import fs from 'node:fs';
import path from 'node:path';

function check(name, pass, detail) {
  return { name: name, pass: !!pass, detail: detail || '' };
}

function findBundleText(assetsDir) {
  if (!fs.existsSync(assetsDir)) return '';
  var files = fs.readdirSync(assetsDir).filter(function (f) {
    return f.endsWith('.js');
  });
  return files.map(function (file) {
    return fs.readFileSync(path.resolve(assetsDir, file), 'utf8');
  }).join('\n');
}

export function runPlayableSmoke(distDir) {
  var dist = path.resolve(distDir || path.resolve(process.cwd(), 'dist'));
  var checks = [];

  var indexPath = path.resolve(dist, 'index.html');
  var legacyIndexPath = path.resolve(dist, 'legacy/index.html');
  var legacyGamePath = path.resolve(dist, 'legacy/game.js');
  var legacyReactPath = path.resolve(dist, 'legacy/react.min.js');
  var legacyReactDomPath = path.resolve(dist, 'legacy/react-dom.min.js');
  var assetsDir = path.resolve(dist, 'assets');

  checks.push(check('dist index exists', fs.existsSync(indexPath), 'dist/index.html'));
  checks.push(check('legacy index exists', fs.existsSync(legacyIndexPath), 'dist/legacy/index.html'));
  checks.push(check('legacy game.js exists', fs.existsSync(legacyGamePath), 'dist/legacy/game.js'));
  checks.push(check('legacy react.min.js exists', fs.existsSync(legacyReactPath), 'dist/legacy/react.min.js'));
  checks.push(check('legacy react-dom.min.js exists', fs.existsSync(legacyReactDomPath), 'dist/legacy/react-dom.min.js'));

  var bundleText = findBundleText(assetsDir);
  checks.push(check('launcher contains Play Now label', bundleText.indexOf('Play Now') >= 0, 'bundle token search'));
  checks.push(check('launcher contains Module Status label', bundleText.indexOf('Module Status') >= 0, 'bundle token search'));
  checks.push(check('launcher references legacy/index.html', bundleText.indexOf('legacy/index.html') >= 0, 'bundle token search'));

  return {
    ok: checks.every(function (item) { return item.pass; }),
    checks: checks,
    distDir: dist,
  };
}

function writeSmokeReport(reportPath, payload) {
  var abs = path.resolve(process.cwd(), reportPath || 'dist/playable-smoke-report.json');
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(payload, null, 2) + '\n');
  return abs;
}

export function runPlayableSmokeWithReport(distDir, reportPath) {
  var result = runPlayableSmoke(distDir);
  var payload = {
    generatedAt: new Date().toISOString(),
    ok: result.ok,
    checks: result.checks,
    distDir: result.distDir,
  };
  var report = writeSmokeReport(reportPath || 'dist/playable-smoke-report.json', payload);
  return { result: payload, report: report };
}

function parseCliArgs(args) {
  var out = { distDir: '', reportPath: 'dist/playable-smoke-report.json' };
  for (var i = 0; i < args.length; i += 1) {
    if (args[i] === '--dist' && args[i + 1]) out.distDir = args[i + 1];
    if (args[i] === '--report' && args[i + 1]) out.reportPath = args[i + 1];
  }
  return out;
}

function main() {
  var args = parseCliArgs(process.argv.slice(2));
  var out = runPlayableSmokeWithReport(args.distDir || path.resolve(process.cwd(), 'dist'), args.reportPath);
  console.log('[playable-smoke] report: ' + out.report);
  if (!out.result.ok) {
    console.error('[playable-smoke] failed checks:');
    out.result.checks.filter(function (item) { return !item.pass; }).forEach(function (item) {
      console.error(' - ' + item.name + ' (' + item.detail + ')');
    });
    process.exit(1);
  }
  console.log('[playable-smoke] OK');
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}
