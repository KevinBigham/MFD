import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FATargetBoard, buildFATargetMarketReceipt } from './FATargetBoard';

const mockState = {
  phase: 'free_agency',
  team: { id: 'user', city: 'Chicago', name: 'Blaze' },
  game: {
    year: 2030,
    players: {
      'fa-1': { id: 'fa-1', name: 'Cole Hart', firstName: 'Cole', lastName: 'Hart', pos: 'CB', ovr: 87, age: 26 },
    },
    teams: {
      user: { id: 'user', city: 'Chicago', name: 'Blaze', isUser: true, roster: [] },
      'rival-1': {
        id: 'rival-1',
        city: 'Denver',
        name: 'Peak',
        isUser: false,
        roster: [
          { id: 'cpu-qb', name: 'Mason Pike', pos: 'QB', ovr: 88, age: 34, isStarter: true },
          { id: 'cpu-wr-1', name: 'Ari Knox', pos: 'WR', ovr: 84, age: 31, isStarter: true },
          { id: 'cpu-wr-2', name: 'Nico Bell', pos: 'WR', ovr: 80, age: 30, isStarter: true },
          { id: 'cpu-te', name: 'Cal Reed', pos: 'TE', ovr: 79, age: 30, isStarter: true },
          { id: 'cpu-ol', name: 'Jules Ward', pos: 'OL', ovr: 82, age: 32, isStarter: true },
          { id: 'cpu-dl', name: 'Owen Frost', pos: 'DL', ovr: 78, age: 29, isStarter: true },
        ],
        draftPicks: [
          { round: 1, year: 2031, currentTeamId: 'rival-1' },
          { round: 3, year: 2031, currentTeamId: 'rival-1' },
        ],
        capSpace: 38,
        capUsed: 212,
        deadCap: 5,
        gmStrategy: 'win_now',
        philosophy: 'maintain',
        wins: 0,
        losses: 0,
        ties: 0,
      },
    },
    teamNeedsCache: {},
    franchiseHistory: [],
    offseasonState: {
      freeAgencyBids: {
        'fa-1': [
          {
            playerId: 'fa-1',
            teamId: 'user',
            round: 2,
            years: 3,
            salary: 14.2,
            signingBonus: 4.5,
            guaranteed: 28,
            score: 83.1,
            status: 'lost',
          },
          {
            playerId: 'fa-1',
            teamId: 'rival-1',
            round: 2,
            years: 4,
            salary: 17.4,
            signingBonus: 7.2,
            guaranteed: 38,
            score: 91.2,
            status: 'won',
          },
        ],
      },
    },
  },
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
  scenarioState: null as any | null,
  actions: {
    refreshFATargetBoard: () => Promise.resolve(),
    toggleFATargetWatchlist: () => Promise.resolve(),
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectPhase: (state: typeof mockState) => state.phase,
  selectUserTeam: (state: typeof mockState) => state.team,
  selectScenarioState: (state: typeof mockState) => state.scenarioState,
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
    expect(markup).toContain('FA Market Receipt');
    expect(markup).toContain('Hot market');
    expect(markup).toContain('Cole Hart // CB // 91 fit, 62% sign probability, $14.2M projected.');
    expect(markup).toContain('Why they won');
    expect(markup).toContain('Denver Peak won Cole Hart at $17.4M in Round 2.');
    expect(markup).toContain('Saved bid receipt');
    expect(markup).toContain('You offered $14.2M ($3.2M less per year). Saved bid score: you 83.1, Denver Peak 91.2.');
    expect(markup).toContain('Compare');
  });

  it('builds deterministic market receipts from saved FA target rows', () => {
    type FATargetRow = Parameters<typeof buildFATargetMarketReceipt>[0];
    const baseTarget = mockState.board.targets[0]! as FATargetRow;
    const hotMarket = buildFATargetMarketReceipt(baseTarget);
    const fitWindow = buildFATargetMarketReceipt({
      ...baseTarget,
      marketDemand: 'medium',
      fitScore: 88,
      signProbability: 72,
      projectedSalary: 9,
      competingTeams: ['team-1'],
    });
    const longShot = buildFATargetMarketReceipt({
      ...baseTarget,
      marketDemand: 'low',
      fitScore: 70,
      signProbability: 34,
      projectedSalary: 18.5,
      competingTeams: [],
    });

    expect(hotMarket).toEqual({
      label: 'Hot market',
      detail: 'Cole Hart // CB // 91 fit, 62% sign probability, $14.2M projected. High league demand and 2 competing teams mean this target may require an early bid or a watchlist decision.',
      accent: 'red',
    });
    expect(fitWindow).toEqual({
      label: 'Fit window',
      detail: 'Cole Hart // CB // 88 fit, 72% sign probability, $9M projected. Strong fit plus workable signing odds make this a credible user-team target before the board refreshes.',
      accent: 'green',
    });
    expect(longShot).toEqual({
      label: 'Long shot',
      detail: 'Cole Hart // CB // 70 fit, 34% sign probability, $18.5M projected. Low signing odds and 0 competing teams make this planning intel, not a recommended spend by itself.',
      accent: 'gold',
    });
  });

  it('explains the saved target-board snapshot and watchlist boundary', () => {
    const markup = renderToStaticMarkup(<FATargetBoard />);

    expect(markup).toContain('BOARD SOURCE');
    expect(markup).toContain('Saved faTargetBoard');
    expect(markup).toContain('Refresh rewrites snapshot');
    expect(markup).toContain('Watchlist only');
    expect(markup).toContain('Target rows are planning guidance from the saved FA target-board snapshot');
    expect(markup).toContain('Refresh Board rebuilds that snapshot from current free agents, team needs, scheme fit, cap room, and league demand');
    expect(markup).toContain('Each visible row renders an FA Market Receipt from saved target fields');
    expect(markup).toContain('Watch and Unwatch update only the target-board watchlist');
    expect(markup).toContain('bids and signings still happen in the Free Agency Hub');
  });

  it('renders acquisition-lock planning guidance while leaving board actions available', () => {
    try {
      mockState.scenarioState = {
        activeScenario: {
          id: 'savant',
          name: 'The Savant',
          constraints: { blockTrades: true, blockFreeAgency: true, blockDraft: false },
        },
      };

      const markup = renderToStaticMarkup(<FATargetBoard />);

      expect(markup).toContain('SCENARIO LOCK');
      expect(markup).toContain('The Savant');
      expect(markup).toContain('ACQUISITIONS BLOCKED');
      expect(markup).toContain('BOARD OPEN');
      expect(markup).toContain('saved scenarioState.activeScenario.constraints.blockFreeAgency');
      expect(markup).toContain('FA target rows remain planning guidance');
      expect(markup).toContain('Refresh Board');
      expect(markup).toContain('Unwatch');
      expect(markup).toContain('ACQUISITIONS LOCKED');
    } finally {
      mockState.scenarioState = null;
    }
  });
});
