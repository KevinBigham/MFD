import { runPlaytest } from '../harness';

describe('playtest harness integration — GLUTTON', () => {
  it('runs GLUTTON through one season', () => {
    const report = runPlaytest('GLUTTON', 42, 1);
    expect(report.personaId).toBe('GLUTTON');
    expect(report.seasonsCompleted).toBe(1);
  }, 45000);
});
