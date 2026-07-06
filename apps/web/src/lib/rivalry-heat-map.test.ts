import { describe, expect, it, vi } from 'vitest';
import type { GameResult, GameState } from '@mfd/engine';

const { getTeamContentMock } = vi.hoisted(() => ({
  getTeamContentMock: vi.fn(),
}));

vi.mock('@mfd/engine', () => ({
  getTeamContent: getTeamContentMock,
}));

vi.mock('../app/store/game-store', () => ({
  useGameStore: Object.assign(() => null, {
    getState: () => ({ game: null }),
  }),
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

function makeResult(overrides: Partial<GameResult> = {}): GameResult {
  return {
    id: `game-${overrides.year ?? 2026}-${overrides.week ?? 1}-${overrides.homeTeamId ?? 'CHI'}-${overrides.awayTeamId ?? 'GB'}`,
    homeTeamId: 'CHI',
    awayTeamId: 'GB',
    homeScore: 24,
    awayScore: 17,
    week: 1,
    year: 2026,
    overtime: false,
    ...overrides,
  } as unknown as GameResult;
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
      latestMeeting: null,
    }]);
  });

  it('derives head-to-head records from saved completed schedule results', () => {
    getTeamContentMock.mockImplementation((teamId: string) => {
      if (teamId === 'CHI') {
        return {
          rivalries: [{ opponentId: 'GB' }],
        };
      }
      return { id: teamId, city: teamId };
    });

    const game = makeGame({
      schedule: [
        {
          week: 1,
          games: [
            { homeTeamId: 'CHI', awayTeamId: 'GB', result: makeResult({ id: 'win', homeScore: 27, awayScore: 20 }) },
            { homeTeamId: 'DET', awayTeamId: 'GB', result: makeResult({ id: 'unrelated', homeTeamId: 'DET', awayTeamId: 'GB' }) },
          ],
        },
        {
          week: 2,
          games: [
            { homeTeamId: 'GB', awayTeamId: 'CHI', result: makeResult({ id: 'loss', homeTeamId: 'GB', awayTeamId: 'CHI', homeScore: 21, awayScore: 14, week: 2 }) },
            { homeTeamId: 'CHI', awayTeamId: 'GB', result: null },
          ],
        },
        {
          week: 3,
          games: [
            { homeTeamId: 'GB', awayTeamId: 'CHI', result: makeResult({ id: 'tie', homeTeamId: 'GB', awayTeamId: 'CHI', homeScore: 24, awayScore: 24, week: 3 }) },
          ],
        },
      ],
    } as unknown as Partial<GameState>);

    expect(computeRivalryHeatMap(game, 'CHI')[0]).toMatchObject({
      wins: 1,
      losses: 1,
      ties: 1,
      totalGames: 3,
      winPct: 1 / 3,
      heatLevel: 'cold',
      latestMeeting: {
        year: 2026,
        week: 3,
        result: 'tie',
        score: '24-24',
      },
    });
  });

  it('includes saved playoff results and dedupes repeated result ids', () => {
    getTeamContentMock.mockImplementation((teamId: string) => {
      if (teamId === 'CHI') {
        return {
          rivalries: [{ opponentId: 'GB' }],
        };
      }
      return { id: teamId, city: teamId };
    });

    const playoffResult = makeResult({
      id: 'playoff-repeat',
      homeTeamId: 'GB',
      awayTeamId: 'CHI',
      homeScore: 17,
      awayScore: 28,
      week: 19,
    });
    const game = makeGame({
      schedule: [
        {
          week: 19,
          games: [
            { homeTeamId: 'GB', awayTeamId: 'CHI', result: playoffResult },
          ],
        },
      ],
      playoffBracket: {
        matchups: [
          {
            id: 'wc-1',
            homeTeamId: 'GB',
            awayTeamId: 'CHI',
            winnerTeamId: 'CHI',
            result: playoffResult,
          },
        ],
      },
    } as unknown as Partial<GameState>);

    expect(computeRivalryHeatMap(game, 'CHI')[0]).toMatchObject({
      wins: 1,
      losses: 0,
      ties: 0,
      totalGames: 1,
      winPct: 1,
      latestMeeting: {
        year: 2026,
        week: 19,
        result: 'win',
        score: '28-17',
      },
    });
  });

  it('resolves declared rivalries when the live game uses runtime team ids', () => {
    getTeamContentMock.mockImplementation((teamId: string) => {
      if (teamId === 'CHI') {
        return {
          id: 'CHI',
          city: 'Chicago',
          rivalries: [{ opponentId: 'GB' }],
        };
      }
      if (teamId === 'GB') {
        return { id: 'GB', city: 'Green Bay' };
      }
      return null;
    });

    const game = makeGame({
      teams: {
        'runtime-chi': { id: 'runtime-chi', abbr: 'CHI', city: 'Chicago Live' },
        'runtime-gb': { id: 'runtime-gb', abbr: 'GB', city: 'Green Bay Live' },
      },
      schedule: [
        {
          week: 1,
          games: [
            {
              homeTeamId: 'runtime-chi',
              awayTeamId: 'runtime-gb',
              result: makeResult({
                id: 'runtime-win',
                homeTeamId: 'runtime-chi',
                awayTeamId: 'runtime-gb',
                homeScore: 31,
                awayScore: 20,
              }),
            },
          ],
        },
      ],
    } as unknown as Partial<GameState>);

    expect(computeRivalryHeatMap(game, 'runtime-chi')[0]).toMatchObject({
      rivalTeamId: 'GB',
      rivalAbbr: 'GB',
      rivalCityName: 'Green Bay Live',
      wins: 1,
      totalGames: 1,
      heatLevel: 'cold',
      latestMeeting: {
        year: 2026,
        week: 1,
        result: 'win',
        score: '31-20',
      },
    });
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
