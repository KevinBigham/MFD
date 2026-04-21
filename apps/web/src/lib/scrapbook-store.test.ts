import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScrapbookEntry } from '@mfd/engine';
import {
  appendScrapbookEntry,
  clearScrapbookForDynasty,
  readScrapbookForDynasty,
} from './scrapbook-store';

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

function makeEntry(year: number, overrides: Partial<ScrapbookEntry> = {}): ScrapbookEntry {
  return {
    year,
    eraTag: `Era ${year}`,
    seasonHighlightLine: `Highlight ${year}`,
    notableMoments: [{
      headline: `Moment ${year}`,
      detail: 'A notable season detail.',
      week: 8,
      importance: 'major',
    }],
    recap: {
      teamId: 'afce1',
      teamName: 'Club',
      teamCity: 'Chicago',
      teamAbbr: 'CHI',
      seasonYear: year,
      record: '10-7',
      wins: 10,
      losses: 7,
      ties: 0,
      division: 'East',
      conference: 'AFC',
      divisionFinish: 1,
      conferenceFinish: 2,
      playoffResult: 'wild-card-loss',
      teamAwards: [],
      topPerformers: {
        passingLeader: {
          playerId: `qb-${year}`,
          playerName: `QB ${year}`,
          pos: 'QB',
          value: 4100,
          gamesPlayed: 17,
          perGame: 241.2,
        },
        rushingLeader: {
          playerId: `rb-${year}`,
          playerName: `RB ${year}`,
          pos: 'RB',
          value: 1200,
          gamesPlayed: 17,
          perGame: 70.6,
        },
      },
      seasonStory: `Season story ${year}`,
      teamMotto: 'Keep climbing.',
      breakoutCandidates: [{
        playerId: `breakout-${year}`,
        playerName: `Breakout ${year}`,
        pos: 'WR',
        age: 24,
        ovr: 82,
        ovrDelta: 4,
        reason: 'Strong offseason leap.',
      }],
    },
    ...overrides,
  };
}

describe('scrapbook-store', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns an empty array when localStorage is empty', () => {
    expect(readScrapbookForDynasty('dynasty-a')).toEqual([]);
  });

  it('returns an empty array when the payload fails validation', () => {
    localStorage.setItem('mfd.scrapbook.v1', '{"schemaVersion":99,"entriesByDynastyId":[]}');

    expect(readScrapbookForDynasty('dynasty-a')).toEqual([]);
  });

  it('appends an entry and round-trips it cleanly', () => {
    const entry = makeEntry(2026);

    appendScrapbookEntry('dynasty-a', entry);

    expect(readScrapbookForDynasty('dynasty-a')).toEqual([entry]);
  });

  it('replaces the entry for the same dynasty and year instead of duplicating it', () => {
    appendScrapbookEntry('dynasty-a', makeEntry(2026, { seasonHighlightLine: 'Original' }));
    appendScrapbookEntry('dynasty-a', makeEntry(2026, { seasonHighlightLine: 'Updated' }));

    const entries = readScrapbookForDynasty('dynasty-a');
    expect(entries).toHaveLength(1);
    expect(entries[0]?.seasonHighlightLine).toBe('Updated');
  });

  it('keeps dynasty entries isolated from each other', () => {
    appendScrapbookEntry('dynasty-a', makeEntry(2026));
    appendScrapbookEntry('dynasty-b', makeEntry(2025));

    expect(readScrapbookForDynasty('dynasty-a').map((entry) => entry.year)).toEqual([2026]);
    expect(readScrapbookForDynasty('dynasty-b').map((entry) => entry.year)).toEqual([2025]);
  });

  it('clears only the target dynasty entries', () => {
    appendScrapbookEntry('dynasty-a', makeEntry(2026));
    appendScrapbookEntry('dynasty-b', makeEntry(2025));

    clearScrapbookForDynasty('dynasty-a');

    expect(readScrapbookForDynasty('dynasty-a')).toEqual([]);
    expect(readScrapbookForDynasty('dynasty-b').map((entry) => entry.year)).toEqual([2025]);
  });

  it('returns entries newest first regardless of storage order', () => {
    localStorage.setItem('mfd.scrapbook.v1', JSON.stringify({
      schemaVersion: 1,
      entriesByDynastyId: {
        'dynasty-a': [makeEntry(2024), makeEntry(2026), makeEntry(2025)],
      },
    }));

    expect(readScrapbookForDynasty('dynasty-a').map((entry) => entry.year)).toEqual([2026, 2025, 2024]);
  });
});
