import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GamePlanSetup } from './GamePlanSetup';

const mockState = {
  week: 11,
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
  currentGamePlan: null,
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
  actions: {
    saveGamePlan: () => Promise.resolve(),
    clearGamePlan: () => Promise.resolve(),
    advanceWeek: () => Promise.resolve(null),
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectWeek: (state: typeof mockState) => state.week,
  selectPhase: (state: typeof mockState) => state.phase,
  selectUserTeam: (state: typeof mockState) => state.userTeam,
  selectCurrentGamePlan: (state: typeof mockState) => state.currentGamePlan,
  selectCurrentOpponentReport: (state: typeof mockState) => state.currentOpponentReport,
}));

describe('GamePlanSetup', () => {
  it('renders the scouting report and recommendation-driven controls', () => {
    const markup = renderToStaticMarkup(<GamePlanSetup />);

    expect(markup).toContain('GAME PLAN');
    expect(markup).toContain('Austin Armadillos');
    expect(markup).toContain('7-3');
    expect(markup).toContain('pass_heavy');
    expect(markup).toContain('coverage');
    expect(markup).toContain('Confirm &amp; Sim');
    expect(markup).toContain('Skip With AI Plan');
  });
});
