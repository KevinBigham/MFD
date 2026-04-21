import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState } from '@mfd/engine';

vi.mock('../app/store/persistence', () => ({
  autosaveDynasty: () => Promise.resolve(),
  loadLatestAutosaveGame: () => Promise.resolve(null),
}));

vi.mock('../app/store/sim', () => ({
  runAdvanceWeek: (game: GameState) => Promise.resolve({ nextState: game, events: [], consequences: [] }),
  runPreviewHalftimeDecision: () => Promise.resolve(null),
}));

import { createSeedGameState } from '../app/store/seed';
import { useGameStore } from '../app/store/game-store';
import {
  appendDynastySummary,
  buildDynastySummary,
  deriveDynastyId,
  finalizeDynasty,
  readCareerMeta,
  writeCareerMeta,
} from './career-meta';

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

function userTeam(game: GameState) {
  const team = Object.values(game.teams).find((entry) => entry.isUser);
  if (!team) throw new Error('Expected user team');
  return team;
}

function seedSummaryGame(seed: number, year: number) {
  const game = createSeedGameState(seed);
  const team = userTeam(game);
  game.phase = 'offseason';
  game.year = year;
  game.franchiseHistory = [
    {
      year: year - 2,
      teamId: team.id,
      wins: 10,
      losses: 7,
      ties: 0,
      record: '10-7',
      pointDifferential: 45,
      playoffFinish: 'wild_card_exit',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    },
    {
      year: year - 1,
      teamId: team.id,
      wins: 13,
      losses: 4,
      ties: 0,
      record: '13-4',
      pointDifferential: 112,
      playoffFinish: 'champion',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    },
  ];

  const receiver = team.roster.find((player) => player.pos === 'WR')!;
  game.playerSeasonHistory[receiver.id] = [
    {
      playerId: receiver.id,
      season: year - 2,
      age: 23,
      ovr: 74,
      teamId: team.id,
      gamesPlayed: 17,
      gamesStarted: 5,
      keyStats: {},
    },
    {
      playerId: receiver.id,
      season: year - 1,
      age: 24,
      ovr: 79,
      teamId: team.id,
      gamesPlayed: 17,
      gamesStarted: 11,
      keyStats: {},
    },
  ];

  return game;
}

