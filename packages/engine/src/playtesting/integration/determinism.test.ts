import { runPlaytest } from '../harness';

describe('playtest harness integration — determinism', () => {
  it('produces a deterministic one-season SPEEDRUNNER canonical report', () => {
    const left = runPlaytest('SPEEDRUNNER', 42, 1);
    const right = runPlaytest('SPEEDRUNNER', 42, 1);
    expect(JSON.stringify(left)).toBe(JSON.stringify(right));
    expect(left.anomalies.some((anomaly) => anomaly.detectorId === 'perf-budget')).toBe(false);
  }, 60000);
});
