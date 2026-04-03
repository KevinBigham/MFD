import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PracticeSquad } from './PracticeSquad';

const mockState = {
  userTeam: { id: 'team-1', city: 'Chicago', name: 'Blaze', capSpace: 11.2 },
  userTeamId: 'team-1',
  practiceSquad: [
    { playerId: 'ps-1', elevationsUsed: 3, maxElevations: 3, isElevated: false },
    { playerId: 'ps-2', elevationsUsed: 1, maxElevations: 3, isElevated: false },
  ],
  roster: [
    { id: 'ps-1', name: 'Jay Reed', pos: 'WR', ovr: 68, age: 23, ratings: { speed: 88 } },
    { id: 'ps-2', name: 'Luke Vale', pos: 'LB', ovr: 66, age: 24, ratings: { speed: 77 } },
  ],
  practiceSquadCandidates: [
    { id: 'fa-1', name: 'Drew Moss', pos: 'WR', ovr: 64, age: 22, ratings: { speed: 84 } },
  ],
  actions: {
    elevatePSPlayer: () => Promise.resolve(),
    releasePSPlayer: () => Promise.resolve(),
    addToPracticeSquad: () => Promise.resolve(),
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => state.userTeam,
  selectUserTeamId: (state: typeof mockState) => state.userTeamId,
  selectPracticeSquad: (state: typeof mockState) => state.practiceSquad,
  selectRoster: (state: typeof mockState) => state.roster,
  selectPracticeSquadCandidates: (state: typeof mockState) => state.practiceSquadCandidates,
}));

describe('PracticeSquad', () => {
  it('renders squad slots, elevation usage, and available additions', () => {
    const markup = renderToStaticMarkup(<PracticeSquad />);

    expect(markup).toContain('PRACTICE SQUAD');
    expect(markup).toContain('Jay Reed');
    expect(markup).toContain('3 / 3');
    expect(markup).toContain('Elevation Maxed');
    expect(markup).toContain('Drew Moss');
    expect(markup).toContain('16 SLOT GRID');
  });
});
