import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import { makeLeagueState, makePlayer } from './test-helpers';
import {
  evaluateTradeDown,
  evaluateTradeUp,
  generateDraftTradeOffers,
  updateDraftWarRoomState,
} from './draft-war-room';

describe('draft war room', () => {
  it('generates trade offers when the user is on the clock and ai covets a player', () => {
    const game = makeLeagueState('draft', 1);
    game.offseasonState = {
      round: 1,
      expiringPlayerIds: [],
      reSignDecisions: {},
      freeAgencyBids: {},
      scoutingState: {},
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
    game.offseasonState = {
      round: 1,
      expiringPlayerIds: [],
      reSignDecisions: {},
      freeAgencyBids: {},
      scoutingState: {},
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
    expect(offers.some((offer) => offer.urgency === 'desperate')).toBe(true);
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
});
