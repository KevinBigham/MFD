import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FATargetBoard } from './FATargetBoard';

const mockState = {
  phase: 'free_agency',
  team: { id: 'user', city: 'Chicago', name: 'Blaze' },
  board: {
    watchlist: ['fa-1'],
    targets: [
      {
        player: { id: 'fa-1', name: 'Cole Hart', pos: 'CB', ovr: 87, age: 26 },
        projectedSalary: 14.2,
        marketDemand: 'high',
        fitScore: 91,
        signProbability: 62,
        competingTeams: ['rival-1', 'rival-2'],
      },
    ],
    topAvailable: [],
    bestFits: [],
    bargains: [],
  },
  watchlistTargets: [
    {
      player: { id: 'fa-1', name: 'Cole Hart', pos: 'CB', ovr: 87, age: 26 },
      projectedSalary: 14.2,
      marketDemand: 'high',
      fitScore: 91,
      signProbability: 62,
      competingTeams: ['rival-1', 'rival-2'],
    },
  ],
  actions: {
    refreshFATargetBoard: () => Promise.resolve(),
    toggleFATargetWatchlist: () => Promise.resolve(),
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectPhase: (state: typeof mockState) => state.phase,
  selectUserTeam: (state: typeof mockState) => state.team,
  selectFATargetBoard: (state: typeof mockState) => state.board,
  selectWatchlistTargets: (state: typeof mockState) => state.watchlistTargets,
}));

describe('FATargetBoard', () => {
  it('renders the watchlist and market intel sections', () => {
    const markup = renderToStaticMarkup(<FATargetBoard />);

    expect(markup).toContain('FA TARGET BOARD');
    expect(markup).toContain('WATCHLIST');
    expect(markup).toContain('Cole Hart');
    expect(markup).toContain('62%');
  });
});
