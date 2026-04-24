import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import { PLAYTEST_PERSONAS } from '../playtesting/personas';
import { runPlaytest } from '../playtesting/harness';
import type { AIBiasConfig } from './ai-bias';
import { runCoachingCarousel } from './coaching-carousel';
import { initializeDeadline } from './trade-deadline';
import { makeLeagueState } from './test-helpers';
import type { DraftPick, GameState, StaffMember } from '../types';

function makePick(teamId: string, round: number, pick: number): DraftPick {
  return {
    round,
    pick,
    originalTeamId: teamId,
    currentTeamId: teamId,
    year: 2026,
    isCompPick: false,
  };
}

function prepareDeadlineGame(): GameState {
  const game = makeLeagueState('regular_season', 9);
  const records: Record<string, [number, number, GameState['teams'][string]['gmStrategy']]> = {
    afce1: [7, 2, 'contend'],
    afce2: [2, 7, 'rebuild'],
    afcn1: [7, 2, 'contend'],
    afcn2: [2, 7, 'rebuild'],
    afcs1: [6, 3, 'contend'],
    afcs2: [3, 6, 'rebuild'],
    afcw1: [6, 3, 'contend'],
    afcw2: [3, 6, 'rebuild'],
    nfce1: [6, 3, 'contend'],
    nfce2: [3, 6, 'rebuild'],
    nfcn1: [6, 3, 'contend'],
    nfcn2: [3, 6, 'rebuild'],
  };

  for (const [teamId, [wins, losses, gmStrategy]] of Object.entries(records)) {
    const team = game.teams[teamId]!;
    team.wins = wins;
    team.losses = losses;
    team.gmStrategy = gmStrategy;
    team.draftPicks = [makePick(teamId, 1, 12), makePick(teamId, 2, 14), makePick(teamId, 3, 18)];
    team.roster.forEach((player, index) => {
      player.age = 25 + (index % 7);
      player.ovr = 76 + (index % 9);
      game.players[player.id] = player;
    });
  }

  return game;
}

function makeCoach(id: string): StaffMember {
  return {
    id,
    name: `${id} Coach`,
    role: 'HC',
    archetype: 'balanced',
    traits: [],
    ratings: { gameplan: 72, development: 70, motivation: 68, strategy: 71 },
    level: 3,
    age: 50,
  };
}

function makeStableCarouselGame(): GameState {
  const game = makeLeagueState('offseason', 1);
  game.year = 2027;
  game.teams.afce1!.isUser = true;
  game.teams.afce1!.staff.hc = makeCoach('user-hc');
  game.teams.afce2!.staff.hc = makeCoach('ai-hc');
  game.teams.afce2!.wins = 10;
  game.teams.afce2!.losses = 7;
  game.teams.afce2!.ownerPatience80 = 75;
  return game;
}

