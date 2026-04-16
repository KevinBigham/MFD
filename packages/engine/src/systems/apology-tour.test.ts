import { describe, expect, it } from 'vitest';
import type { GameResult, GameState } from '../types';
import type { NamedGameArchetype } from './named-games';
import { syncApologyTourThreads } from './apology-tour';
import { makeLeagueState } from './test-helpers';

const USER_TEAM_ID = 'afce1';
const OPPONENT_TEAM_ID = 'afce2';

function makeResult(overrides: Partial<GameResult> & {
  archetype?: NamedGameArchetype;
  gameId?: string;
} = {}): GameResult {
  const homeScore = overrides.homeScore ?? 21;
  const awayScore = overrides.awayScore ?? 31;
  const gameId = overrides.gameId ?? overrides.id ?? 'game-collapse-1';
  const winnerTeamId = homeScore === awayScore
    ? null
    : homeScore > awayScore ? USER_TEAM_ID : OPPONENT_TEAM_ID;

  return {
    id: gameId,
    homeTeamId: overrides.homeTeamId ?? USER_TEAM_ID,
    awayTeamId: overrides.awayTeamId ?? OPPONENT_TEAM_ID,
    homeScore,
    awayScore,
    week: overrides.week ?? 5,
    year: overrides.year ?? 2026,
    overtime: false,
    mvpPlayerId: null,
    stats: {},
    playerMatchupEvents: [],
    namedGame: overrides.archetype === undefined ? {
      name: 'The Collapse',
      archetype: 'collapse',
      gameId,
      year: overrides.year ?? 2026,
      week: overrides.week ?? 5,
      homeTeamId: USER_TEAM_ID,
      awayTeamId: OPPONENT_TEAM_ID,
      winnerTeamId,
      homeScore,
      awayScore,
      reason: 'Lost after leading by 14+ entering the fourth quarter.',
    } : {
      name: overrides.archetype === 'heartbreaker' ? 'The Heartbreaker' : 'The Collapse',
      archetype: overrides.archetype,
      gameId,
      year: overrides.year ?? 2026,
      week: overrides.week ?? 5,
      homeTeamId: USER_TEAM_ID,
      awayTeamId: OPPONENT_TEAM_ID,
      winnerTeamId,
      homeScore,
      awayScore,
      reason: 'Named loss.',
    },
    ...overrides,
  } as GameResult;
}

function sync(game: GameState, result: GameResult, currentWeek = result.week + 1): void {
  syncApologyTourThreads(game, {
    teamId: USER_TEAM_ID,
    opponentTeamId: OPPONENT_TEAM_ID,
    result,
    currentYear: result.year,
    currentWeek,
  });
}

describe('Apology Tour threads', () => {
  it('starts an active thread for a user-team Collapse loss', () => {
    const game = makeLeagueState('regular_season', 6);

    sync(game, makeResult());

    expect(game.apologyTourThreads).toHaveLength(1);
    expect(game.apologyTourThreads[0]).toMatchObject({
      gameId: 'game-collapse-1',
      teamId: USER_TEAM_ID,
      opponentTeamId: OPPONENT_TEAM_ID,
      namedGameName: 'The Collapse',
      archetype: 'collapse',
      startedYear: 2026,
      startedWeek: 5,
      status: 'active',
      beatsDelivered: ['fan_letter'],
    });
  });

  it('does not start a thread for wins or non-apology named games', () => {
    const game = makeLeagueState('regular_season', 6);

    sync(game, makeResult({ gameId: 'user-win', homeScore: 34, awayScore: 24 }));
    sync(game, makeResult({ gameId: 'shootout-loss', archetype: 'shootout', homeScore: 35, awayScore: 42 }));

    expect(game.apologyTourThreads).toEqual([]);
  });

  it('dedupes by source game id and does not duplicate delivered beats', () => {
    const game = makeLeagueState('regular_season', 7);
    const result = makeResult();

    sync(game, result, 6);
    sync(game, result, 7);
    sync(game, result, 7);

    expect(game.apologyTourThreads).toHaveLength(1);
    expect(game.apologyTourThreads[0]?.beatsDelivered).toEqual(['fan_letter', 'beat_column']);
  });

  it('delivers fan, columnist, and owner beats on weeks +1, +2, and +3', () => {
    const game = makeLeagueState('regular_season', 8);
    const result = makeResult({ archetype: 'heartbreaker', gameId: 'heartbreaker-1' });

    sync(game, result, 6);
    sync(game, result, 7);
    sync(game, result, 8);

    expect(game.apologyTourThreads[0]?.beatsDelivered).toEqual([
      'fan_letter',
      'beat_column',
      'owner_email',
    ]);
  });

  it('resolves after the next user-team win once the owner beat has landed', () => {
    const game = makeLeagueState('regular_season', 9);
    sync(game, makeResult(), 8);

    sync(game, makeResult({
      gameId: 'recovery-win',
      homeScore: 27,
      awayScore: 17,
      namedGame: undefined,
      week: 9,
    }), 9);

    expect(game.apologyTourThreads[0]?.status).toBe('resolved');
    expect(game.apologyTourThreads[0]?.beatsDelivered).toContain('resolution');
  });

  it('escalates after the next user-team loss once the owner beat has landed', () => {
    const game = makeLeagueState('regular_season', 9);
    sync(game, makeResult(), 8);

    sync(game, makeResult({
      gameId: 'pressure-loss',
      homeScore: 17,
      awayScore: 24,
      namedGame: undefined,
      week: 9,
    }), 9);

    expect(game.apologyTourThreads[0]?.status).toBe('escalated');
    expect(game.apologyTourThreads[0]?.beatsDelivered).toContain('resolution');
  });

  it('produces deterministic thread output for identical inputs', () => {
    const left = makeLeagueState('regular_season', 8);
    const right = makeLeagueState('regular_season', 8);
    const result = makeResult({ gameId: 'same-input' });

    sync(left, result, 8);
    sync(right, result, 8);

    expect(left.apologyTourThreads).toEqual(right.apologyTourThreads);
  });
});
