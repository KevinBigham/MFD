import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildHybridMetricsReport, runHybridMetricsReport } from '../scripts/report-hybrid-metrics.mjs';

describe('report-hybrid-metrics', () => {
  it('builds metrics report from mixed sources', () => {
    var report = buildHybridMetricsReport({
      e2eReport: {
        checks: [
          { name: 'a', durationMs: 110 },
          { name: 'b', durationMs: 240 },
        ],
      },
      playableSmokeReport: { checks: [{ name: 'x', durationMs: 90 }] },
      legacySessionReport: { checks: [{ name: 'y', durationMs: 70 }] },
      playabilityReport: { metrics: { samples: [50, 80] } },
    });

    expect(report.schemaVersion).toBe('hybrid-metrics.v1');
    expect(report.samples.length).toBe(6);
    expect(report.stats.count).toBe(6);
    expect(typeof report.stats.p95).toBe('number');
    expect(Array.isArray(report.warnings)).toBe(true);
  });

  it('writes metrics report artifact to disk', () => {
    var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-hybrid-metrics-'));
    var cwd = process.cwd();
    try {
      process.chdir(root);

      fs.mkdirSync('dist', { recursive: true });
      fs.writeFileSync(path.join('dist', 'e2e-launcher-report.json'), JSON.stringify({ checks: [{ name: 'boot', durationMs: 100 }] }));

      var out = runHybridMetricsReport('dist/hybrid-metrics.json', {});
      expect(fs.existsSync(out.outputPath)).toBe(true);

      var parsed = JSON.parse(fs.readFileSync(out.outputPath, 'utf8'));
      expect(parsed.schemaVersion).toBe('hybrid-metrics.v1');
      expect(parsed.stats.count).toBeGreaterThanOrEqual(1);
    } finally {
      process.chdir(cwd);
    }
  });
});
