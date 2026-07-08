import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import { makeLeagueState, makePlayer } from './test-helpers';
import {
  applyDraftTradeOffer,
  evaluateTradeDown,
  evaluateTradeUp,
  generateDraftTradeOffers,
  updateDraftWarRoomState,
} from './draft-war-room';
import { startScenario } from './scenario-challenge';

function addDraftPick(
  game: ReturnType<typeof makeLeagueState>,
  teamId: string,
  round: number,
  pick: number,
  year = game.year,
  originalTeamId = teamId,
): void {
  game.teams[teamId]!.draftPicks.push({
    round,
    pick,
    originalTeamId,
    currentTeamId: teamId,
    year,
    isCompPick: false,
  });
}

describe('draft war room', () => {
  it('generates trade offers when the user is on the clock and ai covets a player', () => {
    const game = makeLeagueState('draft', 1);
    addDraftPick(game, 'afce1', 1, 1);
    addDraftPick(game, 'afce2', 1, 2);
    game.offseasonState = {
      round: 1,
      expiringPlayerIds: [],
      reSignDecisions: {},
      freeAgencyBids: {},
      scoutingState: {},
      scoutingWatchlist: [],
      tradeOffers: [],
      draftOrder: [
        { id: 'afce1-2030-1-1-afce1', teamId: 'afce1', round: 1, pick: 1, overall: 1, originalTeamId: 'afce1' },
        { id: 'afce2-2030-1-2-afce2', teamId: 'afce2', round: 1, pick: 2, overall: 2, originalTeamId: 'afce2' },
      ],
      currentDraftPickIndex: 0,
      completedDraftPickIds: [],
    };
    game.draftClass = [makePlayer('prospect-qb', null, 'QB', 90) as never];

    const offers = generateDraftTradeOffers(game, game.offseasonState.draftOrder[0]!, mulberry32(2));

    expect(offers.length).toBeGreaterThan(0);
  });

  it('blocks draft-war-room trade offers when scenario constraints disable trades', () => {
    const base = makeLeagueState('draft', 1);
    base.offseasonState = {
      round: 1,
      expiringPlayerIds: [],
      reSignDecisions: {},
      freeAgencyBids: {},
      scoutingState: {},
      scoutingWatchlist: [],
      tradeOffers: [],
      draftOrder: [
        { id: 'afce1-2030-1-1-afce1', teamId: 'afce1', round: 1, pick: 1, overall: 1, originalTeamId: 'afce1' },
        { id: 'afce2-2030-1-2-afce2', teamId: 'afce2', round: 1, pick: 2, overall: 2, originalTeamId: 'afce2' },
      ],
      currentDraftPickIndex: 0,
      completedDraftPickIds: [],
    };
    base.draftClass = [makePlayer('prospect-qb', null, 'QB', 90) as never];
    const game = startScenario('the_savant', base, mulberry32(22));

    const offers = generateDraftTradeOffers(game, game.offseasonState.draftOrder[0]!, mulberry32(2));

    expect(offers).toEqual([]);
  });

  it('uses the jimmy johnson chart for trade-up pricing', () => {
    const cost = evaluateTradeUp(12, 5);
    expect(cost.cost.requesting.length).toBeGreaterThan(0);
    expect(cost.worthIt).toBeTypeOf('boolean');
  });

  it('shows best available players after a trade down', () => {
    const game = makeLeagueState('draft', 1);
    game.draftClass = [
      makePlayer('prospect-1', null, 'WR', 84) as never,
      makePlayer('prospect-2', null, 'CB', 82) as never,
      makePlayer('prospect-3', null, 'OL', 80) as never,
    ];

    const down = evaluateTradeDown(game.teams.afce1!, 12, 18, game.draftClass as never);
    expect(down.bestAvailableAfter.length).toBeGreaterThan(0);
  });

  it('marks urgency as desperate when ai has a critical need', () => {
    const game = makeLeagueState('draft', 1);
    addDraftPick(game, 'afce1', 1, 1);
    addDraftPick(game, 'afce2', 1, 2);
    game.offseasonState = {
      round: 1,
      expiringPlayerIds: [],
      reSignDecisions: {},
      freeAgencyBids: {},
      scoutingState: {},
      scoutingWatchlist: [],
      tradeOffers: [],
      draftOrder: [
        { id: 'afce1-2030-1-1-afce1', teamId: 'afce1', round: 1, pick: 1, overall: 1, originalTeamId: 'afce1' },
        { id: 'afce2-2030-1-2-afce2', teamId: 'afce2', round: 1, pick: 2, overall: 2, originalTeamId: 'afce2' },
      ],
      currentDraftPickIndex: 0,
      completedDraftPickIds: [],
    };
    const ai = game.teams.afce2!;
    ai.roster.filter((player) => player.pos === 'QB').forEach((player) => { player.ovr = 58; });
    game.draftClass = [makePlayer('prospect-qb', null, 'QB', 92) as never];

    const offers = generateDraftTradeOffers(game, game.offseasonState.draftOrder[0]!, mulberry32(4));
    expect(offers.some((offer) => offer.urgency === 'desperate')).toBe(true);
  });

  it('does not synthesize draft trade offers when no live backed candidate pick exists', () => {
    const game = makeLeagueState('draft', 1);
    addDraftPick(game, 'afce1', 1, 1);
    game.offseasonState = {
      round: 1,
      expiringPlayerIds: [],
      reSignDecisions: {},
      freeAgencyBids: {},
      scoutingState: {},
      scoutingWatchlist: [],
      tradeOffers: [],
      draftOrder: [
        { id: 'afce1-2030-1-1-afce1', teamId: 'afce1', round: 1, pick: 1, overall: 1, originalTeamId: 'afce1' },
      ],
      currentDraftPickIndex: 0,
      completedDraftPickIds: [],
    };
    const ai = game.teams.afce2!;
    ai.roster.filter((player) => player.pos === 'QB').forEach((player) => { player.ovr = 58; });
    game.draftClass = [makePlayer('prospect-qb', null, 'QB', 92) as never];

    const offers = generateDraftTradeOffers(game, game.offseasonState.draftOrder[0]!, mulberry32(4));

    expect(offers).toEqual([]);
  });

  it('does not generate draft trade offers from draft-order rows missing source pick ledgers', () => {
    const game = makeLeagueState('draft', 1);
    addDraftPick(game, 'afce1', 1, 1);
    game.offseasonState = {
      round: 1,
      expiringPlayerIds: [],
      reSignDecisions: {},
      freeAgencyBids: {},
      scoutingState: {},
      scoutingWatchlist: [],
      tradeOffers: [],
      draftOrder: [
        { id: 'afce1-2030-1-1-afce1', teamId: 'afce1', round: 1, pick: 1, overall: 1, originalTeamId: 'afce1' },
        { id: 'afce2-2030-1-2-afce2', teamId: 'afce2', round: 1, pick: 2, overall: 2, originalTeamId: 'afce2' },
      ],
      currentDraftPickIndex: 0,
      completedDraftPickIds: [],
    };
    const ai = game.teams.afce2!;
    ai.roster.filter((player) => player.pos === 'QB').forEach((player) => { player.ovr = 58; });
    game.draftClass = [makePlayer('prospect-qb', null, 'QB', 92) as never];

    const offers = generateDraftTradeOffers(game, game.offseasonState.draftOrder[0]!, mulberry32(4));

    expect(offers).toEqual([]);
  });

  it('includes and transfers future sweeteners only when the source team owns the future pick', () => {
    const game = makeLeagueState('draft', 1);
    addDraftPick(game, 'afce1', 1, 1);
    addDraftPick(game, 'afce2', 1, 9);
    addDraftPick(game, 'afce2', 3, 9, game.year + 1);
    game.offseasonState = {
      round: 1,
      expiringPlayerIds: [],
      reSignDecisions: {},
      freeAgencyBids: {},
      scoutingState: {},
      scoutingWatchlist: [],
      tradeOffers: [],
      draftOrder: [
        { id: `afce1-${game.year}-1-1-afce1`, teamId: 'afce1', round: 1, pick: 1, overall: 1, originalTeamId: 'afce1' },
        { id: `afce2-${game.year}-1-9-afce2`, teamId: 'afce2', round: 1, pick: 9, overall: 9, originalTeamId: 'afce2' },
      ],
      currentDraftPickIndex: 0,
      completedDraftPickIds: [],
    };
    const ai = game.teams.afce2!;
    ai.roster.filter((player) => player.pos === 'QB').forEach((player) => { player.ovr = 58; });
    game.draftClass = [makePlayer('prospect-qb', null, 'QB', 92) as never];

    const [offer] = generateDraftTradeOffers(game, game.offseasonState.draftOrder[0]!, mulberry32(4));
    const next = applyDraftTradeOffer(game, offer!);

    expect(offer?.offer.offering.map((asset) => asset.pickId)).toEqual([
      'afce2-1-9-afce2',
      `afce2-${game.year + 1}-3-9-afce2`,
    ]);
    expect(next.teams.afce1.draftPicks).toEqual([
      { round: 1, pick: 9, originalTeamId: 'afce2', currentTeamId: 'afce1', year: game.year, isCompPick: false },
      { round: 3, pick: 9, originalTeamId: 'afce2', currentTeamId: 'afce1', year: game.year + 1, isCompPick: false },
    ]);
    expect(next.teams.afce2.draftPicks).toEqual([
      { round: 1, pick: 1, originalTeamId: 'afce1', currentTeamId: 'afce2', year: game.year, isCompPick: false },
    ]);
    expect(next.offseasonState?.draftOrder).toEqual([
      { id: `afce2-${game.year}-1-1-afce1`, teamId: 'afce2', round: 1, pick: 1, overall: 1, originalTeamId: 'afce1' },
      { id: `afce1-${game.year}-1-9-afce2`, teamId: 'afce1', round: 1, pick: 9, overall: 9, originalTeamId: 'afce2' },
    ]);
    expect(next.leagueNews.at(-1)).toMatchObject({
      id: `draft-trade-${game.year}-${game.week}-1-afce2`,
      type: 'trade',
      teamIds: ['afce2', 'afce1'],
      playerIds: [],
      importance: 'breaking',
    });
    expect(next.leagueNews.at(-1)?.headline).toContain('trades up to pick #1');
    expect(next.leagueNews.at(-1)?.body).toContain('Future round 3 pick');
    expect(next.leagueNews.at(-1)?.body).toContain('Draft order ownership updated');
  });

  it('updates the running class grade after each pick', () => {
    const next = updateDraftWarRoomState({
      currentPick: 12,
      onTheClock: 'afce1',
      timeRemaining: 90,
      incomingOffers: [],
      userCanTradeUp: [],
      draftGrade: 'B',
    }, {
      playerId: 'rookie-1',
      expectedValue: 78,
      actualValue: 84,
    });

    expect(next.draftGrade).not.toBe('B');
  });

  it('does not generate offers when the user is not on the clock', () => {
    const game = makeLeagueState('draft', 1);
    game.offseasonState = {
      round: 1,
      expiringPlayerIds: [],
      reSignDecisions: {},
      freeAgencyBids: {},
      scoutingState: {},
      scoutingWatchlist: [],
      tradeOffers: [],
      draftOrder: [
        { id: 'afce2-2030-1-1-afce2', teamId: 'afce2', round: 1, pick: 1, overall: 1, originalTeamId: 'afce2' },
      ],
      currentDraftPickIndex: 0,
      completedDraftPickIds: [],
    };

    const offers = generateDraftTradeOffers(game, game.offseasonState.draftOrder[0]!, mulberry32(1));
    expect(offers).toEqual([]);
  });

  it('does not apply draft-war-room trade offers when scenario constraints disable trades', () => {
    const base = makeLeagueState('draft', 1);
    base.teams.afce1.draftPicks = [
      { round: 1, pick: 1, originalTeamId: 'afce1', currentTeamId: 'afce1', year: base.year, isCompPick: false },
    ];
    base.teams.afce2.draftPicks = [
      { round: 1, pick: 2, originalTeamId: 'afce2', currentTeamId: 'afce2', year: base.year, isCompPick: false },
      { round: 3, pick: 2, originalTeamId: 'afce2', currentTeamId: 'afce2', year: base.year, isCompPick: false },
    ];
    const game = startScenario('the_savant', base, mulberry32(24));

    const next = applyDraftTradeOffer(game, {
      from: 'afce2',
      targetPick: 1,
      offer: {
        offering: [{
          type: 'pick',
          teamId: 'afce2',
          playerId: null,
          pickId: 'afce2-1-2-afce2',
          description: 'Round 1, Pick 2',
        }],
        requesting: [{
          type: 'pick',
          teamId: 'afce1',
          playerId: null,
          pickId: 'afce1-1-1-afce1',
          description: 'Round 1, Pick 1',
        }],
        type: 'mixed',
      },
      urgency: 'desperate',
      reasoning: 'Scenario should block this trade.',
    });

    expect(next).toBe(game);
    expect(next.teams.afce1.draftPicks).toEqual(game.teams.afce1.draftPicks);
    expect(next.teams.afce2.draftPicks).toEqual(game.teams.afce2.draftPicks);
  });

  it('applies accepted draft-war-room trade offers to team picks and live draft order', () => {
    const game = makeLeagueState('draft', 1);
    game.teams.afce1.draftPicks = [
      { round: 1, pick: 1, originalTeamId: 'afce1', currentTeamId: 'afce1', year: game.year, isCompPick: false },
    ];
    game.teams.afce2.draftPicks = [
      { round: 1, pick: 2, originalTeamId: 'afce2', currentTeamId: 'afce2', year: game.year, isCompPick: false },
    ];
    game.offseasonState = {
      round: 1,
      expiringPlayerIds: [],
      reSignDecisions: {},
      freeAgencyBids: {},
      scoutingState: {},
      scoutingWatchlist: [],
      tradeOffers: [],
      draftOrder: [
        { id: `afce1-${game.year}-1-1-afce1`, teamId: 'afce1', round: 1, pick: 1, overall: 1, originalTeamId: 'afce1' },
        { id: `afce2-${game.year}-1-2-afce2`, teamId: 'afce2', round: 1, pick: 2, overall: 2, originalTeamId: 'afce2' },
      ],
      currentDraftPickIndex: 0,
      completedDraftPickIds: [],
    };

    const next = applyDraftTradeOffer(game, {
      from: 'afce2',
      targetPick: 1,
      offer: {
        offering: [{
          type: 'pick',
          teamId: 'afce2',
          playerId: null,
          pickId: 'afce2-1-2-afce2',
          description: 'Round 1, Pick 2',
        }],
        requesting: [{
          type: 'pick',
          teamId: 'afce1',
          playerId: null,
          pickId: 'afce1-1-1-afce1',
          description: 'Round 1, Pick 1',
        }],
        type: 'mixed',
      },
      urgency: 'desperate',
      reasoning: 'Move down one slot.',
    });

    expect(next.teams.afce1.draftPicks).toEqual([
      { round: 1, pick: 2, originalTeamId: 'afce2', currentTeamId: 'afce1', year: game.year, isCompPick: false },
    ]);
    expect(next.teams.afce2.draftPicks).toEqual([
      { round: 1, pick: 1, originalTeamId: 'afce1', currentTeamId: 'afce2', year: game.year, isCompPick: false },
    ]);
    expect(next.offseasonState?.draftOrder).toEqual([
      { id: `afce2-${game.year}-1-1-afce1`, teamId: 'afce2', round: 1, pick: 1, overall: 1, originalTeamId: 'afce1' },
      { id: `afce1-${game.year}-1-2-afce2`, teamId: 'afce1', round: 1, pick: 2, overall: 2, originalTeamId: 'afce2' },
    ]);
    expect(next.leagueNews.at(-1)).toMatchObject({
      id: `draft-trade-${game.year}-${game.week}-1-afce2`,
      type: 'trade',
      teamIds: ['afce2', 'afce1'],
      playerIds: [],
      importance: 'breaking',
    });
    expect(next.leagueNews.at(-1)?.headline).toContain('trades up to pick #1');
    expect(next.leagueNews.at(-1)?.body).toContain('Round 1, Pick 2');
    expect(next.leagueNews.at(-1)?.body).toContain('Draft order ownership updated');
    expect(game.offseasonState.draftOrder[0]?.teamId).toBe('afce1');
    expect(game.teams.afce1.draftPicks[0]?.currentTeamId).toBe('afce1');
    expect(game.leagueNews).toEqual([]);
  });

  it('does not partially apply accepted draft-war-room trades when a live offered pick is missing', () => {
    const game = makeLeagueState('draft', 1);
    game.teams.afce1.draftPicks = [
      { round: 1, pick: 1, originalTeamId: 'afce1', currentTeamId: 'afce1', year: game.year, isCompPick: false },
    ];
    game.teams.afce2.draftPicks = [];
    game.offseasonState = {
      round: 1,
      expiringPlayerIds: [],
      reSignDecisions: {},
      freeAgencyBids: {},
      scoutingState: {},
      scoutingWatchlist: [],
      tradeOffers: [],
      draftOrder: [
        { id: `afce1-${game.year}-1-1-afce1`, teamId: 'afce1', round: 1, pick: 1, overall: 1, originalTeamId: 'afce1' },
        { id: `afce2-${game.year}-1-2-afce2`, teamId: 'afce2', round: 1, pick: 2, overall: 2, originalTeamId: 'afce2' },
      ],
      currentDraftPickIndex: 0,
      completedDraftPickIds: [],
    };

    const next = applyDraftTradeOffer(game, {
      from: 'afce2',
      targetPick: 1,
      offer: {
        offering: [{
          type: 'pick',
          teamId: 'afce2',
          playerId: null,
          pickId: 'afce2-1-2-afce2',
          description: 'Round 1, Pick 2',
        }],
        requesting: [{
          type: 'pick',
          teamId: 'afce1',
          playerId: null,
          pickId: 'afce1-1-1-afce1',
          description: 'Round 1, Pick 1',
        }],
        type: 'mixed',
      },
      urgency: 'desperate',
      reasoning: 'Missing offered pick should abort.',
    });

    expect(next).toBe(game);
    expect(next.teams.afce1.draftPicks).toEqual(game.teams.afce1.draftPicks);
    expect(next.teams.afce2.draftPicks).toEqual(game.teams.afce2.draftPicks);
    expect(next.offseasonState?.draftOrder).toEqual(game.offseasonState.draftOrder);
    expect(next.leagueNews).toEqual(game.leagueNews);
  });
});
