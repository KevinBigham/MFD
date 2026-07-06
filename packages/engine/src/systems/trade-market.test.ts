import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import { getSalaryCap } from '../config';
import type { DraftPick, DraftProspect, GameState, Team, TradeOffer } from '../types';
import { calcCapHit } from './contracts';
import { initializeOffseasonState } from './offseason';
import { startScenario } from './scenario-challenge';
import { acceptTradeOffer, generateTradeOffers, rejectTradeOffer } from './trade-market';
import { applyRuleChange, initLeagueRules } from './league-rules';
import { makeLeagueState, makePlayer } from './test-helpers';

function addPick(game: GameState, teamId: string, round: number, pick: number, year = game.year): DraftPick {
  const draftPick: DraftPick = {
    round,
    pick,
    originalTeamId: teamId,
    currentTeamId: teamId,
    year,
    isCompPick: false,
  };
  game.teams[teamId].draftPicks.push(draftPick);
  return draftPick;
}

function makeOffer(game: GameState): {
  userPlayerId: string;
  aiPlayerId: string;
  offer: TradeOffer;
  pick: DraftPick;
} {
  const userTeam = game.teams.afce1;
  const aiTeam = game.teams.afce2;
  const userPlayer = userTeam.roster.find((player) => player.pos === 'WR')!;
  const aiPlayer = aiTeam.roster.find((player) => player.pos === 'CB')!;
  const pick = addPick(game, aiTeam.id, 2, 10);
  game.offseasonState ??= initializeOffseasonState(game);

  const offer: TradeOffer = {
    id: 'offer-1',
    fromTeamId: aiTeam.id,
    toTeamId: userTeam.id,
    direction: 'inbound',
    summary: `${aiTeam.city} offers help in the secondary.`,
    status: 'pending',
    send: [{
      type: 'player',
      teamId: userTeam.id,
      playerId: userPlayer.id,
      pickId: null,
      description: userPlayer.name,
    }],
    receive: [
      {
        type: 'player',
        teamId: aiTeam.id,
        playerId: aiPlayer.id,
        pickId: null,
        description: aiPlayer.name,
      },
      {
        type: 'pick',
        teamId: aiTeam.id,
        playerId: null,
        pickId: `${aiTeam.id}-${pick.year}-${pick.round}-${pick.pick}-${pick.originalTeamId}`,
        description: `Round ${pick.round} pick`,
      },
    ],
  };
  game.offseasonState.tradeOffers = [offer];
  return { userPlayerId: userPlayer.id, aiPlayerId: aiPlayer.id, offer, pick };
}

function makeProspect(id: string, pos: DraftProspect['pos'], trueGrade: number): DraftProspect {
  return {
    id,
    firstName: 'Prospect',
    lastName: id,
    pos,
    college: 'Test U',
    region: 'south',
    ratings: { awareness: trueGrade, speed: trueGrade, stamina: trueGrade },
    projectedRound: 1,
    scoutGrade: trueGrade - 2,
    trueGrade,
    personality: { workEthic: 7, loyalty: 5, greed: 5, pressure: 5, ambition: 7 },
    traits: [],
    archetype: null,
    characterArchetype: 'balanced',
    bustProbability: 0.1,
    stealProbability: 0.1,
    scoutingReports: [],
    combine: null,
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 10) / 10;
}

function expectedCapUsed(team: Team): number {
  return roundMoney(team.roster.reduce((sum, player) => sum + calcCapHit(player.contract ?? null), 0) + team.deadCap);
}

function expectCapTotalsSynced(game: GameState, teamId: string): void {
  const team = game.teams[teamId];
  expect(team.capUsed).toBe(expectedCapUsed(team));
  expect(team.capSpace).toBe(roundMoney(getSalaryCap(game.year, game) - team.capUsed));
}

