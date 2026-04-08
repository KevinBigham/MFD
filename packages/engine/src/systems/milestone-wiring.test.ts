import { describe, expect, it } from 'vitest';
import { advanceFranchiseWeek } from './franchise-week';
import { makeLeagueState } from './test-helpers';

function userPlayer(game: ReturnType<typeof makeLeagueState>, playerId: string) {
  return game.teams.afce1.roster.find((player) => player.id === playerId)!;
}

describe('milestone wiring', () => {
  it('returns user-team milestones after a milestone game week', () => {
    const game = makeLeagueState('regular_season', 1);
    const qb = userPlayer(game, 'afce1-qb');

    qb.careerStats.passYds = 9_999;

    const result = advanceFranchiseWeek(game);

    expect(result.milestones?.some((milestone) =>
      milestone.playerId === qb.id && milestone.stat === 'passYds' && milestone.milestoneLabel === '10,000')).toBe(true);
  });

  it('returns no milestones for a normal week without thresholds crossing', () => {
    const game = makeLeagueState('regular_season', 1);

    const result = advanceFranchiseWeek(game);

    expect(result.milestones).toEqual([]);
  });

  it('creates milestone news when milestones are reached', () => {
    const game = makeLeagueState('regular_season', 1);
    const qb = userPlayer(game, 'afce1-qb');

    qb.careerStats.passYds = 9_999;

    const result = advanceFranchiseWeek(game);

    expect(result.nextState.leagueNews.some((item) =>
      item.type === 'milestone' && item.playerIds.includes(qb.id))).toBe(true);
  });

  it('returns multiple milestones in the same user week', () => {
    const game = makeLeagueState('regular_season', 1);
    const qb = userPlayer(game, 'afce1-qb');
    const wr = userPlayer(game, 'afce1-wr1');

    qb.careerStats.passYds = 10_000;
    wr.careerStats.rec = 500;

    const result = advanceFranchiseWeek(game);

    expect(result.milestones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ playerId: qb.id, stat: 'passYds' }),
        expect.objectContaining({ playerId: wr.id, stat: 'rec' }),
      ]),
    );
  });

  it('filters milestone output to the user team only', () => {
    const game = makeLeagueState('regular_season', 1);
    const qb = userPlayer(game, 'afce1-qb');
    const opponent = Object.values(game.teams).find((team) => !team.isUser)!;
    const opponentQb = opponent.roster.find((player) => player.pos === 'QB')!;

    qb.careerStats.passYds = 9_999;
    opponentQb.careerStats.passYds = 9_999;

    const result = advanceFranchiseWeek(game);

    expect(result.milestones?.some((milestone) => milestone.playerId === qb.id)).toBe(true);
    expect(result.milestones?.some((milestone) => milestone.playerId === opponentQb.id)).toBe(false);
  });

  it('uses career totals rather than season totals for milestone detection', () => {
    const game = makeLeagueState('regular_season', 1);
    const qb = userPlayer(game, 'afce1-qb');

    qb.stats.passYds = 4_000;
    qb.careerStats.passYds = 250;

    const result = advanceFranchiseWeek(game);

    expect(result.milestones?.some((milestone) => milestone.playerId === qb.id && milestone.stat === 'passYds')).toBe(false);
  });
});
