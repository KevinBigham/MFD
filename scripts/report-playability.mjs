import fs from 'node:fs';
import path from 'node:path';

import { buildPlayabilityReport } from '../src/app/playability-report.js';

function readJsonIfExists(filepath) {
  var abs = path.resolve(process.cwd(), filepath);
  if (!fs.existsSync(abs)) return null;
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (_err) {
    return null;
  }
}

function toSection(report) {
  if (!report || typeof report !== 'object') {
    return { ok: false, checks: [{ name: 'report missing', pass: false, detail: 'report file not found' }], errors: ['report missing'] };
  }
  return {
    ok: report.ok !== false,
    checks: Array.isArray(report.checks) ? report.checks : [],
    errors: Array.isArray(report.errors) ? report.errors : [],
    missingFiles: Array.isArray(report.missingFiles) ? report.missingFiles : [],
    badRefs: Array.isArray(report.badRefs) ? report.badRefs : [],
  };
}

function normalizeMetricSamples(metricData) {
  if (!metricData || !Array.isArray(metricData.samples)) return [];
  return metricData.samples.map(function (sample) {
    if (typeof sample === 'number') return sample;
    if (sample && typeof sample.durationMs === 'number') return sample.durationMs;
    return 0;
  }).filter(function (value) {
    return Number.isFinite(value) && value >= 0;
  });
}

export function buildPlayabilityReportInput() {
  var build = readJsonIfExists('dist/playable-build-report.json');
  var smoke = readJsonIfExists('dist/playable-smoke-report.json');
  var save = readJsonIfExists('dist/legacy-save-report.json');
  var legacySession = readJsonIfExists('dist/legacy-session-smoke-report.json');
  var metricData = readJsonIfExists('dist/hybrid-metrics.json');

  return {
    launcher: toSection(smoke),
    build: toSection(build),
    save: toSection(save),
    bridge: toSection(legacySession),
    smoke: toSection(legacySession),
    sessionHealth: legacySession && legacySession.sessionHealth ? legacySession.sessionHealth : { state: 'unknown', running: false, history: [] },
    metrics: {
      samples: normalizeMetricSamples(metricData),
    },
  };
}

export function runPlayabilityReport(outputPath) {
  var report = buildPlayabilityReport(buildPlayabilityReportInput());
  var outPath = path.resolve(process.cwd(), outputPath || 'dist/playability-report.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
  return { report: report, outputPath: outPath };
}

function parseArgs(args) {
  var out = { report: 'dist/playability-report.json' };
  for (var i = 0; i < args.length; i += 1) {
    if (args[i] === '--report' && args[i + 1]) out.report = args[i + 1];
  }
  return out;
}

function main() {
  var args = parseArgs(process.argv.slice(2));
  var out = runPlayabilityReport(args.report);
  console.log('[playability-report] wrote ' + out.outputPath);
  if (!out.report.overallOk) {
    console.error('[playability-report] one or more playability sections failed');
    process.exit(1);
  }
  console.log('[playability-report] OK');
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}
