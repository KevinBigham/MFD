import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { applyRuleChange, initLeagueRules } from '@mfd/engine';
import { CommissionerOffice } from './CommissionerOffice';

const baseState = () => {
  const rules = applyRuleChange(initLeagueRules(2031), {
    key: 'practice_squad_size',
    newValue: 10,
    source: 'commissioner_vote',
    proposedBy: 'commissioner',
    effectiveYear: 2032,
    rationale: 'Expand developmental depth.',
  });

  return {
    game: { week: 3 },
    team: { id: 'CHI', city: 'Chicago', name: 'Blaze' },
    commissioner: {
      name: 'Elena Morrow',
      personality: 'progressive' as const,
      tenure: 4,
      approval: 64,
      activeProposals: [],
      history: [],
      rulings: [],
      lowApprovalYears: 0,
    },
    agenda: [
      {
        id: 'proposal-1',
        ruleKey: 'playoff_seeds_per_conf' as const,
        currentValue: 7,
        proposedValue: 8,
        rationale: 'Open the bracket to more clubs.',
        source: 'commissioner' as const,
        votes: {},
        requiredMajority: 17,
        deadline: 2031,
        effectiveYear: 2032,
        proposedByTeamId: null,
      },
    ],
    history: [
      {
        proposalId: 'history-1',
        passed: true,
        yesVotes: 19,
        noVotes: 13,
        abstains: 0,
        effectiveYear: 2031,
        ruleKey: 'practice_squad_size' as const,
        proposedValue: 10,
      },
    ],
    rulings: [
      {
        id: 'ruling-1',
        year: 2031,
        week: 3,
        type: 'fine' as const,
        playerId: 'p1',
        playerName: 'Marcus Cole',
        teamId: 'CHI',
        headline: 'Marcus Cole fined for sideline outburst',
        rationale: 'The commissioner cited conduct detrimental.',
        moraleImpact: -3,
        chemistryImpact: -1,
        ownerApprovalImpact: -2,
      },
    ],
    cbaState: {
      status: 'awaiting_owner_vote' as const,
      currentDeal: {
        id: 'deal-1',
        startYear: 2028,
        endYear: 2034,
        duration: 6,
        ratifiedBy: 'both' as const,
        amendments: [],
        terms: {
          revenueSplit: 0.5,
          capGrowthRate: 0.05,
          capFloorPct: 0.9,
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
      negotiationState: {
        round: 3,
        ownersProposal: null,
        playersProposal: null,
        currentProposal: null,
        gap: 12,
        mediator: true,
        publicPressure: 71,
        ownerVotes: {},
        userVote: null,
      },
      history: [],
      lockoutRisk: 18,
      lastNegotiationYear: 2031,
    },
    leagueRules: rules,
    actions: {
      voteOnProposal: vi.fn(),
      petitionRuleChange: vi.fn(),
    },
  };
};

let mockState = baseState();

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectCBAState: (state: typeof mockState) => state.cbaState,
  selectCommissionerAgenda: (state: typeof mockState) => state.agenda,
  selectCommissionerRulings: (state: typeof mockState) => state.rulings,
  selectCommissionerState: (state: typeof mockState) => state.commissioner,
  selectCommissionerVoteHistory: (state: typeof mockState) => state.history,
  selectLeagueRules: (state: typeof mockState) => state.leagueRules,
  selectUserTeam: (state: typeof mockState) => state.team,
}));

describe('CommissionerOffice', () => {
  beforeEach(() => {
    mockState = baseState();
  });

  it('renders the commissioner header and approval state', () => {
    const markup = renderToStaticMarkup(<CommissionerOffice />);
    expect(markup).toContain('COMMISSIONER&#x27;S OFFICE');
    expect(markup).toContain('Elena Morrow');
    expect(markup).toContain('64 APPROVAL');
  });

  it('renders the active proposal card and owner vote buttons', () => {
    const markup = renderToStaticMarkup(<CommissionerOffice />);
    expect(markup).toContain('PLAYOFF SEEDS / CONFERENCE');
    expect(markup).toContain('7 -&gt; 8');
    expect(markup).toContain('Vote Yes');
    expect(markup).toContain('Vote No');
    expect(markup).toContain('Abstain');
  });

  it('renders the cba summary panel with navigation actions', () => {
    const markup = renderToStaticMarkup(<CommissionerOffice />);
    expect(markup).toContain('CBA STATUS');
    expect(markup).toContain('AWAITING_OWNER_VOTE');
    expect(markup).toContain('Open CBA Negotiation');
    expect(markup).toContain('View League Rules');
  });

  it('renders the owner petition controls and warning copy', () => {
    const markup = renderToStaticMarkup(<CommissionerOffice />);
    expect(markup).toContain('OWNER PETITION');
    expect(markup).toContain('Failed petitions cost owner goodwill');
    expect(markup).toContain('File Petition');
    expect(markup).toContain('CURRENT: 5%');
  });

  it('renders the empty-state copy when no active proposals are pending', () => {
    mockState.agenda = [];
    const markup = renderToStaticMarkup(<CommissionerOffice />);
    expect(markup).toContain('No governance votes are pending this offseason');
  });
});
