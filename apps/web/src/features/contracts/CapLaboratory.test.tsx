import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CapLaboratory from './CapLaboratory';

const executeCapMoves = vi.fn();

const mockState = {
  game: {
    players: {
      p1: { id: 'p1', contract: { voidYears: 1 } },
    },
  },
  userTeam: {
    id: 'user',
    city: 'Chicago',
    name: 'Blaze',
    deadCap: 22,
  },
  capHealth: {
    grade: 'B',
    capSpace: 28.4,
    capUsed: 214.6,
    deadCapPct: 9,
    topHeavyScore: 61,
    flexibilityScore: 73,
    futureRisk: 22,
    recommendations: ['Restructure one premium veteran deal.'],
  },
  capCandidates: [
    {
      playerId: 'p1',
      playerName: 'Ace Cannon',
      pos: 'QB',
      capHit: 42.5,
      deadIfCut: 34.1,
      deadIfTraded: 31.7,
      savingsIfCut: 8.4,
      savingsIfTraded: 10.8,
      restructureSavings: 12.3,
      backloadSavings: 9.1,
      recommendation: 'restructure',
    },
    {
      playerId: 'p2',
      playerName: 'Brick Stone',
      pos: 'DL',
      capHit: 18.3,
      deadIfCut: 16.2,
      deadIfTraded: 15.4,
      savingsIfCut: 2.1,
      savingsIfTraded: 2.9,
      restructureSavings: 0,
      backloadSavings: 1.2,
      recommendation: 'hold',
    },
  ],
  projection: {
    years: [
      { year: 2033, capTotal: 280, committed: 211, deadCap: 18, available: 51, expiringContracts: ['Ace Cannon'], notes: [] },
      { year: 2034, capTotal: 291, committed: 176, deadCap: 12, available: 103, expiringContracts: ['Brick Stone'], notes: [] },
    ],
  },
  actions: {
    executeCapMoves,
  },
};

vi.mock('@mfd/engine', () => ({
  buildCapScenario: () => ({ teamId: 'user' }),
  simulateMultipleMoves: () => ({
    success: true,
    capSpaceBefore: 28.4,
    capSpaceAfter: 41.9,
    capSaved: 13.5,
    deadCapAdded: 0,
    warnings: [],
    details: 'Preview ready.',
    yearlyImpact: [],
    scenario: {
      projections: [
        { year: 2033, capTotal: 280, committed: 202, deadCap: 18, available: 60, expiringContracts: ['Ace Cannon'], notes: [] },
      ],
      currentDeadCap: 22,
    },
  }),
}));

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => state.userTeam,
  useCapHealth: () => mockState.capHealth,
  useCapCandidates: () => mockState.capCandidates,
  useMultiYearProjection: () => mockState.projection,
}));

describe('CapLaboratory', () => {
  beforeEach(() => {
    executeCapMoves.mockReset();
    mockState.capCandidates = [
      {
        playerId: 'p1',
        playerName: 'Ace Cannon',
        pos: 'QB',
        capHit: 42.5,
        deadIfCut: 34.1,
        deadIfTraded: 31.7,
        savingsIfCut: 8.4,
        savingsIfTraded: 10.8,
        restructureSavings: 12.3,
        backloadSavings: 9.1,
        recommendation: 'restructure',
      },
      {
        playerId: 'p2',
        playerName: 'Brick Stone',
        pos: 'DL',
        capHit: 18.3,
        deadIfCut: 16.2,
        deadIfTraded: 15.4,
        savingsIfCut: 2.1,
        savingsIfTraded: 2.9,
        restructureSavings: 0,
        backloadSavings: 1.2,
        recommendation: 'hold',
      },
    ];
  });

  it('renders the cap health header cards', () => {
    const markup = renderToStaticMarkup(<CapLaboratory />);

    expect(markup).toContain('CAP LABORATORY');
    expect(markup).toContain('CAP GRADE');
    expect(markup).toContain('CAP SPACE');
    expect(markup).toContain('FLEX SCORE');
  });

  it('renders the cap candidate table and selected player context', () => {
    const markup = renderToStaticMarkup(<CapLaboratory />);

    expect(markup).toContain('CAP CANDIDATES');
    expect(markup).toContain('Ace Cannon');
    expect(markup).toContain('Brick Stone');
    expect(markup).toContain('Cap hit $42.5M');
  });

  it('renders the empty sandbox state before moves are queued', () => {
    const markup = renderToStaticMarkup(<CapLaboratory />);

    expect(markup).toContain('QUEUED MOVES');
    expect(markup).toContain('No moves queued yet.');
    expect(markup).toContain('Apply Sandbox');
  });

  it('renders the multi-year projection table', () => {
    const markup = renderToStaticMarkup(<CapLaboratory />);

    expect(markup).toContain('MULTI-YEAR PROJECTION');
    expect(markup).toContain('2033');
    expect(markup).toContain('$280M');
    expect(markup).toContain('$103M');
  });
});