describe('AIBiasConfig consumers', () => {
  it('allows every bias field to be omitted for default-path callers', () => {
    const bias: AIBiasConfig = {};

    expect(Object.keys(bias)).toEqual([]);
  });

  it('models the full playtest bias shape without requiring runtime defaults', () => {
    const bias: Required<AIBiasConfig> = {
      faAggression: 1,
      extensionAggression: 1,
      tradeWillingness: 1,
      udfaReliance: 0,
      fireCoachEverySeason: true,
      snapManagement: 'ride_stars',
      fatigueIgnore: true,
      advanceOnly: false,
    };

    expect(bias.snapManagement).toBe('ride_stars');
    expect(bias.fireCoachEverySeason).toBe(true);
  });

  it.each([
    ['SPEEDRUNNER', 'advanceOnly'],
    ['GLUTTON', 'faAggression'],
    ['CHEAPSKATE', 'udfaReliance'],
    ['CHURN_ARTIST', 'fireCoachEverySeason'],
    ['INJURY_MAGNET', 'fatigueIgnore'],
  ] as const)('exposes %s with a real %s bias field', (personaId, field) => {
    const persona = PLAYTEST_PERSONAS.find((entry) => entry.id === personaId);

    expect(persona?.aiBias[field]).toBeDefined();
  });

  it('keeps built-in persona bias configs immutable before harness use', () => {
    for (const persona of PLAYTEST_PERSONAS) {
      expect(Object.isFrozen(persona.aiBias)).toBe(true);
    }
  });

  it('accepts a custom persona object carrying an AI bias config', () => {
    const report = runPlaytest({
      id: 'SPEEDRUNNER',
      label: 'Custom Speedrunner',
      description: 'Zero-step custom persona.',
      aiBias: { advanceOnly: true },
    }, 42, 0);

    expect(report.personaLabel).toBe('Custom Speedrunner');
    expect(report.seasonsCompleted).toBe(0);
  });

  it('does not mutate a custom persona bias object during a zero-step harness run', () => {
    const aiBias: AIBiasConfig = { tradeWillingness: 0.8, advanceOnly: true };

    runPlaytest({
      id: 'SPEEDRUNNER',
      label: 'Immutable Check',
      description: 'Zero-step custom persona.',
      aiBias,
    }, 99, 0);

    expect(aiBias).toEqual({ tradeWillingness: 0.8, advanceOnly: true });
  });

  it('keeps deadline generation deterministic with the same trade-willingness bias', () => {
    const left = initializeDeadline(prepareDeadlineGame(), mulberry32(15), { tradeWillingness: 1 });
    const right = initializeDeadline(prepareDeadlineGame(), mulberry32(15), { tradeWillingness: 1 });

    expect(left.scheduledDeals).toEqual(right.scheduledDeals);
  });

  it('raises deadline activity when trade willingness is aggressive', () => {
    const cautious = initializeDeadline(prepareDeadlineGame(), mulberry32(20), { tradeWillingness: 0 });
    const aggressive = initializeDeadline(prepareDeadlineGame(), mulberry32(20), { tradeWillingness: 1 });

    expect(aggressive.scheduledDeals.length).toBeGreaterThanOrEqual(cautious.scheduledDeals.length);
    expect(aggressive.scheduledDeals.length).toBeGreaterThan(0);
  });

  it('clamps high trade willingness through the same deadline path as max aggression', () => {
    const maxed = initializeDeadline(prepareDeadlineGame(), mulberry32(21), { tradeWillingness: 1 });
    const overMax = initializeDeadline(prepareDeadlineGame(), mulberry32(21), { tradeWillingness: 2 });

    expect(overMax.scheduledDeals.length).toBe(maxed.scheduledDeals.length);
  });

  it('clamps negative trade willingness through the cautious deadline path', () => {
    const minimum = initializeDeadline(prepareDeadlineGame(), mulberry32(22), { tradeWillingness: 0 });
    const belowMinimum = initializeDeadline(prepareDeadlineGame(), mulberry32(22), { tradeWillingness: -1 });

    expect(belowMinimum.scheduledDeals.length).toBe(minimum.scheduledDeals.length);
  });

  it('uses default deadline behavior when trade willingness is omitted', () => {
    const defaultPath = initializeDeadline(prepareDeadlineGame(), mulberry32(23), {});

    expect(defaultPath.scheduledDeals.length).toBeGreaterThanOrEqual(3);
    expect(defaultPath.scheduledDeals.length).toBeLessThanOrEqual(8);
  });

  it('forces AI coaching churn when fireCoachEverySeason is enabled', () => {
    const game = makeStableCarouselGame();

    const result = runCoachingCarousel(game, 2026, { fireCoachEverySeason: true });

    expect(result.events.some((event) => event.type === 'coach_fired')).toBe(true);
    expect(result.events.some((event) => event.type === 'coach_hired')).toBe(true);
    expect(game.teams.afce2!.staff.hc?.id).not.toBe('ai-hc');
  });

  it('does not fire a stable AI coach when churn bias is omitted', () => {
    const game = makeStableCarouselGame();

    const result = runCoachingCarousel(game, 2026, {});

    expect(result.events).toEqual([]);
    expect(game.teams.afce2!.staff.hc?.id).toBe('ai-hc');
  });

  it('never fires the user coach even when churn bias is enabled', () => {
    const game = makeStableCarouselGame();

    runCoachingCarousel(game, 2026, { fireCoachEverySeason: true });

    expect(game.teams.afce1!.staff.hc?.id).toBe('user-hc');
  });

  it('records coaching events from churn bias into the event log', () => {
    const game = makeStableCarouselGame();

    runCoachingCarousel(game, 2026, { fireCoachEverySeason: true });

    expect(game.eventLog.some((event) => event.type === 'coach_fired')).toBe(true);
    expect(game.eventLog.some((event) => event.type === 'coach_hired')).toBe(true);
  });

  it('records coaching history for the fired AI coach under churn bias', () => {
    const game = makeStableCarouselGame();

    runCoachingCarousel(game, 2026, { fireCoachEverySeason: true });

    expect(game.coachingHistory.some((entry) => entry.coachId === 'ai-hc')).toBe(true);
  });

  it('keeps user and AI churn outcomes deterministic for the same setup', () => {
    const left = makeStableCarouselGame();
    const right = makeStableCarouselGame();

    const leftResult = runCoachingCarousel(left, 2026, { fireCoachEverySeason: true });
    const rightResult = runCoachingCarousel(right, 2026, { fireCoachEverySeason: true });

    expect(leftResult.events.map((event) => event.type)).toEqual(rightResult.events.map((event) => event.type));
  });
});
