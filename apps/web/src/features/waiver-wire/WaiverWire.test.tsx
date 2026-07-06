import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WaiverWire, WaiverClaimReceiptPanel, buildWaiverClaimReceipt } from './WaiverWire';

const mockState = {
  userTeam: { id: 'team-1', city: 'Chicago', name: 'Blaze' },
  userTeamId: 'team-1',
  scenarioState: null as any,
  waiverBoard: [
    {
      playerId: 'p1',
      name: 'Keenan Ward',
      pos: 'WR',
      ovr: 79,
      age: 25,
      salary: 3.2,
      salaryLabel: 'No active contract',
      contractStatus: 'no_active_contract',
      releasedByTeamId: 'team-2',
      releasedByName: 'Austin Armadillos',
      countdown: 'Clears after 1 week advance',
      claimPending: true,
      canSubmitClaim: false,
      actionLabel: 'Claim Pending',
      statusLabel: 'Pending waiver run',
      lifecycleNote: 'If awarded, the player signs a one-year minimum deal with the claiming team.',
    },
    {
      playerId: 'p6',
      name: 'Open Claim',
      pos: 'CB',
      ovr: 72,
      age: 26,
      salary: 1.4,
      salaryLabel: 'No active contract',
      contractStatus: 'no_active_contract',
      releasedByTeamId: 'team-3',
      releasedByName: 'Denver Peaks',
      countdown: 'Clears after 2 week advances',
      claimPending: false,
      canSubmitClaim: true,
      actionLabel: 'Submit Claim',
      statusLabel: 'Open claim',
      lifecycleNote: 'Open claim resolves after week advance.',
    },
  ],
  waiverPriority: [
    { teamId: 'team-1', teamName: 'Chicago Blaze', priority: 1, isUser: true },
    { teamId: 'team-2', teamName: 'Austin Armadillos', priority: 2, isUser: false },
  ],
  claimResults: [
    {
      id: 'wr-1',
      year: 2031,
      week: 8,
      successfulClaims: [{ playerId: 'p2', playerName: 'Sam North', winningTeamName: 'Chicago Blaze' }],
      lostClaims: [{ playerId: 'p3', playerName: 'Drew Vale', winningTeamName: 'Austin Armadillos' }],
      clearedPlayers: [{ playerId: 'p4', playerName: 'Mason Pike', scopeLabel: 'League-wide clearance' }],
    },
  ],
  transactionLog: [
    { type: 'CUT', year: 2031, week: 7, playerId: 'p5', notes: 'Released to waivers' },
    { type: 'WAIVER_CLAIM', year: 2031, week: 8, playerId: 'p2', notes: 'Won priority claim' },
  ],
  actions: {
    submitWaiverClaim: () => Promise.resolve(),
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectScenarioState: (state: typeof mockState) => state.scenarioState,
  selectUserTeam: (state: typeof mockState) => state.userTeam,
  selectUserTeamId: (state: typeof mockState) => state.userTeamId,
  selectWaiverWireBoard: (state: typeof mockState) => state.waiverBoard,
  selectWaiverPriority: (state: typeof mockState) => state.waiverPriority,
  selectClaimResults: (state: typeof mockState) => state.claimResults,
  selectTransactionLog: (state: typeof mockState) => state.transactionLog,
}));

