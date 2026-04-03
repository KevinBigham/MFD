import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GamePlanSetup } from './GamePlanSetup';

const mockState = {
  week: 11,
  year: 2029,
  phase: 'regular_season',
  userTeam: {
    id: 'team-1',
    city: 'Chicago',
    name: 'Blaze',
    roster: [
      { id: 'qb-1', name: 'Jay Stone', pos: 'QB', ovr: 87 },
      { id: 'wr-1', name: 'Keenan Ward', pos: 'WR', ovr: 83 },
    ],
  },
  currentWeeklyPrepPlan: null,
  currentOpponentReport: {
    teamId: 'team-2',
    teamName: 'Austin Armadillos',
    record: '7-3',
    offenseRank: 5,
    defenseRank: 21,
    strengths: ['Vertical passing game can stress the secondary.'],
    weaknesses: ['Secondary is vulnerable to sustained passing pressure.'],
    keyPlayers: [{ id: 'opp-1', name: 'Rex Cole', pos: 'CB', ovr: 72 }],
    schemeRecommendation: {
      offense: 'pass_heavy',
      defense: 'coverage',
      reasoning: 'Attack the weak secondary and keep the lid on their pass game.',
    },
  },
  currentOpponentIntel: {
    opponentTeamId: 'team-2',
    attackLane: 'passing',
    defendLane: 'passing',
    dangerPlayers: [{ id: 'opp-2', name: 'Zane Cross', pos: 'WR', ovr: 86 }],
    weakLinks: [{ id: 'opp-3', name: 'Rex Cole', pos: 'CB', ovr: 72 }],
    tendencies: ['Austin leans on explosive pass game.'],
    recommendations: {
      offense: ['Stress the secondary early.'],
      defense: ['Disrupt the quarterback and close explosives.'],
    },
  },
  actions: {
    saveWeeklyPrepPlan: () => Promise.resolve(),
    clearWeeklyPrepPlan: () => Promise.resolve(),
    advanceWeek: () => Promise.resolve(null),
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectWeek: (state: typeof mockState) => state.week,
  selectYear: (state: typeof mockState) => state.year,
  selectPhase: (state: typeof mockState) => state.phase,
  selectUserTeam: (state: typeof mockState) => state.userTeam,
  selectCurrentWeeklyPrepPlan: (state: typeof mockState) => state.currentWeeklyPrepPlan,
  selectCurrentOpponentReport: (state: typeof mockState) => state.currentOpponentReport,
  selectCurrentOpponentIntel: (state: typeof mockState) => state.currentOpponentIntel,
}));

describe('GamePlanSetup', () => {
  it('renders the scouting report and recommendation-driven controls', () => {
    const markup = renderToStaticMarkup(<GamePlanSetup />);

    expect(markup).toContain('WEEKLY PREP');
    expect(markup).toContain('Austin Armadillos');
    expect(markup).toContain('7-3');
    expect(markup).toContain('Attack lane: passing');
    expect(markup).toContain('Stress the secondary early.');
    expect(markup).toContain('Save Weekly Prep &amp; Sim');
    expect(markup).toContain('Skip With Auto Prep');
  });
});
