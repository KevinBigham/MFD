import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState } from '@mfd/engine';
import { computeDynastyChronicle } from './dynasty-chronicle';

let scrapbookEntries: Array<{ year: number; seasonHighlightLine: string; recap: { teamId: string } }> = [];
let playoffLoreCards: Array<{
  dynastyId: string;
  seasonYear: number;
  source: 'archived' | 'pending';
  card: {
    gameId: string;
    round: 'wild_card' | 'divisional' | 'conference' | 'super_bowl';
    outcome: 'win' | 'loss';
    headline: string;
    finalScore: string;
  };
}> = [];

vi.mock('./scrapbook-store', () => ({
  readScrapbookForDynasty: () => scrapbookEntries,
  listAllPlayoffLoreCards: () => playoffLoreCards,
}));

function createGame(): GameState {
  return {
    seed: 'seed-1',
    year: 2033,
    teams: {
      'team-1': { id: 'team-1', abbr: 'CHI' },
      'team-2': { id: 'team-2', abbr: 'DAL' },
    },
    franchiseHistory: [
      { year: 2032, teamId: 'team-1', record: '13-4', wins: 13, losses: 4, ties: 0, playoffFinish: 'champion' },
      { year: 2031, teamId: 'team-1', record: '11-6', wins: 11, losses: 6, ties: 0, playoffFinish: 'conference' },
      { year: 2029, teamId: 'team-1', record: '9-8', wins: 9, losses: 8, ties: 0, playoffFinish: 'wild_card' },
      { year: 2032, teamId: 'team-2', record: '10-7', wins: 10, losses: 7, ties: 0, playoffFinish: 'divisional' },
    ],
    hallOfFame: [
      {
        playerId: 'hof-1',
        name: 'Cole Stone',
        position: 'QB',
        inductionYear: 2032,
        peakOvr: 96,
        careerYears: 12,
        score: 140,
        awards: { mvps: 2, allPros: 4, proBowls: 6, championships: 2 },
        highlights: ['2x MVP'],
        teams: ['team-1'],
      },
      {
        playerId: 'hof-2',
        name: 'Legacy Back',
        position: 'RB',
        inductionYear: 2025,
        peakOvr: 91,
        careerYears: 10,
        score: 125,
        awards: { mvps: 0, allPros: 3, proBowls: 5, championships: 1 },
        highlights: ['1x champion'],
        teams: ['team-1'],
      },
    ],
    coachingHistory: [
      {
        coachId: 'coach-1',
        name: 'Terry Vale',
        archetype: 'aggressive',
        age: 60,
        seasonsCoached: 6,
        wins: 61,
        losses: 24,
        championships: 1,
        awards: 0,
        retired: true,
        teams: [{ teamId: 'team-1', startYear: 2030, endYear: 2032, wins: 37, losses: 14, championships: 1 }],
      },
      {
        coachId: 'coach-2',
        name: 'Older Coach',
        archetype: 'builder',
        age: 66,
        seasonsCoached: 12,
        wins: 88,
        losses: 72,
        championships: 0,
        awards: 0,
        retired: false,
        teams: [{ teamId: 'team-1', startYear: 2020, endYear: 2029, wins: 88, losses: 72, championships: 0 }],
      },
    ],
    playerArchive: [],
    playerSeasonHistory: {},
  } as unknown as GameState;
}

describe('computeDynastyChronicle', () => {
  beforeEach(() => {
    scrapbookEntries = [];
    playoffLoreCards = [];
  });

  it('returns an empty array for a dynasty with no matching history', () => {
    const game = createGame();

    expect(computeDynastyChronicle(game, 'seed-1:unknown-team:2030')).toEqual([]);
  });

  it('returns season-end events for franchise history in the dynasty window', () => {
    const game = createGame();

    const chronicle = computeDynastyChronicle(game, 'seed-1:team-1:2030');
    const seasonEvents = chronicle.filter((event) => event.type === 'season_end');

    expect(seasonEvents).toHaveLength(2);
    expect(seasonEvents).toEqual([
      expect.objectContaining({ type: 'season_end', year: 2032, teamAbbr: 'CHI', record: '13-4' }),
      expect.objectContaining({ type: 'season_end', year: 2031, teamAbbr: 'CHI', record: '11-6' }),
    ]);
  });

  it('aggregates every supported archive source into one event stream', () => {
    const game = createGame();
    scrapbookEntries = [
      { year: 2032, seasonHighlightLine: 'A title season lands in the scrapbook.', recap: { teamId: 'team-1' } },
    ];
    playoffLoreCards = [
      {
        dynastyId: 'seed-1:team-1:2030',
        seasonYear: 2032,
        source: 'archived',
        card: {
          gameId: 'g-1',
          round: 'super_bowl',
          outcome: 'win',
          headline: 'Chicago closes the deal.',
          finalScore: '31-24',
        },
      },
    ];

    const chronicle = computeDynastyChronicle(game, 'seed-1:team-1:2030');

    expect(chronicle).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'championship_win', year: 2032 }),
        expect.objectContaining({ type: 'hof_induction', year: 2032, playerName: 'Cole Stone' }),
        expect.objectContaining({ type: 'playoff_round', year: 2032, headline: 'Chicago closes the deal.' }),
        expect.objectContaining({ type: 'coach_hire', year: 2030, coachName: 'Terry Vale' }),
        expect.objectContaining({ type: 'coach_retire', year: 2032, coachName: 'Terry Vale' }),
        expect.objectContaining({ type: 'coach_championship', year: 2032, coachName: 'Terry Vale' }),
        expect.objectContaining({ type: 'scrapbook_note', year: 2032, headline: 'A title season lands in the scrapbook.' }),
      ]),
    );
  });

  it('sorts same-year events by chronicle priority before stable ids', () => {
    const game = createGame();
    scrapbookEntries = [
      { year: 2032, seasonHighlightLine: 'Scrapbook line', recap: { teamId: 'team-1' } },
    ];
    playoffLoreCards = [
      {
        dynastyId: 'seed-1:team-1:2030',
        seasonYear: 2032,
        source: 'archived',
        card: {
          gameId: 'g-1',
          round: 'super_bowl',
          outcome: 'win',
          headline: 'Title game lore',
          finalScore: '31-24',
        },
      },
    ];

    const chronicle = computeDynastyChronicle(game, 'seed-1:team-1:2030').filter((event) => event.year === 2032);

    expect(chronicle.map((event) => event.type)).toEqual([
      'championship_win',
      'hof_induction',
      'playoff_round',
      'season_end',
      'coach_championship',
      'coach_retire',
      'scrapbook_note',
    ]);
  });

  it('orders multi-year events newest first across mixed event kinds', () => {
    const game = createGame();

    const chronicle = computeDynastyChronicle(game, 'seed-1:team-1:2029');

    expect(chronicle[0]).toEqual(expect.objectContaining({ year: 2032 }));
    expect(chronicle[chronicle.length - 1]).toEqual(expect.objectContaining({ year: 2029 }));
  });

  it('returns an empty array for an invalid dynasty id', () => {
    const game = createGame();

    expect(computeDynastyChronicle(game, 'invalid')).toEqual([]);
  });
});
