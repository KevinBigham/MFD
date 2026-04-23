import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ContractTools } from './ContractTools';

// ── Mock state ─────────────────────────────────────────

const cutPlayer = vi.fn();
const restructure = vi.fn();
const backload = vi.fn();

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
  projectContractCap: (contract: unknown, startYear: number, seasons: number) =>
    Array.from({ length: seasons }, (_, offset) => ({
      year: startYear + offset,
      salaryCap: 280 + offset * 10,
      contractHit: contract && offset < 3 ? 38 : 0,
      deadIfCut: contract && offset < 3 ? 24 : 0,
      capSavingsIfCut: contract && offset < 3 ? 14 : 0,
      expired: !contract || offset >= 3,
    })),
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

    expect(markup).toContain('RESTRUCTURE');
    expect(markup).toContain('BACKLOAD');
    expect(markup).toContain('CUT (STANDARD)');
    expect(markup).toContain('CUT (POST-JUNE 1)');
    // Cap savings dollar figures from the mocked previews should surface.
    expect(markup).toContain('$14.0M');
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
