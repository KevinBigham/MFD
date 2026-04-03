import { describe, expect, it } from 'vitest';
import { makeLeagueState } from './test-helpers';
import { findTradeTargets } from './trade-finder';

describe('trade finder', () => {
  it('generates suggestions for a team with clear needs', () => {
    const game = makeLeagueState('regular_season', 8);
    const userTeam = game.teams.afce1;
    userTeam.roster = userTeam.roster.filter((player) => player.pos !== 'TE');
    const partner = game.teams.afce2;
    partner.roster.find((player) => player.pos === 'TE')!.tradeBlock = true;

    const suggestions = findTradeTargets(game, userTeam.id);

    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('filters out cap-incompatible trade suggestions', () => {
    const game = makeLeagueState('regular_season', 8);
    const userTeam = game.teams.afce1;
    userTeam.capSpace = 1;
    const partner = game.teams.afce2;
    const target = partner.roster.find((player) => player.pos === 'QB')!;
    target.tradeBlock = true;
    if (target.contract) {
      target.contract.baseSalary = 30;
      target.contract.totalValue = 120;
    }

    const suggestions = findTradeTargets(game, userTeam.id);

    expect(suggestions.some((entry) => entry.offer.requesting.some((asset) => asset.playerId === target.id))).toBe(false);
  });

  it('returns reasoning for each suggestion', () => {
    const game = makeLeagueState('regular_season', 8);
    game.teams.afce2.roster.find((player) => player.pos === 'WR')!.tradeBlock = true;

    const suggestions = findTradeTargets(game, 'afce1');

    expect(suggestions.every((entry) => entry.reasoning.length > 0)).toBe(true);
  });

  it('keeps expected acceptance at or above 80 percent', () => {
    const game = makeLeagueState('regular_season', 8);
    game.teams.afce2.roster.find((player) => player.pos === 'WR')!.tradeBlock = true;

    const suggestions = findTradeTargets(game, 'afce1');

    expect(suggestions.every((entry) => entry.acceptanceLikelihood >= 0.8)).toBe(true);
  });

  it('returns between three and five suggestions when enough options exist', () => {
    const game = makeLeagueState('regular_season', 8);
    for (const teamId of ['afce2', 'afcn1', 'afcn2', 'nfce1', 'nfcn1']) {
      const target = game.teams[teamId].roster.find((player) => player.pos === 'WR' || player.pos === 'TE');
      if (target) target.tradeBlock = true;
    }

    const suggestions = findTradeTargets(game, 'afce1');

    expect(suggestions.length).toBeGreaterThanOrEqual(3);
    expect(suggestions.length).toBeLessThanOrEqual(5);
  });
});
