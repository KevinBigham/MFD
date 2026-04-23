import { runPlaytest } from '../harness';

describe('playtest harness integration — CHEAPSKATE', () => {
  it('runs CHEAPSKATE through one season', () => {
    const report = runPlaytest('CHEAPSKATE', 42, 1);
    expect(report.personaId).toBe('CHEAPSKATE');
    expect(report.seasonsCompleted).toBe(1);
  }, 45000);
});
