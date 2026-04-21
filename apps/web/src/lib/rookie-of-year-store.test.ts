import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearRookieOfYearForDynasty,
  readRookieOfYearEntries,
  readRookieOfYearStore,
  upsertRookieOfYearEntry,
} from './rookie-of-year-store';

const STORAGE_KEY = 'mfd.rookieOfYear.v1';

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

function makeEntry(season: number, playerId = `rookie-${season}`) {
  return {
    playerId,
    playerName: `Rookie ${season}`,
    teamId: 'team-1',
    teamAbbr: 'CHI',
    position: 'QB' as const,
    compositeScore: 120.5,
    headline: `Rookie ${season}: CHI rookie QB takes ROY honors`,
    highlights: ['Strong rookie season'],
    season,
  };
}

describe('rookie-of-year-store', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns an empty payload when storage is empty', () => {
    expect(readRookieOfYearStore()).toEqual({
      schemaVersion: 1,
      byDynastyId: {},
    });
  });

  it('persists a dynasty rookie winner and reads it back', () => {
    upsertRookieOfYearEntry('dynasty-a', makeEntry(2026));

    expect(readRookieOfYearEntries('dynasty-a')).toEqual([makeEntry(2026)]);
  });

  it('replaces the same season deterministically on upsert', () => {
    upsertRookieOfYearEntry('dynasty-a', makeEntry(2026, 'rookie-a'));
    upsertRookieOfYearEntry('dynasty-a', makeEntry(2026, 'rookie-b'));

    expect(readRookieOfYearEntries('dynasty-a')).toEqual([makeEntry(2026, 'rookie-b')]);
  });

  it('keeps entries newest-season first', () => {
    upsertRookieOfYearEntry('dynasty-a', makeEntry(2025));
    upsertRookieOfYearEntry('dynasty-a', makeEntry(2027));
    upsertRookieOfYearEntry('dynasty-a', makeEntry(2026));

    expect(readRookieOfYearEntries('dynasty-a').map((entry) => entry.season)).toEqual([2027, 2026, 2025]);
  });

  it('falls back to the default payload on malformed json', () => {
    localStorage.setItem(STORAGE_KEY, '{bad-json');

    expect(readRookieOfYearStore()).toEqual({
      schemaVersion: 1,
      byDynastyId: {},
    });
  });

  it('clears one dynasty without affecting others', () => {
    upsertRookieOfYearEntry('dynasty-a', makeEntry(2026));
    upsertRookieOfYearEntry('dynasty-b', makeEntry(2025));

    clearRookieOfYearForDynasty('dynasty-a');

    expect(readRookieOfYearEntries('dynasty-a')).toEqual([]);
    expect(readRookieOfYearEntries('dynasty-b')).toEqual([makeEntry(2025)]);
  });
});
