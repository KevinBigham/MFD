import { runPlaytest } from '../harness';

describe('playtest harness integration — INJURY_MAGNET', () => {
  it('runs INJURY_MAGNET through one season', () => {
    const report = runPlaytest('INJURY_MAGNET', 42, 1);
    expect(report.personaId).toBe('INJURY_MAGNET');
    expect(report.seasonsCompleted).toBe(1);
  }, 45000);
});
