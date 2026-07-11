import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { simulateWeeks } from './sim-ahead';

function minimalGame(partial: Partial<GameState> = {}): GameState {
  return {
    year: 2026,
    week: 1,
    phase: 'regular_season',
    teams: {
      user: {
        id: 'user',
        isUser: true,
        wins: 0,
        losses: 0,
        ties: 0,
        roster: [],
      },
    },
    players: {},
    schedule: [{
      week: 1,
      games: [{
        homeTeamId: 'user',
        awayTeamId: 'cpu',
        result: null,
      }],
    }],
    weekSummaries: [],
    cbaState: { status: 'active' },
    ...partial,
  } as GameState;
}

describe('simulateWeeks', () => {
  it('stops before an already-scheduled user game for My Next Game', () => {
    const game = minimalGame();
    const frames: unknown[] = [];

    const result = simulateWeeks(game, 'next_user_game', (frame) => frames.push(frame));

    expect(result.nextState).toBe(game);
    expect(result.weeksSimmed).toBe(0);
    expect(result.stopReason).toBe('user_game');
    expect(frames).toHaveLength(1);
  });

  it('treats zero-week targets as already reached', () => {
    const game = minimalGame({ schedule: [] });

    const result = simulateWeeks(game, { weeks: 0 });

    expect(result.weeksSimmed).toBe(0);
    expect(result.stopReason).toBe('target_reached');
  });
});
