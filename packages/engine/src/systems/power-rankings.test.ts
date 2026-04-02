import { describe, expect, it } from 'vitest';
import { createPowerRankings, updatePowerRankings } from './power-rankings';
import { makeLeagueState } from './test-helpers';

describe('power rankings system', () => {
  it('ranks undefeated teams ahead of winless teams and tracks delta from prior rankings', () => {
    const game = makeLeagueState('regular_season', 6);
    game.teams.afce1.wins = 5;
    game.teams.afce1.losses = 0;
    game.teams.afce1.seasonStats.pointDifferential = 72;
    game.teams.afce1.streak = 5;

    game.teams.nfcw2.wins = 0;
    game.teams.nfcw2.losses = 5;
    game.teams.nfcw2.seasonStats.pointDifferential = -71;
    game.teams.nfcw2.streak = -5;

    const first = createPowerRankings(game, []);
    const second = updatePowerRankings(game, first);

    expect(first[0]?.teamId).toBe('afce1');
    expect(first.at(-1)?.teamId).toBe('nfcw2');
    expect(second[0]?.previousRank).toBe(1);
    expect(second[0]?.delta).toBe(0);
    expect(first[0]?.blurb.length).toBeGreaterThan(0);
  });
});
