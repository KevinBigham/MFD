import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  FreeAgencyActionReceiptPanel,
  FreeAgencyHub,
  buildFreeAgencyActionReceipt,
  buildFreeAgencyBidResolutionSummary,
} from './FreeAgencyHub';

const rosterPlayer = {
  id: 'p1',
  name: 'Jay Stone',
  firstName: 'Jay',
  lastName: 'Stone',
  pos: 'QB',
  ovr: 88,
  age: 27,
  holdout: true,
  agentId: 'agent-1',
};

const marketPlayer = {
  id: 'fa-1',
  name: 'Drew Vale',
  firstName: 'Drew',
  lastName: 'Vale',
  pos: 'WR',
  ovr: 79,
  age: 25,
  agentId: null,
};

const cpuRoster = [
  { id: 'cpu-qb', name: 'Mason Pike', firstName: 'Mason', lastName: 'Pike', pos: 'QB', ovr: 88, age: 34, isStarter: true },
  { id: 'cpu-wr-1', name: 'Ari Knox', firstName: 'Ari', lastName: 'Knox', pos: 'WR', ovr: 84, age: 31, isStarter: true },
  { id: 'cpu-wr-2', name: 'Nico Bell', firstName: 'Nico', lastName: 'Bell', pos: 'WR', ovr: 80, age: 30, isStarter: true },
  { id: 'cpu-te', name: 'Cal Reed', firstName: 'Cal', lastName: 'Reed', pos: 'TE', ovr: 79, age: 30, isStarter: true },
  { id: 'cpu-ol', name: 'Jules Ward', firstName: 'Jules', lastName: 'Ward', pos: 'OL', ovr: 82, age: 32, isStarter: true },
  { id: 'cpu-dl', name: 'Owen Frost', firstName: 'Owen', lastName: 'Frost', pos: 'DL', ovr: 78, age: 29, isStarter: true },
];

const reSignDecision = {
  playerId: 'p1',
  teamId: 'team-1',
  askingPrice: { years: 4, salary: 25, signingBonus: 10, guaranteed: 42 },
  agentDemand: { years: 4, salary: 29, signingBonus: 12, guaranteed: 47 },
  lastOffer: { years: 4, salary: 24, signingBonus: 9, guaranteed: 39 },
  counterOffer: { years: 4, salary: 26.5, signingBonus: 10.5, guaranteed: 43 },
  agentResponse: 'Jordan Bishop counters for a middle ground on Jay Stone.',
  patienceWeeksRemaining: 2,
  status: 'countered',
};

const offseasonState = {
  round: 1,
  expiringPlayerIds: ['p1'],
  reSignDecisions: {
    p1: reSignDecision,
  },
  freeAgencyBids: {
    'fa-1': [
      {
        playerId: 'fa-1',
        teamId: 'team-1',
        round: 1,
        years: 3,
        salary: 9.5,
        signingBonus: 7.1,
        guaranteed: 18.4,
        score: 82.4,
        status: 'lost',
      },
      {
        playerId: 'fa-1',
        teamId: 'cpu-1',
        round: 1,
        years: 4,
        salary: 11.2,
        signingBonus: 9.4,
        guaranteed: 24.1,
        score: 91.8,
        status: 'won',
      },
    ],
  },
};

type MockOffseasonCalendar = {
  visible: boolean;
  headline: string;
  summary: string;
  activeStepId: string | null;
  blocked: boolean;
  steps: Array<{
    id: string;
    label: string;
    status: 'complete' | 'active' | 'upcoming' | 'blocked';
    detail: string;
    route: string;
    ctaLabel: string;
  }>;
};

const hiddenOffseasonCalendar: MockOffseasonCalendar = {
  visible: false,
  headline: '',
  summary: '',
  activeStepId: null,
  blocked: false,
  steps: [],
};

