import { describe, expect, it } from 'vitest';
import {
  advanceCoachDevelopment,
  buildCoachRetentionDecision,
  resolvePoachingCycle,
} from '../index';
import { makeLeagueState } from './test-helpers';

describe('coach retention', () => {
  it('advances coach development after a successful stretch', () => {
    const game = makeLeagueState('regular_season', 10);
    const team = game.teams.afce1!;
    team.staff.hc = {
      id: 'hc-1',
      name: 'Staff Alpha',
      role: 'HC',
      archetype: 'Strategist',
      traits: [],
      ratings: { gameplan: 80, development: 76, motivation: 74, strategy: 79 },
      level: 4,
      age: 48,
      term: 3,
      buyoutPenalty: 3,
      loyalty: 7,
      ambition: 4,
      schemeLean: { offense: 'spread', defense: 'cover_3' },
      lastHiredYear: 2025,
    };
    team.wins = 10;
    team.losses = 2;

    const delta = advanceCoachDevelopment(game, 'afce1');

    expect(delta.xpGain).toBeGreaterThan(0);
    expect(delta.ratingGrowth.gameplan).toBeGreaterThanOrEqual(0);
    expect(game.teams.afce1!.staff.hc?.level).toBeGreaterThanOrEqual(4);
  });

  it('reduces poach risk for loyal successful coaches', () => {
    const game = makeLeagueState('regular_season', 10);
    game.teams.afce1!.staff.hc = {
      id: 'hc-loyal',
      name: 'Loyal HC',
      role: 'HC',
      archetype: 'Motivator',
      traits: [],
      ratings: { gameplan: 82, development: 80, motivation: 85, strategy: 78 },
      level: 5,
      age: 50,
      term: 4,
      buyoutPenalty: 2,
      loyalty: 9,
      ambition: 3,
      schemeLean: { offense: 'spread', defense: 'cover_3' },
      lastHiredYear: 2024,
    };
    game.teams.afce1!.wins = 11;
    game.teams.afce1!.losses = 1;

    const decision = buildCoachRetentionDecision(game, 'afce1', 'HC');

    expect(decision.poachRisk).toBeLessThan(40);
    expect(decision.acceptsExtension).toBe(true);
  });

  it('raises poach risk for ambitious coordinators on expiring terms', () => {
    const game = makeLeagueState('regular_season', 10);
    game.teams.afce1!.staff.oc = {
      id: 'oc-ambitious',
      name: 'Ambitious OC',
      role: 'OC',
      archetype: 'Air Attack',
      traits: [],
      ratings: { gameplan: 86, development: 77, motivation: 73, strategy: 80 },
      level: 5,
      age: 40,
      term: 1,
      buyoutPenalty: 1,
      loyalty: 3,
      ambition: 9,
      schemeLean: { offense: 'west_coast', defense: 'cover_3' },
      lastHiredYear: 2025,
    };
    game.teams.afce1!.wins = 9;

    const decision = buildCoachRetentionDecision(game, 'afce1', 'OC');

    expect(decision.poachRisk).toBeGreaterThanOrEqual(50);
  });

  it('can resolve deterministic poaching departures', () => {
    const game = makeLeagueState('offseason', 1);
    game.teams.afce1!.staff.dc = {
      id: 'dc-leaving',
      name: 'Leaving DC',
      role: 'DC',
      archetype: 'Disciplinarian',
      traits: [],
      ratings: { gameplan: 84, development: 70, motivation: 69, strategy: 82 },
      level: 5,
      age: 41,
      term: 1,
      buyoutPenalty: 1,
      loyalty: 2,
      ambition: 9,
      schemeLean: { offense: 'spread', defense: 'man_press' },
      lastHiredYear: 2025,
    };

    const departures = resolvePoachingCycle(game, () => 0.01);

    expect(departures.some((entry) => entry.staffId === 'dc-leaving')).toBe(true);
    expect(game.teams.afce1!.staff.dc).toBeNull();
  });

  it('keeps stable staffs in place when poach checks fail', () => {
    const game = makeLeagueState('offseason', 1);
    game.teams.afce1!.staff.oc = {
      id: 'oc-stable',
      name: 'Stable OC',
      role: 'OC',
      archetype: 'Strategist',
      traits: [],
      ratings: { gameplan: 78, development: 76, motivation: 74, strategy: 75 },
      level: 4,
      age: 49,
      term: 3,
      buyoutPenalty: 2,
      loyalty: 8,
      ambition: 4,
      schemeLean: { offense: 'spread', defense: 'cover_3' },
      lastHiredYear: 2024,
    };

    const departures = resolvePoachingCycle(game, () => 0.99);

    expect(departures).toEqual([]);
    expect(game.teams.afce1!.staff.oc?.id).toBe('oc-stable');
  });
});
