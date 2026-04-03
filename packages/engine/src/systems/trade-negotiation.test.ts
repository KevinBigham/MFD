import { describe, expect, it } from 'vitest';
import type { TradeOfferAsset } from '../types';
import {
  createTradeProposal,
  generateCounterOffer,
  getTradeableAssets,
  submitProposal,
} from './trade-negotiation';
import { makeLeagueState } from './test-helpers';

function playerAsset(teamId: string, playerId: string, description = playerId): TradeOfferAsset {
  return {
    type: 'player',
    teamId,
    playerId,
    pickId: null,
    description,
  };
}

function pickAsset(teamId: string, year: number, round: number, pick: number): TradeOfferAsset {
  return {
    type: 'pick',
    teamId,
    playerId: null,
    pickId: `${teamId}-${year}-${round}-${pick}-${teamId}`,
    description: `Round ${round} pick`,
  };
}

describe('trade negotiation', () => {
  it('accepts a fair proposal', () => {
    const game = makeLeagueState('offseason');
    const fairPlayer = game.teams.afce2.roster.find((player) => player.pos === 'WR')!;
    const proposal = createTradeProposal(
      game,
      'afce1',
      'afce2',
      [pickAsset('afce1', game.year, 1, 3)],
      [playerAsset('afce2', fairPlayer.id, fairPlayer.name)],
    );

    const result = submitProposal(game, proposal.id, () => 0.3);

    expect(result.proposal.status).toBe('accepted');
  });

  it('rejects a lopsided proposal', () => {
    const game = makeLeagueState('offseason');
    const elitePlayer = game.teams.afce2.roster.find((player) => player.pos === 'QB')!;
    elitePlayer.ovr = 92;
    const proposal = createTradeProposal(
      game,
      'afce1',
      'afce2',
      [pickAsset('afce1', game.year, 7, 32)],
      [playerAsset('afce2', elitePlayer.id, elitePlayer.name)],
    );

    const result = submitProposal(game, proposal.id, () => 0.2);

    expect(result.proposal.status).toBe('rejected');
  });

  it('creates a counter-offer that improves the value differential', () => {
    const game = makeLeagueState('offseason');
    game.teams.afce2.gmStrategy = 'rebuild';
    game.teams.afce1.draftPicks = [
      { round: 2, pick: 20, originalTeamId: 'afce1', currentTeamId: 'afce1', year: game.year, isCompPick: false },
      { round: 3, pick: 12, originalTeamId: 'afce1', currentTeamId: 'afce1', year: game.year, isCompPick: false },
    ];
    const target = game.teams.afce2.roster.find((player) => player.pos === 'WR')!;
    target.ovr = 86;
    const proposal = createTradeProposal(
      game,
      'afce1',
      'afce2',
      [pickAsset('afce1', game.year, 3, 12)],
      [playerAsset('afce2', target.id, target.name)],
    );

    const counter = generateCounterOffer(game, proposal, () => 0.1)!;

    expect(counter.valueDiff).toBeGreaterThan(proposal.valueDiff);
    expect(counter.status).toBe('countered');
  });

  it('rebuild teams counter for picks and contenders counter for players', () => {
    const game = makeLeagueState('offseason');
    const target = game.teams.afce2.roster.find((player) => player.pos === 'WR')!;
    const base = createTradeProposal(
      game,
      'afce1',
      'afce2',
      [pickAsset('afce1', game.year, 2, 20)],
      [playerAsset('afce2', target.id, target.name)],
    );

    game.teams.afce2.gmStrategy = 'rebuild';
    const rebuildCounter = generateCounterOffer(game, base, () => 0.2)!;
    game.teams.afce2.gmStrategy = 'contend';
    const contendCounter = generateCounterOffer(game, base, () => 0.2)!;

    expect(rebuildCounter.offering.some((asset) => asset.type !== 'player')).toBe(true);
    expect(contendCounter.offering.some((asset) => asset.type === 'player')).toBe(true);
  });

  it('blocks submissions after the week 12 trade deadline', () => {
    const game = makeLeagueState('regular_season', 13);
    const assets = getTradeableAssets(game, 'afce1');
    const target = game.teams.afce2.roster.find((player) => player.pos === 'WR')!;
    const proposal = createTradeProposal(
      game,
      'afce1',
      'afce2',
      assets.filter((asset) => asset.type === 'pick').slice(0, 1),
      [playerAsset('afce2', target.id, target.name)],
    );

    expect(() => submitProposal(game, proposal.id, () => 0.3)).toThrow(/deadline/i);
  });
});
