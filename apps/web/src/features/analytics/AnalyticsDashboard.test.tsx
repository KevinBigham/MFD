import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnalyticsDashboard } from './AnalyticsDashboard';

const mockState = {
  userTeam: { id: 'team-1', city: 'Chicago', name: 'Blaze' },
  roster: [
    {
      id: 'p1',
      name: 'Jay Stone',
      pos: 'QB',
      stats: { passYds: 3810, passTD: 31, passINT: 8, passAtt: 470, passComp: 316, rushYds: 0, rushAtt: 0, recYds: 0, targets: 0, sacks: 0, defINT: 0, tackles: 0, fgMade: 0, fgAtt: 0, gamesPlayed: 13, yacYds: 0 },
    },
    {
      id: 'p2',
      name: 'Rick Mason',
      pos: 'RB',
      stats: { passYds: 0, passTD: 0, passINT: 0, passAtt: 0, passComp: 0, rushYds: 1264, rushAtt: 241, recYds: 212, targets: 31, sacks: 0, defINT: 0, tackles: 0, fgMade: 0, fgAtt: 0, gamesPlayed: 13, yacYds: 144 },
    },
  ],
  teams: {
    'team-1': { city: 'Chicago', name: 'Blaze' },
    'team-2': { city: 'Austin', name: 'Armadillos' },
  },
  advancedStats: {
    stats: { qbr: 71.2, epa: 4.8, successRate: 0.69, yac: 118.4, pressureRate: 0.08, thirdDownRate: 0.47, redZoneRate: 0.63, turnoverRate: 1.1 },
    ranks: { offense: 4, defense: 8, specialTeams: 11 },
    teamRankings: { offense: [], defense: [], specialTeams: [] },
  },
  analyticsLeaders: {
    passYds: [{ playerId: 'p1', teamId: 'team-1', name: 'Jay Stone', value: 3810 }],
    rushYds: [{ playerId: 'p2', teamId: 'team-1', name: 'Rick Mason', value: 1264 }],
    recYds: [{ playerId: 'p3', teamId: 'team-2', name: 'Ace Reed', value: 1181 }],
    sacks: [{ playerId: 'p4', teamId: 'team-2', name: 'Duke Hall', value: 13 }],
    defINT: [{ playerId: 'p5', teamId: 'team-2', name: 'Ty Knox', value: 6 }],
  },
  comparison: {
    stat: 'passYds',
    playerA: { id: 'p1', name: 'Jay Stone', value: 3810, efficiency: 4.89 },
    playerB: { id: 'p2', name: 'Rick Mason', value: 1264, efficiency: 5.24 },
  },
  trends: {
    pointsFor: [24, 31, 20, 35, 28],
    pointDifferential: [3, 11, -4, 14, 7],
    thirdDownConversions: [5, 7, 4, 8, 6],
    redZoneScores: [2, 3, 1, 4, 3],
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => state.userTeam,
  selectRoster: (state: typeof mockState) => state.roster,
  selectTeams: (state: typeof mockState) => state.teams,
  selectAdvancedStats: (state: typeof mockState) => state.advancedStats,
  selectAnalyticsLeaders: (state: typeof mockState) => state.analyticsLeaders,
  selectPlayerComparison: () => (state: typeof mockState) => state.comparison,
  selectWeeklyTrend: (stat: keyof typeof mockState.trends) => (state: typeof mockState) => state.trends[stat],
}));

describe('AnalyticsDashboard', () => {
  it('renders advanced stats, player efficiency, comparison, and league leader sections', () => {
    const markup = renderToStaticMarkup(<AnalyticsDashboard />);

    expect(markup).toContain('ANALYTICS');
    expect(markup).toContain('--- TEAM OVERVIEW ---');
    expect(markup).toContain('--- PLAYER EFFICIENCY ---');
    expect(markup).toContain('--- PLAYER COMPARISON ---');
    expect(markup).toContain('Jay Stone');
    expect(markup).toContain('--- WEEKLY TREND ---');
    expect(markup).toContain('--- LEAGUE LEADERS ---');
  });
});
