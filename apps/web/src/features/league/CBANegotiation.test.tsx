import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { type CBAProposal } from '@mfd/engine';
import { CBAActionReceiptPanel, CBANegotiation, buildCBAActionReceipt } from './CBANegotiation';

const negotiationState = {
  round: 2,
  ownersProposal: {
    id: 'owners-1',
    side: 'owners' as const,
    year: 2031,
    round: 2,
    rationale: 'Owners want cost certainty.',
    terms: {
      revenueSplit: 0.49,
      capGrowthRate: 0.045,
      capFloorPct: 0.89,
      minSalaryScale: [0.8, 1.1, 1.2],
      franchiseTagLimit: 1,
      tagTypesAllowed: ['exclusive', 'non-exclusive', 'transition'],
      rosterLimit: 53,
      practiceSquadSize: 10,
      irReturnLimit: 4,
      playoffSeeds: 7,
      draftRounds: 7,
    },
  },
  playersProposal: {
    id: 'players-1',
    side: 'players' as const,
    year: 2031,
    round: 2,
    rationale: 'Players are pushing for a larger share of growth.',
    terms: {
      revenueSplit: 0.52,
      capGrowthRate: 0.055,
      capFloorPct: 0.91,
      minSalaryScale: [0.82, 1.14, 1.23],
      franchiseTagLimit: 2,
      tagTypesAllowed: ['exclusive', 'non-exclusive'],
      rosterLimit: 54,
      practiceSquadSize: 12,
      irReturnLimit: 5,
      playoffSeeds: 8,
      draftRounds: 7,
    },
  },
  currentProposal: {
    id: 'current-1',
    side: 'owners' as const,
    year: 2031,
    round: 2,
    rationale: 'A mediated compromise is on the table.',
    terms: {
      revenueSplit: 0.5,
      capGrowthRate: 0.05,
      capFloorPct: 0.9,
      minSalaryScale: [0.81, 1.12, 1.21],
      franchiseTagLimit: 1,
      tagTypesAllowed: ['exclusive', 'non-exclusive'],
      rosterLimit: 53,
      practiceSquadSize: 11,
      irReturnLimit: 4,
      playoffSeeds: 7,
      draftRounds: 7,
    },
  },
  gap: 12,
  mediator: true,
  publicPressure: 68,
  ownerVotes: {},
  userVote: null,
};

const baseState = () => ({
  game: {
    teams: {
      user: {},
      cpu1: {},
      cpu2: {},
    },
  },
  cbaState: {
    status: 'awaiting_owner_vote' as 'awaiting_owner_vote' | 'lockout',
    currentDeal: {
      id: 'deal-prev',
      startYear: 2026,
      endYear: 2030,
      duration: 5,
      ratifiedBy: 'both' as const,
      amendments: [],
      terms: {
        revenueSplit: 0.49,
        capGrowthRate: 0.045,
        capFloorPct: 0.89,
        minSalaryScale: [0.8, 1.1, 1.2],
        franchiseTagLimit: 1,
        tagTypesAllowed: ['exclusive', 'non-exclusive', 'transition'],
        rosterLimit: 53,
        practiceSquadSize: 8,
        irReturnLimit: 4,
        playoffSeeds: 7,
        draftRounds: 7,
      },
    },
    negotiationState,
    history: [
      {
        id: 'deal-prev',
        startYear: 2026,
        endYear: 2030,
        duration: 5,
        ratifiedBy: 'both' as const,
        amendments: [],
        terms: {
          revenueSplit: 0.49,
          capGrowthRate: 0.045,
          capFloorPct: 0.89,
          minSalaryScale: [0.8, 1.1, 1.2],
          franchiseTagLimit: 1,
          tagTypesAllowed: ['exclusive', 'non-exclusive', 'transition'],
          rosterLimit: 53,
          practiceSquadSize: 8,
          irReturnLimit: 4,
          playoffSeeds: 7,
          draftRounds: 7,
        },
      },
      {
        id: 'deal-next',
        startYear: 2031,
        endYear: 2037,
        duration: 6,
        ratifiedBy: 'both' as const,
        amendments: [],
        terms: negotiationState.currentProposal.terms,
      },
    ],
    lockoutRisk: 22,
    lastNegotiationYear: 2031,
  },
  unionLeader: {
    id: 'p1',
    name: 'Marcus Cole',
    pos: 'QB',
    ovr: 94,
    personality: { ambition: 9, workEthic: 8, loyalty: 6 },
  },
  actions: {
    voteOnCBA: vi.fn(),
    advanceCBANegotiation: vi.fn(),
  },
});

