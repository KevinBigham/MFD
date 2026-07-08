import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FranchiseLegends } from './FranchiseLegends';

const { teamThemeVarsMock } = vi.hoisted(() => ({
  teamThemeVarsMock: vi.fn(() => ({
    '--mfd-team-primary': '#cc2200',
    '--mfd-team-secondary': '#22cc00',
    '--mfd-team-tertiary': '#0022cc',
  })),
}));

function createHallOfFamer(index: number, teamId = 'team-1') {
  return {
    playerId: `hof-${index}`,
    name: `Legend ${index}`,
    position: index % 2 === 0 ? 'QB' : 'WR',
    inductionYear: 2030 + index,
    peakOvr: 90 - (index % 5),
    careerYears: 10,
    score: 125 - index,
    awards: {
      mvps: index % 3,
      allPros: 3,
      proBowls: 5,
      championships: 2,
    },
    highlights: [`Legend ${index} changed the franchise.`],
    teams: [teamId],
  };
}

const baseState = () => ({
  game: {
    year: 2033,
    teams: {
      'team-1': {
        id: 'team-1',
        city: 'Chicago',
        name: 'Blaze',
        abbr: 'CHI',
        retiredJerseys: [
          {
            id: 'jr-1',
            playerId: 'qb-1',
            playerName: 'Cole Stone',
            pos: 'QB',
            jerseyNumber: 12,
            teamId: 'team-1',
            year: 2031,
            peakOvr: 96,
            seasonsWithTeam: 8,
            championships: 2,
            headline: 'Chicago retires #12',
            ceremony: 'Banner night.',
            legacyScore: 99,
          },
        ],
      },
    },
    players: {
      'qb-1': {
        id: 'qb-1',
        name: 'Cole Stone',
        pos: 'QB',
      },
      'qb-2': {
        id: 'qb-2',
        name: 'Jace North',
        pos: 'QB',
      },
    },
    franchiseHistory: [
      { year: 2032, teamId: 'team-1', wins: 13, losses: 4, ties: 0, record: '13-4', pointDifferential: 102, playoffFinish: 'champion' },
      { year: 2031, teamId: 'team-1', wins: 11, losses: 6, ties: 0, record: '11-6', pointDifferential: 54, playoffFinish: 'divisional' },
      { year: 2028, teamId: 'team-1', wins: 12, losses: 5, ties: 0, record: '12-5', pointDifferential: 88, playoffFinish: 'champion' },
      { year: 2024, teamId: 'team-1', wins: 8, losses: 9, ties: 0, record: '8-9', pointDifferential: -12, playoffFinish: 'missed_playoffs' },
      { year: 2019, teamId: 'team-1', wins: 6, losses: 10, ties: 0, record: '6-10', pointDifferential: -54, playoffFinish: 'missed_playoffs' },
    ],
    farewellTours: [
      {
        playerId: 'qb-1',
        playerName: 'Cole Stone',
        teamId: 'team-1',
        finalSeason: true,
        announcedWeek: 14,
        moments: [
          {
            week: 16,
            type: 'final_home_game',
            opponent: 'Detroit',
            narrative: 'Cole took one last home tunnel walk.',
          },
        ],
      },
      {
        playerId: 'qb-road',
        playerName: 'Road Legend',
        teamId: 'team-2',
        finalSeason: true,
        announcedWeek: 13,
        moments: [
          {
            week: 15,
            type: 'gift_exchange',
            opponent: 'Chicago',
            narrative: 'A road tribute.',
          },
        ],
      },
    ],
    hallOfFame: Array.from({ length: 12 }, (_, index) => createHallOfFamer(index + 1)),
    coachingHistory: [
      {
        coachId: 'coach-1',
        name: 'Terry Vale',
        archetype: 'aggressive',
        age: 58,
        seasonsCoached: 8,
        wins: 70,
        losses: 40,
        championships: 2,
        awards: 1,
        retired: false,
        teams: [{ teamId: 'team-1', startYear: 2027, endYear: 2032, wins: 70, losses: 40, championships: 2 }],
      },
      {
        coachId: 'coach-2',
        name: 'Miles Kerr',
        archetype: 'builder',
        age: 64,
        seasonsCoached: 6,
        wins: 42,
        losses: 54,
        championships: 0,
        awards: 0,
        retired: true,
        teams: [{ teamId: 'team-1', startYear: 2021, endYear: 2026, wins: 42, losses: 54, championships: 0 }],
      },
    ],
    playerSeasonHistory: {
      'qb-1': [
        { playerId: 'qb-1', season: 2032, age: 30, ovr: 95, teamId: 'team-1', gamesPlayed: 17, gamesStarted: 17, keyStats: { passYds: 4710 } },
      ],
      'qb-2': [
        { playerId: 'qb-2', season: 2028, age: 28, ovr: 88, teamId: 'team-1', gamesPlayed: 17, gamesStarted: 17, keyStats: { passYds: 4395 } },
      ],
    },
    playerArchive: [
      {
        playerId: 'qb-1',
        firstName: 'Cole',
        lastName: 'Stone',
        name: 'Cole Stone',
        positions: ['QB'],
        jerseyNumber: 12,
        peakOvr: 96,
        peakYear: 2032,
        firstYear: 2025,
        lastYear: 2032,
        retirementYear: null,
        teamHistory: [{ teamId: 'team-1', firstYear: 2025, lastYear: 2032 }],
      },
      {
        playerId: 'qb-2',
        firstName: 'Jace',
        lastName: 'North',
        name: 'Jace North',
        positions: ['QB'],
        jerseyNumber: 7,
        peakOvr: 89,
        peakYear: 2028,
        firstYear: 2026,
        lastYear: 2029,
        retirementYear: 2029,
        teamHistory: [{ teamId: 'team-1', firstYear: 2026, lastYear: 2029 }],
      },
    ],
  },
  team: {
    id: 'team-1',
    city: 'Chicago',
    name: 'Blaze',
    abbr: 'CHI',
    retiredJerseys: [
      {
        id: 'jr-1',
        playerId: 'qb-1',
        playerName: 'Cole Stone',
        pos: 'QB',
        jerseyNumber: 12,
        teamId: 'team-1',
        year: 2031,
        peakOvr: 96,
        seasonsWithTeam: 8,
        championships: 2,
        headline: 'Chicago retires #12',
        ceremony: 'Banner night.',
        legacyScore: 99,
      },
    ],
  },
});

