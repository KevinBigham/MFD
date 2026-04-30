import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScoutingBoard } from './ScoutingBoard';

const mockState = {
  draftClass: [
    {
      id: 'prospect-1',
      firstName: 'Jalen',
      lastName: 'North',
      pos: 'WR',
      college: 'Texas',
      projectedRound: 1,
      scoutGrade: 82,
      combine: null,
      region: 'south',
      bloodline: {
        parentPlayerId: 'legend-wr',
        parentName: 'Marcus North',
        parentTeamId: 'user',
        parentPosition: 'WR',
        relationship: 'son',
        legacyTag: 'famous_name',
      },
    },
  ],
  offseasonState: {
    scoutingState: {
      'prospect-1': {
        prospectId: 'prospect-1',
        actions: ['film'],
        accuracy: 0.42,
        confidence: 42,
        visibleScoutGrade: 83,
        notes: ['Film: explosive release package.'],
        proDayRating: null,
        assignedScoutId: 'scout-1',
        riskBand: 'balanced',
        ceilingBand: 'impact',
        characterRead: 'steady',
        privateWorkoutRatings: [],
      },
    },
    scoutingWatchlist: ['prospect-1'],
  },
  scoutingDepartment: {
    scouts: [
      { id: 'scout-1', name: 'Avery Mason', tier: 'good', specialty: 'WR', salary: 1.5, accuracy: 0.87, scope: 'regional', region: 'south' },
    ],
    availableScouts: [
      { id: 'scout-2', name: 'Jordan Hayes', tier: 'elite', specialty: null, salary: 2.2, accuracy: 0.93, scope: 'national', region: null },
    ],
    budget: 4.2,
    maxScouts: 5,
    privateWorkoutsRemaining: 2,
  },
  userTeamNeeds: { criticalNeeds: ['WR'] },
  actions: {
    fireScout: () => Promise.resolve(),
    hireScout: () => Promise.resolve(),
    runProDay: () => Promise.resolve(),
    runScoutingAction: () => Promise.resolve(),
    runPrivateWorkout: () => Promise.resolve(),
    toggleScoutingWatchlist: () => Promise.resolve(),
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectDraftClass: (state: typeof mockState) => state.draftClass,
  selectOffseasonState: (state: typeof mockState) => state.offseasonState,
  selectScoutingDepartment: (state: typeof mockState) => state.scoutingDepartment,
  selectUserTeamNeeds: (state: typeof mockState) => state.userTeamNeeds,
}));

describe('ScoutingBoard', () => {
  it('renders watchlist controls, workout budget, and scouting filters', () => {
    const markup = renderToStaticMarkup(<ScoutingBoard />);

    expect(markup).toContain('SCOUTING BOARD');
    expect(markup).toContain('PRIVATE WORKOUTS');
    expect(markup).toContain('WATCHLIST');
    expect(markup).toContain('Watchlist Only');
    expect(markup).toContain('Critical Needs');
    expect(markup).toContain('south');
    expect(markup).toContain('Bloodline');
    expect(markup).toContain('Lineage: son of Marcus North');
    expect(markup).toContain('balanced');
    expect(markup).toContain('steady');
    expect(markup).toContain('Compare');
    expect(markup).toContain('Scout Desk // Authored Read');
    expect(markup).toContain('Good route runner on three-level tree. Sharp on slants, digs, outs.');
  });
});
