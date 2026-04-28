import { buildPlaytestReport, MAX_PLAYTEST_STEPS, runPlaytest } from './harness';
import { PLAYTEST_PERSONAS } from './personas';
import type { PlaytestAnomaly } from './types';

function makeAnomaly(overrides: Partial<PlaytestAnomaly>): PlaytestAnomaly {
  return {
    detectorId: 'cap-sanity',
    severity: 'medium',
    detail: 'base',
    reproSeed: 42,
    step: 1,
    year: 2026,
    week: 1,
    phase: 'regular_season',
    ...overrides,
  };
}

function reportWith(anomalies: PlaytestAnomaly[]) {
  return buildPlaytestReport({
    persona: PLAYTEST_PERSONAS[0]!,
    seed: 42,
    seasonsRequested: 1,
    seasonsCompleted: 1,
    weeksAdvanced: 20,
    anomalies,
  });
}

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

  it('exports the launch guard step ceiling', () => {
    expect(MAX_PLAYTEST_STEPS).toBe(800);
  });

  it('sorts anomalies by step before other tie-breakers', () => {
    const report = reportWith([
      makeAnomaly({ detectorId: 'later-step', step: 3 }),
      makeAnomaly({ detectorId: 'earlier-step', step: 2 }),
    ]);

    expect(report.anomalies.map((entry) => entry.detectorId)).toEqual(['earlier-step', 'later-step']);
  });

  it('sorts same-step anomalies by year', () => {
    const report = reportWith([
      makeAnomaly({ detectorId: 'later-year', year: 2027 }),
      makeAnomaly({ detectorId: 'earlier-year', year: 2026 }),
    ]);

    expect(report.anomalies.map((entry) => entry.detectorId)).toEqual(['earlier-year', 'later-year']);
  });

  it('sorts same-frame anomalies by phase order', () => {
    const report = reportWith([
      makeAnomaly({ detectorId: 'playoffs', phase: 'playoffs' }),
      makeAnomaly({ detectorId: 'regular', phase: 'regular_season' }),
    ]);

    expect(report.anomalies.map((entry) => entry.detectorId)).toEqual(['regular', 'playoffs']);
  });

  it('sorts same-phase anomalies by week', () => {
    const report = reportWith([
      makeAnomaly({ detectorId: 'week-two', week: 2 }),
      makeAnomaly({ detectorId: 'week-one', week: 1 }),
    ]);

    expect(report.anomalies.map((entry) => entry.detectorId)).toEqual(['week-one', 'week-two']);
  });

  it('sorts exact-frame anomalies by detector id', () => {
    const report = reportWith([
      makeAnomaly({ detectorId: 'rng-channel' }),
      makeAnomaly({ detectorId: 'cap-sanity' }),
    ]);

    expect(report.anomalies.map((entry) => entry.detectorId)).toEqual(['cap-sanity', 'rng-channel']);
  });

  it('sorts exact-detector anomalies by detail', () => {
    const report = reportWith([
      makeAnomaly({ detail: 'z detail' }),
      makeAnomaly({ detail: 'a detail' }),
    ]);

    expect(report.anomalies.map((entry) => entry.detail)).toEqual(['a detail', 'z detail']);
  });

  it('counts every anomaly in buildPlaytestReport', () => {
    const report = reportWith([
      makeAnomaly({ detectorId: 'one' }),
      makeAnomaly({ detectorId: 'two' }),
      makeAnomaly({ detectorId: 'three' }),
    ]);

    expect(report.anomalyCount).toBe(3);
  });

  it('excludes perf-budget anomalies from canonical report counts', () => {
    const report = reportWith([
      makeAnomaly({ detectorId: 'roster-minimums', severity: 'medium' }),
      makeAnomaly({ detectorId: 'perf-budget', severity: 'medium' }),
      makeAnomaly({ detectorId: 'rng-channel', severity: 'high' }),
    ]);

    expect(report.anomalies.map((entry) => entry.detectorId)).toEqual(['rng-channel', 'roster-minimums']);
    expect(report.anomalyCount).toBe(2);
    expect(report.highSeverityCount).toBe(1);
  });

  it('counts only high-severity anomalies as high severity', () => {
    const report = reportWith([
      makeAnomaly({ severity: 'low' }),
      makeAnomaly({ severity: 'medium' }),
      makeAnomaly({ severity: 'high' }),
    ]);

    expect(report.highSeverityCount).toBe(1);
  });

  it('preserves report identity fields while sorting anomalies', () => {
    const report = reportWith([makeAnomaly({ detectorId: 'rng-channel' })]);

    expect(report.personaId).toBe('SPEEDRUNNER');
    expect(report.personaLabel).toBe('Speedrunner');
    expect(report.seed).toBe(42);
    expect(report.seasonsRequested).toBe(1);
    expect(report.weeksAdvanced).toBe(20);
  });

  it('returns a sorted anomaly copy without mutating caller order', () => {
    const anomalies = [
      makeAnomaly({ detectorId: 'rng-channel' }),
      makeAnomaly({ detectorId: 'cap-sanity' }),
    ];

    const report = reportWith(anomalies);

    expect(anomalies.map((entry) => entry.detectorId)).toEqual(['rng-channel', 'cap-sanity']);
    expect(report.anomalies.map((entry) => entry.detectorId)).toEqual(['cap-sanity', 'rng-channel']);
  });

  it('retains repro metadata on sorted anomalies', () => {
    const report = reportWith([
      makeAnomaly({ detectorId: 'rng-channel', reproSeed: 99, step: 4, year: 2028, week: 7 }),
    ]);

    expect(report.anomalies[0]).toMatchObject({
      detectorId: 'rng-channel',
      reproSeed: 99,
      step: 4,
      year: 2028,
      week: 7,
    });
  });

  it('reports zero anomaly counts for an explicit empty anomaly list', () => {
    const report = reportWith([]);

    expect(report.anomalyCount).toBe(0);
    expect(report.highSeverityCount).toBe(0);
  });

  it('returns requested seasons for a zero-step persona object run', () => {
    const report = runPlaytest({
      id: 'SPEEDRUNNER',
      label: 'Zero Step',
      description: 'Harness identity check.',
      aiBias: { advanceOnly: true },
    }, 12, 0);

    expect(report.seasonsRequested).toBe(0);
    expect(report.personaLabel).toBe('Zero Step');
  });

  it('does not mutate a persona object passed to runPlaytest when no steps run', () => {
    const persona = {
      id: 'SPEEDRUNNER' as const,
      label: 'Mutable Probe',
      description: 'Harness identity check.',
      aiBias: { advanceOnly: true },
    };

    runPlaytest(persona, 12, 0);

    expect(persona).toEqual({
      id: 'SPEEDRUNNER',
      label: 'Mutable Probe',
      description: 'Harness identity check.',
      aiBias: { advanceOnly: true },
    });
  });
});
