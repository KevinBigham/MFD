import { beforeEach, describe, expect, it } from 'vitest';
import type { NewsItem, WeeklySummary } from '@mfd/engine';
import {
  SESSION_RECAP_STALE_DAYS,
  buildSessionRecap,
  clearSessionRecapSessionMemory,
  markSessionRecapDisplayed,
  readSessionRecapLastSeen,
  sessionRecapStorageKey,
  shouldShowSessionRecap,
} from './session-recap';

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

const week12 = makeSummary({
  id: 'summary-2029-12',
  week: 12,
  result: 'win',
  teamScore: 31,
  opponentScore: 17,
  record: '8-4',
  headline: 'Blaze stay hot behind a fourth-quarter avalanche',
  notes: ['Jay Stone hit two deep shots after halftime.'],
});

const week11 = makeSummary({
  id: 'summary-2029-11',
  week: 11,
  result: 'win',
  teamScore: 28,
  opponentScore: 24,
  record: '7-4',
  headline: 'Chicago escaped late',
  notes: ['A late stop kept the division race alive.'],
});

function makeSummary(overrides: Partial<WeeklySummary> = {}): WeeklySummary {
  return {
    id: 'summary-2029-10',
    year: 2029,
    week: 10,
    phase: 'regular_season',
    teamId: 'team-1',
    opponentTeamId: 'team-2',
    opponentName: 'Austin Armadillos',
    result: 'loss',
    teamScore: 17,
    opponentScore: 24,
    record: '6-4',
    headline: 'Chicago dropped a narrow one',
    ownerDelta: 0,
    injuries: [],
    mvpPlayerId: null,
    notes: [],
    ...overrides,
  };
}

function makeNews(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: 'news-2029-12',
    year: 2029,
    week: 12,
    type: 'trade',
    headline: 'Deadline move paid off',
    body: 'Chicago added a starter and the locker room noticed.',
    teamIds: ['team-1'],
    playerIds: ['p1'],
    importance: 'breaking',
    ...overrides,
  };
}

describe('buildSessionRecap', () => {
  it('builds exact deterministic beats from fixture save inputs', () => {
    expect(buildSessionRecap({
      year: 2029,
      week: 13,
      phase: 'regular_season',
      teamRecord: '8-4',
      weekSummaries: [week11, week12],
      leagueNews: [makeNews()],
      standingsPosition: '#1 AFC playoff seed',
      nextOpponent: {
        week: 13,
        opponentTeamId: 'team-2',
        opponentName: 'Austin Armadillos',
        home: true,
        primetime: true,
      },
    })).toEqual({
      beats: [
        {
          id: 'session-recap:left-off:summary-2029-12',
          kind: 'LEFT_OFF',
          label: 'Where you left off',
          text: 'You left off at 8-4 after a strong win: Blaze stay hot behind a fourth-quarter avalanche. 2-game win streak.',
          sourceRefs: ['weekSummary:summary-2029-12', 'Week 12 2029'],
        },
        {
          id: 'session-recap:just-happened:news:news-2029-12',
          kind: 'JUST_HAPPENED',
          label: 'What just happened',
          text: 'Deadline move paid off: Chicago added a starter and the locker room noticed.',
          sourceRefs: ['leagueNews:news-2029-12', 'Week 12 2029'],
        },
        {
          id: 'session-recap:this-week:opponent:2029:13:team-2',
          kind: 'THIS_WEEK',
          label: "What's at stake",
          text: 'Week 13: home vs Austin Armadillos in primetime. #1 AFC playoff seed.',
          sourceRefs: ['schedule:2029:13:team-2'],
        },
      ],
      stakesLine: 'Austin Armadillos is next with #1 AFC playoff seed.',
      sourceRefs: [
        'weekSummary:summary-2029-12',
        'Week 12 2029',
        'leagueNews:news-2029-12',
        'schedule:2029:13:team-2',
      ],
    });
  });

  it('returns null for brand-new saves without prior summary or news receipts', () => {
    expect(buildSessionRecap({
      year: 2026,
      week: 1,
      phase: 'preseason',
      weekSummaries: [],
      leagueNews: [],
      nextOpponent: { week: 1, opponentName: 'Austin Armadillos', opponentTeamId: 'team-2' },
    })).toBeNull();
  });

  it('is deterministic and caps the output at three beats', () => {
    const input = {
      year: 2029,
      week: 13,
      phase: 'regular_season',
      teamRecord: '8-4',
      weekSummaries: [week11, week12],
      leagueNews: [makeNews(), makeNews({ id: 'news-major', importance: 'major' })],
      nextOpponent: { week: 13, opponentName: 'Austin Armadillos', opponentTeamId: 'team-2' },
    };

    const first = buildSessionRecap(input);
    const second = buildSessionRecap(input);

    expect(first).toEqual(second);
    expect(first?.beats).toHaveLength(3);
  });

  it('does not throw when optional inputs are missing', () => {
    expect(() => buildSessionRecap({ year: 2029, week: 13, phase: 'regular_season' })).not.toThrow();
    expect(buildSessionRecap({ year: 2029, week: 13, phase: 'regular_season' })).toBeNull();
  });
});

describe('session recap trigger storage', () => {
  beforeEach(() => {
    clearSessionRecapSessionMemory();
  });

  it('shows when the per-dynasty key is absent', () => {
    expect(shouldShowSessionRecap({
      dynastyId: 'dynasty-a',
      storage: new MemoryStorage(),
      nowMs: 1_000,
    })).toBe(true);
  });

  it('hides when the timestamp is fresh and updates after display', () => {
    const storage = new MemoryStorage();
    const timestamp = 10_000;

    expect(markSessionRecapDisplayed('dynasty-a', storage, timestamp)).toEqual({
      dynastyId: 'dynasty-a',
      timestamp,
    });
    expect(readSessionRecapLastSeen('dynasty-a', storage)).toEqual({
      dynastyId: 'dynasty-a',
      timestamp,
    });

    clearSessionRecapSessionMemory();
    expect(shouldShowSessionRecap({
      dynastyId: 'dynasty-a',
      storage,
      nowMs: timestamp + (SESSION_RECAP_STALE_DAYS * 24 * 60 * 60 * 1000) - 1,
    })).toBe(false);
  });

  it('shows when the timestamp is stale', () => {
    const storage = new MemoryStorage();
    markSessionRecapDisplayed('dynasty-a', storage, 10_000);
    clearSessionRecapSessionMemory();

    expect(shouldShowSessionRecap({
      dynastyId: 'dynasty-a',
      storage,
      nowMs: 10_000 + (SESSION_RECAP_STALE_DAYS * 24 * 60 * 60 * 1000),
    })).toBe(true);
  });

  it('isolates two dynasty ids and never re-shows in the same session', () => {
    const storage = new MemoryStorage();
    markSessionRecapDisplayed('dynasty-a', storage, 10_000);

    expect(storage.getItem(sessionRecapStorageKey('dynasty-b'))).toBeNull();
    expect(shouldShowSessionRecap({ dynastyId: 'dynasty-a', storage, nowMs: 10_000 + 1_000_000 })).toBe(false);

    clearSessionRecapSessionMemory();
    expect(shouldShowSessionRecap({ dynastyId: 'dynasty-b', storage, nowMs: 10_000 + 1_000_000 })).toBe(true);
  });
});