type MockState = Omit<ReturnType<typeof baseState>, 'team'> & {
  team: ReturnType<typeof baseState>['team'] | null;
};

let mockState: MockState = baseState();

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => state.team,
}));

vi.mock('../shared/pixelUi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../shared/pixelUi')>();
  return {
    ...actual,
    teamThemeVars: teamThemeVarsMock,
  };
});

describe('FranchiseLegends', () => {
  beforeEach(() => {
    mockState = baseState();
    teamThemeVarsMock.mockClear();
  });

  it('renders the team header with founding year badges', () => {
    const markup = renderToStaticMarkup(<FranchiseLegends />);

    expect(markup).toContain('CHICAGO BLAZE');
    expect(markup).toContain('Franchise Legends');
    expect(markup).toContain('FOUNDED 2019');
    expect(markup).toContain('FRANCHISE LEGEND SOURCES');
    expect(markup).toContain('game.franchiseHistory');
    expect(markup).toContain('Championship rings and era buckets are derived from those rows.');
    expect(markup).toContain('game.players, game.playerArchive, game.hallOfFame, and game.playerSeasonHistory');
    expect(markup).toContain('saved game.hallOfFame and team.retiredJerseys');
    expect(markup).toContain('game.farewellTours');
    expect(markup).toContain('Starting a tour remains owned by the Player Profile action.');
    expect(markup).toContain('game.coachingHistory team stints');
    expect(markup).toContain('Opening /legends does not write franchise history, Hall of Fame entries, retired jerseys, coach history, season stats, player archives, or save sidecars.');
  });

  it('renders the totals strip from derived franchise history', () => {
    const markup = renderToStaticMarkup(<FranchiseLegends />);

    expect(markup).toContain('Championships');
    expect(markup).toContain('HOFers');
    expect(markup).toContain('Retired Numbers');
    expect(markup).toContain('Head Coaches');
    expect(markup).toContain('Seasons Played');
    expect(markup).toContain('Titles in franchise history');
  });

  it('renders championship ring rows with coach and starting quarterback details', () => {
    const markup = renderToStaticMarkup(<FranchiseLegends />);

    expect(markup.match(/data-testid="championship-ring-row"/g)).toHaveLength(2);
    expect(markup).toContain('2032 TITLE RUN');
    expect(markup).toContain('Coach: Terry Vale');
    expect(markup).toContain('Starting QB: Cole Stone');
    expect(markup).toContain('Season PD +102');
  });

  it('renders the championship empty state when the franchise has no titles', () => {
    mockState = {
      ...baseState(),
      game: {
        ...baseState().game,
        franchiseHistory: [
          { year: 2032, teamId: 'team-1', wins: 9, losses: 8, ties: 0, record: '9-8', pointDifferential: 12, playoffFinish: 'wild_card' },
        ],
      },
    };

    const markup = renderToStaticMarkup(<FranchiseLegends />);

    expect(markup).toContain('No championships yet. The next one starts with a season click.');
  });

  it('limits the hall of fame panel to the top ten entries', () => {
    const markup = renderToStaticMarkup(<FranchiseLegends />);

    expect(markup.match(/data-testid="hof-row"/g)).toHaveLength(10);
    expect(markup).toContain('#1 LEGEND 1');
    expect(markup).not.toContain('LEGEND 12');
  });

  it('renders retired numbers with the derived era label', () => {
    const markup = renderToStaticMarkup(<FranchiseLegends />);

    expect(markup).toContain('#12 COLE STONE');
    expect(markup).toContain('era 2025-2032');
  });

  it('renders active farewell tours from saved game state without starting tours', () => {
    const markup = renderToStaticMarkup(<FranchiseLegends />);

    expect(markup).toContain('ACTIVE FAREWELL TOURS');
    expect(markup).toContain('Source: saved game.farewellTours filtered to the current user team.');
    expect(markup).toContain('Player Profile starts tours through startFarewellTour');
    expect(markup.match(/data-testid="farewell-tour-row"/g)).toHaveLength(1);
    expect(markup).toContain('COLE STONE');
    expect(markup).toContain('ANNOUNCED WEEK 14');
    expect(markup).toContain('Week 16: FINAL HOME GAME vs Detroit - Cole took one last home tunnel walk.');
    expect(markup).not.toContain('ROAD LEGEND');
  });

  it('sorts coach roll call rows by hire year descending', () => {
    const markup = renderToStaticMarkup(<FranchiseLegends />);

    expect(markup.match(/data-testid="coach-roll-call-row"/g)).toHaveLength(2);
    expect(markup.indexOf('TERRY VALE')).toBeLessThan(markup.indexOf('MILES KERR'));
    expect(markup).toContain('WIN% 63.6%');
    expect(markup).toContain('2x TITLES');
  });

  it('renders era strip decade buckets with playoff and title counts', () => {
    const markup = renderToStaticMarkup(<FranchiseLegends />);

    expect(markup.match(/data-testid="era-strip-row"/g)).toHaveLength(3);
    expect(markup).toContain('2030s');
    expect(markup).toContain('2020s');
    expect(markup).toContain('2010s');
    expect(markup).toContain('Record 24-10 // Playoffs 2 // Titles 1');
  });

  it('renders the no-team fallback when no user team is loaded', () => {
    mockState = {
      ...baseState(),
      team: null,
    };

    const markup = renderToStaticMarkup(<FranchiseLegends />);

    expect(markup).toContain('No franchise is loaded.');
  });

  it('applies team theme vars to the franchise legends root container', () => {
    const markup = renderToStaticMarkup(<FranchiseLegends />);

    expect(teamThemeVarsMock).toHaveBeenCalledWith('team-1');
    expect(markup).toContain('--mfd-team-primary:#cc2200');
  });
});
