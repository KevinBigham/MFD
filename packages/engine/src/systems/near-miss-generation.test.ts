import { describe, expect, it } from 'vitest';
import { advanceFranchiseWeek } from './franchise-week';
import { createNearMissTracker, type NearMissEntry } from './near-miss-receipts';
import { makeLeagueState } from './test-helpers';
import type { GameState, PlayoffBracket } from '../types';

type AdvanceWeekWithNearMisses = ReturnType<typeof advanceFranchiseWeek> & {
  nearMissReceipts?: NearMissEntry[];
};

function makeSeasonFinale(year = 2029): GameState {
  const game = makeLeagueState('playoffs', 22);
  game.year = year;
  game.playoffBracket = {
    season: year,
    afc: [],
    nfc: [],
    championTeamId: null,
    matchups: [{
      id: `super-bowl-${year}`,
      round: 'super_bowl',
      conference: 'NFL',
      week: 22,
      homeTeamId: 'afce1',
      awayTeamId: 'nfce1',
      winnerTeamId: null,
      result: null,
    }],
  } satisfies PlayoffBracket;
  return game;
}

describe('near-miss receipt generation', () => {
  it('generates receipts at season rollover when the tracker has notable entries', () => {
    const game = makeSeasonFinale();
    game.nearMissTracker = createNearMissTracker();
    game.nearMissTracker.declinedTrades.push({
      playerName: 'Elite QB',
      playerOvr: 91,
      partnerTeamName: 'NFCE1 Club',
      week: 8,
    });

    const result = advanceFranchiseWeek(game) as AdvanceWeekWithNearMisses;

    expect(result.nearMissReceipts).toEqual([
      expect.objectContaining({ type: 'declined_trade', playerName: 'Elite QB' }),
    ]);
    expect(result.nextState.seasonNearMissReceipts).toEqual(result.nearMissReceipts);
  });

  it('returns no receipts when the tracker is empty', () => {
    const game = makeSeasonFinale();
    game.nearMissTracker = createNearMissTracker();

    const result = advanceFranchiseWeek(game) as AdvanceWeekWithNearMisses;

    expect(result.nearMissReceipts).toBeUndefined();
  });

  it('clears the tracker after season-end generation', () => {
    const game = makeSeasonFinale();
    game.nearMissTracker = createNearMissTracker();
    game.nearMissTracker.declinedTrades.push({
      playerName: 'Elite QB',
      playerOvr: 91,
      partnerTeamName: 'NFCE1 Club',
      week: 8,
    });

    const result = advanceFranchiseWeek(game);

    expect(result.nextState.nearMissTracker).toBeUndefined();
  });

  it('includes a declined-trade receipt when a notable declined trade exists', () => {
    const game = makeSeasonFinale();
    game.nearMissTracker = createNearMissTracker();
    game.nearMissTracker.declinedTrades.push({
      playerName: 'Lockdown Corner',
      playerOvr: 84,
      partnerTeamName: 'AFCE2 Club',
      week: 5,
    });

    const result = advanceFranchiseWeek(game) as AdvanceWeekWithNearMisses;

    expect(result.nearMissReceipts).toContainEqual(
      expect.objectContaining({ type: 'declined_trade', playerName: 'Lockdown Corner' }),
    );
  });

  it('includes a passed-pick receipt when a notable passed pick exists', () => {
    const game = makeSeasonFinale();
    game.nearMissTracker = createNearMissTracker();
    game.nearMissTracker.passedPicks.push({
      playerName: 'Future Star',
      playerOvr: 79,
      round: 1,
      pickNumber: 14,
      draftedByTeam: 'NFCE1 Club',
    });

    const result = advanceFranchiseWeek(game) as AdvanceWeekWithNearMisses;

    expect(result.nearMissReceipts).toContainEqual(
      expect.objectContaining({ type: 'passed_pick', playerName: 'Future Star' }),
    );
  });
});
