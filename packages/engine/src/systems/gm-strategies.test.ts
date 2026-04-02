import { describe, expect, it } from 'vitest';
import { makeLeagueState } from './test-helpers';
import { evaluateStrategy, reevaluateLeagueStrategies } from './gm-strategies';

describe('gm strategy reevaluation', () => {
  it('pivots a rebuild team to contend when the roster is young and strong', () => {
    const game = makeLeagueState('offseason');
    const team = game.teams.afce2;
    team.gmStrategy = 'rebuild';
    team.wins = 10;
    team.losses = 7;
    team.roster.forEach((player, index) => {
      player.ovr = index < 4 ? 82 : 79;
      player.age = index < 4 ? 24 : 25;
    });

    expect(evaluateStrategy(team)).toBe('contend');
  });

  it('pivots a contender to rebuild after an old, losing season', () => {
    const game = makeLeagueState('offseason');
    const team = game.teams.afce2;
    team.gmStrategy = 'contend';
    team.wins = 5;
    team.losses = 12;
    team.roster.forEach((player) => {
      player.age = 30;
      player.ovr = 74;
    });

    expect(evaluateStrategy(team)).toBe('rebuild');
  });

  it('updates team strategy and emits a narrative event when a pivot happens', () => {
    const game = makeLeagueState('offseason');
    const team = game.teams.afce2;
    team.gmStrategy = 'rebuild';
    team.wins = 11;
    team.losses = 6;
    team.roster.forEach((player, index) => {
      player.ovr = index < 4 ? 83 : 79;
      player.age = index < 4 ? 24 : 25;
    });

    const events = reevaluateLeagueStrategies(game);

    expect(team.gmStrategy).toBe('contend');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'gm_strategy_shift',
      data: { teamId: team.id, from: 'rebuild', to: 'contend' },
    });
    expect(game.narrativeState.recentHeadlines[0]).toContain(team.city);
  });
});