describe('WaiverWire', () => {
  it('renders the board, priority order, claim results, and transaction log', () => {
    const markup = renderToStaticMarkup(<WaiverWire />);

    expect(markup).toContain('WAIVER WIRE');
    expect(markup).toContain('Keenan Ward');
    expect(markup).toContain('Open Claim');
    expect(markup).toContain('Austin Armadillos');
    expect(markup).toContain('No active contract');
    expect(markup).toContain('Clears after 1 week advance');
    expect(markup).toContain('Pending waiver run');
    expect(markup).toContain('Claim Pending');
    expect(markup).toContain('Submit Claim');
    expect(markup).toContain('CLAIM RESULTS');
    expect(markup).toContain('Sam North');
    expect(markup).toContain('Mason Pike cleared to free agency // League-wide clearance');
    expect(markup).toContain('TRANSACTION LOG');
    expect(markup).toContain('WAIVER_CLAIM');
    expect(markup).not.toContain('WAIVER CLAIM RECEIPT');
  });

  it('renders scenario lock guidance when free-agent acquisitions block waiver claims', () => {
    mockState.scenarioState = {
      activeScenario: {
        id: 'savant',
        name: 'The Savant',
        constraints: { blockTrades: true, blockFreeAgency: true, blockDraft: false },
      },
    };

    try {
      const markup = renderToStaticMarkup(<WaiverWire />);

      expect(markup).toContain('SCENARIO LOCK');
      expect(markup).toContain('The Savant');
      expect(markup).toContain('WAIVER CLAIMS BLOCKED');
      expect(markup).toContain('Submit Claim buttons are disabled here');
      expect(markup).toContain('saved scenarioState.activeScenario.constraints.blockFreeAgency');
      expect(markup).toContain('blocked waiver claims');
      expect(markup).toContain('Claims locked');
      expect(markup).toContain('Scenario Locked');
      expect(markup).toContain('data-mfd-button-state="disabled"');
    } finally {
      mockState.scenarioState = null;
    }
  });

  it('builds waiver claim receipts from the existing claim-intent commit path', () => {
    const receipt = buildWaiverClaimReceipt({
      playerId: 'p6',
      playerName: 'Open Claim',
      playerPos: 'CB',
      teamName: 'Chicago Blaze',
      priorityLabel: '#1',
      salaryLabel: 'No active contract',
      contractStatus: 'no_active_contract',
      releasedByName: 'Denver Peaks',
      countdown: 'Clears after 2 week advances',
      lifecycleNote: 'If awarded, the player signs a one-year minimum deal with the claiming team.',
    });

    expect(receipt).toMatchObject({
      id: 'waiver-claim:p6',
      title: 'Waiver Claim Submitted',
      accent: 'green',
    });
    expect(receipt.target).toContain('Open Claim // CB // released by Denver Peaks // priority #1');
    expect(receipt.result).toContain('Chicago Blaze submitted claim intent for Open Claim');
    expect(receipt.result).toContain('award, loss, or clearance resolves during the next waiver run');
    expect(receipt.result).toContain('one-year minimum deal');
    expect(receipt.stateTouched).toContain('waiverClaims intent queue');
    expect(receipt.source).toContain('actions.submitWaiverClaim -> submitWaiverClaimEngine -> commitGame');
    expect(receipt.boundary).toContain('does not award the player');
    expect(receipt.boundary).toContain('reroll saved outcomes');
  });

  it('renders waiver claim receipt source copy and no-extra-write boundary', () => {
    const receipt = buildWaiverClaimReceipt({
      playerId: 'p6',
      playerName: 'Open Claim',
      playerPos: 'CB',
      teamName: 'Chicago Blaze',
      priorityLabel: '#1',
      salaryLabel: '$1.4M',
      contractStatus: 'active_contract',
      releasedByName: 'Denver Peaks',
      countdown: 'Clears after 2 week advances',
      lifecycleNote: 'Open claim resolves after week advance.',
    });

    const markup = renderToStaticMarkup(<WaiverClaimReceiptPanel receipt={receipt} />);

    expect(markup).toContain('WAIVER CLAIM RECEIPT');
    expect(markup).toContain('On-screen confirmation');
    expect(markup).toContain('Open Claim // CB // released by Denver Peaks // priority #1');
    expect(markup).toContain('Changed now');
    expect(markup).toContain('Action used');
    expect(markup).toContain('actions.submitWaiverClaim -&gt; submitWaiverClaimEngine -&gt; commitGame');
    expect(markup).toContain('Did not also');
    expect(markup).toContain('This confirmation does not award the player');
    expect(markup).toContain('current contract data shown on the board travels with the claim');
  });
});
