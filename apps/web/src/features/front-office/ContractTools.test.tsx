import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ContractToolActionReceiptPanel,
  ContractTools,
  buildContractToolActionReceipt,
} from './ContractTools';

// ── Mock state ─────────────────────────────────────────

const cutPlayer = vi.fn();
const restructure = vi.fn();
const backload = vi.fn();
const engineMocks = vi.hoisted(() => ({
  projectContractCap: vi.fn((contract: unknown, startYear: number, seasons: number) =>
    Array.from({ length: seasons }, (_, offset) => ({
      year: startYear + offset,
      salaryCap: 280 + offset * 10,
      contractHit: contract && offset < 3 ? 38 : 0,
      deadIfCut: contract && offset < 3 ? 24 : 0,
      capSavingsIfCut: contract && offset < 3 ? 14 : 0,
      expired: !contract || offset >= 3,
    })),
  ),
  buildContractDecisionForecast: vi.fn((contract: unknown) => ({
    recommendedAction: contract ? 'restructure' : 'hold',
    actionLabel: contract ? 'Restructure' : 'Hold',
    severity: contract ? 'medium' : 'low',
    reversible: !contract,
    capSpaceDelta: contract ? 12.5 : 0,
    currentYearDeadCapDelta: 0,
    futureDeadCapDelta: contract ? 4.5 : 0,
    immediateImpact: contract ? 'Creates $12.5M of current-year cap space.' : 'No active contract.',
    thisSeasonImpact: 'Keeps the player on the roster while improving short-term flexibility.',
    futureImpact: 'More bonus proration is now attached to the deal.',
    risk: 'The move is hard to unwind.',
    ownerReaction: 'Ownership sees a cleaner current cap sheet.',
    playerReaction: 'Player camp usually welcomes guaranteed money.',
    mediaReaction: 'Media frames it as win-now accounting.',
    uncertainty: 'Future risk depends on health and age curve.',
    warnings: contract ? ['Future dead money pressure is material.'] : ['No contract selected.'],
  })),
}));

const baseContract = {
  baseSalary: 10,
  years: 3,
  prorated: 2,
  guaranteed: 6,
  voidYears: 0,
  restructured: false,
};

const mockState = {
  userTeam: {
    id: 'user',
    name: 'Blaze',
    capUsed: 214.6,
    capSpace: 28.4,
    deadCap: 18.2,
    roster: [
      {
        id: 'p1',
        name: 'Ace Cannon',
        pos: 'QB',
        contract: { ...baseContract, baseSalary: 30, prorated: 8 },
      },
      {
        id: 'p2',
        name: 'Brick Stone',
        pos: 'DL',
        contract: { ...baseContract, baseSalary: 12, prorated: 3 },
      },
      {
        id: 'p3',
        name: 'Rookie Smith',
        pos: 'WR',
        // No contract — should be filtered out of roster list.
      },
    ],
  },
  game: { year: 2026 },
  actions: { cutPlayer, restructure, backload },
};

// ── Mocks ──────────────────────────────────────────────

vi.mock('@mfd/engine', () => ({
  evaluateRestructureEligibility: (contract: { baseSalary: number } | null) =>
    contract
      ? {
          eligible: true,
          reason: 'Restructure available.',
          currentHit: contract.baseSalary + 2,
          projectedHit: contract.baseSalary,
          savings: 2,
          addedProration: 1,
          spreadYears: 3,
        }
      : { eligible: false, reason: 'No contract.', currentHit: 0, projectedHit: 0, savings: 0, addedProration: 0, spreadYears: 0 },
  evaluateBackloadEligibility: (contract: unknown, voids: number) =>
    contract
      ? {
          eligible: true,
          reason: `Backload adds ${voids} void year(s).`,
          currentHit: 38,
          projectedHit: 31,
          savings: 7,
          voidYearsAdded: voids,
          totalVoidYears: voids,
        }
      : { eligible: false, reason: 'No contract.', currentHit: 0, projectedHit: 0, savings: 0, voidYearsAdded: 0, totalVoidYears: 0 },
  evaluateStandardCutImpact: (contract: unknown) =>
    contract
      ? {
          eligible: true,
          reason: 'Cut frees cap space.',
          currentHit: 38,
          deadCap: 24,
          capSavings: 14,
        }
      : { eligible: false, reason: 'No contract.', currentHit: 0, deadCap: 0, capSavings: 0 },
  evaluatePostJune1CutImpact: (contract: unknown) =>
    contract
      ? {
          eligible: true,
          reason: 'Post-June 1 defers accelerated prorated bonus into next league year.',
          currentHit: 38,
          deadCap: 24,
          capSavings: 30,
          currentYearDead: 8,
          nextYearDead: 16,
        }
      : { eligible: false, reason: 'No contract.', currentHit: 0, deadCap: 0, capSavings: 0, currentYearDead: 0, nextYearDead: 0 },
  projectContractCap: engineMocks.projectContractCap,
  buildContractDecisionForecast: engineMocks.buildContractDecisionForecast,
}));

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => state.userTeam,
  selectRoster: (state: typeof mockState) => state.userTeam?.roster ?? [],
  selectYear: (state: typeof mockState) => state.game?.year ?? 2026,
}));

