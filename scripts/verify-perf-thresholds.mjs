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

export function parseThresholdConfig(config) {
  var defaults = {
    schemaVersion: 'hybrid-perf-thresholds.v1',
    softMs: { p95: 1500, max: 3000 },
    catastrophicMs: { p95: 5000, max: 12000 },
  };
  var value = config || {};
  return {
    schemaVersion: String(value.schemaVersion || defaults.schemaVersion),
    softMs: {
      p95: Number(value.softMs && value.softMs.p95 || defaults.softMs.p95),
      max: Number(value.softMs && value.softMs.max || defaults.softMs.max),
    },
    catastrophicMs: {
      p95: Number(value.catastrophicMs && value.catastrophicMs.p95 || defaults.catastrophicMs.p95),
      max: Number(value.catastrophicMs && value.catastrophicMs.max || defaults.catastrophicMs.max),
    },
  };
}

export function evaluatePerfThresholds(metricsReport, thresholdConfig) {
  var report = metricsReport || {};
  var cfg = parseThresholdConfig(thresholdConfig);
  var stats = report.stats || { p95: 0, max: 0, count: 0 };

  var warnings = [];
  var failures = [];

  if (stats.p95 > cfg.softMs.p95) warnings.push('p95 above soft threshold');
  if (stats.max > cfg.softMs.max) warnings.push('max above soft threshold');

  if (stats.p95 > cfg.catastrophicMs.p95) failures.push('p95 above catastrophic threshold');
  if (stats.max > cfg.catastrophicMs.max) failures.push('max above catastrophic threshold');

  return {
    ok: failures.length === 0,
    warnings: warnings,
    failures: failures,
    stats: {
      p95: Number(stats.p95 || 0),
      max: Number(stats.max || 0),
      count: Number(stats.count || 0),
    },
    thresholds: cfg,
  };
}

export function runPerfThresholdCheck(options) {
  var opts = options || {};
  var metricsPath = opts.metricsPath || 'dist/hybrid-metrics.json';
  var configPath = opts.configPath || 'scripts/perf-thresholds.json';
  var outputPath = opts.outputPath || 'dist/perf-threshold-report.json';

  var metrics = readJson(metricsPath) || { stats: { p95: 0, max: 0, count: 0 } };
  var config = parseThresholdConfig(readJson(configPath));
  var evaluated = evaluatePerfThresholds(metrics, config);
  var payload = {
    schemaVersion: 'hybrid-perf-threshold-report.v1',
    generatedAt: new Date().toISOString(),
    ok: evaluated.ok,
    warnings: evaluated.warnings,
    failures: evaluated.failures,
    stats: evaluated.stats,
    thresholds: evaluated.thresholds,
    source: {
      metricsPath: metricsPath,
      configPath: configPath,
    },
  };

  var absOut = path.resolve(process.cwd(), outputPath);
  fs.mkdirSync(path.dirname(absOut), { recursive: true });
  fs.writeFileSync(absOut, JSON.stringify(payload, null, 2) + '\n');
  return { result: payload, outputPath: absOut };
}

function parseArgs(args) {
  var out = {
    metricsPath: 'dist/hybrid-metrics.json',
    configPath: 'scripts/perf-thresholds.json',
    outputPath: 'dist/perf-threshold-report.json',
  };
  for (var i = 0; i < args.length; i += 1) {
    if (args[i] === '--metrics' && args[i + 1]) out.metricsPath = args[i + 1];
    if (args[i] === '--config' && args[i + 1]) out.configPath = args[i + 1];
    if (args[i] === '--report' && args[i + 1]) out.outputPath = args[i + 1];
  }
  return out;
}

function main() {
  var args = parseArgs(process.argv.slice(2));
  var out = runPerfThresholdCheck(args);
  console.log('[verify-perf] report: ' + out.outputPath);
  out.result.warnings.forEach(function (warning) {
    console.warn('[verify-perf] warning: ' + warning);
  });
  if (!out.result.ok) {
    out.result.failures.forEach(function (failure) {
      console.error('[verify-perf] failure: ' + failure);
    });
    process.exit(1);
  }
  console.log('[verify-perf] OK');
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}
