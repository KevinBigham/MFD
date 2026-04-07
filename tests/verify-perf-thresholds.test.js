import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  evaluatePerfThresholds,
  parseThresholdConfig,
  runPerfThresholdCheck,
} from '../scripts/verify-perf-thresholds.mjs';

describe('verify-perf-thresholds', () => {
  it('parses threshold config with defaults', () => {
    var cfg = parseThresholdConfig({});
    expect(cfg.schemaVersion).toBe('hybrid-perf-thresholds.v1');
    expect(cfg.softMs.p95).toBeGreaterThan(0);
    expect(cfg.catastrophicMs.max).toBeGreaterThan(cfg.softMs.max);
  });

  it('evaluates warnings vs catastrophic failures', () => {
    var okEval = evaluatePerfThresholds({ stats: { p95: 1000, max: 2000 } }, {
      softMs: { p95: 1200, max: 2500 },
      catastrophicMs: { p95: 3000, max: 8000 },
    });
    expect(okEval.ok).toBe(true);
    expect(okEval.failures).toEqual([]);

    var failEval = evaluatePerfThresholds({ stats: { p95: 5001, max: 100 } }, {
      softMs: { p95: 1200, max: 2500 },
      catastrophicMs: { p95: 5000, max: 8000 },
    });
    expect(failEval.ok).toBe(false);
    expect(failEval.failures.length).toBe(1);
  });

  it('writes threshold report artifact', () => {
    var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-perf-threshold-'));
    var cwd = process.cwd();
    try {
      process.chdir(root);

      fs.mkdirSync('dist', { recursive: true });
      fs.mkdirSync('scripts', { recursive: true });
      fs.writeFileSync(path.join('dist', 'hybrid-metrics.json'), JSON.stringify({ stats: { p95: 100, max: 200, count: 3 } }));
      fs.writeFileSync(path.join('scripts', 'perf-thresholds.json'), JSON.stringify({
        schemaVersion: 'hybrid-perf-thresholds.v1',
        softMs: { p95: 300, max: 600 },
        catastrophicMs: { p95: 1000, max: 2000 },
      }));

      var out = runPerfThresholdCheck({
        metricsPath: 'dist/hybrid-metrics.json',
        configPath: 'scripts/perf-thresholds.json',
        outputPath: 'dist/perf-threshold-report.json',
      });

      expect(out.result.ok).toBe(true);
      expect(fs.existsSync(out.outputPath)).toBe(true);
    } finally {
      process.chdir(cwd);
    }
  });
});
