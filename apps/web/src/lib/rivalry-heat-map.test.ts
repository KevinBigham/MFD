import { describe, expect, it, vi } from 'vitest';
import type { GameState } from '@mfd/engine';

const { getTeamContentMock } = vi.hoisted(() => ({
  getTeamContentMock: vi.fn(),
}));

vi.mock('@mfd/engine', () => ({
  getTeamContent: getTeamContentMock,
}));

import { computeRivalryHeatMap } from './rivalry-heat-map';

function makeGame(overrides: Partial<GameState> = {}): GameState {
  return {
    teams: {
      CHI: { id: 'CHI', abbr: 'CHI', city: 'Chicago' },
      GB: { id: 'GB', abbr: 'GB', city: 'Green Bay' },
      DET: { id: 'DET', abbr: 'DET', city: 'Detroit' },
    },
    ...overrides,
  } as unknown as GameState;
}

describe('computeRivalryHeatMap', () => {
  it('returns an empty array when the game or user team is missing', () => {
    expect(computeRivalryHeatMap(null, 'CHI')).toEqual([]);
    expect(computeRivalryHeatMap(makeGame(), null)).toEqual([]);
  });

  it('returns an empty array when the team content declares no rivalries', () => {
    getTeamContentMock.mockImplementation(() => ({ rivalries: [] }));

    expect(computeRivalryHeatMap(makeGame(), 'CHI')).toEqual([]);
  });

  it('returns zeroed cold entries for declared rivals', () => {
    getTeamContentMock.mockImplementation((teamId: string) => {
      if (teamId === 'CHI') {
        return {
          rivalries: [{ opponentId: 'GB' }],
        };
      }
      return { id: teamId, city: teamId };
    });

    expect(computeRivalryHeatMap(makeGame(), 'CHI')).toEqual([{
      rivalTeamId: 'GB',
      rivalAbbr: 'GB',
      rivalCityName: 'Green Bay',
      wins: 0,
      losses: 0,
      ties: 0,
      totalGames: 0,
      winPct: 0,
      heatLevel: 'cold',
    }]);
  });

  it('sorts alphabetically by abbreviation when all rivalries are cold', () => {
    getTeamContentMock.mockImplementation((teamId: string) => {
      if (teamId === 'CHI') {
        return {
          rivalries: [{ opponentId: 'GB' }, { opponentId: 'DET' }],
        };
      }
      return { id: teamId, city: teamId };
    });

    expect(computeRivalryHeatMap(makeGame(), 'CHI').map((entry) => entry.rivalAbbr)).toEqual(['DET', 'GB']);
  });

  it('falls back to content data when a rival team is missing from the live game map', () => {
    getTeamContentMock.mockImplementation((teamId: string) => {
      if (teamId === 'CHI') {
        return {
          rivalries: [{ opponentId: 'MIN' }],
        };
      }
      if (teamId === 'MIN') {
        return { id: 'MIN', city: 'Minneapolis' };
      }
      return { id: teamId, city: teamId };
    });

    expect(computeRivalryHeatMap(makeGame(), 'CHI')[0]).toMatchObject({
      rivalTeamId: 'MIN',
      rivalAbbr: 'MIN',
      rivalCityName: 'Minneapolis',
      heatLevel: 'cold',
    });
  });
});