const visibleOffseasonCalendar: MockOffseasonCalendar = {
  visible: true,
  headline: 'Re-sign Window',
  summary: 'Re-sign Window is the current window; advancement still runs through the existing phase action.',
  activeStepId: 're_sign',
  blocked: false,
  steps: [
    {
      id: 're_sign',
      label: 'Re-sign Window',
      status: 'active',
      detail: '0 accepted, 1 unresolved from 1 expiring player(s).',
      route: '/contracts',
      ctaLabel: 'Manage Contracts',
    },
    {
      id: 'free_agency',
      label: 'Free Agency Rounds',
      status: 'upcoming',
      detail: 'Round 1 of 3.',
      route: '/free-agency',
      ctaLabel: 'Open Market',
    },
  ],
};

const mockState = {
  game: {
    year: 2030,
    phase: 'offseason',
    freeAgents: [] as string[],
    scenarioState: null as any,
    agents: [
      {
        id: 'agent-1',
        name: 'Jordan Bishop',
        style: 'hardball',
        demandMultiplier: 1.2,
      },
    ],
    players: {
      p1: rosterPlayer,
      'fa-1': marketPlayer,
    },
    teams: {
      'team-1': {
        id: 'team-1',
        city: 'Chicago',
        name: 'Blaze',
        isUser: true,
        roster: [rosterPlayer],
      },
      'cpu-1': {
        id: 'cpu-1',
        city: 'Denver',
        name: 'Peak',
        isUser: false,
        roster: cpuRoster,
        draftPicks: [
          { round: 1, year: 2031, currentTeamId: 'cpu-1' },
          { round: 3, year: 2031, currentTeamId: 'cpu-1' },
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
    offseasonState,
  },
  phase: 'offseason',
  scenarioState: null as any,
  roster: [rosterPlayer],
  offseasonState,
  freeAgents: [],
  userTeamId: 'team-1',
  offseasonCalendar: visibleOffseasonCalendar,
  actions: {
    advanceWeek: async () => null,
    submitFreeAgentBid: async () => undefined,
    negotiateContract: async () => undefined,
    signStreetFreeAgent: async () => undefined,
  },
};

function forecast(status: 'likely_accept' | 'competitive_bid' | 'blocked', label: string, resolution: string) {
  return {
    mode: status === 'likely_accept' ? 're_sign' : status === 'competitive_bid' ? 'open_market_bid' : 'street_sign',
    status,
    statusLabel: label,
    confidence: status === 'blocked' ? 'high' : 'medium',
    score: status === 'blocked' ? null : 88,
    threshold: status === 'blocked' ? null : 75,
    immediateImpact: status === 'blocked' ? 'Roster limit already reached.' : 'Existing helper stores the action result.',
    seasonImpact: 'Existing offseason systems own season impact.',
    futureRisk: 'Existing cap and roster systems own downstream risk.',
    resolution,
    source: status === 'likely_accept' ? 'negotiateOffer' : status === 'competitive_bid' ? 'submitFreeAgentBid score' : 'signStreetFreeAgent roster-limit gate',
    warnings: [],
  } as any;
}

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectPhase: (state: typeof mockState) => state.phase,
  selectRoster: (state: typeof mockState) => state.roster,
  selectOffseasonState: (state: typeof mockState) => state.offseasonState,
  selectFreeAgentPlayers: (state: typeof mockState) => state.freeAgents,
  selectScenarioState: (state: typeof mockState) => state.scenarioState,
  selectUserTeamId: (state: typeof mockState) => state.userTeamId,
  selectOffseasonCalendar: (state: typeof mockState) => state.offseasonCalendar,
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => () => Promise.resolve(),
}));

