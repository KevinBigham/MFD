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
      ],
    },
  ],
  playoffPicture: {
    afc: [{ seed: 1, teamId: 'team-1', teamName: 'Chicago City of Broad Shoulders Deep-Dish', teamIcon: 'chi', divisionWinner: true, indicator: 'X' }],
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
    expect(markup).toContain('AFC EAST');
    expect(markup).toContain('Chicago City of Broad Shoulders Deep-Dish');
    expect(markup).toContain('PLAYOFF PICTURE');
    expect(markup).toContain('STAT LEADERS');
    expect(markup).toContain('Jay Stone');
  });
});
