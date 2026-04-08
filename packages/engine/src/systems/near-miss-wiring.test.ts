import { describe, expect, it } from 'vitest';
import { advanceDraft, makeDraftPick } from './draft';
import { createNearMissTracker, generateNearMissReceipts } from './near-miss-receipts';
import {
  createTradeProposal,
  rejectCounterProposal,
  submitProposal,
} from './trade-negotiation';
import { makeLeagueState } from './test-helpers';
import type { DraftProspect, OffseasonState, TradeProposal } from '../types';

function makeOffseasonState(teamIds: string[], year: number): OffseasonState {
  return {
    round: 1,
    expiringPlayerIds: [],
    reSignDecisions: {},
    freeAgencyBids: {},
    scoutingState: {},
    scoutingWatchlist: [],
    tradeOffers: [],
    draftOrder: teamIds.map((teamId, index) => ({
      id: `${teamId}-${year}-1-${index + 1}-${teamId}`,
      teamId,
      round: 1,
      pick: index + 1,
      overall: index + 1,
      originalTeamId: teamId,
    })),
    currentDraftPickIndex: 0,
    completedDraftPickIds: [],
  };
}

function makeProspect(id: string, pos: DraftProspect['pos'], trueGrade: number): DraftProspect {
  return {
    id,
    firstName: 'Test',
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

describe('near-miss wiring', () => {
  it('records the highest-ovr requested player when a user trade is declined', () => {
    const game = makeLeagueState('regular_season', 5);
    const requested = [...game.teams.afce2.roster]
      .sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id))
      .slice(0, 2);
    const proposal = createTradeProposal(
      game,
      'afce1',
      'afce2',
      [],
      requested.map((player) => ({
        type: 'player',
        teamId: 'afce2',
        playerId: player.id,
        pickId: null,
        description: player.name,
      })),
    );

    const result = submitProposal(game, proposal.id);

    expect(result.proposal.status).toBe('rejected');
    expect(result.nextState.nearMissTracker?.declinedTrades).toHaveLength(1);
    expect(result.nextState.nearMissTracker?.declinedTrades[0]?.playerName).toBe(requested[0]?.name);
  });

  it('records a declined counter proposal for the user team', () => {
    const game = makeLeagueState('regular_season', 6);
    const requested = game.teams.afce2.roster
      .filter((player) => player.pos === 'QB' || player.pos === 'WR')
      .sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id))[0]!;
    const proposal = createTradeProposal(
      game,
      'afce1',
      'afce2',
      [],
      [{
        type: 'player',
        teamId: 'afce2',
        playerId: requested.id,
        pickId: null,
        description: requested.name,
      }],
    );
    proposal.counterOffer = {
      ...proposal,
      status: 'countered',
      aiResponse: 'Need more.',
      counterOffer: null,
    } as TradeProposal;

    const rejected = rejectCounterProposal(game, proposal.id);

    expect(rejected.status).toBe('rejected');
    expect(game.nearMissTracker?.declinedTrades).toHaveLength(1);
    expect(game.nearMissTracker?.declinedTrades[0]?.playerName).toBe(requested.name);
  });

  it('initializes the tracker lazily on first recorded near miss', () => {
    const game = makeLeagueState('regular_season', 5);
    expect(game.nearMissTracker).toBeUndefined();

    const requested = game.teams.afce2.roster[0]!;
    const proposal = createTradeProposal(
      game,
      'afce1',
      'afce2',
      [],
      [{
        type: 'player',
        teamId: 'afce2',
        playerId: requested.id,
        pickId: null,
        description: requested.name,
      }],
    );
    submitProposal(game, proposal.id);

    expect(game.nearMissTracker).toBeDefined();
  });

  it('queues a bypassed player and records the passed pick once an ai team drafts him', () => {
    const game = makeLeagueState('draft');
    game.offseasonState = makeOffseasonState(['afce1', 'afce2'], game.year);
    game.teams.afce1.draftPicks = [{
      round: 1,
      pick: 1,
      originalTeamId: 'afce1',
      currentTeamId: 'afce1',
      year: game.year,
      isCompPick: false,
    }];
    game.teams.afce2.draftPicks = [{
      round: 1,
      pick: 2,
      originalTeamId: 'afce2',
      currentTeamId: 'afce2',
      year: game.year,
      isCompPick: false,
    }];
    game.draftClass = [
      makeProspect('best-qb', 'QB', 90),
      makeProspect('user-wr', 'WR', 80),
    ];

    const drafted = makeDraftPick(game, 'user-wr');

    expect(drafted.nextState.pendingPassedPickTargets).toEqual([
      expect.objectContaining({
        prospectId: 'best-qb',
        playerName: 'Test best-qb',
        playerOvr: 90,
        round: 1,
        pickNumber: 1,
      }),
    ]);

    advanceDraft(drafted.nextState);

    expect(drafted.nextState.nearMissTracker?.passedPicks).toEqual([
      expect.objectContaining({
        playerName: 'Test best-qb',
        draftedByTeam: 'AFCE2 Club',
      }),
    ]);
    expect(drafted.nextState.pendingPassedPickTargets).toEqual([]);
  });

  it('does not queue a passed-pick target when the user drafts the best remaining prospect', () => {
    const game = makeLeagueState('draft');
    game.offseasonState = makeOffseasonState(['afce1', 'afce2'], game.year);
    game.teams.afce1.draftPicks = [{
      round: 1,
      pick: 1,
      originalTeamId: 'afce1',
      currentTeamId: 'afce1',
      year: game.year,
      isCompPick: false,
    }];
    game.draftClass = [
      makeProspect('best-qb', 'QB', 90),
      makeProspect('next-wr', 'WR', 80),
    ];

    const drafted = makeDraftPick(game, 'best-qb');

    expect(drafted.nextState.pendingPassedPickTargets ?? []).toEqual([]);
    expect(drafted.nextState.nearMissTracker).toBeUndefined();
  });

  it('accumulates multiple near misses and produces receipts', () => {
    const tracker = createNearMissTracker();
    tracker.declinedTrades.push({
      playerName: 'Elite QB',
      playerOvr: 88,
      partnerTeamName: 'AFCE2 Club',
      week: 4,
    });
    tracker.passedPicks.push({
      playerName: 'Rookie Star',
      playerOvr: 79,
      round: 1,
      pickNumber: 12,
      draftedByTeam: 'AFCE2 Club',
    });

    const receipts = generateNearMissReceipts(() => 0.42, tracker);

    expect(receipts).toHaveLength(2);
    expect(receipts.map((receipt) => receipt.type)).toEqual(['declined_trade', 'passed_pick']);
  });
});
