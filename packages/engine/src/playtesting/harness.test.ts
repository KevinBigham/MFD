import {
  buildPlaytestReport,
  HOST_NOISE_DETECTOR_IDS,
  makePlaytestLeagueState,
  MAX_PLAYTEST_STEPS,
  PLAYTEST_ROUNDTRIP_SKIPPED,
  resolvePlaytestCBAActions,
  resolvePlaytestExpansionDraft,
  runPlaytest,
} from './harness';
import { getSalaryCap } from '../config';
import { checkCBAStatus } from '../systems/cba-engine';
import { calcCapHit } from '../systems/contracts';
import { initializeExpansionDraft } from '../systems/expansion-draft';
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

function roundMoney(value: number): number {
  return Math.round(value * 10) / 10;
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

  it('starts synthetic playtest teams with truthful cap totals', () => {
    const game = makePlaytestLeagueState(42);
    const salaryCap = getSalaryCap(game.year, game);

    for (const team of Object.values(game.teams)) {
      const expectedCapUsed = roundMoney(
        team.roster.reduce((sum, player) => sum + calcCapHit(player.contract), 0) + team.deadCap,
      );
      expect(team.capUsed).toBe(expectedCapUsed);
      expect(team.capSpace).toBe(roundMoney(salaryCap - expectedCapUsed));
      expect(team.capSpace).toBeGreaterThanOrEqual(0);
    }
  });

  it('exports the launch guard step ceiling', () => {
    expect(MAX_PLAYTEST_STEPS).toBe(800);
  });

  it('exports the round-trip skipped marker used for sampled long-horizon profiles', () => {
    expect(PLAYTEST_ROUNDTRIP_SKIPPED).toBe('__PLAYTEST_ROUNDTRIP_SKIPPED__');
  });

  it('honors a custom max step ceiling without changing the default fast-tier cap', () => {
    const report = runPlaytest('SPEEDRUNNER', 42, 1, { maxSteps: 1 });

    expect(MAX_PLAYTEST_STEPS).toBe(800);
    expect(report.seasonsCompleted).toBe(0);
    expect(report.anomalies.some((anomaly) =>
      anomaly.detectorId === 'harness-guard'
      && anomaly.detail.includes('1-step guard'),
    )).toBe(true);
  });

  it('requires a positive integer save round-trip cadence', () => {
    expect(() => runPlaytest('SPEEDRUNNER', 42, 0, { saveRoundTripEvery: 0 }))
      .toThrow('saveRoundTripEvery must be a positive integer');
  });

  it('emits progress when a requested season completes', () => {
    const events: Array<{ seasonsCompleted: number; seasonsRequested: number; weeksAdvanced: number }> = [];
    const report = runPlaytest('SPEEDRUNNER', 42, 1, {
      onProgress: (event) => {
        events.push({
          seasonsCompleted: event.seasonsCompleted,
          seasonsRequested: event.seasonsRequested,
          weeksAdvanced: event.weeksAdvanced,
        });
      },
    });

    expect(report.seasonsCompleted).toBe(1);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      seasonsCompleted: 1,
      seasonsRequested: 1,
      weeksAdvanced: report.weeksAdvanced,
    });
  });

  it('auto-ratifies owner-vote CBA blockers for playtest progression', () => {
    const game = makePlaytestLeagueState(42);
    game.year = 2036;
    game.phase = 'offseason';
    const currentDeal = game.cbaState.currentDeal!;
    game.cbaState.status = 'awaiting_owner_vote';
    game.cbaState.negotiationState = {
      round: 3,
      ownersProposal: null,
      playersProposal: null,
      currentProposal: {
        id: 'playtest-cba-compromise',
        side: 'owners',
        year: game.year,
        round: 3,
        rationale: 'Playtest compromise.',
        terms: {
          ...currentDeal.terms,
          practiceSquadSize: currentDeal.terms.practiceSquadSize + 1,
        },
      },
      gap: 0,
      mediator: true,
      publicPressure: 70,
      ownerVotes: {},
      userVote: null,
    };

    const resolved = resolvePlaytestCBAActions(game);

    expect(resolved.cbaState.status).toBe('active');
    expect(resolved.cbaState.currentDeal?.startYear).toBe(2036);
    expect(resolved.cbaState.currentDeal?.terms.practiceSquadSize).toBe(currentDeal.terms.practiceSquadSize + 1);
    expect(checkCBAStatus(resolved.cbaState, resolved.year)).toBe('active');
  });

  it('auto-resolves expiring CBA windows without leaving the playtest frame blocked', () => {
    const game = makePlaytestLeagueState(42);
    game.year = game.cbaState.currentDeal!.endYear;
    game.phase = 'offseason';

    const resolved = resolvePlaytestCBAActions(game);

    expect(checkCBAStatus(resolved.cbaState, resolved.year)).toBe('active');
    expect(resolved.cbaState.currentDeal?.startYear).toBe(game.year);
    expect(resolved.laborState.activeStoppage).toBeNull();
  });

  it('auto-finalizes expansion draft blockers for playtest progression', () => {
    const game = makePlaytestLeagueState(42);
    game.year = 2041;
    game.phase = 'offseason';
    game.expansionDraftState = initializeExpansionDraft(game, () => 0.1);
    const teamCount = Object.keys(game.teams).length;

    const resolved = resolvePlaytestExpansionDraft(game);

    expect(resolved).toBe(game);
    expect(resolved.expansionDraftState).toBeUndefined();
    expect(Object.keys(resolved.teams)).toHaveLength(teamCount + 1);
  });

  it('exports the host-noise detector ids that are stripped from canonical reports', () => {
    expect(HOST_NOISE_DETECTOR_IDS).toEqual(['perf-budget']);
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
    expect(report.anomalies.some((anomaly) =>
      HOST_NOISE_DETECTOR_IDS.some((detectorId) => detectorId === anomaly.detectorId),
    )).toBe(false);
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
