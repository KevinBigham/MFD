import { runPlaytest } from './harness';

describe('playtest harness integration', () => {
  it('runs SPEEDRUNNER through one season', () => {
    const report = runPlaytest('SPEEDRUNNER', 42, 1);
    expect(report.personaId).toBe('SPEEDRUNNER');
    expect(report.seasonsCompleted).toBe(1);
    expect(report.weeksAdvanced).toBeGreaterThan(15);
  }, 45000);

  it('produces a deterministic one-season SPEEDRUNNER report', () => {
    const left = runPlaytest('SPEEDRUNNER', 42, 1);
    const right = runPlaytest('SPEEDRUNNER', 42, 1);
    expect(JSON.stringify(left)).toBe(JSON.stringify(right));
  }, 45000);

  it('runs GLUTTON through one season', () => {
    const report = runPlaytest('GLUTTON', 42, 1);
    expect(report.personaId).toBe('GLUTTON');
    expect(report.seasonsCompleted).toBe(1);
  }, 45000);

  it('runs CHEAPSKATE through one season', () => {
    const report = runPlaytest('CHEAPSKATE', 42, 1);
    expect(report.personaId).toBe('CHEAPSKATE');
    expect(report.seasonsCompleted).toBe(1);
  }, 45000);

  it('runs CHURN_ARTIST through one season', () => {
    const report = runPlaytest('CHURN_ARTIST', 42, 1);
    expect(report.personaId).toBe('CHURN_ARTIST');
    expect(report.seasonsCompleted).toBe(1);
  }, 45000);

  it('runs INJURY_MAGNET through one season', () => {
    const report = runPlaytest('INJURY_MAGNET', 42, 1);
    expect(report.personaId).toBe('INJURY_MAGNET');
    expect(report.seasonsCompleted).toBe(1);
  }, 45000);
});
