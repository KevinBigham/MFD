import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSeasonRecap, type GameState } from '@mfd/engine';
import { createSeedGameState } from './store/seed';
import { syncScrapbookAtYearRollover } from './scrapbook-rollover';
import { deriveDynastyId } from '../lib/career-meta';
import {
  readPendingPlayoffLoreCards,
  readScrapbookForDynasty,
  stagePendingPlayoffLoreCard,
} from '../lib/scrapbook-store';
import type { PlayoffLoreCard } from '../lib/playoff-lore';

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

function seedCompletedSeason(game: GameState, year: number, teamId: string) {
  const team = game.teams[teamId]!;
  const quarterback = team.roster.find((player) => player.pos === 'QB')!;
  const runningBack = team.roster.find((player) => player.pos === 'RB')!;
  const breakout = team.roster.find((player) => player.pos === 'WR')!;
  const divisionPeers = Object.values(game.teams)
    .filter((entry) => entry.conference === team.conference && entry.division === team.division)
    .filter((entry) => entry.id !== team.id)
    .slice(0, 3);
  const conferenceLeader = Object.values(game.teams)
    .filter((entry) => entry.conference === team.conference && entry.division !== team.division)
    .at(0)!;

  game.year = year + 1;
  game.phase = 'offseason';

  quarterback.stats.gamesPlayed = 17;
  quarterback.stats.passYds = 4_612;
  quarterback.stats.passTD = 36;
  runningBack.stats.gamesPlayed = 17;
  runningBack.stats.rushYds = 1_487;
  runningBack.stats.rushTD = 14;
  breakout.age = 24;
  breakout.ovr = 82;
  breakout.careerStats.previousSeasonOvr = 77;

  game.franchiseHistory = game.franchiseHistory.filter((entry) => entry.year !== year);
  game.franchiseHistory.push(
    {
      year,
      teamId: team.id,
      wins: 12,
      losses: 5,
      ties: 0,
      record: '12-5',
      pointDifferential: 88,
      playoffFinish: 'conference_final_exit',
      majorEvents: ['Won 8 of the last 10 games to seize control of the conference race.'],
      awardsWon: [],
      recordsBroken: [],
    },
    {
      year,
      teamId: divisionPeers[0]!.id,
      wins: 10,
      losses: 7,
      ties: 0,
      record: '10-7',
      pointDifferential: 15,
      playoffFinish: 'wild_card_exit',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    },
    {
      year,
      teamId: divisionPeers[1]!.id,
      wins: 9,
      losses: 8,
      ties: 0,
      record: '9-8',
      pointDifferential: -4,
      playoffFinish: 'missed_playoffs',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    },
    {
      year,
      teamId: divisionPeers[2]!.id,
      wins: 6,
      losses: 11,
      ties: 0,
      record: '6-11',
      pointDifferential: -80,
      playoffFinish: 'missed_playoffs',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    },
    {
      year,
      teamId: conferenceLeader.id,
      wins: 13,
      losses: 4,
      ties: 0,
      record: '13-4',
      pointDifferential: 111,
      playoffFinish: 'champion',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    },
  );

  return team;
}

function makeCard(year: number, week: number): PlayoffLoreCard {
  return {
    gameId: `playoff-${year}-${week}`,
    seasonYear: year,
    week,
    round: 'wild_card',
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
  };
}

describe('syncScrapbookAtYearRollover', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('appends a scrapbook entry with the completed season year and recap fields', () => {
    const game = createSeedGameState(42, 0, 'pro');
    const team = Object.values(game.teams).find((entry) => entry.isUser)!;
    seedCompletedSeason(game, 2026, team.id);

    const appended = syncScrapbookAtYearRollover(2026, game, team.id, false);
    const recap = buildSeasonRecap(game, team.id)!;
    const entries = readScrapbookForDynasty(deriveDynastyId(game));

    expect(appended).toBe(true);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.year).toBe(2026);
    expect(entries[0]?.recap.record).toBe(recap.record);
    expect(entries[0]?.recap.seasonStory).toBe(recap.seasonStory);
  });

  it('keeps the scrapbook idempotent across repeated rollover fires for the same season', () => {
    const game = createSeedGameState(77, 0, 'pro');
    const team = Object.values(game.teams).find((entry) => entry.isUser)!;
    seedCompletedSeason(game, 2026, team.id);

    expect(syncScrapbookAtYearRollover(2026, game, team.id, false)).toBe(true);
    expect(syncScrapbookAtYearRollover(2026, game, team.id, false)).toBe(true);

    const entries = readScrapbookForDynasty(deriveDynastyId(game));
    expect(entries).toHaveLength(1);
    expect(entries[0]?.year).toBe(2026);
  });

  it('merges staged playoff lore cards into the rollover entry and clears the pending season bucket', () => {
    const game = createSeedGameState(88, 0, 'pro');
    const team = Object.values(game.teams).find((entry) => entry.isUser)!;
    const dynastyId = deriveDynastyId(game);
    seedCompletedSeason(game, 2026, team.id);
    stagePendingPlayoffLoreCard(dynastyId, 2026, makeCard(2026, 19));

    expect(syncScrapbookAtYearRollover(2026, game, team.id, false)).toBe(true);

    const entries = readScrapbookForDynasty(dynastyId);
    expect(entries[0]?.playoffLoreCards).toHaveLength(1);
    expect(entries[0]?.playoffLoreCards[0]?.round).toBe('wild_card');
    expect(readPendingPlayoffLoreCards(dynastyId, 2026)).toEqual([]);
  });
});
