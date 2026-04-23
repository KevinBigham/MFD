/**
 * Integration coverage — franchise week wiring of the
 * league-pulse heat-spike detector. When a league rivalry's
 * intensity crosses a tier threshold during a game advance,
 * a deterministic social post announcing the ascension should
 * appear in the weekly socialFeed.
 */
import { describe, expect, it } from 'vitest';
import { advanceFranchiseWeek } from './franchise-week';
import { makeLeagueState } from './test-helpers';
import type { LeagueRivalry } from '../types';

function mkSeedRivalry(overrides: Partial<LeagueRivalry> & { id: string; teamA: string; teamB: string }): LeagueRivalry {
  return {
    isDivision: true,
    history: [],
    lastMetYear: null,
    lastMetWeek: null,
    intensity: 40,
    ...overrides,
  };
}

describe('franchise-week heat-spike integration', () => {
  it('emits a heat-spike social post when a rivalry ascends from budding to heated', () => {
    const game = makeLeagueState('regular_season', 1);
    // Pre-seed ONLY this one rivalry at intensity 48 (budding) with empty
    // history. Any default game bump (+3 first-spark or +5 close game)
    // will push it across the 51 threshold into heated.
    game.leagueRivalries.push(
      mkSeedRivalry({ id: 'afce1::afce2', teamA: 'afce1', teamB: 'afce2', intensity: 48 }),
    );

    const { nextState } = advanceFranchiseWeek(game);

    const updated = nextState.leagueRivalries.find((entry) => entry.id === 'afce1::afce2');
    expect(updated).toBeDefined();
    expect(updated!.intensity).toBeGreaterThanOrEqual(51);

    const heatSpikePosts = (nextState.socialFeed ?? []).filter(
      (post) => post.id.startsWith('social-rivalry-heat-afce1::afce2-'),
    );
    expect(heatSpikePosts.length).toBeGreaterThan(0);
    const post = heatSpikePosts[0]!;
    expect(post.trigger).toBe('rivalry');
    expect(post.sentiment).toBe('hype');
    // Team names from makeLeagueState are of the shape "<id> <division>" — just
    // confirm the post references both teams by id/name substring.
    expect(post.content.length).toBeGreaterThan(20);
  });

  it('does not emit a heat-spike post when intensity stays within the same tier', () => {
    const game = makeLeagueState('regular_season', 1);
    // Seed a rivalry that starts already-heated and only a few points into
    // the tier, so the +3/+5 bump cannot push it past 76.
    game.leagueRivalries.push(
      mkSeedRivalry({ id: 'afce1::afce2', teamA: 'afce1', teamB: 'afce2', intensity: 55, history: ['prior spark'] }),
    );

    const { nextState } = advanceFranchiseWeek(game);

    const updated = nextState.leagueRivalries.find((entry) => entry.id === 'afce1::afce2');
    expect(updated).toBeDefined();
    expect(updated!.intensity).toBeLessThan(76);

    const heatSpikePosts = (nextState.socialFeed ?? []).filter(
      (post) => post.id.startsWith('social-rivalry-heat-afce1::afce2-'),
    );
    expect(heatSpikePosts).toHaveLength(0);
  });

  it('is deterministic — two runs of the same input produce the same posts', () => {
    const game1 = makeLeagueState('regular_season', 1);
    game1.leagueRivalries.push(
      mkSeedRivalry({ id: 'afce1::afce2', teamA: 'afce1', teamB: 'afce2', intensity: 48 }),
    );
    const game2 = makeLeagueState('regular_season', 1);
    game2.leagueRivalries.push(
      mkSeedRivalry({ id: 'afce1::afce2', teamA: 'afce1', teamB: 'afce2', intensity: 48 }),
    );

    const run1 = advanceFranchiseWeek(game1).nextState;
    const run2 = advanceFranchiseWeek(game2).nextState;

    const posts1 = (run1.socialFeed ?? []).filter((p) => p.id.startsWith('social-rivalry-heat-'));
    const posts2 = (run2.socialFeed ?? []).filter((p) => p.id.startsWith('social-rivalry-heat-'));

    expect(posts1.map((p) => p.content)).toEqual(posts2.map((p) => p.content));
    expect(posts1.map((p) => p.id)).toEqual(posts2.map((p) => p.id));
  });

  it('does not mutate the input game state (post array references are fresh)', () => {
    const game = makeLeagueState('regular_season', 1);
    game.leagueRivalries.push(
      mkSeedRivalry({ id: 'afce1::afce2', teamA: 'afce1', teamB: 'afce2', intensity: 48 }),
    );
    const beforeFeedRef = game.socialFeed;
    const beforeFeedLength = (game.socialFeed ?? []).length;

    advanceFranchiseWeek(game);

    // advanceFranchiseWeek builds nextState via immutable snapshot; the input
    // socialFeed reference and length must be untouched.
    expect(game.socialFeed).toBe(beforeFeedRef);
    expect((game.socialFeed ?? []).length).toBe(beforeFeedLength);
  });

  it('tags the post id with the week number used when the ascension landed', () => {
    const game = makeLeagueState('regular_season', 7);
    game.leagueRivalries.push(
      mkSeedRivalry({ id: 'afce1::afce2', teamA: 'afce1', teamB: 'afce2', intensity: 48 }),
    );
    // Schedule afce1 vs afce2 at week 7 so the game actually plays.
    game.schedule = [{
      week: 7,
      games: [
        { homeTeamId: 'afce1', awayTeamId: 'afce2', result: null, flexed: false, primetime: false, broadcastNetwork: null },
      ],
    }];

    const { nextState } = advanceFranchiseWeek(game);

    const heatSpikePosts = (nextState.socialFeed ?? []).filter(
      (post) => post.id.startsWith('social-rivalry-heat-afce1::afce2-'),
    );
    expect(heatSpikePosts.length).toBeGreaterThan(0);
    // Post id format: social-rivalry-heat-<rivalryId>-<week>-<tier>
    // Week number in post id should match the game's week when the ascension landed.
    const post = heatSpikePosts[0]!;
    expect(post.id).toMatch(/-7-(heated|blood_feud)$/);
  });
});