describe('career-meta', () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);
    useGameStore.setState({
      game: null,
      initialized: false,
      undoSnapshot: null,
      undoLabel: null,
      recapPromptSeenThisSession: false,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useGameStore.setState({
      game: null,
      initialized: false,
      undoSnapshot: null,
      undoLabel: null,
      recapPromptSeenThisSession: false,
    });
  });

  it('readCareerMeta returns defaults when localStorage is empty', () => {
    expect(readCareerMeta()).toEqual({
      schemaVersion: 1,
      dynasties: [],
      careerTotals: {
        dynasties: 0,
        seasonsCoached: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        championships: 0,
        playoffAppearances: 0,
        breakoutsDeveloped: 0,
        coachesDeveloped: 0,
        hallOfFamersDeveloped: 0,
      },
    });
  });

  it('readCareerMeta returns defaults when payload fails validation', () => {
    localStorage.setItem('mfd.careerMeta.v1', '{"dynasties":"bad"}');

    expect(readCareerMeta().dynasties).toEqual([]);
  });

  it('writeCareerMeta round-trips a populated payload correctly', () => {
    writeCareerMeta({
      schemaVersion: 1,
      dynasties: [
        {
          dynastyId: '1:team:2026',
          teamId: 'team',
          teamCity: 'Chicago',
          teamName: 'Blaze',
          teamAbbr: 'CHI',
          startYear: 2026,
          endYear: null,
          seasonsCoached: 2,
          wins: 23,
          losses: 11,
          ties: 0,
          championships: 1,
          playoffAppearances: 2,
          breakoutsDeveloped: 1,
        },
      ],
      careerTotals: {
        dynasties: 0,
        seasonsCoached: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        championships: 0,
        playoffAppearances: 0,
        breakoutsDeveloped: 0,
      },
    });

    expect(readCareerMeta().careerTotals.wins).toBe(23);
    expect(readCareerMeta().dynasties[0]?.teamName).toBe('Blaze');
  });

  it('appendDynastySummary adds an entry and recomputes career totals', () => {
    appendDynastySummary({
      dynastyId: '1:team:2026',
      teamId: 'team',
      teamCity: 'Chicago',
      teamName: 'Blaze',
      teamAbbr: 'CHI',
      startYear: 2026,
      endYear: null,
      seasonsCoached: 2,
      wins: 23,
      losses: 11,
      ties: 0,
      championships: 1,
      playoffAppearances: 2,
      breakoutsDeveloped: 1,
    });

    const meta = readCareerMeta();
    expect(meta.dynasties).toHaveLength(1);
    expect(meta.careerTotals).toMatchObject({
      dynasties: 1,
      seasonsCoached: 2,
      wins: 23,
      championships: 1,
      playoffAppearances: 2,
      breakoutsDeveloped: 1,
    });
  });

  it('finalizeDynasty sets endYear and freezes the entry', () => {
    appendDynastySummary({
      dynastyId: '1:team:2026',
      teamId: 'team',
      teamCity: 'Chicago',
      teamName: 'Blaze',
      teamAbbr: 'CHI',
      startYear: 2026,
      endYear: null,
      seasonsCoached: 2,
      wins: 23,
      losses: 11,
      ties: 0,
      championships: 1,
      playoffAppearances: 2,
      breakoutsDeveloped: 1,
    });

    finalizeDynasty('1:team:2026', 2027);

    expect(readCareerMeta().dynasties[0]?.endYear).toBe(2027);
  });

  it('schemaVersion mismatch falls back to defaults', () => {
    localStorage.setItem('mfd.careerMeta.v1', JSON.stringify({
      schemaVersion: 99,
      dynasties: [],
      careerTotals: {},
    }));

    expect(readCareerMeta().dynasties).toEqual([]);
  });

  it('deriveDynastyId is deterministic from seed, team, and start year', () => {
    const game = seedSummaryGame(42, 2028);
    const team = userTeam(game);

    expect(deriveDynastyId(game)).toBe(`${game.seed}:${team.id}:2026`);
  });

  it('buildDynastySummary derives totals and breakout counts from game state', () => {
    const game = seedSummaryGame(42, 2028);
    const summary = buildDynastySummary(game);

    expect(summary).toMatchObject({
      startYear: 2026,
      seasonsCoached: 2,
      wins: 23,
      losses: 11,
      championships: 1,
      playoffAppearances: 2,
      breakoutsDeveloped: 1,
    });
  });

  it('newGame appends a dynasty summary and finalizes the previous dynasty on replacement', async () => {
    const first = seedSummaryGame(1, 2028);
    const second = seedSummaryGame(2, 2031);

    await useGameStore.getState().actions.newGame(first);
    await useGameStore.getState().actions.newGame(second);

    const meta = readCareerMeta();
    expect(meta.dynasties).toHaveLength(2);
    expect(meta.dynasties.find((entry) => entry.dynastyId === deriveDynastyId(first))?.endYear).toBe(2027);
    expect(meta.dynasties.find((entry) => entry.dynastyId === deriveDynastyId(second))?.endYear).toBeNull();
  });

  it('loadGame backfills the loaded dynasty into career meta immediately', () => {
    const loaded = seedSummaryGame(5, 2030);

    useGameStore.getState().actions.loadGame(loaded);

    expect(readCareerMeta().dynasties[0]?.dynastyId).toBe(deriveDynastyId(loaded));
  });

  // ── Defensive regressions ───────────────────────────────
  // Sprint-56 "The Scrapbook" compounds on these invariants: the scrapbook
  // groups entries by the same dynastyId produced here and trusts writes to
  // dedupe, so any regression in dedup or storage-fallback behavior would
  // surface as duplicate or lost entries in the scrapbook timeline.

  it('appendDynastySummary replaces an existing entry with the same dynastyId (no duplicates)', () => {
    const base = {
      dynastyId: '1:team:2026',
      teamId: 'team',
      teamCity: 'Chicago',
      teamName: 'Blaze',
      teamAbbr: 'CHI',
      startYear: 2026,
      endYear: null,
      seasonsCoached: 1,
      wins: 10,
      losses: 7,
      ties: 0,
      championships: 0,
      playoffAppearances: 0,
      breakoutsDeveloped: 0,
    } as const;

    appendDynastySummary(base);
    appendDynastySummary({
      ...base,
      seasonsCoached: 2,
      wins: 23,
      losses: 11,
      championships: 1,
      playoffAppearances: 2,
      breakoutsDeveloped: 1,
    });

    const meta = readCareerMeta();
    expect(meta.dynasties).toHaveLength(1);
    expect(meta.dynasties[0]).toMatchObject({
      dynastyId: '1:team:2026',
      seasonsCoached: 2,
      wins: 23,
      championships: 1,
    });
    expect(meta.careerTotals.dynasties).toBe(1);
    expect(meta.careerTotals.wins).toBe(23);
  });

  it('finalizeDynasty with an unknown dynastyId is a no-op (all entries unchanged)', () => {
    appendDynastySummary({
      dynastyId: '1:team:2026',
      teamId: 'team',
      teamCity: 'Chicago',
      teamName: 'Blaze',
      teamAbbr: 'CHI',
      startYear: 2026,
      endYear: null,
      seasonsCoached: 2,
      wins: 23,
      losses: 11,
      ties: 0,
      championships: 1,
      playoffAppearances: 2,
      breakoutsDeveloped: 1,
    });

    finalizeDynasty('does-not-exist', 2099);

    expect(readCareerMeta().dynasties).toHaveLength(1);
    expect(readCareerMeta().dynasties[0]?.endYear).toBeNull();
  });

  it('readCareerMeta falls back to defaults on non-JSON payloads', () => {
    localStorage.setItem('mfd.careerMeta.v1', 'not-even-json{{{');

    const meta = readCareerMeta();
    expect(meta.dynasties).toEqual([]);
    expect(meta.careerTotals.dynasties).toBe(0);
  });

  it('readCareerMeta recomputes career totals from dynasties (ignores stale persisted totals)', () => {
    localStorage.setItem('mfd.careerMeta.v1', JSON.stringify({
      schemaVersion: 1,
      dynasties: [
        {
          dynastyId: '1:team:2026',
          teamId: 'team',
          teamCity: 'Chicago',
          teamName: 'Blaze',
          teamAbbr: 'CHI',
          startYear: 2026,
          endYear: null,
          seasonsCoached: 2,
          wins: 23,
          losses: 11,
          ties: 0,
          championships: 1,
          playoffAppearances: 2,
          breakoutsDeveloped: 1,
        },
      ],
      careerTotals: {
        dynasties: 99,
        seasonsCoached: 99,
        wins: 99,
        losses: 99,
        ties: 99,
        championships: 99,
        playoffAppearances: 99,
        breakoutsDeveloped: 99,
      },
    }));

    const meta = readCareerMeta();
    expect(meta.careerTotals).toEqual({
      dynasties: 1,
      seasonsCoached: 2,
      wins: 23,
      losses: 11,
      ties: 0,
      championships: 1,
      playoffAppearances: 2,
      breakoutsDeveloped: 1,
      coachesDeveloped: 0,
      hallOfFamersDeveloped: 0,
    });
  });

  it('writeCareerMeta + readCareerMeta survive a multi-dynasty round-trip with accurate totals', () => {
    const blaze = {
      dynastyId: '1:blaze:2026',
      teamId: 'blaze',
      teamCity: 'Chicago',
      teamName: 'Blaze',
      teamAbbr: 'CHI',
      startYear: 2026,
      endYear: 2028,
      seasonsCoached: 3,
      wins: 30,
      losses: 21,
      ties: 0,
      championships: 1,
      playoffAppearances: 3,
      breakoutsDeveloped: 4,
    };
    const peaches = {
      dynastyId: '2:peaches:2029',
      teamId: 'peaches',
      teamCity: 'Atlanta',
      teamName: 'Peaches',
      teamAbbr: 'ATL',
      startYear: 2029,
      endYear: null,
      seasonsCoached: 2,
      wins: 17,
      losses: 17,
      ties: 0,
      championships: 0,
      playoffAppearances: 1,
      breakoutsDeveloped: 2,
    };

    writeCareerMeta({
      schemaVersion: 1,
      dynasties: [blaze, peaches],
      careerTotals: {
        dynasties: 0,
        seasonsCoached: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        championships: 0,
        playoffAppearances: 0,
        breakoutsDeveloped: 0,
      },
    });

    const meta = readCareerMeta();
    expect(meta.dynasties).toHaveLength(2);
    expect(meta.careerTotals).toEqual({
      dynasties: 2,
      seasonsCoached: 5,
      wins: 47,
      losses: 38,
      ties: 0,
      championships: 1,
      playoffAppearances: 4,
      breakoutsDeveloped: 6,
      coachesDeveloped: 0,
      hallOfFamersDeveloped: 0,
    });
  });

  it('buildDynastySummary returns null when no user team is present', () => {
    const game = createSeedGameState(10);
    for (const team of Object.values(game.teams)) {
      (team as { isUser: boolean }).isUser = false;
    }

    expect(buildDynastySummary(game)).toBeNull();
  });

  it('readCareerMeta rejects payloads with negative counters', () => {
    localStorage.setItem('mfd.careerMeta.v1', JSON.stringify({
      schemaVersion: 1,
      dynasties: [
        {
          dynastyId: '1:team:2026',
          teamId: 'team',
          teamCity: 'Chicago',
          teamName: 'Blaze',
          teamAbbr: 'CHI',
          startYear: 2026,
          endYear: null,
          seasonsCoached: -1,
          wins: 0,
          losses: 0,
          ties: 0,
          championships: 0,
          playoffAppearances: 0,
          breakoutsDeveloped: 0,
        },
      ],
      careerTotals: defaultTotalsForTest(),
    }));

    expect(readCareerMeta().dynasties).toEqual([]);
  });

  // ── Sprint 61 "The Legacy" — HOFer development counter ──
  it('buildDynastySummary counts HOFers whose first career team is the user team', () => {
    const game = seedSummaryGame(42, 2028);
    const team = userTeam(game);

    game.hallOfFame = [
      {
        playerId: 'hof-1',
        name: 'Homegrown Hero',
        position: 'QB',
        inductionYear: 2027,
        peakOvr: 97,
        careerYears: 14,
        score: 220,
        awards: { mvps: 3, allPros: 6, proBowls: 10, championships: 2 },
        highlights: ['Peak 97 OVR', '14 seasons'],
        teams: [team.id, 'other-team'],
      },
      {
        playerId: 'hof-2',
        name: 'Late-Career Pickup',
        position: 'LB',
        inductionYear: 2027,
        peakOvr: 92,
        careerYears: 12,
        score: 180,
        awards: { mvps: 0, allPros: 4, proBowls: 7, championships: 1 },
        highlights: ['Peak 92 OVR', '12 seasons'],
        teams: ['some-other-team', team.id],
      },
      {
        playerId: 'hof-3',
        name: 'Different Franchise HOFer',
        position: 'WR',
        inductionYear: 2027,
        peakOvr: 94,
        careerYears: 13,
        score: 200,
        awards: { mvps: 0, allPros: 5, proBowls: 8, championships: 1 },
        highlights: ['Peak 94 OVR', '13 seasons'],
        teams: ['some-other-team', 'another-team'],
      },
    ];

    const summary = buildDynastySummary(game);

    expect(summary?.hallOfFamersDeveloped).toBe(1);
  });

  it('recomputeCareerTotals sums hallOfFamersDeveloped across dynasties', () => {
    writeCareerMeta({
      schemaVersion: 1,
      dynasties: [
        {
          dynastyId: '1:blaze:2026',
          teamId: 'blaze',
          teamCity: 'Chicago',
          teamName: 'Blaze',
          teamAbbr: 'CHI',
          startYear: 2026,
          endYear: 2029,
          seasonsCoached: 4,
          wins: 45,
          losses: 23,
          ties: 0,
          championships: 2,
          playoffAppearances: 3,
          breakoutsDeveloped: 2,
          coachesDeveloped: 1,
          hallOfFamersDeveloped: 2,
        },
        {
          dynastyId: '2:orbit:2030',
          teamId: 'orbit',
          teamCity: 'Houston',
          teamName: 'Orbit',
          teamAbbr: 'HOU',
          startYear: 2030,
          endYear: null,
          seasonsCoached: 2,
          wins: 19,
          losses: 15,
          ties: 0,
          championships: 0,
          playoffAppearances: 1,
          breakoutsDeveloped: 1,
          coachesDeveloped: 0,
          hallOfFamersDeveloped: 3,
        },
      ],
      careerTotals: defaultTotalsForTest(),
    });

    const meta = readCareerMeta();

    expect(meta.careerTotals.hallOfFamersDeveloped).toBe(5);
    expect(meta.careerTotals.coachesDeveloped).toBe(1);
  });

  it('readCareerMeta defaults hallOfFamersDeveloped to 0 on legacy payloads without the field', () => {
    localStorage.setItem('mfd.careerMeta.v1', JSON.stringify({
      schemaVersion: 1,
      dynasties: [
        {
          dynastyId: '1:team:2026',
          teamId: 'team',
          teamCity: 'Chicago',
          teamName: 'Blaze',
          teamAbbr: 'CHI',
          startYear: 2026,
          endYear: null,
          seasonsCoached: 2,
          wins: 23,
          losses: 11,
          ties: 0,
          championships: 1,
          playoffAppearances: 2,
          breakoutsDeveloped: 1,
        },
      ],
      careerTotals: defaultTotalsForTest(),
    }));

    const meta = readCareerMeta();

    expect(meta.dynasties[0]?.hallOfFamersDeveloped).toBe(0);
    expect(meta.careerTotals.hallOfFamersDeveloped).toBe(0);
  });
});

function defaultTotalsForTest() {
  return {
    dynasties: 0,
    seasonsCoached: 0,
    wins: 0,
    losses: 0,
    ties: 0,
    championships: 0,
    playoffAppearances: 0,
    breakoutsDeveloped: 0,
  };
}
