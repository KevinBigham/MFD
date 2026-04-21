import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState, HallOfFameEntry } from '@mfd/engine';

class MemoryStorage implements Storage {
  private readonly backing = new Map<string, string>();
  get length() { return this.backing.size; }
  clear(): void { this.backing.clear(); }
  getItem(key: string): string | null { return this.backing.get(key) ?? null; }
  key(index: number): string | null { return [...this.backing.keys()][index] ?? null; }
  removeItem(key: string): void { this.backing.delete(key); }
  setItem(key: string, value: string): void { this.backing.set(key, value); }
}

vi.mock('./store/persistence', () => ({
  autosaveDynasty: () => Promise.resolve(),
  loadLatestAutosaveGame: () => Promise.resolve(null),
}));

vi.mock('./store/sim', () => ({
  runAdvanceWeek: (game: GameState) => Promise.resolve({ nextState: game, events: [], consequences: [] }),
  runPreviewHalftimeDecision: () => Promise.resolve(null),
}));

import { createSeedGameState } from './store/seed';
import { deriveDynastyId } from '../lib/career-meta';
import { readHallOfFameDynasty } from '../lib/hall-of-fame-archive';
import { syncHallOfFameArchiveAtYearRollover } from './hall-of-fame-rollover';

function userTeam(game: GameState) {
  const team = Object.values(game.teams).find((entry) => entry.isUser);
  if (!team) throw new Error('Expected user team');
  return team;
}

function makeEntry(overrides: Partial<HallOfFameEntry> = {}): HallOfFameEntry {
  return {
    playerId: 'p-1',
    name: 'Jalen Banks',
    position: 'QB',
    inductionYear: 2042,
    peakOvr: 96,
    careerYears: 14,
    score: 128,
    awards: { mvps: 2, allPros: 4, proBowls: 8, championships: 2 },
    highlights: [],
    teams: ['KC'],
    ...overrides,
  };
}

describe('syncHallOfFameArchiveAtYearRollover', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false when game or teamId is missing', () => {
    expect(syncHallOfFameArchiveAtYearRollover(null, null, null)).toBe(false);
  });

  it('returns false when previousYear is null (cold start)', () => {
    const game = createSeedGameState(42);
    expect(syncHallOfFameArchiveAtYearRollover(null, game, userTeam(game).id)).toBe(false);
  });

  it('returns false when year has not advanced', () => {
    const game = createSeedGameState(42);
    expect(syncHallOfFameArchiveAtYearRollover(game.year, game, userTeam(game).id)).toBe(false);
  });

  it('returns false when the dynasty has no HOF entries yet', () => {
    const game = createSeedGameState(42);
    game.hallOfFame = [];
    expect(syncHallOfFameArchiveAtYearRollover(game.year - 1, game, userTeam(game).id)).toBe(false);
  });

  it('persists the dynasty snapshot on year rollover with HOF entries present', () => {
    const game = createSeedGameState(42);
    const team = userTeam(game);
    game.hallOfFame = [makeEntry({ teams: [team.id] })];

    const wrote = syncHallOfFameArchiveAtYearRollover(game.year - 1, game, team.id);
    expect(wrote).toBe(true);

    const stored = readHallOfFameDynasty(deriveDynastyId(game));
    expect(stored).not.toBeNull();
    expect(stored?.teamId).toBe(team.id);
    expect(stored?.lastSyncedYear).toBe(game.year);
    expect(stored?.entries).toHaveLength(1);
  });

  it('replaces existing snapshot on subsequent rollovers (full-snapshot semantics)', () => {
    const game = createSeedGameState(42);
    const team = userTeam(game);

    game.hallOfFame = [makeEntry({ playerId: 'p-1', teams: [team.id] })];
    syncHallOfFameArchiveAtYearRollover(game.year - 1, game, team.id);

    game.year += 1;
    game.hallOfFame = [
      makeEntry({ playerId: 'p-1', teams: [team.id] }),
      makeEntry({ playerId: 'p-2', name: 'Second', teams: [team.id] }),
    ];
    const wrote = syncHallOfFameArchiveAtYearRollover(game.year - 1, game, team.id);
    expect(wrote).toBe(true);

    const stored = readHallOfFameDynasty(deriveDynastyId(game));
    expect(stored?.entries).toHaveLength(2);
    expect(stored?.lastSyncedYear).toBe(game.year);
  });
});
