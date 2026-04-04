import { describe, expect, it } from 'vitest';
import {
  advanceDeadlineClock,
  finalizeDeadline,
  generateDeadlineDeal,
  gradeDeadlineDeal,
  initializeDeadline,
  mulberry32,
} from '../index';
import type { DeadlineDeal, DraftPick, GameState } from '../types';
import { makeLeagueState } from './test-helpers';

function makePick(teamId: string, round: number, pick: number): DraftPick {
  return {
    round,
    pick,
    originalTeamId: teamId,
    currentTeamId: teamId,
    year: 2026,
    isCompPick: false,
  };
}

function makeDeadlineGame(): GameState {
  const game = makeLeagueState('regular_season', 9);

  game.schedule.unshift({
    week: 9,
    games: [
      { homeTeamId: 'afce1', awayTeamId: 'afce2', result: null, flexed: false, primetime: true, broadcastNetwork: 'MFN' },
    ],
  });

  const records: Record<string, [number, number, GameState['teams'][string]['gmStrategy']]> = {
    afce1: [7, 1, 'contend'],
    afce2: [2, 6, 'rebuild'],
    afcn1: [6, 2, 'contend'],
    afcn2: [2, 6, 'rebuild'],
    afcs1: [5, 3, 'contend'],
    afcs2: [1, 7, 'rebuild'],
    afcw1: [6, 2, 'contend'],
    afcw2: [3, 5, 'neutral'],
  };

  for (const [teamId, [wins, losses, gmStrategy]] of Object.entries(records)) {
    game.teams[teamId]!.wins = wins;
    game.teams[teamId]!.losses = losses;
    game.teams[teamId]!.gmStrategy = gmStrategy;
    game.teams[teamId]!.draftPicks = [
      makePick(teamId, 1, 12),
      makePick(teamId, 2, 14),
      makePick(teamId, 3, 18),
    ];
  }

  game.teams.afce1.roster[2]!.tradeBlock = true;

  game.teams.afce2.roster[0]!.ovr = 84;
  game.teams.afce2.roster[0]!.age = 31;
  game.teams.afce2.roster[1]!.ovr = 82;
  game.teams.afce2.roster[1]!.age = 29;
  game.teams.afcn2.roster[0]!.ovr = 83;
  game.teams.afcn2.roster[0]!.age = 30;
  game.teams.afcs2.roster[2]!.ovr = 85;
  game.teams.afcs2.roster[2]!.age = 28;

  for (const team of Object.values(game.teams)) {
    for (const player of team.roster) {
      game.players[player.id] = player;
    }
  }

  return game;
}

describe('trade deadline', () => {
  it('initializes deadline state with contenders, sellers, and pending offers', () => {
    const game = makeDeadlineGame();

    const state = initializeDeadline(game, mulberry32(7));

    expect(state.isDeadlineWeek).toBe(true);
    expect(state.minutesRemaining).toBe(240);
    expect((state.scheduledDeals ?? []).length).toBeGreaterThan(0);
    expect(state.pendingOffers.length).toBeGreaterThan(0);
    for (const deal of state.scheduledDeals ?? []) {
      const buyer = game.teams[deal.teams[0]]!;
      const seller = game.teams[deal.teams[1]]!;
      expect(buyer.wins).toBeGreaterThan(buyer.losses);
      expect(seller.gmStrategy === 'rebuild' || seller.losses > seller.wins).toBe(true);
    }
  });

  it('creates realistic contender-for-veteran deadline deals', () => {
    const game = makeDeadlineGame();
    const contenderIds = ['afce1', 'afcn1', 'afcs1', 'afcw1'];
    const sellerIds = ['afce2', 'afcn2', 'afcs2'];

    const deal = generateDeadlineDeal(game.teams, contenderIds, sellerIds, Object.values(game.players), mulberry32(9));

    expect(contenderIds).toContain(deal.teams[0]);
    expect(sellerIds).toContain(deal.teams[1]);
    expect(deal.players.length).toBeGreaterThan(0);
    expect(deal.picks.length).toBeGreaterThan(0);
    expect((game.players[deal.players[0]!]!.age >= 28) || (game.players[deal.players[0]!]!.ovr >= 82)).toBe(true);
  });

  it('ramps urgency through all countdown tiers', () => {
    const game = makeDeadlineGame();
    let state = initializeDeadline(game, mulberry32(12));

    expect(state.urgencyLevel).toBe('calm');
    state = advanceDeadlineClock(state, 130, mulberry32(12));
    expect(state.urgencyLevel).toBe('heating_up');
    state = advanceDeadlineClock(state, 60, mulberry32(12));
    expect(state.urgencyLevel).toBe('frantic');
    state = advanceDeadlineClock(state, 45, mulberry32(12));
    expect(state.urgencyLevel).toBe('buzzer_beater');
  });

  it('expires pending offers and clears the deadline state on finalize', () => {
    const game = makeDeadlineGame();
    const initialized = initializeDeadline(game, mulberry32(15));
    const nextState = finalizeDeadline(game, {
      ...initialized,
      completedDeals: (initialized.scheduledDeals ?? []).slice(0, 1),
    });

    expect(nextState.tradeDeadlineState).toBeUndefined();
  });

  it('grades splash deals higher for contenders landing stars', () => {
    const game = makeDeadlineGame();
    const deal: DeadlineDeal = {
      id: 'deadline-1',
      teams: ['afce1', 'afce2'],
      players: [game.teams.afce2.roster[0]!.id],
      picks: ['Round 2 pick'],
      pickIds: ['afce1-2026-2-14-afce1'],
      timestamp: 60,
      grade: 'A',
      splash: true,
      narrative: 'Big move',
    };

    const grades = gradeDeadlineDeal(deal, game.teams, Object.values(game.players));

    expect(['A+', 'A']).toContain(grades.buyerGrade);
    expect(['A', 'A-', 'B+', 'B']).toContain(grades.sellerGrade);
  });

  it('initializes deadline deterministically for the same seed', () => {
    const left = initializeDeadline(makeDeadlineGame(), mulberry32(21));
    const right = initializeDeadline(makeDeadlineGame(), mulberry32(21));

    expect(left).toEqual(right);
  });
});
