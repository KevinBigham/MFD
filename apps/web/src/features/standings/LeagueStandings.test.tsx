import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LeagueStandings } from './LeagueStandings';

const mockState = {
  standings: [
    {
      conference: 'AFC',
      division: 'East',
      rows: [
        {
          rank: 1,
          teamId: 'team-1',
          teamName: 'Chicago City of Broad Shoulders Deep-Dish',
          teamIcon: 'chi',
          wins: 10,
          losses: 3,
          ties: 0,
          pct: 0.769,
          pointsFor: 340,
          pointsAgainst: 280,
          pointDifferential: 60,
          streak: 4,
          homeRecord: '5-1',
          awayRecord: '5-2',
        },
        {
          rank: 4,
          teamId: 'team-4',
          teamName: 'Milwaukee Frost Line',
          teamIcon: 'mil',
          wins: 7,
          losses: 6,
          ties: 0,
          pct: 0.538,
          pointsFor: 288,
          pointsAgainst: 282,
          pointDifferential: 6,
          streak: -3,
          homeRecord: '4-2',
          awayRecord: '3-4',
        },
        {
          rank: 8,
          teamId: 'team-8',
          teamName: 'Canton Factory Lights',
          teamIcon: 'can',
          wins: 3,
          losses: 10,
          ties: 0,
          pct: 0.231,
          pointsFor: 210,
          pointsAgainst: 320,
          pointDifferential: -110,
          streak: 2,
          homeRecord: '2-5',
          awayRecord: '1-5',
        },
        {
          rank: 9,
          teamId: 'team-12',
          teamName: 'Toledo River Kings',
          teamIcon: 'tol',
          wins: 2,
          losses: 11,
          ties: 0,
          pct: 0.154,
          pointsFor: 190,
          pointsAgainst: 330,
          pointDifferential: -140,
          streak: 1,
          homeRecord: '1-6',
          awayRecord: '1-5',
        },
      ],
    },
  ],
  playoffPicture: {
    afc: [
      { seed: 1, teamId: 'team-1', teamName: 'Chicago City of Broad Shoulders Deep-Dish', teamIcon: 'chi', divisionWinner: true, indicator: 'X' },
      { seed: 2, teamId: 'team-2', teamName: 'Cleveland Lakeshore', teamIcon: 'cle', divisionWinner: true, indicator: '' },
      { seed: 3, teamId: 'team-3', teamName: 'Pittsburgh Iron', teamIcon: 'pit', divisionWinner: true, indicator: '' },
      { seed: 4, teamId: 'team-4', teamName: 'Milwaukee Frost Line', teamIcon: 'mil', divisionWinner: false, indicator: '' },
      { seed: 5, teamId: 'team-5', teamName: 'Columbus Aviators', teamIcon: 'col', divisionWinner: false, indicator: '' },
      { seed: 6, teamId: 'team-6', teamName: 'Detroit Motors', teamIcon: 'det', divisionWinner: false, indicator: '' },
      { seed: 7, teamId: 'team-7', teamName: 'Indianapolis Speed', teamIcon: 'ind', divisionWinner: false, indicator: '' },
      { seed: 8, teamId: 'team-8', teamName: 'Canton Factory Lights', teamIcon: 'can', divisionWinner: false, indicator: '' },
    ],
    nfc: [{ seed: 1, teamId: 'team-9', teamName: 'Seattle Emerald City Grunge', teamIcon: 'sea', divisionWinner: true, indicator: '' }],
  },
  statLeaders: {
    passYds: [{ playerId: 'p1', playerName: 'Jay Stone', teamName: 'Chicago City of Broad Shoulders Deep-Dish', value: 3800 }],
    rushYds: [{ playerId: 'p2', playerName: 'Rick Mason', teamName: 'Chicago City of Broad Shoulders Deep-Dish', value: 1200 }],
    recYds: [{ playerId: 'p3', playerName: 'Ace Reed', teamName: 'Chicago City of Broad Shoulders Deep-Dish', value: 1180 }],
    sacks: [{ playerId: 'p4', playerName: 'Duke Hall', teamName: 'Austin Armadillos', value: 12 }],
    defINT: [{ playerId: 'p5', playerName: 'Ty Knox', teamName: 'Seattle Emerald City Grunge', value: 6 }],
  },
  userTeam: { id: 'team-1' },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectStandings: (state: typeof mockState) => state.standings,
  selectPlayoffPicture: (state: typeof mockState) => state.playoffPicture,
  selectStatLeaders: (state: typeof mockState) => state.statLeaders,
  selectUserTeam: (state: typeof mockState) => state.userTeam,
}));

describe('LeagueStandings', () => {
  it('renders standings tables, playoff picture, and leader panels', () => {
    const markup = renderToStaticMarkup(<LeagueStandings />);

    expect(markup).toContain('LEAGUE STANDINGS');
    expect(markup).toContain('NEXT CALL');
    expect(markup).toContain('Read the division math first');
    expect(markup).toContain('data-mfd-table-responsive="cards"');
    expect(markup).toContain('AFC EAST');
    expect(markup).toContain('Chicago City of Broad Shoulders Deep-Dish');
    expect(markup).toContain('8 seeds / conference');
    expect(markup).toContain('PLAYOFF PICTURE');
    expect(markup).toContain('STAT LEADERS');
    expect(markup).toContain('Jay Stone');
  });

  it('labels standings sources without implying route-time writes', () => {
    const markup = renderToStaticMarkup(<LeagueStandings />);

    expect(markup).toContain('STANDINGS SOURCES');
    expect(markup).toContain('selectStandings maps STANDINGS_DIVISIONS through getDivisionStandings');
    expect(markup).toContain('1 divisions / 4 teams');
    expect(markup).toContain('selectPlayoffPicture reads the playoff-picture helper output');
    expect(markup).toContain('9 seeds');
    expect(markup).toContain('selectStatLeaders reads current player and team season stats through getStatLeaders');
    expect(markup).toContain('5 leaders');
    expect(markup).toContain('Opening League Standings does not play scheduled games, click Advance Week, write playoff brackets');
  });

  it('renders division-leader laurel for the top team in a division', () => {
    const markup = renderToStaticMarkup(<LeagueStandings />);

    expect(markup).toContain('data-division-leader-row="true"');
    expect(markup).toContain('data-standings-signal="division_leader"');
  });

  it('renders locked seed signal for top-three playoff seeds', () => {
    const markup = renderToStaticMarkup(<LeagueStandings />);

    expect(markup).toContain('data-standings-signal="seed_locked"');
    expect(markup).toContain('Playoff seed locked');
  });

  it('renders bubble seed signal for playoff seeds after the locked group', () => {
    const markup = renderToStaticMarkup(<LeagueStandings />);

    expect(markup).toContain('data-standings-signal="seed_bubble"');
    expect(markup).toContain('Playoff bubble');
    expect(markup).toContain('Canton Factory Lights');
  });

  it('renders out signal for non-playoff teams', () => {
    const markup = renderToStaticMarkup(<LeagueStandings />);

    expect(markup).toContain('data-standings-signal="seed_out"');
    expect(markup).toContain('Outside playoff picture');
  });

  it('renders streak signals without removing the text streak label', () => {
    const markup = renderToStaticMarkup(<LeagueStandings />);

    expect(markup).toContain('data-standings-signal="fire"');
    expect(markup).toContain('data-standings-signal="ice"');
    expect(markup).toContain('W4');
    expect(markup).toContain('L3');
  });
});
