import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function readJsonIfExists(filepath) {
  var abs = path.resolve(process.cwd(), filepath);
  if (!fs.existsSync(abs)) return null;
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

export function buildSummaryMarkdown(input) {
  var preload = input.preload || {};
  var profile = input.profile || {};
  var playableBuild = input.playableBuild || {};
  var playableSmoke = input.playableSmoke || {};
  var legacySave = input.legacySave || {};
  var legacySessionSmoke = input.legacySessionSmoke || {};
  var importSafety = input.importSafety || {};
  var playability = input.playability || {};
  var hybridMetrics = input.hybridMetrics || {};
  var perfThreshold = input.perfThreshold || {};
  var security = input.security || {};
  var lines = [];
  lines.push('# Overnight Stability/Perf Summary');
  lines.push('');
  lines.push('## Preload Check');
  lines.push('- Modulepreloads: ' + (preload.modulePreloadsCount || 0));
  lines.push('- Violations: ' + ((preload.violations && preload.violations.length) || 0));
  lines.push('');
  lines.push('## Dist Profile');
  lines.push('- Assets: ' + ((profile.assets && profile.assets.length) || 0));
  lines.push('- Index bytes: ' + (((profile.index || {}).bytes) || 0));
  lines.push('- Index gzip bytes: ' + (((profile.index || {}).gzipBytes) || 0));
  lines.push('');
  lines.push('## Playable Gate');
  lines.push('- Playable build: ' + (playableBuild.ok === false ? 'FAIL' : (playableBuild.ok === true ? 'PASS' : 'unknown')));
  lines.push('- Playable smoke: ' + (playableSmoke.ok === false ? 'FAIL' : (playableSmoke.ok === true ? 'PASS' : 'unknown')));
  lines.push('- Missing legacy files: ' + ((playableBuild.missingFiles && playableBuild.missingFiles.length) || 0));
  lines.push('- Broken legacy refs: ' + ((playableBuild.badRefs && playableBuild.badRefs.length) || 0));
  lines.push('- Smoke checks: ' + ((playableSmoke.checks && playableSmoke.checks.length) || 0));
  lines.push('');
  lines.push('## Hybrid Gate');
  lines.push('- Legacy save checks: ' + ((legacySave.checks && legacySave.checks.length) || 0));
  lines.push('- Legacy save status: ' + (legacySave.ok === false ? 'FAIL' : (legacySave.ok === true ? 'PASS' : 'unknown')));
  lines.push('- Legacy session smoke checks: ' + ((legacySessionSmoke.checks && legacySessionSmoke.checks.length) || 0));
  lines.push('- Legacy session smoke status: ' + (legacySessionSmoke.ok === false ? 'FAIL' : (legacySessionSmoke.ok === true ? 'PASS' : 'unknown')));
  lines.push('- Save import safety status: ' + (importSafety.ok === false ? 'FAIL' : (importSafety.ok === true ? 'PASS' : 'unknown')));
  lines.push('- Save import safety checks: ' + ((importSafety.checks && importSafety.checks.length) || 0));
  lines.push('- Playability report status: ' + (playability.overallOk === false ? 'FAIL' : (playability.overallOk === true ? 'PASS' : 'unknown')));
  lines.push('- Playability failed sections: ' + (((playability.summary || {}).failedSections) || 0));
  lines.push('- Hybrid metrics samples: ' + (((hybridMetrics.stats || {}).count) || 0));
  lines.push('- Hybrid metrics p50/p95: ' + (((hybridMetrics.stats || {}).p50) || 0) + ' / ' + (((hybridMetrics.stats || {}).p95) || 0) + ' ms');
  lines.push('- Perf threshold status: ' + (perfThreshold.ok === false ? 'FAIL' : (perfThreshold.ok === true ? 'PASS' : 'unknown')));
  lines.push('- Perf threshold warnings: ' + ((perfThreshold.warnings && perfThreshold.warnings.length) || 0));
  lines.push('- Security guardrails: ' + (security.ok === false ? 'FAIL' : (security.ok === true ? 'PASS' : 'unknown')));
  lines.push('- Security checks: ' + ((security.checks && security.checks.length) || 0));
  lines.push('');
  lines.push('## Top Assets');
  var top = profile.topAssets || [];
  if (top.length === 0) {
    lines.push('- none');
  } else {
    top.forEach(function (asset) {
      lines.push('- ' + asset.file + ': ' + asset.bytes + ' bytes (' + asset.gzipBytes + ' gzip)');
    });
  }
  lines.push('');
  return lines.join('\n') + '\n';
}

export function writeSummary(outputPath) {
  var preload = readJsonIfExists('dist/preload-report.json');
  var profile = readJsonIfExists('dist/perf-profile.json');
  var playableBuild = readJsonIfExists('dist/playable-build-report.json');
  var playableSmoke = readJsonIfExists('dist/playable-smoke-report.json');
  var legacySave = readJsonIfExists('dist/legacy-save-report.json');
  var legacySessionSmoke = readJsonIfExists('dist/legacy-session-smoke-report.json');
  var importSafety = readJsonIfExists('dist/import-safety-report.json');
  var playability = readJsonIfExists('dist/playability-report.json');
  var hybridMetrics = readJsonIfExists('dist/hybrid-metrics.json');
  var perfThreshold = readJsonIfExists('dist/perf-threshold-report.json');
  var security = readJsonIfExists('dist/security-report.json');
  var markdown = buildSummaryMarkdown({
    preload: preload,
    profile: profile,
    playableBuild: playableBuild,
    playableSmoke: playableSmoke,
    legacySave: legacySave,
    legacySessionSmoke: legacySessionSmoke,
    importSafety: importSafety,
    playability: playability,
    hybridMetrics: hybridMetrics,
    perfThreshold: perfThreshold,
    security: security,
  });
  var out = path.resolve(process.cwd(), outputPath || 'docs/overnight-summary.md');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, markdown);
  return { outputPath: out, markdown: markdown };
}

var isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  var out = writeSummary(process.argv[2]);
  console.log('[ci-summary] wrote ' + out.outputPath);
  console.log(out.markdown);
}
