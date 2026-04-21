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
});
