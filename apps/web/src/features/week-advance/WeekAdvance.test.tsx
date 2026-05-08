import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WeekAdvance } from './WeekAdvance';

const mockState = {
  team: {
    id: 'team-1',
    city: 'Chicago',
    name: 'Blaze',
    capSpace: 18,
    schemeOff: 'spread',
    schemeDef: 'cover_3',
  },
  roster: [
    { id: 'qb-1', isStarter: true, injury: null },
    { id: 'rb-1', isStarter: true, injury: null },
  ],
  week: 11,
  year: 2031,
  schedule: [
    {
      week: 11,
      games: [{ homeTeamId: 'team-1', awayTeamId: 'team-2', result: null }],
    },
  ],
  latestSummary: null,
  offseasonState: null,
  phase: 'regular_season',
  teams: {
    'team-2': { id: 'team-2', city: 'Austin', name: 'Armadillos', wins: 7, losses: 3, schemeOff: 'power', schemeDef: 'base' },
  },
  currentGamePlan: null,
  actions: {
    advanceWeek: () => Promise.resolve(null),
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectCurrentGamePlan: (state: typeof mockState) => state.currentGamePlan,
  selectLatestSummary: (state: typeof mockState) => state.latestSummary,
  selectOffseasonState: (state: typeof mockState) => state.offseasonState,
  selectPhase: (state: typeof mockState) => state.phase,
  selectRoster: (state: typeof mockState) => state.roster,
  selectSchedule: (state: typeof mockState) => state.schedule,
  selectTeams: (state: typeof mockState) => state.teams,
  selectUserTeam: (state: typeof mockState) => state.team,
  selectWeek: (state: typeof mockState) => state.week,
  selectYear: (state: typeof mockState) => state.year,
}));

describe('WeekAdvance', () => {
  it('shows the soft game-plan gate when no plan is set for a played week', () => {
    const markup = renderToStaticMarkup(<WeekAdvance />);

    expect(markup).toContain('GAME PLAN');
    expect(markup).toContain('Plan Needed');
    expect(markup).toContain('Prepare Game Plan');
    expect(markup).toContain('DECISION IMPACT');
    expect(markup).toContain('2 open checks travel into the sim.');
  });
});