// ── Tests ──────────────────────────────────────────────

describe('ContractTools', () => {
  beforeEach(() => {
    cutPlayer.mockReset();
    restructure.mockReset();
    backload.mockReset();
    engineMocks.projectContractCap.mockClear();
    engineMocks.buildContractDecisionForecast.mockClear();
  });

  it('renders the contract tools header with team context', () => {
    const markup = renderToStaticMarkup(<ContractTools />);

    expect(markup).toContain('CONTRACT TOOLS');
    expect(markup).toContain('BLAZE');
    expect(markup).toContain('2 CONTRACTS');
  });

  it('renders team-level cap metric cards', () => {
    const markup = renderToStaticMarkup(<ContractTools />);

    expect(markup).toContain('CAP USED');
    expect(markup).toContain('CAP SPACE');
    expect(markup).toContain('DEAD CAP');
    expect(markup).toContain('ACTIVE DEALS');
  });

  it('labels contract tool sources, rule context, and commit boundaries', () => {
    const markup = renderToStaticMarkup(<ContractTools />);

    expect(markup).toContain('CONTRACT TOOL SOURCES');
    expect(markup).toContain('Roster Source');
    expect(markup).toContain('selectRoster supplies current user-team contract players');
    expect(markup).toContain('Preview Helpers');
    expect(markup).toContain('Rule Context');
    expect(markup).toContain('salary_cap_growth overrides surface in projections');
    expect(markup).toContain('Commit Boundary');
    expect(markup).toContain('rendering previews does not move players or write saves');
  });

  it('threads active GameState into projection and forecast helpers', () => {
    renderToStaticMarkup(<ContractTools />);

    expect(engineMocks.projectContractCap).toHaveBeenCalledWith(
      expect.objectContaining({ baseSalary: 30 }),
      2026,
      4,
      mockState.game,
    );
    expect(engineMocks.buildContractDecisionForecast).toHaveBeenCalledWith(
      expect.objectContaining({ baseSalary: 30 }),
      2026,
      expect.objectContaining({
        currentCapSpace: 28.4,
        voidYears: 2,
        game: mockState.game,
      }),
    );
  });

  it('lists only contract-bearing players in the roster panel', () => {
    const markup = renderToStaticMarkup(<ContractTools />);

    expect(markup).toContain('ROSTER');
    expect(markup).toContain('ACE CANNON');
    expect(markup).toContain('BRICK STONE');
    // Player without a contract should NOT appear.
    expect(markup).not.toContain('ROOKIE SMITH');
  });

  it('renders all four preview rows for the top-selected contract', () => {
    const markup = renderToStaticMarkup(<ContractTools />);

    expect(markup).toContain('DECISION FORECAST');
    expect(markup).toContain('RECOMMENDED');
    expect(markup).toContain('Player camp');
    expect(markup).toContain('Future dead money pressure is material.');
    expect(markup).toContain('RESTRUCTURE');
    expect(markup).toContain('BACKLOAD');
    expect(markup).toContain('CUT (STANDARD)');
    expect(markup).toContain('CUT (POST-JUNE 1)');
    // Cap savings dollar figures from the mocked previews should surface.
    expect(markup).toContain('$14.0M');
    expect(markup).not.toContain('CONTRACT ACTION RECEIPT');
  });

  it('renders the 4-year contract projection grid', () => {
    const markup = renderToStaticMarkup(<ContractTools />);

    expect(markup).toContain('4-YEAR CONTRACT PROJECTION');
    expect(markup).toContain('2026');
    expect(markup).toContain('2027');
    expect(markup).toContain('2028');
    expect(markup).toContain('2029');
    expect(markup).toContain('EXPIRED');
  });

  it('builds restructure receipts from the existing direct contract commit path', () => {
    const receipt = buildContractToolActionReceipt({
      action: 'restructure',
      player: mockState.userTeam.roster[0] as never,
      teamName: mockState.userTeam.name,
      currentYear: 2026,
      currentHit: 38,
      projectedHit: 31,
      capSavings: 7,
    });

    expect(receipt).toMatchObject({
      id: 'restructure:p1:2026',
      title: 'Restructure Applied',
      actionLabel: 'Restructure',
      accent: 'cyan',
    });
    expect(receipt.target).toContain('Ace Cannon // QB // Blaze // Y2026');
    expect(receipt.result).toContain('$7.0M of current-year cap space');
    expect(receipt.result).not.toContain('current-year room');
    expect(receipt.stateTouched).toContain('team cap totals');
    expect(receipt.source).toContain('actions.restructure -> restructureContract');
    expect(receipt.source).toContain('commitGame');
    expect(receipt.boundary).toContain('does not run another restructure');
    expect(receipt.boundary).toContain('reroll saved outcomes');
  });

  it('builds cut receipts without implying a second waiver or separate confirmation log write', () => {
    const receipt = buildContractToolActionReceipt({
      action: 'post_june_1_cut',
      player: mockState.userTeam.roster[0] as never,
      teamName: mockState.userTeam.name,
      currentYear: 2026,
      currentHit: 38,
      capSavings: 30,
      currentYearDead: 8,
      nextYearDead: 16,
    });

    expect(receipt).toMatchObject({
      id: 'post-june-1-cut:p1:2026',
      title: 'Post-June 1 Cut Processed',
      actionLabel: 'Post-June 1 Cut',
      accent: 'red',
    });
    expect(receipt.result).toContain('$8.0M dead cap this year');
    expect(receipt.result).toContain('$16.0M deferred to next year');
    expect(receipt.result).toContain('current-year cap space');
    expect(receipt.result).not.toContain('current-year room');
    expect(receipt.stateTouched).toContain('waiver wire');
    expect(receipt.source).toContain('actions.cutPlayer({ postJune1: true })');
    expect(receipt.boundary).toContain('does not cut another player');
    expect(receipt.boundary).toContain('separate confirmation log');
  });

  it('renders contract action receipt source copy and no-extra-write boundary', () => {
    const receipt = buildContractToolActionReceipt({
      action: 'standard_cut',
      player: mockState.userTeam.roster[0] as never,
      teamName: mockState.userTeam.name,
      currentYear: 2026,
      currentHit: 38,
      capSavings: 14,
      deadCap: 24,
    });

    const markup = renderToStaticMarkup(<ContractToolActionReceiptPanel receipt={receipt} />);

    expect(markup).toContain('CONTRACT ACTION RECEIPT');
    expect(markup).toContain('current-year cap space');
    expect(markup).not.toContain('current-year room');
    expect(markup).toContain('On-screen confirmation');
    expect(markup).toContain('Changed now');
    expect(markup).toContain('Action used');
    expect(markup).toContain('actions.cutPlayer -&gt; cutPlayerToWaiversEngine -&gt; commitGame');
    expect(markup).toContain('Did not also');
    expect(markup).toContain('This confirmation does not cut another player');
  });

  it('renders the no-team-loaded guard when userTeam is missing', () => {
    mockState.userTeam = null as never;
    const markup = renderToStaticMarkup(<ContractTools />);
    expect(markup).toContain('CONTRACT TOOLS');
    expect(markup).toContain('No team loaded.');
    // Restore for subsequent tests in other files (beforeEach of future imports).
    mockState.userTeam = {
      id: 'user',
      name: 'Blaze',
      capUsed: 214.6,
      capSpace: 28.4,
      deadCap: 18.2,
      roster: [],
    } as never;
  });
});
