import { runPlaytest } from '../harness';

describe('playtest harness integration — SPEEDRUNNER', () => {
  it('runs SPEEDRUNNER through one season', () => {
    const report = runPlaytest('SPEEDRUNNER', 42, 1);
    expect(report.personaId).toBe('SPEEDRUNNER');
    expect(report.seasonsCompleted).toBe(1);
    expect(report.weeksAdvanced).toBeGreaterThan(15);
  }, 45000);
});