describe('trade-market direct coverage', () => {
  it('generates inbound offers for reasonable trade-block players', () => {
    const game = makeLeagueState('offseason', 1);
    const target = game.teams.afce1.roster.find((player) => player.pos === 'WR')!;
    target.tradeBlock = true;
    target.ovr = 82;
    target.age = 25;
    target.devTrait = 'star';

    const offers = generateTradeOffers(game);

    expect(offers.some((offer) =>
      offer.direction === 'inbound'
      && offer.send.some((asset) => asset.playerId === target.id),
    )).toBe(true);
  });

  it('can generate pick-only inbound offers when sellers mark a player available', () => {
    const game = makeLeagueState('offseason', 1);
    const target = game.teams.afce1.roster.find((player) => player.pos === 'WR')!;
    target.tradeBlock = true;
    target.ovr = 76;
    target.age = 28;
    target.devTrait = 'normal';

    for (const team of Object.values(game.teams).filter((candidate) => !candidate.isUser)) {
      team.gmStrategy = 'rebuild';
      addPick(game, team.id, 1, 20);
      addPick(game, team.id, 2, 20);
    }

    const offers = generateTradeOffers(game);

    expect(offers.some((offer) =>
      offer.direction === 'inbound'
      && offer.send.some((asset) => asset.playerId === target.id)
      && offer.receive.every((asset) => asset.type !== 'player'),
    )).toBe(true);
  });

  it('generates outbound offers for rebuild teams shopping older veterans', () => {
    const game = makeLeagueState('offseason', 1);
    const aiTeam = game.teams.afce2;
    const veteran = aiTeam.roster.find((player) => player.pos === 'QB')!;
    veteran.age = 31;
    veteran.ovr = 80;
    aiTeam.gmStrategy = 'rebuild';
    addPick(game, game.teams.afce1.id, 1, 18);
    addPick(game, game.teams.afce1.id, 2, 18);

    const offers = generateTradeOffers(game);

    expect(offers.some((offer) =>
      offer.direction === 'outbound'
      && offer.receive.some((asset) => asset.playerId === veteran.id),
    )).toBe(true);
  });

  it('blocks accepting trades after the configured regular-season deadline', () => {
    const game = makeLeagueState('regular_season', 10);
    const { userPlayerId, aiPlayerId } = makeOffer(game);

    const result = acceptTradeOffer(game, 'offer-1');

    expect(result.nextState.offseasonState?.tradeOffers[0]?.status).toBe('pending');
    expect(result.nextState.teams.afce1.roster.some((player) => player.id === userPlayerId)).toBe(true);
    expect(result.nextState.teams.afce2.roster.some((player) => player.id === aiPlayerId)).toBe(true);
  });

  it('honors a custom week 12 deadline before blocking accepted offers', () => {
    const game = makeLeagueState('regular_season', 10);
    game.leagueRules = applyRuleChange(initLeagueRules(game.year), {
      key: 'trade_deadline_week',
      newValue: 12,
      source: 'owners_vote',
      proposedBy: 'owners',
      effectiveYear: game.year,
      rationale: 'Late-season trade window.',
    });
    makeOffer(game);

    const result = acceptTradeOffer(game, 'offer-1');

    expect(result.nextState.offseasonState?.tradeOffers[0]?.status).toBe('accepted');
  });

  it('blocks accepting trades when scenario constraints disable trades', () => {
    const base = makeLeagueState('regular_season', 8);
    const game = startScenario('the_savant', base, mulberry32(11));
    const { userPlayerId, aiPlayerId } = makeOffer(game);

    const result = acceptTradeOffer(game, 'offer-1');

    expect(result.nextState.offseasonState?.tradeOffers[0]?.status).toBe('pending');
    expect(result.nextState.teams.afce1.roster.some((player) => player.id === userPlayerId)).toBe(true);
    expect(result.nextState.teams.afce2.roster.some((player) => player.id === aiPlayerId)).toBe(true);
  });

  it('transfers players and picks and records transaction logs when a trade is accepted', () => {
    const game = makeLeagueState('offseason', 1);
    const { userPlayerId, aiPlayerId, pick } = makeOffer(game);

    const result = acceptTradeOffer(game, 'offer-1');

    expect(result.nextState.teams.afce1.roster.some((player) => player.id === aiPlayerId)).toBe(true);
    expect(result.nextState.teams.afce2.roster.some((player) => player.id === userPlayerId)).toBe(true);
    expect(result.nextState.teams.afce1.draftPicks.some((entry) =>
      entry.year === pick.year && entry.round === pick.round && entry.pick === pick.pick,
    )).toBe(true);
    expect(result.nextState.teams.afce1.txLog).toHaveLength(1);
    expect(result.nextState.teams.afce2.txLog).toHaveLength(1);
    expect(result.nextState.offseasonState?.tradeOffers[0]?.status).toBe('accepted');
  });

  it('synchronizes cap totals from post-trade rosters when an offer is accepted', () => {
    const game = makeLeagueState('offseason', 1);
    const { userPlayerId, aiPlayerId } = makeOffer(game);
    const userTeam = game.teams.afce1;
    const aiTeam = game.teams.afce2;
    const userPlayer = userTeam.roster.find((player) => player.id === userPlayerId)!;
    const aiPlayer = aiTeam.roster.find((player) => player.id === aiPlayerId)!;
    userPlayer.contract!.baseSalary = 18;
    userPlayer.contract!.prorated = 2;
    aiPlayer.contract!.baseSalary = 4;
    aiPlayer.contract!.prorated = 1;
    userTeam.deadCap = 3.5;
    aiTeam.deadCap = 1.5;
    userTeam.capUsed = 999;
    userTeam.capSpace = -999;
    aiTeam.capUsed = 888;
    aiTeam.capSpace = -888;

    const result = acceptTradeOffer(game, 'offer-1');

    expect(result.nextState.teams.afce1.roster.some((player) => player.id === aiPlayerId)).toBe(true);
    expect(result.nextState.teams.afce2.roster.some((player) => player.id === userPlayerId)).toBe(true);
    expectCapTotalsSynced(result.nextState, userTeam.id);
    expectCapTotalsSynced(result.nextState, aiTeam.id);
  });

  it('records press, news, and social fallout for accepted user-team trades', () => {
    const game = makeLeagueState('offseason', 1);
    makeOffer(game);

    const result = acceptTradeOffer(game, 'offer-1');

    expect(result.nextState.leagueNews.at(-1)?.type).toBe('trade');
    expect(result.nextState.recentPressConferences.length).toBeGreaterThan(0);
    expect(result.nextState.socialFeed.some((post) => post.trigger === 'trade')).toBe(true);
  });

  it('rejects offers by status only and leaves rosters untouched', () => {
    const game = makeLeagueState('offseason', 1);
    const { userPlayerId, aiPlayerId } = makeOffer(game);

    const result = rejectTradeOffer(game, 'offer-1');

    expect(result.nextState.offseasonState?.tradeOffers[0]?.status).toBe('rejected');
    expect(result.nextState.teams.afce1.roster.some((player) => player.id === userPlayerId)).toBe(true);
    expect(result.nextState.teams.afce2.roster.some((player) => player.id === aiPlayerId)).toBe(true);
    expect(result.nextState.teams.afce1.txLog).toHaveLength(0);
    expect(result.nextState.socialFeed).toHaveLength(0);
  });

  it('returns no trade offers when the league has no user-controlled team', () => {
    const game = makeLeagueState('offseason', 1);
    for (const team of Object.values(game.teams)) {
      team.isUser = false;
    }

    expect(generateTradeOffers(game)).toEqual([]);
  });
});
