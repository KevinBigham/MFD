import { describe, expect, it } from 'vitest';
import { makeLeagueState } from './test-helpers';
import { generateTradeOffers } from './trade-market';
import { calcPickValue, calcPlayerValue, evaluateTradeOffer } from './trade-value';
import type { TradeOfferAsset } from '../types';

function pickAsset(teamId: string, year: number, round: number, pick: number, originalTeamId = teamId): TradeOfferAsset {
  return {
    type: 'pick',
    teamId,
    playerId: null,
    pickId: `${teamId}-${year}-${round}-${pick}-${originalTeamId}`,
    description: `Round ${round} pick`,
  };
}

function playerAsset(teamId: string, playerId: string, description = playerId): TradeOfferAsset {
  return {
    type: 'player',
    teamId,
    playerId,
    pickId: null,
    description,
  };
}

describe('trade value system', () => {
  it('values an elite young x-factor quarterback above any single pick', () => {
    const game = makeLeagueState('offseason');
    const qb = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
    qb.age = 24;
    qb.ovr = 90;
    qb.devTrait = 'x-factor';
    qb.contract!.baseSalary = 8;

    const playerValue = calcPlayerValue(game, qb, game.teams.afce2);
    const topPickValue = calcPickValue({ round: 1, pick: 1 });

    expect(playerValue).toBeGreaterThan(topPickValue);
  });

  it('crushes the value of an aging veteran on a bad contract', () => {
    const game = makeLeagueState('offseason');
    const wr = game.teams.afce1.roster.find((player) => player.pos === 'WR')!;
    wr.age = 32;
    wr.ovr = 76;
    wr.devTrait = 'normal';
    wr.contract!.baseSalary = 42;

    const value = calcPlayerValue(game, wr, game.teams.afce2);
    expect(value).toBeLessThanOrEqual(0);
  });

  it('lets rebuild teams accept pick-heavy deals that neutral teams reject', () => {
    const game = makeLeagueState('offseason');
    const seller = game.teams.afce2;
    const qb = seller.roster.find((player) => player.pos === 'QB')!;
    qb.age = 30;
    qb.ovr = 81;
    qb.devTrait = 'normal';
    seller.gmStrategy = 'rebuild';

    const incoming = [
      pickAsset('afce1', game.year, 1, 28),
      pickAsset('afce1', game.year, 3, 5),
    ];
    const outgoing = [playerAsset('afce2', qb.id, qb.name)];

    const rebuildResult = evaluateTradeOffer(game, seller, incoming, outgoing);
    seller.gmStrategy = 'neutral';
    const neutralResult = evaluateTradeOffer(game, seller, incoming, outgoing);

    expect(rebuildResult.accepted).toBe(true);
    expect(neutralResult.accepted).toBe(false);
  });

  it('generates at least one offer for a reasonably valued trade-block player', () => {
    const game = makeLeagueState('offseason');
    const userTeam = game.teams.afce1;
    userTeam.isUser = true;
    const wr = userTeam.roster.find((player) => player.pos === 'WR')!;
    wr.tradeBlock = true;
    wr.ovr = 82;
    wr.age = 26;
    wr.devTrait = 'star';

    const offers = generateTradeOffers(game);

    expect(offers.some((offer) =>
      offer.send.some((asset) => asset.playerId === wr.id) ||
      offer.receive.some((asset) => asset.playerId === wr.id)
    )).toBe(true);
  });
});
