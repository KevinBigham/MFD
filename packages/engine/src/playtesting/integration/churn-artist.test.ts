import { runPlaytest } from '../harness';

describe('playtest harness integration — CHURN_ARTIST', () => {
  it('runs CHURN_ARTIST through one season', () => {
    const report = runPlaytest('CHURN_ARTIST', 42, 1);
    expect(report.personaId).toBe('CHURN_ARTIST');
    expect(report.seasonsCompleted).toBe(1);
  }, 45000);
});
