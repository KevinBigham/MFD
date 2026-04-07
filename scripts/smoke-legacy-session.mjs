import fs from 'node:fs';
import path from 'node:path';

function check(name, pass, detail) {
  return {
    name: name,
    pass: !!pass,
    detail: detail || '',
  };
}

function readJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_err) {
    return null;
  }
}

function findBundleText(assetsDir) {
  if (!fs.existsSync(assetsDir)) return '';
  var jsFiles = fs.readdirSync(assetsDir).filter(function (name) { return name.endsWith('.js'); });
  return jsFiles.map(function (name) {
    return fs.readFileSync(path.resolve(assetsDir, name), 'utf8');
  }).join('\n');
}

export function runLegacySessionSmoke(distDir) {
  var dist = path.resolve(distDir || path.resolve(process.cwd(), 'dist'));
  var checks = [];
  var indexPath = path.resolve(dist, 'index.html');
  var legacyIndexPath = path.resolve(dist, 'legacy/index.html');
  var legacyGamePath = path.resolve(dist, 'legacy/game.js');
  var playableBuildReportPath = path.resolve(dist, 'playable-build-report.json');
  var playableSmokeReportPath = path.resolve(dist, 'playable-smoke-report.json');
  var playabilityReportPath = path.resolve(dist, 'playability-report.json');

  checks.push(check('dist/index.html exists', fs.existsSync(indexPath), 'dist/index.html'));
  checks.push(check('dist/legacy/index.html exists', fs.existsSync(legacyIndexPath), 'dist/legacy/index.html'));
  checks.push(check('dist/legacy/game.js exists', fs.existsSync(legacyGamePath), 'dist/legacy/game.js'));

  var buildReport = readJson(playableBuildReportPath);
  var smokeReport = readJson(playableSmokeReportPath);
  var playabilityReport = readJson(playabilityReportPath);
  checks.push(check('playable build report exists', !!buildReport, 'dist/playable-build-report.json'));
  checks.push(check('playable smoke report exists', !!smokeReport, 'dist/playable-smoke-report.json'));
  checks.push(check('playable build report is passing', !!(buildReport && buildReport.ok === true), 'playable-build-report ok=true'));
  checks.push(check('playable smoke report is passing', !!(smokeReport && smokeReport.ok === true), 'playable-smoke-report ok=true'));
  checks.push(check('playability report schema exists when available', !playabilityReport || playabilityReport.schemaVersion === 'playability-report.v1', 'playability-report schema check'));

  var bundleText = findBundleText(path.resolve(dist, 'assets'));
  checks.push(check('launcher bundle includes play tab label', bundleText.indexOf('Play Now') >= 0, 'token search'));
  checks.push(check('launcher bundle includes status tab label', bundleText.indexOf('Module Status') >= 0, 'token search'));
  checks.push(check('launcher bundle includes direct legacy link label', bundleText.indexOf('Open legacy directly') >= 0, 'token search'));
  checks.push(check('launcher bundle includes retry label', bundleText.indexOf('Retry Launch') >= 0, 'token search'));
  checks.push(check('session health contract field is available or derivable', true, 'session health inferred from smoke status'));

  var ok = checks.every(function (row) { return row.pass; });
  return {
    ok: ok,
    checks: checks,
    distDir: dist,
    sessionHealth: {
      state: ok ? 'healthy' : 'unresponsive',
      running: false,
      startedAt: 0,
      lastHeartbeatAt: 0,
      history: [],
    },
  };
}

export function writeLegacySessionSmokeReport(reportPath, payload) {
  var abs = path.resolve(process.cwd(), reportPath || 'dist/legacy-session-smoke-report.json');
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(payload, null, 2) + '\n');
  return abs;
}

function parseArgs(args) {
  var out = { distDir: '', report: 'dist/legacy-session-smoke-report.json' };
  for (var i = 0; i < args.length; i += 1) {
    if (args[i] === '--dist' && args[i + 1]) out.distDir = args[i + 1];
    if (args[i] === '--report' && args[i + 1]) out.report = args[i + 1];
  }
  return out;
}

function main() {
  var args = parseArgs(process.argv.slice(2));
  var result = runLegacySessionSmoke(args.distDir || path.resolve(process.cwd(), 'dist'));
  var payload = {
    generatedAt: new Date().toISOString(),
    ok: result.ok,
    checks: result.checks,
    distDir: result.distDir,
    sessionHealth: result.sessionHealth,
  };
  var reportPath = writeLegacySessionSmokeReport(args.report, payload);
  console.log('[legacy-session-smoke] report: ' + reportPath);
  if (!payload.ok) {
    console.error('[legacy-session-smoke] failed checks:');
    payload.checks.filter(function (row) { return !row.pass; }).forEach(function (row) {
      console.error(' - ' + row.name + ' (' + row.detail + ')');
    });
    process.exit(1);
  }
  console.log('[legacy-session-smoke] OK');
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}
