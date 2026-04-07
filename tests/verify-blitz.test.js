import { describe, expect, it } from 'vitest';

import { BLITZ_STEPS, runBlitzGate } from '../scripts/verify-blitz.mjs';

describe('verify-blitz gate orchestrator', () => {
  it('returns ok=true when all steps pass', () => {
    var out = runBlitzGate({
      reportPath: 'dist/blitz-gate-report-test-pass.json',
      runner: function () {
        return { status: 0 };
      },
    });
    expect(out.report.ok).toBe(true);
    expect(out.report.steps.length).toBe(BLITZ_STEPS.length);
    expect(out.report.steps.every(function (step) { return step.ok; })).toBe(true);
  });

  it('returns ok=false when any step fails', () => {
    var out = runBlitzGate({
      reportPath: 'dist/blitz-gate-report-test-fail.json',
      runner: function (step) {
        if (step.name === 'security') return { status: 1 };
        return { status: 0 };
      },
    });
    expect(out.report.ok).toBe(false);
    expect(out.report.steps.some(function (step) { return step.name === 'security' && !step.ok; })).toBe(true);
  });
});