describe('FreeAgencyHub', () => {
  it('renders agent demand, counter language, and accept-counter controls in the re-sign window', () => {
    const markup = renderToStaticMarkup(<FreeAgencyHub />);

    expect(markup).toContain('FREE AGENCY HUB');
    expect(markup).toContain('Jordan Bishop');
    expect(markup).toContain('Agent demand: 4Y / $29M');
    expect(markup).toContain('Jordan Bishop counters for a middle ground on Jay Stone.');
    expect(markup).toContain('Accept Counter');
    expect(markup).toContain('Holdout');
    expect(markup).toContain('Decision Forecast');
    expect(markup).not.toContain('FREE AGENCY ACTION RECEIPT');
    expect(markup).toContain('Likely counter');
    expect(markup).toContain('Likely accepted');
    expect(markup).toContain('Season');
    expect(markup).toContain('Countered decisions stay in the re-sign window until you accept, improve the offer, or advance and risk a walk.');
    expect(markup).toContain('Future');
    expect(markup).toContain('4 year(s) at $29M base salary become the saved commitment if the accepted offer advances.');
    expect(markup).toContain('Resolution');
    expect(markup).toContain('negotiateOffer ratio to saved agentDemand');
  });

  it('renders schema-normalized player names from first and last name fallbacks', () => {
    const originalRosterName = (rosterPlayer as { name?: string }).name;
    const originalMarketName = (marketPlayer as { name?: string }).name;
    const originalPhase = mockState.phase;
    const originalGamePhase = mockState.game.phase;
    const originalOffseasonState = mockState.offseasonState;
    const originalGameOffseasonState = mockState.game.offseasonState;
    const originalRoster = mockState.roster;
    const originalFreeAgents = mockState.freeAgents;
    const originalGameFreeAgents = mockState.game.freeAgents;
    const originalCalendar = mockState.offseasonCalendar;
    try {
      delete (rosterPlayer as { name?: string }).name;
      delete (marketPlayer as { name?: string }).name;

      const reSignMarkup = renderToStaticMarkup(<FreeAgencyHub />);
      expect(reSignMarkup).toContain('JAY STONE');
      expect(reSignMarkup).toContain('QB // 88 OVR');

      mockState.phase = 'regular_season';
      mockState.game.phase = 'regular_season';
      mockState.offseasonState = null as never;
      mockState.game.offseasonState = null as never;
      mockState.roster = [];
      mockState.freeAgents = [marketPlayer] as never;
      mockState.game.freeAgents = ['fa-1'];
      mockState.offseasonCalendar = hiddenOffseasonCalendar;

      const streetMarkup = renderToStaticMarkup(<FreeAgencyHub />);
      expect(streetMarkup).toContain('DREW VALE');
    } finally {
      (rosterPlayer as { name?: string }).name = originalRosterName;
      (marketPlayer as { name?: string }).name = originalMarketName;
      mockState.phase = originalPhase;
      mockState.game.phase = originalGamePhase;
      mockState.offseasonState = originalOffseasonState;
      mockState.game.offseasonState = originalGameOffseasonState;
      mockState.roster = originalRoster;
      mockState.freeAgents = originalFreeAgents;
      mockState.game.freeAgents = originalGameFreeAgents;
      mockState.offseasonCalendar = originalCalendar;
    }
  });

  it('labels free-agency source and commit boundaries', () => {
    const markup = renderToStaticMarkup(<FreeAgencyHub />);

    expect(markup).toContain('FREE AGENCY SOURCES');
    expect(markup).toContain('selectOffseasonState plus selectRoster');
    expect(markup).toContain('saved reSignDecisions');
    expect(markup).toContain('selectFreeAgentPlayers');
    expect(markup).toContain('saved game.agents');
    expect(markup).toContain('route-local marketOffer estimates');
    expect(markup).toContain('buildFreeAgencyDecisionForecast');
    expect(markup).toContain('Bid Resolution Summary');
    expect(markup).toContain('Reads saved freeAgencyBids won/lost rows');
    expect(markup).toContain('selectScenarioState reads blockFreeAgency');
    expect(markup).toContain('negotiateContract, submitFreeAgentBid, signStreetFreeAgent, and advanceWeek are the only live write paths');
    expect(markup).toContain('Opening /free-agency');
    expect(markup).toContain('do not write bids');
    expect(markup).toContain('reroll saved outcomes');
  });

  it('builds read-only bid-resolution summaries from saved free-agency bids', () => {
    const summary = buildFreeAgencyBidResolutionSummary({
      bidsByPlayer: offseasonState.freeAgencyBids as never,
      players: mockState.game.players as never,
      teams: mockState.game.teams as never,
      userTeamId: 'team-1',
      currentYear: mockState.game.year,
      teamNeedsByTeam: mockState.game.teamNeedsCache as never,
      franchiseHistory: mockState.game.franchiseHistory as never,
    });

    expect(summary.label).toBe('Market losses saved');
    expect(summary.accent).toBe('red');
    expect(summary.detail).toContain('1 resolved free-agency bid row(s): 0 user win(s), 1 user loss(es), 0 CPU-only result(s).');
    expect(summary.source).toContain('offseasonState.freeAgencyBids rows after resolveFreeAgencyRound marks bids won/lost');
    expect(summary.rows).toEqual([
      expect.objectContaining({
        id: 'fa-bid-resolution:fa-1:1:cpu-1',
        label: 'Outbid',
        accent: 'red',
        detail: 'Drew Vale // WR // 79 OVR // Round 1: cpu-1 won at 91.8 score from 2 saved bid(s). User bid lost at 82.4 score.',
        boundary: 'Saved bid-resolution row only; display does not re-score bids, resolve the round, move players, change cap totals, autosave, or reroll outcomes.',
        counterfactual: expect.objectContaining({
          winnerLine: 'Denver Peak won Drew Vale at $11.2M in Round 1.',
          userComparisonLine: 'You offered $9.5M ($1.7M less per year). Saved bid score: you 82.4, Denver Peak 91.8.',
        }),
      }),
    ]);
  });

  it('renders saved bid-resolution rows without adding a write path', () => {
    const markup = renderToStaticMarkup(<FreeAgencyHub />);

    expect(markup).toContain('BID RESOLUTION SUMMARY');
    expect(markup).toContain('Market losses saved');
    expect(markup).toContain('Saved freeAgencyBids');
    expect(markup).toContain('Drew Vale // WR // 79 OVR // Round 1: cpu-1 won at 91.8 score');
    expect(markup).toContain('User bid lost at 82.4 score.');
    expect(markup).toContain('Why they won');
    expect(markup).toContain('Denver Peak won Drew Vale at $11.2M in Round 1.');
    expect(markup).toContain('Competitive window');
    expect(markup).toContain('WIN_NOW GM posture and MAINTAIN philosophy were saved on the winning team.');
    expect(markup).toContain('You offered $9.5M ($1.7M less per year). Saved bid score: you 82.4, Denver Peak 91.8.');
    expect(markup).toContain('display does not re-score bids, resolve the round, move players, change cap totals, autosave, or reroll outcomes');
  });

  it('builds on-screen confirmations for re-sign offers, market bids, and street signing gates', () => {
    const reSignReceipt = buildFreeAgencyActionReceipt({
      action: 're_sign_offer',
      player: rosterPlayer as any,
      offer: reSignDecision.agentDemand,
      actionLabel: 'Meet Demand',
      phase: 'offseason',
      round: 1,
      forecast: forecast('likely_accept', 'Likely accepted', 'Immediate negotiation response; no roster movement from the forecast or button alone.'),
    });
    const marketReceipt = buildFreeAgencyActionReceipt({
      action: 'open_market_bid',
      player: marketPlayer as any,
      offer: { years: 3, salary: 9.5, signingBonus: 7.1, guaranteed: 18.4 },
      actionLabel: 'Aggressive',
      phase: 'free_agency',
      round: 2,
      replacingExistingBid: true,
      forecast: forecast('competitive_bid', 'Competitive bid', 'Pending bid now; signing only happens during free-agency round resolution.'),
    });
    const streetReceipt = buildFreeAgencyActionReceipt({
      action: 'street_sign',
      player: marketPlayer as any,
      offer: { years: 1, salary: 3.2, signingBonus: 0.8, guaranteed: 2.4 },
      actionLabel: 'Sign',
      phase: 'regular_season',
      forecast: forecast('blocked', 'Blocked', 'No commit when roster-limit gates stop the add.'),
    });

    expect(reSignReceipt.title).toBe('Re-Sign Offer Sent');
    expect(reSignReceipt.result).toContain('Meet Demand');
    expect(reSignReceipt.source).toContain('actions.negotiateContract');
    expect(reSignReceipt.boundary).toContain('does not advance the offseason');
    expect(marketReceipt.title).toBe('Open-Market Bid Replaced');
    expect(marketReceipt.target).toContain('Round 2');
    expect(marketReceipt.result).toContain('Resolve Round');
    expect(marketReceipt.source).toContain('submitFreeAgentBidEngine');
    expect(streetReceipt.title).toBe('Street Signing Blocked');
    expect(streetReceipt.result).toContain('without a durable add');
    expect(streetReceipt.stateTouched).toContain('No durable roster/cap/autosave write');
    expect(streetReceipt.boundary).toContain('bypass scenario/source-list/roster-limit gates');
  });

  it('renders free-agency receipt source and no-extra-write copy', () => {
    const receipt = buildFreeAgencyActionReceipt({
      action: 'open_market_bid',
      player: marketPlayer as any,
      offer: { years: 3, salary: 9.5, signingBonus: 7.1, guaranteed: 18.4 },
      actionLabel: 'Market',
      phase: 'free_agency',
      round: 1,
      forecast: forecast('competitive_bid', 'Competitive bid', 'Pending bid now; signing only happens during free-agency round resolution.'),
    });

    const markup = renderToStaticMarkup(<FreeAgencyActionReceiptPanel receipt={receipt} />);

    expect(markup).toContain('FREE AGENCY ACTION RECEIPT');
    expect(markup).toContain('Open-Market Bid Stored');
    expect(markup).toContain('On-screen confirmation');
    expect(markup).toContain('Action used');
    expect(markup).toContain('actions.submitFreeAgentBid');
    expect(markup).toContain('Did not also');
    expect(markup).toContain('separate confirmation log');
  });

  it('mirrors the shared offseason calendar readout without adding a write path', () => {
    const markup = renderToStaticMarkup(<FreeAgencyHub />);

    expect(markup).toContain('OFFSEASON CALENDAR');
    expect(markup).toContain('selectOffseasonCalendar');
    expect(markup).toContain('Saved phase/round');
    expect(markup).toContain('Shared read model');
    expect(markup).toContain('data-offseason-calendar-step="re_sign"');
    expect(markup).toContain('Re-sign Window');
    expect(markup).toContain('active');
    expect(markup).toContain('0 accepted, 1 unresolved from 1 expiring player(s).');
    expect(markup).toContain('This route mirrors the same selector used by Week Advance.');
    expect(markup).toContain('do not click Advance Week');
    expect(markup).toContain('move players');
    expect(markup).toContain('reroll saved outcomes');
  });

  it('renders command guidance when the regular-season street market is empty', () => {
    const originalPhase = mockState.phase;
    const originalOffseasonState = mockState.offseasonState;
    const originalRoster = mockState.roster;
    const originalCalendar = mockState.offseasonCalendar;
    try {
      mockState.phase = 'regular_season';
      mockState.offseasonState = null as never;
      mockState.roster = [];
      mockState.offseasonCalendar = hiddenOffseasonCalendar;

      const markup = renderToStaticMarkup(<FreeAgencyHub />);

      expect(markup).toContain('Street market is quiet');
      expect(markup).toContain('Team Needs');
      expect(markup).toContain('Waiver Wire');
    } finally {
      mockState.phase = originalPhase;
      mockState.offseasonState = originalOffseasonState;
      mockState.roster = originalRoster;
      mockState.offseasonCalendar = originalCalendar;
    }
  });

  it('renders scenario lock guidance and disables open-market bids when external free agency is blocked', () => {
    const originalPhase = mockState.phase;
    const originalGamePhase = mockState.game.phase;
    const originalFreeAgents = mockState.freeAgents;
    const originalGameFreeAgents = mockState.game.freeAgents;
    const originalScenarioState = mockState.scenarioState;
    const originalGameScenarioState = mockState.game.scenarioState;
    try {
      const scenarioState = {
        activeScenario: {
          id: 'savant',
          name: 'The Savant',
          constraints: { blockTrades: true, blockFreeAgency: true, blockDraft: false },
        },
      };
      mockState.phase = 'free_agency';
      mockState.game.phase = 'free_agency';
      mockState.freeAgents = [marketPlayer] as never;
      mockState.game.freeAgents = ['fa-1'];
      mockState.scenarioState = scenarioState;
      mockState.game.scenarioState = scenarioState;

      const markup = renderToStaticMarkup(<FreeAgencyHub />);

      expect(markup).toContain('SCENARIO LOCK');
      expect(markup).toContain('The Savant');
      expect(markup).toContain('FREE-AGENT ADDS BLOCKED');
      expect(markup).toContain('Open-market bids and street signings are disabled here');
      expect(markup).toContain('In-house re-sign negotiation and market advancement remain available.');
      expect(markup).toContain('saved scenarioState.activeScenario.constraints.blockFreeAgency');
      expect(markup).toContain('blocked market bids or street signings');
      expect(markup).toContain('MARKET LOCKED');
      expect(markup).toContain('Scenario Locked');
      expect(markup).toContain('Active scenario constraints block this free-agency action.');
      expect(markup).toContain('data-mfd-button-state="disabled"');
    } finally {
      mockState.phase = originalPhase;
      mockState.game.phase = originalGamePhase;
      mockState.freeAgents = originalFreeAgents;
      mockState.game.freeAgents = originalGameFreeAgents;
      mockState.scenarioState = originalScenarioState;
      mockState.game.scenarioState = originalGameScenarioState;
    }
  });

  it('renders scenario lock guidance and disables street signings when external free agency is blocked', () => {
    const originalPhase = mockState.phase;
    const originalGamePhase = mockState.game.phase;
    const originalOffseasonState = mockState.offseasonState;
    const originalGameOffseasonState = mockState.game.offseasonState;
    const originalRoster = mockState.roster;
    const originalFreeAgents = mockState.freeAgents;
    const originalGameFreeAgents = mockState.game.freeAgents;
    const originalScenarioState = mockState.scenarioState;
    const originalGameScenarioState = mockState.game.scenarioState;
    try {
      const scenarioState = {
        activeScenario: {
          id: 'savant',
          name: 'The Savant',
          constraints: { blockTrades: true, blockFreeAgency: true, blockDraft: false },
        },
      };
      mockState.phase = 'regular_season';
      mockState.game.phase = 'regular_season';
      mockState.offseasonState = null as never;
      mockState.game.offseasonState = null as never;
      mockState.roster = [];
      mockState.freeAgents = [marketPlayer] as never;
      mockState.game.freeAgents = ['fa-1'];
      mockState.scenarioState = scenarioState;
      mockState.game.scenarioState = scenarioState;

      const markup = renderToStaticMarkup(<FreeAgencyHub />);

      expect(markup).toContain('STREET FREE AGENTS');
      expect(markup).toContain('DREW VALE');
      expect(markup).toContain('Scenario Locked');
      expect(markup).toContain('Active scenario constraints block this free-agency action.');
      expect(markup).toContain('data-mfd-button-state="disabled"');
    } finally {
      mockState.phase = originalPhase;
      mockState.game.phase = originalGamePhase;
      mockState.offseasonState = originalOffseasonState;
      mockState.game.offseasonState = originalGameOffseasonState;
      mockState.roster = originalRoster;
      mockState.freeAgents = originalFreeAgents;
      mockState.game.freeAgents = originalGameFreeAgents;
      mockState.scenarioState = originalScenarioState;
      mockState.game.scenarioState = originalGameScenarioState;
    }
  });
});
