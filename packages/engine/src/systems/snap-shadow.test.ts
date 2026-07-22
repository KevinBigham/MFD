import { describe, expect, it } from 'vitest';
import { calibrateSnapShadow, simulateSnapShadow } from './snap-shadow';

describe('snap shadow engine', () => {
  it('is byte-identical for the same explicit seed and inputs', () => {
    const home = { id: 'home', overall: 80, runRate: 0.46 };
    const away = { id: 'away', overall: 77, runRate: 0.41 };
    const first = simulateSnapShadow('game-1', home, away, 90125);
    const second = simulateSnapShadow('game-1', home, away, 90125);

    expect(first).toEqual(second);
    expect(first.snapEvents.length).toBeGreaterThan(80);
    expect(first.snapEvents.every((event, index) => event.sequence === index + 1)).toBe(true);
  });

  it('makes every snap a validated before-after causal chain', () => {
    const result = simulateSnapShadow('game-chain', { id: 'h', overall: 75 }, { id: 'a', overall: 75 }, 42);

    for (let index = 1; index < result.snapEvents.length; index += 1) {
      expect(result.snapEvents[index]!.before).toEqual(result.snapEvents[index - 1]!.after);
      expect(result.snapEvents[index]!.causeIds).toEqual([result.snapEvents[index - 1]!.id]);
    }
  });

  it('reports calibration gates without mutating canonical samples', () => {
    const samples = Array.from({ length: 32 }, (_, index) => ({
      seed: 1000 + index,
      gameId: `cal-${index}`,
      home: { id: `h-${index}`, overall: 78 + (index % 4) },
      away: { id: `a-${index}`, overall: 76 + (index % 3) },
      canonicalHomeScore: 24,
      canonicalAwayScore: 21,
      canonicalPassRate: 0.56,
      canonicalYardsPerTeam: 335,
    }));
    const frozen = structuredClone(samples);
    const report = calibrateSnapShadow(samples);

    expect(samples).toEqual(frozen);
    expect(report.games).toBe(32);
    expect(report.shadowPointsPerTeam).toBeGreaterThan(10);
    expect(report.shadowPassRate).toBeGreaterThan(0.4);
    expect(typeof report.withinTolerance).toBe('boolean');
  });

  it('turns planned tricks and fourth-down aggression into real snap events', () => {
    const home = { id: 'home', overall: 80, trickPlayIds: ['flea-flicker'], goForItOnFourth: true };
    const away = { id: 'away', overall: 78 };
    const withPlan = Array.from({ length: 200 }, (_, index) => simulateSnapShadow(`planned-${index}`, home, away, index + 1))
      .find((result) => result.snapEvents.some((event) => event.playType === 'trick'));

    expect(withPlan).toBeDefined();
    const trick = withPlan!.snapEvents.find((event) => event.playType === 'trick')!;
    expect(trick.decisionRefs).toEqual(['trick:flea-flicker']);
    expect(trick.description).toContain('flea-flicker');

    const aggressiveFourthDown = Array.from({ length: 200 }, (_, index) => {
      const seed = index + 1;
      const aggressive = simulateSnapShadow(`fourth-${seed}`, { id: 'h', overall: 78, goForItOnFourth: true }, { id: 'a', overall: 78 }, seed);
      return aggressive.snapEvents.find((event) => event.before.down === 4 && event.before.distance <= 4 && event.playType === 'run');
    }).find(Boolean);
    expect(aggressiveFourthDown).toBeDefined();
  });

  it('fires authored score contingencies once and changes the subsequent live play mix', () => {
    const rule = {
      id: 'halftime-run',
      trigger: 'end_of_q2_losing' as const,
      response: 'run_heavy' as const,
      label: 'IF LOSING AT HALF -> RUN HEAVY',
      description: 'Change the live call sheet after halftime.',
    };
    const changed = Array.from({ length: 100 }, (_, index) => index + 1).some((seed) => {
      const baseline = simulateSnapShadow('contingency-mix', { id: 'home', overall: 68 }, { id: 'away', overall: 88 }, seed);
      const contingent = simulateSnapShadow(
        'contingency-mix',
        { id: 'home', overall: 68, contingencyRules: [rule] },
        { id: 'away', overall: 88 },
        seed,
      );
      const refs = contingent.snapEvents.flatMap((event) => event.decisionRefs ?? [])
        .filter((ref) => ref === 'contingency:home:halftime-run');
      return refs.length === 1
        && (contingent.runPlays !== baseline.runPlays || contingent.passPlays !== baseline.passPlays);
    });

    expect(changed).toBe(true);
  });

  it('activates authored fourth-down aggression only after its trigger is recorded', () => {
    const result = simulateSnapShadow(
      'contingency-fourth',
      {
        id: 'home',
        overall: 78,
        windSpeed: 22,
        contingencyRules: [{
          id: 'wind-fourth',
          trigger: 'wind_over_15',
          response: 'go_for_it_on_4th',
          label: 'IF WINDY -> GO FOR IT',
          description: 'Keep the kick unit off the field.',
        }],
      },
      { id: 'away', overall: 78 },
      44,
    );
    const referencedSnaps = result.snapEvents.filter((event) =>
      event.decisionRefs?.includes('contingency:home:wind-fourth'));

    expect(referencedSnaps.length).toBeGreaterThanOrEqual(1);
    expect(referencedSnaps[0]!.before.quarter).toBeGreaterThanOrEqual(2);
  });

  it('turns Coach Mode fourth-down and two-minute calls into canonical decision refs', () => {
    const result = Array.from({ length: 200 }, (_, index) => simulateSnapShadow(
      `coach-mode-${index + 1}`,
      { id: 'home', overall: 78, coachMode: true, twoMinuteMode: true },
      { id: 'away', overall: 78 },
      index + 1,
    )).find((candidate) => {
      const refs = candidate.snapEvents.flatMap((event) => event.decisionRefs ?? []);
      return refs.some((ref) => ref.startsWith('coach-mode:home:fourth-down:'))
        && refs.includes('coach-mode:home:two-minute');
    });

    expect(result).toBeDefined();
    const coachRefs = result!.snapEvents.flatMap((event) => event.decisionRefs ?? [])
      .filter((ref) => ref.startsWith('coach-mode:home:'));
    expect(coachRefs).toContain('coach-mode:home:two-minute');
    expect(coachRefs.some((ref) => ref.startsWith('coach-mode:home:fourth-down:'))).toBe(true);

    const baseline = simulateSnapShadow(
      result!.snapEvents[0]!.gameId,
      { id: 'home', overall: 78 },
      { id: 'away', overall: 78 },
      Number(result!.snapEvents[0]!.gameId.split('-').at(-1)),
    );
    expect(baseline.snapEvents.flatMap((event) => event.decisionRefs ?? [])
      .some((ref) => ref.startsWith('coach-mode:'))).toBe(false);
  });
});
