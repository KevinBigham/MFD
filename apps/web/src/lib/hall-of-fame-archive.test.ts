import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HallOfFameEntry } from '@mfd/engine';
import {
  clearHallOfFameForDynasty,
  listDynastiesByStartYear,
  readHallOfFameArchive,
  readHallOfFameDynasty,
  summarizeHallOfFameArchive,
  topHallOfFamerByScore,
  upsertHallOfFameDynasty,
  type HallOfFameArchiveDynasty,
} from './hall-of-fame-archive';

const STORAGE_KEY = 'mfd.hallOfFame.v1';

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
    highlights: ['Peak 96 OVR', '14 seasons'],
    teams: ['KC'],
    ...overrides,
  };
}

function makeDynasty(overrides: Partial<HallOfFameArchiveDynasty> = {}): HallOfFameArchiveDynasty {
  return {
    dynastyId: 'seed-kc-2030',
    teamId: 'KC',
    teamCity: 'Kansas City',
    teamName: 'Storm',
    teamAbbr: 'KC',
    startYear: 2030,
    lastSyncedYear: 2045,
    entries: [],
    ...overrides,
  };
}

describe('hall-of-fame-archive', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns an empty payload when storage is empty', () => {
    const payload = readHallOfFameArchive();
    expect(payload.schemaVersion).toBe(1);
    expect(Object.keys(payload.dynastiesById)).toHaveLength(0);
  });

  it('persists a dynasty via upsert and reads it back sorted newest-induction first', () => {
    upsertHallOfFameDynasty(makeDynasty({
      entries: [
        makeEntry({ playerId: 'p-1', inductionYear: 2041, name: 'Alpha' }),
        makeEntry({ playerId: 'p-2', inductionYear: 2044, name: 'Charlie' }),
        makeEntry({ playerId: 'p-3', inductionYear: 2042, name: 'Bravo' }),
      ],
    }));

    const dynasty = readHallOfFameDynasty('seed-kc-2030');
    expect(dynasty).not.toBeNull();
    expect(dynasty?.entries.map((entry) => entry.inductionYear)).toEqual([2044, 2042, 2041]);
  });

  it('replaces an existing dynasty on upsert (idempotent full-snapshot semantics)', () => {
    upsertHallOfFameDynasty(makeDynasty({ entries: [makeEntry({ playerId: 'p-1' })] }));
    upsertHallOfFameDynasty(makeDynasty({
      lastSyncedYear: 2046,
      entries: [makeEntry({ playerId: 'p-1' }), makeEntry({ playerId: 'p-2', name: 'Second' })],
    }));

    const dynasty = readHallOfFameDynasty('seed-kc-2030');
    expect(dynasty?.entries).toHaveLength(2);
    expect(dynasty?.lastSyncedYear).toBe(2046);
  });

  it('clears a single dynasty without affecting others', () => {
    upsertHallOfFameDynasty(makeDynasty({ dynastyId: 'a', teamId: 'KC', entries: [makeEntry({ teams: ['KC'] })] }));
    upsertHallOfFameDynasty(makeDynasty({ dynastyId: 'b', teamId: 'LA', teamAbbr: 'LA', entries: [makeEntry({ playerId: 'p-9', teams: ['LA'] })] }));

    clearHallOfFameForDynasty('a');

    const payload = readHallOfFameArchive();
    expect(Object.keys(payload.dynastiesById)).toEqual(['b']);
  });

  it('falls back to empty payload on malformed localStorage JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not-json');
    const payload = readHallOfFameArchive();
    expect(payload.dynastiesById).toEqual({});
  });

  it('falls back to empty payload on schema-invalid data (wrong schemaVersion)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 99, dynastiesById: {} }));
    const payload = readHallOfFameArchive();
    expect(payload.schemaVersion).toBe(1);
    expect(payload.dynastiesById).toEqual({});
  });

  it('summarizes inductees, homegrown count, championships, MVPs, and dynasties represented', () => {
    upsertHallOfFameDynasty(makeDynasty({
      dynastyId: 'a',
      teamId: 'KC',
      entries: [
        makeEntry({ playerId: 'p-1', teams: ['KC', 'DAL'], awards: { mvps: 2, allPros: 4, proBowls: 8, championships: 2 } }),
        makeEntry({ playerId: 'p-2', teams: ['GB', 'KC'], awards: { mvps: 0, allPros: 1, proBowls: 3, championships: 1 } }),
      ],
    }));
    upsertHallOfFameDynasty(makeDynasty({
      dynastyId: 'b',
      teamId: 'LA',
      teamAbbr: 'LA',
      entries: [
        makeEntry({ playerId: 'p-9', teams: ['LA'], awards: { mvps: 1, allPros: 2, proBowls: 4, championships: 0 } }),
      ],
    }));

    const summary = summarizeHallOfFameArchive(readHallOfFameArchive());
    expect(summary.totalInductees).toBe(3);
    expect(summary.totalHomegrown).toBe(2);
    expect(summary.totalChampionships).toBe(3);
    expect(summary.totalMvps).toBe(3);
    expect(summary.dynastiesRepresented).toBe(2);
  });

  it('does not count empty dynasties in dynastiesRepresented', () => {
    upsertHallOfFameDynasty(makeDynasty({ dynastyId: 'empty', entries: [] }));
    upsertHallOfFameDynasty(makeDynasty({ dynastyId: 'full', teamId: 'LA', teamAbbr: 'LA', entries: [makeEntry({ teams: ['LA'] })] }));

    const summary = summarizeHallOfFameArchive(readHallOfFameArchive());
    expect(summary.dynastiesRepresented).toBe(1);
    expect(summary.totalInductees).toBe(1);
  });

  it('lists dynasties ordered by startYear then teamAbbr', () => {
    upsertHallOfFameDynasty(makeDynasty({ dynastyId: 'late', startYear: 2040, teamAbbr: 'LA' }));
    upsertHallOfFameDynasty(makeDynasty({ dynastyId: 'early', startYear: 2020, teamAbbr: 'KC' }));
    upsertHallOfFameDynasty(makeDynasty({ dynastyId: 'tie', startYear: 2020, teamAbbr: 'AA' }));

    const ordered = listDynastiesByStartYear(readHallOfFameArchive());
    expect(ordered.map((dynasty) => dynasty.dynastyId)).toEqual(['tie', 'early', 'late']);
  });

  it('clear on a nonexistent dynasty id is a no-op', () => {
    upsertHallOfFameDynasty(makeDynasty({ dynastyId: 'a' }));
    clearHallOfFameForDynasty('does-not-exist');
    expect(Object.keys(readHallOfFameArchive().dynastiesById)).toEqual(['a']);
  });

  it('returns null for topHallOfFamerByScore when a dynasty has no entries', () => {
    expect(topHallOfFamerByScore(makeDynasty({ entries: [] }))).toBeNull();
  });

  it('returns the highest-score hall of famer and breaks ties by induction year then name', () => {
    const top = topHallOfFamerByScore(makeDynasty({
      entries: [
        makeEntry({ playerId: 'later', name: 'Zeta Star', score: 140, inductionYear: 2044 }),
        makeEntry({ playerId: 'earlier', name: 'Bravo Star', score: 140, inductionYear: 2042 }),
        makeEntry({ playerId: 'alpha', name: 'Alpha Star', score: 140, inductionYear: 2042 }),
        makeEntry({ playerId: 'lower', name: 'Lower Star', score: 130, inductionYear: 2041 }),
      ],
    }));

    expect(top?.playerId).toBe('alpha');
  });
});
