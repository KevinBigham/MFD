import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CBANegotiation } from './CBANegotiation';

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

  it('shows approve and reject buttons when owner voting is open', () => {
    const markup = renderToStaticMarkup(<CBANegotiation />);
    expect(markup).toContain('Approve');
    expect(markup).toContain('Reject');
    expect(markup).toContain('Advance Negotiation');
  });

  it('renders the lockout banner and resolution button during a work stoppage', () => {
    mockState.cbaState.status = 'lockout';
    const markup = renderToStaticMarkup(<CBANegotiation />);
    expect(markup).toContain('WORK STOPPAGE ACTIVE');
    expect(markup).toContain('Resolve Lockout');
  });
});
