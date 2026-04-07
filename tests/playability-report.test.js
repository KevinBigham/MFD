import { describe, expect, it } from 'vitest';

import {
  buildPlayabilityReport,
  summarizePlayabilityChecks,
} from '../src/app/playability-report.js';

describe('playability-report', () => {
  it('builds stable schema with section normalization and metrics', () => {
    var report = buildPlayabilityReport({
      launcher: { ok: true, checks: [{ name: 'a', pass: true }] },
      save: { ok: true, checks: [{ name: 'b', pass: true }] },
      bridge: { ok: false, checks: [{ name: 'c', pass: false }], errors: ['unresponsive'] },
      build: { ok: true, checks: [{ name: 'd', pass: true }] },
      smoke: { ok: true, checks: [{ name: 'e', pass: true }] },
      metrics: { samples: [10, 20, 30, 40, 50] },
      sessionHealth: { state: 'healthy', running: false, history: [1, 2] },
    });

    expect(report.schemaVersion).toBe('playability-report.v1');
    expect(typeof report.generatedAt).toBe('string');
    expect(report.overallOk).toBe(false);
    expect(report.summary.failedSections).toBe(1);
    expect(report.metrics.sampleCount).toBe(5);
    expect(report.metrics.p50Ms).toBeGreaterThan(0);
    expect(report.metrics.p95Ms).toBeGreaterThanOrEqual(report.metrics.p50Ms);
    expect(report.sessionHealth.state).toBe('healthy');
    expect(report.sessionHealth.historyCount).toBe(2);
  });

  it('summarizes report checks with deterministic counts', () => {
    var summary = summarizePlayabilityChecks({
      launcher: { ok: true, checks: [{ name: 'a', pass: true }] },
      save: { ok: true, checks: [{ name: 'b', pass: false }] },
      bridge: { ok: true, checks: [] },
    });
    expect(summary.sectionCount).toBe(3);
    expect(summary.totalChecks).toBe(2);
    expect(summary.failedChecks).toBe(1);
    expect(summary.failedSections).toBe(1);
  });

  it('handles empty input safely', () => {
    var report = buildPlayabilityReport({});
    expect(report.sections).toBeDefined();
    expect(report.summary.sectionCount).toBe(5);
    expect(report.summary.totalChecks).toBe(0);
  });
});
