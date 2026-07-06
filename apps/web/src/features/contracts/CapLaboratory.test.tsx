import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CapLaboratory, {
  CapLabExecutionReceiptPanel,
  buildCapLabExecutionReceipt,
} from './CapLaboratory';

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
    expect(markup).toContain('Cap Grade');
    expect(markup).toContain('Cap Space');
    expect(markup).toContain('Flex Score');
  });

  it('labels cap laboratory source and commit boundaries', () => {
    const markup = renderToStaticMarkup(<CapLaboratory />);

    expect(markup).toContain('CAP LAB SOURCES');
    expect(markup).toContain('useCapHealth');
    expect(markup).toContain('useCapCandidates');
    expect(markup).toContain('useMultiYearProjection');
    expect(markup).toContain('buildCapScenario(userTeam, game)');
    expect(markup).toContain('simulateMultipleMoves');
    expect(markup).toContain('actions.executeCapMoves(sandbox)');
    expect(markup).toContain('Opening /cap-lab');
    expect(markup).toContain('do not write saves');
    expect(markup).toContain('reroll saved outcomes');
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
    expect(markup).not.toContain('CAP LAB EXECUTION RECEIPT');
  });

  it('renders the multi-year projection table', () => {
    const markup = renderToStaticMarkup(<CapLaboratory />);

    expect(markup).toContain('MULTI-YEAR PROJECTION');
    expect(markup).toContain('2033');
    expect(markup).toContain('$280M');
    expect(markup).toContain('$103M');
  });

  it('opts cap tables into responsive card mode for phone viewports', () => {
    const markup = renderToStaticMarkup(<CapLaboratory />);

    expect(markup.match(/data-mfd-table-mode="cards"/g)).toHaveLength(2);
  });

  it('builds cap-lab execution receipts from the batch commit path', () => {
    const receipt = buildCapLabExecutionReceipt({
      moves: [
        { type: 'backload', playerId: 'p1', params: { voidYears: 1 } },
        { type: 'extend', playerId: 'p2', params: { years: 3, avgSalary: 18 } },
      ],
      capSpaceBefore: 28.4,
      capSpaceAfter: 41.9,
      capSaved: 13.5,
      warnings: ['Future dead cap pressure'],
      playerNames: { p1: 'Ace Cannon', p2: 'Brick Stone' },
    });

    expect(receipt).toMatchObject({
      id: 'cap-lab:backload:p1|extend:p2',
      title: 'Cap Lab Applied',
      accent: 'gold',
    });
    expect(receipt.summary).toContain('2 queued moves resolved');
    expect(receipt.summary).toContain('$13.5M preview saved');
    expect(receipt.moveSummary).toContain('Ace Cannon: Backload +1 void');
    expect(receipt.moveSummary).toContain('Brick Stone: Extend 3y @ $18M');
    expect(receipt.stateTouched).toContain('contract extension records');
    expect(receipt.source).toContain('actions.executeCapMoves');
    expect(receipt.source).toContain('commitGame');
    expect(receipt.boundary).toContain('does not reapply sandbox moves');
  });

  it('renders cap-lab execution receipt source copy and no-extra-write boundary', () => {
    const receipt = buildCapLabExecutionReceipt({
      moves: [{ type: 'post_june_1_cut', playerId: 'p1' }],
      capSpaceBefore: 28.4,
      capSpaceAfter: 36.4,
      capSaved: 8,
      playerNames: { p1: 'Ace Cannon' },
    });

    const markup = renderToStaticMarkup(<CapLabExecutionReceiptPanel receipt={receipt} />);

    expect(markup).toContain('CAP LAB EXECUTION RECEIPT');
    expect(markup).toContain('On-screen confirmation');
    expect(markup).toContain('Ace Cannon: Post-June-1 Cut');
    expect(markup).toContain('roster/waiver state');
    expect(markup).toContain('actions.executeCapMoves -&gt; buildCapScenario/simulate previews');
    expect(markup).toContain('Did not also');
    expect(markup).toContain('This confirmation does not reapply sandbox moves');
  });
});
