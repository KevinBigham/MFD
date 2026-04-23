import { runPlaytest } from '../harness';
import type { PlaytestReport } from '../types';

// The perf-budget detector measures wall-clock p99 of advanceFranchiseWeek.
// Under concurrent vitest forks or CI load, wall-clock drifts across runs even
// with identical sim state. Determinism is a sim-state invariant, so strip
// wall-clock-derived anomalies before comparing the two reports.
function canonical(report: PlaytestReport): string {
  const filtered = report.anomalies.filter((anomaly) => anomaly.detectorId !== 'perf-budget');
  return JSON.stringify({
    ...report,
    anomalies: filtered,
    anomalyCount: filtered.length,
    highSeverityCount: filtered.filter((anomaly) => anomaly.severity === 'high').length,
  });
}

describe('playtest harness integration — determinism', () => {
  it('produces a deterministic one-season SPEEDRUNNER report (sim-state only)', () => {
    const left = runPlaytest('SPEEDRUNNER', 42, 1);
    const right = runPlaytest('SPEEDRUNNER', 42, 1);
    expect(canonical(left)).toBe(canonical(right));
  }, 45000);
});
