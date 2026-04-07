import { describe, expect, it } from 'vitest';

import {
  clearPerfSamples,
  collectPerfStats,
  endPerfSpan,
  getPerfSamples,
  startPerfSpan,
} from '../src/app/perf-metrics.js';

describe('perf-metrics', () => {
  it('records span samples and returns stable stats', () => {
    clearPerfSamples();
    var spanA = startPerfSpan('launcher_boot', { clock: { now: function () { return 100; } } });
    endPerfSpan(spanA, { result: 'ok' });

    var samples = getPerfSamples();
    expect(samples.length).toBe(1);
    expect(samples[0].name).toBe('launcher_boot');
    expect(samples[0].durationMs).toBeGreaterThanOrEqual(0);

    var stats = collectPerfStats(samples);
    expect(stats.count).toBe(1);
    expect(stats.p50).toBeGreaterThanOrEqual(0);
    expect(stats.p95).toBeGreaterThanOrEqual(stats.p50);
  });

  it('returns failure for unknown span id', () => {
    clearPerfSamples();
    var out = endPerfSpan('missing-span-id', {});
    expect(out.ok).toBe(false);
    expect(out.reason).toContain('unknown span id');
  });

  it('normalizes mixed sample shapes when collecting stats', () => {
    var stats = collectPerfStats([
      { durationMs: 20 },
      40,
      { durationMs: 10 },
      { durationMs: 60 },
    ]);
    expect(stats.count).toBe(4);
    expect(stats.max).toBe(60);
    expect(stats.p95).toBeGreaterThanOrEqual(40);
  });
});
