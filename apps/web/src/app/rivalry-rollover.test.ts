import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameResult, GameState } from '@mfd/engine';
import { createSeedGameState } from './store/seed';
import { loadRivalries, RIVALRIES_STORAGE_KEY } from '../lib/rivalry-storage';
import { syncRivalriesAtYearRollover, syncRivalriesForGame } from './rivalry-rollover';

class MemoryStorage implements Storage {
  private readonly backing = new Map<string, string>();

  get length() {
    return this.backing.size;
  }

  clear(): void {
    this.backing.clear();
  }

  getItem(key: string): string | null {
    return this.backing.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.backing.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.backing.delete(key);
  }

  setItem(key: string, value: string): void {
    this.backing.set(key, value);
  }
}

function makeResult(
  homeTeamId: string,
  awayTeamId: string,
  week: number,
  homeScore: number,
  awayScore: number,
): GameResult {
  return {
    id: `${homeTeamId}-${awayTeamId}-${week}`,
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    week,
    year: 2026,
    overtime: false,
    mvpPlayerId: null,
    stats: {
      [homeTeamId]: {} as never,
      [awayTeamId]: {} as never,
    },
    playerMatchupEvents: [],
  };
}

function addCompletedMatchup(game: GameState): [string, string] {
  const [home, away] = Object.values(game.teams);
  if (!home || !away) throw new Error('Expected two teams');

  game.schedule = [{
    week: 1,
    games: [{
      homeTeamId: home.id,
      awayTeamId: away.id,
      result: makeResult(home.id, away.id, 1, 24, 17),
    }],
  }];

  return [home.id, away.id];
}

describe('rivalry sidecar sync', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('does not write without a game or completed year rollover', () => {
    const game = createSeedGameState(42);

    expect(syncRivalriesForGame(null)).toBe(false);
    expect(syncRivalriesAtYearRollover(null, game)).toBe(false);
    expect(syncRivalriesAtYearRollover(game.year, game)).toBe(false);
    expect(localStorage.getItem(RIVALRIES_STORAGE_KEY)).toBeNull();
  });

  it('writes derived rivalry records for the current save', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_818_181);
    const game = createSeedGameState(42);
    const [homeTeamId, awayTeamId] = addCompletedMatchup(game);

    expect(syncRivalriesForGame(game)).toBe(true);

    const payload = loadRivalries();
    expect(payload.generatedAt).toBe(1_818_181);
    expect(payload.teams[homeTeamId]?.[0]).toMatchObject({
      opponentId: awayTeamId,
      lastMatchup: {
        result: 'win',
        margin: 7,
      },
      headToHeadRecent: {
        wins: 1,
        losses: 0,
        ties: 0,
      },
    });
  });

  it('syncs derived rivalries after a year rollover', () => {
    vi.spyOn(Date, 'now').mockReturnValue(2_626_262);
    const game = createSeedGameState(99);
    const [homeTeamId, awayTeamId] = addCompletedMatchup(game);
    const completedYear = game.year;
    game.year += 1;

    expect(syncRivalriesAtYearRollover(completedYear, game)).toBe(true);

    const payload = loadRivalries();
    expect(payload.generatedAt).toBe(2_626_262);
    expect(payload.teams[awayTeamId]?.[0]).toMatchObject({
      opponentId: homeTeamId,
      lastMatchup: {
        result: 'loss',
        margin: -7,
      },
    });
  });
});
