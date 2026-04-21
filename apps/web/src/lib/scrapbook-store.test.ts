import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScrapbookEntry } from '@mfd/engine';
import {
  appendScrapbookEntry,
  clearScrapbookForDynasty,
  listAllPlayoffLoreCards,
  readPendingPlayoffLoreCards,
  readScrapbookForDynasty,
  stagePendingPlayoffLoreCard,
  type StoredScrapbookEntry,
} from './scrapbook-store';
import type { PlayoffLoreCard } from './playoff-lore';

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

function makeEntry(year: number, overrides: Partial<StoredScrapbookEntry> = {}): StoredScrapbookEntry {
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
    playoffLoreCards: [],
    ...overrides,
  };
}

function makeCard(year: number, week: number, overrides: Partial<PlayoffLoreCard> = {}): PlayoffLoreCard {
  return {
    gameId: `playoff-${year}-${week}`,
    seasonYear: year,
    week,
    round: week === 22 ? 'super_bowl' : week === 21 ? 'conference' : week === 20 ? 'divisional' : 'wild_card',
    outcome: 'win',
    headline: 'Chicago survives and advances',
    finalScore: '27-24',
    opponentTeamId: 'opp',
    loreHook: 'A late takeaway ended the panic.',
    heroBlocks: [
      { label: 'Spotlight', value: 'Cole Stone // 288 yds, 2 TD' },
      { label: 'Swing', value: 'Turnover edge swung the leverage battle.' },
      { label: 'Tagline', value: 'The season kept its pulse.' },
    ],
    tags: ['Cinderella', 'Named Game'],
    namedGameName: 'The Comeback',
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

  it('migrates schema version 1 payloads without losing scrapbook entries', () => {
    const legacyEntry: ScrapbookEntry = makeEntry(2026);
    localStorage.setItem('mfd.scrapbook.v1', JSON.stringify({
      schemaVersion: 1,
      entriesByDynastyId: {
        'dynasty-a': [{
          ...legacyEntry,
          playoffLoreCards: undefined,
        }],
      },
    }));

    const entries = readScrapbookForDynasty('dynasty-a');

    expect(entries).toHaveLength(1);
    expect(entries[0]?.year).toBe(2026);
    expect(entries[0]?.seasonHighlightLine).toBe('Highlight 2026');
    expect(entries[0]?.playoffLoreCards).toEqual([]);
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

  it('stages pending playoff lore cards under the correct dynasty and season bucket', () => {
    const first = makeCard(2026, 19);
    const second = makeCard(2025, 22, { gameId: 'other-card' });

    stagePendingPlayoffLoreCard('dynasty-a', 2026, first);
    stagePendingPlayoffLoreCard('dynasty-b', 2025, second);

    expect(readPendingPlayoffLoreCards('dynasty-a', 2026)).toEqual([first]);
    expect(readPendingPlayoffLoreCards('dynasty-a', 2025)).toEqual([]);
    expect(readPendingPlayoffLoreCards('dynasty-b', 2025)).toEqual([second]);
  });

  it('merges staged playoff lore into the final scrapbook entry and clears the pending bucket', () => {
    const card = makeCard(2026, 19);
    stagePendingPlayoffLoreCard('dynasty-a', 2026, card);

    appendScrapbookEntry('dynasty-a', makeEntry(2026));

    const entries = readScrapbookForDynasty('dynasty-a');
    expect(entries[0]?.playoffLoreCards).toEqual([card]);
    expect(readPendingPlayoffLoreCards('dynasty-a', 2026)).toEqual([]);
  });

  it('clears only the target dynasty entries', () => {
    appendScrapbookEntry('dynasty-a', makeEntry(2026));
    appendScrapbookEntry('dynasty-b', makeEntry(2025));
    stagePendingPlayoffLoreCard('dynasty-a', 2026, makeCard(2026, 19));
    stagePendingPlayoffLoreCard('dynasty-b', 2025, makeCard(2025, 22));

    clearScrapbookForDynasty('dynasty-a');

    expect(readScrapbookForDynasty('dynasty-a')).toEqual([]);
    expect(readScrapbookForDynasty('dynasty-b').map((entry) => entry.year)).toEqual([2025]);
    expect(readPendingPlayoffLoreCards('dynasty-a', 2026)).toEqual([]);
    expect(readPendingPlayoffLoreCards('dynasty-b', 2025)).toHaveLength(1);
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

  it('returns an empty array from listAllPlayoffLoreCards when storage is empty', () => {
    expect(listAllPlayoffLoreCards()).toEqual([]);
  });

  it('aggregates archived and pending playoff lore cards across dynasties', () => {
    const archivedCard = makeCard(2026, 19, { gameId: 'archived-card' });
    const pendingCard = makeCard(2027, 21, { gameId: 'pending-card' });

    appendScrapbookEntry('dynasty-a', makeEntry(2026, { playoffLoreCards: [archivedCard] }));
    stagePendingPlayoffLoreCard('dynasty-b', 2027, pendingCard);

    expect(listAllPlayoffLoreCards()).toEqual([
      {
        dynastyId: 'dynasty-a',
        seasonYear: 2026,
        card: archivedCard,
        source: 'archived',
      },
      {
        dynastyId: 'dynasty-b',
        seasonYear: 2027,
        card: pendingCard,
        source: 'pending',
      },
    ]);
  });
});