let mockState = baseState();

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectCBAState: (state: typeof mockState) => state.cbaState,
  selectUnionLeader: (state: typeof mockState) => state.unionLeader,
}));

describe('CBANegotiation', () => {
  beforeEach(() => {
    mockState = baseState();
  });

  it('renders both negotiating sides and the current proposal', () => {
    const markup = renderToStaticMarkup(<CBANegotiation />);
    expect(markup).toContain('CBA NEGOTIATIONS');
    expect(markup).toContain('Owners');
    expect(markup).toContain('Players');
    expect(markup).toContain('CURRENT PROPOSAL');
    expect(markup).toContain('Revenue Split');
  });

  it('renders the round, gap meter, and public pressure summary', () => {
    const markup = renderToStaticMarkup(<CBANegotiation />);
    expect(markup).toContain('ROUND 2/5');
    expect(markup).toContain('Gap Meter');
    expect(markup).toContain('Public Pressure');
    expect(markup).toContain('Mediator active');
  });

  it('renders the union leader spotlight', () => {
    const markup = renderToStaticMarkup(<CBANegotiation />);
    expect(markup).toContain('UNION LEADER');
    expect(markup).toContain('MARCUS COLE');
    expect(markup).toContain('WORK ETHIC 8');
  });

  it('shows approve, reject, and abstain buttons when owner voting is open', () => {
    const markup = renderToStaticMarkup(<CBANegotiation />);
    expect(markup).toContain('Approve');
    expect(markup).toContain('Reject');
    expect(markup).toContain('Abstain');
    expect(markup).toContain('2 / 3 APPROVALS');
    expect(markup).toContain('Ratification needs 2 of 3 owner approvals');
    expect(markup).toContain('Rejections and abstentions appear in the public vote line but add no approval votes');
    expect(markup).toContain('Advance Negotiation');
  });

  it('renders cba source context and commit boundaries', () => {
    const markup = renderToStaticMarkup(<CBANegotiation />);
    expect(markup).toContain('CBA SOURCES');
    expect(markup).toContain('selectCBAState reads saved game.cbaState');
    expect(markup).toContain('this route does not generate proposal terms while rendering');
    expect(markup).toContain('Approve, Reject, and Abstain commit through voteOnCBA');
    expect(markup).toContain('Abstain is saved as an owner vote');
    expect(markup).toContain('advanceCBANegotiation');
    expect(markup).toContain('/league-rules remains the read-only effective-rule and history view');
    expect(markup).toContain('OUTSIDE CBA TERMS');
    expect(markup).toContain('COMMISSIONER LANE');
    expect(markup).toContain('comp-pick limit are not part of CBA term projection today');
    expect(markup).toContain('use /commissioner for petitionable changes');
  });

  it('renders the lockout banner and resolution button during a work stoppage', () => {
    mockState.cbaState.status = 'lockout';
    const markup = renderToStaticMarkup(<CBANegotiation />);
    expect(markup).toContain('WORK STOPPAGE ACTIVE');
    expect(markup).toContain('Resolve Lockout');
  });

  it('builds and renders route-local cba action receipts', () => {
    const voteReceipt = buildCBAActionReceipt({
      type: 'vote',
      vote: 'abstain',
      ownerCount: 3,
      approvalThreshold: 2,
      proposal: negotiationState.currentProposal as CBAProposal,
    });

    expect(voteReceipt.title).toBe('CBA Vote Receipt');
    expect(voteReceipt.result).toContain('Abstain vote sent for round 2');
    expect(voteReceipt.detail).toContain('ratifies only when approvals meet 2 of 3');
    expect(voteReceipt.detail).toContain('add no approval vote');
    expect(voteReceipt.source).toContain('Saved by the CBA vote action');
    expect(voteReceipt.source).toContain('owner votes and your vote are recorded');

    const advanceReceipt = buildCBAActionReceipt({
      type: 'advance',
      status: 'lockout',
      round: 5,
      hasCurrentProposal: false,
    });

    expect(advanceReceipt.title).toBe('CBA Lockout Receipt');
    expect(advanceReceipt.result).toContain('Resolve Lockout action sent');
    expect(advanceReceipt.source).toContain('Saved by the CBA advance action');
    expect(advanceReceipt.source).toContain('negotiation status and history move forward');

    const markup = renderToStaticMarkup(<CBAActionReceiptPanel receipt={voteReceipt} />);
    expect(markup).toContain('CBA VOTE RECEIPT');
    expect(markup).toContain('OWNER VOTE');
    expect(markup).toContain('SAVED BY');
    expect(markup).toContain('Saved by the CBA vote action');
    expect(markup).toContain('On-screen confirmation only');
  });
});
