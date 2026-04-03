import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TeamNeeds } from './TeamNeeds';

const mockState = {
  team: { id: 'user', city: 'Chicago', name: 'Blaze', isUser: true },
  teams: {
    user: { id: 'user', city: 'Chicago', name: 'Blaze', isUser: true },
    rival: { id: 'rival', city: 'Austin', name: 'Armadillos', isUser: false },
  },
  report: {
    overall: 'Competitive with a few soft spots',
    criticalNeeds: ['CB', 'OL', 'WR'],
    strengths: ['QB', 'DL', 'LB'],
    draftTargets: ['CB', 'OL', 'WR'],
    faTargets: ['CB', 'WR'],
    capFlexibility: 'moderate',
    positionGrades: [
      { group: 'QB', grade: 'A', avgOvr: 88, starterOvr: 90, depth: 2, ageRisk: 'low', topPlayer: { id: 'qb-1', name: 'Jay Stone', ovr: 92 }, weakestStarter: { id: 'qb-1', name: 'Jay Stone', ovr: 92 } },
      { group: 'CB', grade: 'F', avgOvr: 67, starterOvr: 64, depth: 2, ageRisk: 'medium', topPlayer: { id: 'cb-1', name: 'Ty Knox', ovr: 70 }, weakestStarter: { id: 'cb-2', name: 'Nate Cole', ovr: 64 } },
    ],
  },
  comparison: [
    { group: 'QB', teamAGrade: 'A', teamBGrade: 'B', edge: 'teamA', differential: 6 },
    { group: 'CB', teamAGrade: 'F', teamBGrade: 'C', edge: 'teamB', differential: -7 },
  ],
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectTeams: (state: typeof mockState) => state.teams,
  selectUserTeam: (state: typeof mockState) => state.team,
  selectUserTeamNeeds: (state: typeof mockState) => state.report,
  selectTeamNeedsComparison: () => (state: typeof mockState) => state.comparison,
}));

describe('TeamNeeds', () => {
  it('renders the team needs dashboard with critical needs and strengths', () => {
    const markup = renderToStaticMarkup(<TeamNeeds />);

    expect(markup).toContain('TEAM NEEDS');
    expect(markup).toContain('CRITICAL NEEDS');
    expect(markup).toContain('CB');
    expect(markup).toContain('Jay Stone');
  });
});
