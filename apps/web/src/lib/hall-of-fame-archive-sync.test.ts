import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState, HallOfFameEntry } from '@mfd/engine';
import { readHallOfFameDynasty } from './hall-of-fame-archive';
import {
  buildHallOfFameArchiveDynastySnapshot,
  syncHallOfFameArchiveSnapshot,
} from './hall-of-fame-archive-sync';

class MemoryStorage implements Storage {
  private readonly backing = new Map<string, string>();
  get length() { return this.backing.size; }
  clear(): void { this.backing.clear(); }
  getItem(key: string): string | null { return this.backing.get(key) ?? null; }
  key(index: number): string | null { return [...this.backing.keys()][index] ?? null; }
  removeItem(key: string): void { this.backing.delete(key); }
  setItem(key: string, value: string): void { this.backing.set(key, value); }
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
    highlights: ['2x MVP'],
    teams: ['team-1'],
    ...overrides,
  };
}

function makeGame(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 123,
    year: 2045,
    teams: {
      'team-1': { id: 'team-1', isUser: true, city: 'Chicago', name: 'Blaze', abbr: 'CHI' },
      'team-2': { id: 'team-2', isUser: false, city: 'Dallas', name: 'Stars', abbr: 'DAL' },
    },
    franchiseHistory: [
      { teamId: 'team-1', year: 2030, record: '9-8', wins: 9, losses: 8, ties: 0, playoffFinish: 'wild_card' },
      { teamId: 'team-1', year: 2032, record: '13-4', wins: 13, losses: 4, ties: 0, playoffFinish: 'champion' },
    ],
    hallOfFame: [makeEntry()],
    ...overrides,
  } as unknown as GameState;
}

describe('hall-of-fame-archive-sync', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds a current-save snapshot for the active user team', () => {
    const snapshot = buildHallOfFameArchiveDynastySnapshot(makeGame(), 'team-1');

    expect(snapshot).toEqual(expect.objectContaining({
      dynastyId: '123:team-1:2030',
      teamId: 'team-1',
      teamCity: 'Chicago',
      teamName: 'Blaze',
      teamAbbr: 'CHI',
      startYear: 2030,
      lastSyncedYear: 2045,
    }));
    expect(snapshot?.entries).toHaveLength(1);
  });

  it('refuses to build a snapshot without an active user team and live hall of fame entries', () => {
    expect(buildHallOfFameArchiveDynastySnapshot(null, 'team-1')).toBeNull();
    expect(buildHallOfFameArchiveDynastySnapshot(makeGame(), null)).toBeNull();
    expect(buildHallOfFameArchiveDynastySnapshot(makeGame(), 'team-2')).toBeNull();
    expect(buildHallOfFameArchiveDynastySnapshot(makeGame({ hallOfFame: [] } as unknown as GameState), 'team-1')).toBeNull();
  });

  it('writes the current save snapshot to the hall of fame sidecar', () => {
    const game = makeGame();

    const wrote = syncHallOfFameArchiveSnapshot(game, 'team-1');

    expect(wrote).toBe(true);
    const stored = readHallOfFameDynasty('123:team-1:2030');
    expect(stored?.lastSyncedYear).toBe(2045);
    expect(stored?.entries.map((entry) => entry.playerId)).toEqual(['p-1']);
  });

  it('replaces the prior sidecar snapshot using full-snapshot semantics', () => {
    const game = makeGame();
    syncHallOfFameArchiveSnapshot(game, 'team-1');

    const nextGame = makeGame({
      year: 2046,
      hallOfFame: [
        makeEntry({ playerId: 'p-2', name: 'Second Legend' }),
      ],
    } as unknown as GameState);
    const wrote = syncHallOfFameArchiveSnapshot(nextGame, 'team-1');

    expect(wrote).toBe(true);
    const stored = readHallOfFameDynasty('123:team-1:2030');
    expect(stored?.lastSyncedYear).toBe(2046);
    expect(stored?.entries.map((entry) => entry.playerId)).toEqual(['p-2']);
  });
});
