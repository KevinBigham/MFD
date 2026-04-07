import fs from 'node:fs';
import path from 'node:path';

function readJson(filePath) {
  var abs = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(abs)) return null;
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (_err) {
    return null;
  }
}

function state(value, passKey) {
  if (!value || typeof value !== 'object') return 'missing';
  if (value[passKey] === true) return 'PASS';
  if (value[passKey] === false) return 'FAIL';
  return 'unknown';
}

export function writeBlitzSummary(input) {
  var data = input || {};
  var lines = [];
  lines.push('# Hybrid v4 Blitz Summary');
  lines.push('');
  lines.push('## Gates');
  lines.push('- Lane: ' + state(data.lane, 'ok'));
  lines.push('- Playable build: ' + state(data.playableBuild, 'ok'));
  lines.push('- Playable smoke: ' + state(data.playableSmoke, 'ok'));
  lines.push('- Hybrid: ' + state(data.playability, 'overallOk'));
  lines.push('- E2E launcher: ' + state(data.e2e, 'ok'));
  lines.push('- Save import safety: ' + state(data.importSafety, 'ok'));
  lines.push('- Security: ' + state(data.security, 'ok'));
  lines.push('- Perf thresholds: ' + state(data.perfThreshold, 'ok'));
  lines.push('- Contracts: ' + state(data.contracts, 'ok'));
  lines.push('');

  var blockers = [];
  if (data.playability && data.playability.overallOk === false) blockers.push('playability gate failing');
  if (data.e2e && data.e2e.ok === false) blockers.push('e2e launcher smoke failing');
  if (data.security && data.security.ok === false) blockers.push('security guardrails failing');
  if (data.perfThreshold && data.perfThreshold.ok === false) blockers.push('perf catastrophic threshold exceeded');
  if (data.contracts && data.contracts.ok === false && !data.contracts.skipped) blockers.push('contracts drift detected');

  lines.push('## Blockers');
  if (blockers.length === 0) {
    lines.push('- none');
  } else {
    blockers.forEach(function (row) { lines.push('- ' + row); });
  }

  lines.push('');
  lines.push('## Owner Queues');
  lines.push('- Codex: launcher/runtime/scripts/ci/docs follow-ups');
  lines.push('- Claude: gameplay fixture publication + contract drift resolution');
  lines.push('- Shared: package/docs/integration-window items');
  lines.push('');

  return lines.join('\n') + '\n';
}

export function runBlitzSummary(outputPath) {
  var markdown = writeBlitzSummary({
    lane: readJson('dist/lane-report.json'),
    playableBuild: readJson('dist/playable-build-report.json'),
    playableSmoke: readJson('dist/playable-smoke-report.json'),
    playability: readJson('dist/playability-report.json'),
    e2e: readJson('dist/e2e-launcher-report.json'),
    importSafety: readJson('dist/import-safety-report.json'),
    security: readJson('dist/security-report.json'),
    perfThreshold: readJson('dist/perf-threshold-report.json'),
    contracts: readJson('dist/contracts-report.json'),
  });

  var outPath = path.resolve(process.cwd(), outputPath || 'docs/blitz-summary.md');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, markdown, 'utf8');

  var distCopy = path.resolve(process.cwd(), 'dist/blitz-summary.md');
  fs.mkdirSync(path.dirname(distCopy), { recursive: true });
  fs.writeFileSync(distCopy, markdown, 'utf8');

  return { outputPath: outPath, distPath: distCopy, markdown: markdown };
}

function main() {
  var output = process.argv[2] || 'docs/blitz-summary.md';
  var out = runBlitzSummary(output);
  console.log('[blitz-summary] wrote ' + out.outputPath);
  console.log('[blitz-summary] dist copy ' + out.distPath);
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}
