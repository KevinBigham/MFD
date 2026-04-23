import { buildPlaytestReport, runPlaytest } from './harness';
import { PLAYTEST_PERSONAS } from './personas';

describe('playtest harness', () => {
  it('sorts anomalies deterministically in buildPlaytestReport', () => {
    const report = buildPlaytestReport({
      persona: PLAYTEST_PERSONAS[0]!,
      seed: 42,
      seasonsRequested: 1,
      seasonsCompleted: 1,
      weeksAdvanced: 20,
      anomalies: [
        {
          detectorId: 'rng-channel',
          severity: 'high',
          detail: 'later',
          reproSeed: 42,
          step: 3,
          year: 2026,
          week: 4,
          phase: 'regular_season',
        },
        {
          detectorId: 'cap-sanity',
          severity: 'medium',
          detail: 'earlier',
          reproSeed: 42,
          step: 2,
          year: 2026,
          week: 3,
          phase: 'regular_season',
        },
      ],
    });

    expect(report.anomalies.map((entry) => entry.detectorId)).toEqual(['cap-sanity', 'rng-channel']);
  });

  it('counts high-severity anomalies in buildPlaytestReport', () => {
    const report = buildPlaytestReport({
      persona: PLAYTEST_PERSONAS[0]!,
      seed: 42,
      seasonsRequested: 1,
      seasonsCompleted: 1,
      weeksAdvanced: 20,
      anomalies: [
        {
          detectorId: 'high-one',
          severity: 'high',
          detail: 'A',
          reproSeed: 42,
          step: 1,
          year: 2026,
          week: 1,
          phase: 'preseason',
        },
        {
          detectorId: 'medium-one',
          severity: 'medium',
          detail: 'B',
          reproSeed: 42,
          step: 2,
          year: 2026,
          week: 2,
          phase: 'regular_season',
        },
      ],
    });

    expect(report.anomalyCount).toBe(2);
    expect(report.highSeverityCount).toBe(1);
  });

  it('throws for unknown persona ids', () => {
    expect(() => runPlaytest('NOPE', 42, 0)).toThrow('Unknown playtest persona');
  });

  it('returns an immediate empty report for zero requested seasons', () => {
    const report = runPlaytest('SPEEDRUNNER', 42, 0);
    expect(report.personaId).toBe('SPEEDRUNNER');
    expect(report.seasonsCompleted).toBe(0);
    expect(report.weeksAdvanced).toBe(0);
    expect(report.anomalies).toEqual([]);
  });

  it('is deterministic for the same persona and seed when no steps run', () => {
    const left = runPlaytest('SPEEDRUNNER', 42, 0);
    const right = runPlaytest('SPEEDRUNNER', 42, 0);
    expect(JSON.stringify(left)).toBe(JSON.stringify(right));
  });

  it('accepts a persona object as input', () => {
    const report = runPlaytest(PLAYTEST_PERSONAS[1]!, 99, 0);
    expect(report.personaId).toBe('GLUTTON');
    expect(report.seed).toBe(99);
  });

  it('does not emit a guard anomaly when zero seasons were requested', () => {
    const report = runPlaytest('SPEEDRUNNER', 7, 0);
    expect(report.anomalies.some((anomaly) => anomaly.detectorId === 'harness-guard')).toBe(false);
  });
});
