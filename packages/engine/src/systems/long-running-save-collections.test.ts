import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { MEDIA_CYCLE_HISTORY_LIMIT, trimLongRunningSaveCollections } from './long-running-save-collections';

describe('long-running save collections', () => {
  it('caps media-cycle histories without touching dynasty timeline', () => {
    const game = {
      mediaCycle: {
        weeklyDigests: Array.from({ length: 48 }, (_, index) => ({
          weekNumber: index + 1,
          powerRankings: [],
          headlines: [],
          hotTakes: [],
        })),
        powerRankingHistory: Array.from({ length: 52 }, (_, index) => ({
          weekNumber: index + 1,
          rankings: [],
        })),
      },
      dynastyTimeline: [{
        id: 'landmark-1',
        year: 2026,
        week: 1,
        type: 'milestone',
        headline: 'Landmark',
        importance: 'landmark',
        playerIds: [],
        teamIds: [],
      }],
    } as Pick<GameState, 'mediaCycle' | 'dynastyTimeline'> as GameState;

    trimLongRunningSaveCollections(game);

    expect(game.mediaCycle.weeklyDigests).toHaveLength(MEDIA_CYCLE_HISTORY_LIMIT);
    expect(game.mediaCycle.powerRankingHistory).toHaveLength(MEDIA_CYCLE_HISTORY_LIMIT);
    expect(game.mediaCycle.weeklyDigests[0]?.weekNumber).toBe(15);
    expect(game.mediaCycle.powerRankingHistory[0]?.weekNumber).toBe(19);
    expect(game.dynastyTimeline).toHaveLength(1);
  });
});
