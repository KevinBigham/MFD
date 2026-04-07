import fs from 'node:fs';
import path from 'node:path';

import { collectPerfStats } from '../src/app/perf-metrics.js';

function readJson(filePath) {
  var abs = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(abs)) return null;
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (_err) {
    return null;
  }
}

function readThresholdConfig(configPath) {
  var defaults = {
    schemaVersion: 'hybrid-perf-thresholds.v1',
    softMs: { p95: 1500, max: 3000 },
    catastrophicMs: { p95: 5000, max: 12000 },
  };
  var loaded = readJson(configPath || 'scripts/perf-thresholds.json');
  if (!loaded || typeof loaded !== 'object') return defaults;
  return {
    schemaVersion: String(loaded.schemaVersion || defaults.schemaVersion),
    softMs: {
      p95: Number(loaded.softMs && loaded.softMs.p95 || defaults.softMs.p95),
      max: Number(loaded.softMs && loaded.softMs.max || defaults.softMs.max),
    },
    catastrophicMs: {
      p95: Number(loaded.catastrophicMs && loaded.catastrophicMs.p95 || defaults.catastrophicMs.p95),
      max: Number(loaded.catastrophicMs && loaded.catastrophicMs.max || defaults.catastrophicMs.max),
    },
  };
}

function samplesFromChecks(source, report) {
  if (!report || !Array.isArray(report.checks)) return [];
  return report.checks
    .filter(function (check) {
      return typeof check.durationMs === 'number' && Number.isFinite(check.durationMs) && check.durationMs >= 0;
    })
    .map(function (check) {
      return {
        source: source,
        name: String(check.name || 'unnamed-check'),
        durationMs: Number(check.durationMs),
      };
    });
}

function samplesFromPlayabilityMetrics(report) {
  if (!report || !report.metrics || !Array.isArray(report.metrics.samples)) return [];
  return report.metrics.samples
    .map(function (sample, index) {
      var duration = typeof sample === 'number' ? sample : (sample && sample.durationMs);
      return {
        source: 'playability-report',
        name: 'metric_' + (index + 1),
        durationMs: Number(duration || 0),
      };
    })
    .filter(function (sample) {
      return Number.isFinite(sample.durationMs) && sample.durationMs >= 0;
    });
}

export function buildHybridMetricsReport(input) {
  var data = input || {};
  var thresholdConfig = readThresholdConfig(data.thresholdConfigPath);

  var samples = [];
  samples = samples.concat(samplesFromChecks('e2e-launcher', data.e2eReport));
  samples = samples.concat(samplesFromChecks('playable-smoke', data.playableSmokeReport));
  samples = samples.concat(samplesFromChecks('legacy-session-smoke', data.legacySessionReport));
  samples = samples.concat(samplesFromPlayabilityMetrics(data.playabilityReport));

  var stats = collectPerfStats(samples);
  var warnings = [];
  if (stats.p95 > thresholdConfig.softMs.p95) {
    warnings.push('p95 exceeded soft threshold (' + stats.p95 + 'ms > ' + thresholdConfig.softMs.p95 + 'ms)');
  }
  if (stats.max > thresholdConfig.softMs.max) {
    warnings.push('max exceeded soft threshold (' + stats.max + 'ms > ' + thresholdConfig.softMs.max + 'ms)');
  }

  return {
    schemaVersion: 'hybrid-metrics.v1',
    generatedAt: new Date().toISOString(),
    samples: samples,
    stats: stats,
    thresholds: thresholdConfig,
    warnings: warnings,
  };
}

export function runHybridMetricsReport(outputPath, options) {
  var opts = options || {};
  var report = buildHybridMetricsReport({
    thresholdConfigPath: opts.thresholdConfigPath,
    e2eReport: readJson('dist/e2e-launcher-report.json'),
    playableSmokeReport: readJson('dist/playable-smoke-report.json'),
    legacySessionReport: readJson('dist/legacy-session-smoke-report.json'),
    playabilityReport: readJson('dist/playability-report.json'),
  });

  var outPath = path.resolve(process.cwd(), outputPath || 'dist/hybrid-metrics.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
  return { report: report, outputPath: outPath };
}

function parseArgs(args) {
  var out = {
    reportPath: 'dist/hybrid-metrics.json',
    thresholdConfigPath: 'scripts/perf-thresholds.json',
  };
  for (var i = 0; i < args.length; i += 1) {
    if (args[i] === '--report' && args[i + 1]) out.reportPath = args[i + 1];
    if (args[i] === '--thresholds' && args[i + 1]) out.thresholdConfigPath = args[i + 1];
  }
  return out;
}

function main() {
  var args = parseArgs(process.argv.slice(2));
  var out = runHybridMetricsReport(args.reportPath, { thresholdConfigPath: args.thresholdConfigPath });
  console.log('[hybrid-metrics] wrote ' + out.outputPath);
  if (out.report.warnings.length > 0) {
    out.report.warnings.forEach(function (warning) {
      console.warn('[hybrid-metrics] warning: ' + warning);
    });
  }
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}
