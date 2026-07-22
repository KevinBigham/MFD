import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ConditionalPick, TradeSuggestion } from '@mfd/engine';
import { TradeCenter, TradeCenterActionReceiptPanel, buildTradeCenterActionReceipt } from './TradeCenter';
import { buildGeneratedOfferReceipt } from './TradeFinder';

const source = readFileSync(new URL('./TradeCenter.tsx', import.meta.url), 'utf-8');

const sendAssets = [{ type: 'player' as const, teamId: 'team-1', playerId: 'user-wr', pickId: null, description: 'Jay Reed' }];
const receiveAssets = [{ type: 'player' as const, teamId: 'team-2', playerId: 'target-te', pickId: null, description: 'Cole Hart' }];

const forecast = {
  valueLabel: 'Fair value',
  acceptanceLabel: 'Partner accepts',
  headline: 'Chicago sends a receiver for tight-end help.',
} as any;

const mockState = {
  game: {
    year: 2026,
    leagueRules: null as any,
    conditionalPicks: [] as ConditionalPick[],
    franchiseHistory: [
      { teamId: 'team-2', year: 2025, wins: 11, losses: 6, ties: 0, playoffFinish: 'division' },
    ],
    players: {
      'user-wr': { id: 'user-wr', name: 'Jay Reed', contract: null },
      'target-te': { id: 'target-te', name: 'Cole Hart', contract: null },
    },
    teams: {
      'team-1': { id: 'team-1', draftPicks: [] },
      'team-2': {
        id: 'team-2',
        city: 'Austin',
        name: 'Armadillos',
        gmStrategy: 'contend',
        philosophy: 'contend',
        capSpace: 12,
        capUsed: 226,
        deadCap: 4,
        wins: 8,
        losses: 4,
        ties: 0,
        draftPicks: [
          { round: 1, pick: 26, originalTeamId: 'team-2', currentTeamId: 'team-2', year: 2027, isCompPick: false },
          { round: 2, pick: 58, originalTeamId: 'team-2', currentTeamId: 'team-2', year: 2027, isCompPick: false },
          { round: 3, pick: 90, originalTeamId: 'team-2', currentTeamId: 'team-2', year: 2028, isCompPick: false },
        ],
        roster: [
          { id: 'target-qb', name: 'Austin QB', pos: 'QB', age: 29, ovr: 90, isStarter: true, tradeBlock: false },
          { id: 'target-te', name: 'Cole Hart', pos: 'TE', age: 28, ovr: 84, isStarter: true, tradeBlock: false },
          { id: 'target-wr', name: 'Austin WR', pos: 'WR', age: 30, ovr: 82, isStarter: true, tradeBlock: false },
          { id: 'target-dl', name: 'Austin DL', pos: 'DL', age: 27, ovr: 81, isStarter: true, tradeBlock: false },
        ],
      },
    },
  },
  userTeam: { id: 'team-1', city: 'Chicago', name: 'Blaze' },
  offers: [] as any[],
  proposals: [],
  week: 8,
  phase: 'regular_season',
  scenarioState: null as any,
  tradeSuggestions: [
    {
      partner: 'team-2',
      partnerName: 'Austin Armadillos',
      offer: {
        offering: [{ type: 'player', teamId: 'team-1', playerId: 'user-wr', pickId: null, description: 'Jay Reed' }],
        requesting: [{ type: 'player', teamId: 'team-2', playerId: 'target-te', pickId: null, description: 'Cole Hart' }],
        type: 'player_for_player',
      },
      reasoning: 'Need at TE. Austin can spare a pass catcher and use receiver help.',
      valueGap: 1.2,
      acceptanceLikelihood: 0.9,
      need: 'TE',
    },
  ] as Array<TradeSuggestion & { partnerName?: string }>,
  actions: {
    acceptCounter: () => Promise.resolve(null),
    acceptTradeOffer: () => Promise.resolve(),
    createTradeProposal: () => Promise.resolve(null),
    rejectCounter: () => Promise.resolve(null),
    rejectTradeOffer: () => Promise.resolve(),
    submitTradeProposal: () => Promise.resolve(null),
  },
};

vi.mock('@mfd/engine', async () => {
  const actual = await vi.importActual<typeof import('@mfd/engine')>('@mfd/engine');
  return {
    ...actual,
    getTradeTargets: () => [{
      teamId: 'team-2',
      teamName: 'Austin Armadillos',
      tradeBlock: [],
      picks: [],
      conditionalPicks: mockState.game.conditionalPicks.filter((pick) => pick.toTeamId === 'team-2' && !pick.resolved),
    }],
    getTradeableAssets: () => [
      { type: 'player', teamId: 'team-1', playerId: 'user-wr', pickId: null, description: 'Jay Reed' },
      ...mockState.game.conditionalPicks
        .filter((pick) => pick.toTeamId === 'team-1' && !pick.resolved)
        .map((pick) => ({
          type: 'conditional_pick' as const,
          teamId: 'team-1',
          playerId: null,
          pickId: null,
          conditionalPickId: pick.id,
          description: pick.description,
        })),
    ],
    calcPlayerValue: () => 10,
    calcPickValue: () => 8,
  };
});

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectActiveProposals: (state: typeof mockState) => state.proposals,
  selectPhase: (state: typeof mockState) => state.phase,
  selectScenarioState: (state: typeof mockState) => state.scenarioState,
  selectTradeDeadlineState: () => null,
  selectTradeOffers: (state: typeof mockState) => state.offers,
  selectTradeSuggestions: (state: typeof mockState) => state.tradeSuggestions,
  selectUserTeam: (state: typeof mockState) => state.userTeam,
  selectWeek: (state: typeof mockState) => state.week,
}));

describe('TradeCenter', () => {
  beforeEach(() => {
    mockState.week = 8;
    mockState.phase = 'regular_season';
    mockState.offers = [];
    mockState.proposals = [];
    mockState.game.leagueRules = null;
    mockState.game.conditionalPicks = [];
    mockState.scenarioState = null;
  });

  it('renders the trade finder panel with reusable suggestions', () => {
    const markup = renderToStaticMarkup(<TradeCenter />);

      expect(markup).toContain('TRADE CENTER');
      expect(markup).toContain('NEXT CALL');
      expect(markup).toContain('Choose build, block, or hold');
      expect(markup).toContain('TRADE FINDER');
      expect(markup).not.toContain('TRADE ACTION RECEIPT');
      expect(markup).toContain('Austin Armadillos');
      expect(markup).toContain('CONTEND window');
      expect(markup).toContain('Window drivers from saved roster, cap, picks, and strategy');
      expect(markup).toContain('Contender spine');
      expect(markup).toContain('Cole Hart');
      expect(markup).toContain('90%');
      expect(markup).toContain('Generated Offer Receipt');
      expect(markup).toContain('Value window');
      expect(markup).toContain('Austin Armadillos targets your TE need');
      expect(markup).toContain('90% acceptance, Gap +1.2');
    });

    it('builds deterministic generated-offer receipts from saved trade-finder rows', () => {
      const greenLight = buildGeneratedOfferReceipt({
        ...mockState.tradeSuggestions[0]!,
        acceptanceLikelihood: 0.97,
        valueGap: 0,
      });
      const needMatch = buildGeneratedOfferReceipt({
        ...mockState.tradeSuggestions[0]!,
        acceptanceLikelihood: 0.88,
        valueGap: -1.4,
        need: null,
      });

      expect(greenLight).toEqual({
        label: 'Green-light offer',
        detail: 'Austin Armadillos targets your TE need; player-for-player uses Jay Reed for Cole Hart. 97% acceptance, Gap 0.',
        accent: 'green',
      });
      expect(needMatch).toEqual({
        label: 'Need match',
        detail: 'Austin Armadillos surfaced as a high-confidence match; player-for-player is carried by the saved trade-finder reason, not a submitted proposal. 88% acceptance, Gap -1.4.',
        accent: 'cyan',
      });
    });

    it('labels trade center source and commit boundaries without implying render-time writes', () => {
    const markup = renderToStaticMarkup(<TradeCenter />);

    expect(markup).toContain('TRADE CENTER SOURCES');
    expect(markup).toContain('selectTradeOffers');
    expect(markup).toContain('selectActiveProposals');
    expect(markup).toContain('partner counters');
    expect(markup).not.toContain('AI counters');
    expect(markup).toContain('selectTradeSuggestions');
    expect(markup).toContain('Each visible row renders a Generated Offer Receipt');
    expect(markup).toContain('getTradeTargets(game, userTeam.id)');
    expect(markup).toContain('getTradeableAssets(game, userTeam.id)');
    expect(markup).toContain('selectedPartnerId, offeringKeys, and requestingKeys stay route-local');
    expect(markup).toContain('buildTradeDecisionForecast');
    expect(markup).toContain('does not move players, picks, cap, saves, play scheduled games, reroll saved outcomes, or autosave');
    expect(markup).toContain('selectScenarioState');
    expect(markup).toContain('selectTradeDeadlineState');
    expect(markup).toContain('trade_deadline_week');
    expect(markup).toContain('acceptTradeOffer, rejectTradeOffer');
    expect(markup).toContain('createTradeProposal then submitTradeProposal');
    expect(markup).toContain('acceptCounter, rejectCounter');
    expect(markup).toContain('What-if receipts');
    expect(markup).toContain('Generated offer rejections only mark the saved market offer status');
    expect(markup).toContain('do not write nearMissTracker');
    expect(markup).toContain('Rejected direct proposals and counter declines can record nearMissTracker.declinedTrades');
    expect(markup).toContain('season-end What-If receipts are generated later from that tracker');
      expect(markup).toContain('Saved game.conditionalPicks feed the context panel plus direct proposal asset rows');
    });

    it('builds on-screen confirmations for generated offers, direct proposals, and counter decisions', () => {
      const acceptedOffer = buildTradeCenterActionReceipt({
        action: 'accept_offer',
        id: 'offer-1',
        summary: 'Austin wants your receiver for a tight end.',
        sendAssets,
        receiveAssets,
        forecast,
      });
      const rejectedOffer = buildTradeCenterActionReceipt({
        action: 'reject_offer',
        id: 'offer-1',
        summary: 'Austin wants your receiver for a tight end.',
        sendAssets,
        receiveAssets,
        forecast,
      });
      const proposal = buildTradeCenterActionReceipt({
        action: 'submit_proposal',
        id: 'proposal-1',
        summary: 'Austin Armadillos proposal proposal-1',
        sendAssets,
        receiveAssets,
        forecast,
        resultStatus: 'countered',
        partnerName: 'Austin Armadillos',
      });
      const rejectedProposal = buildTradeCenterActionReceipt({
        action: 'submit_proposal',
        id: 'proposal-2',
        summary: 'Austin Armadillos proposal proposal-2',
        sendAssets,
        receiveAssets,
        forecast,
        resultStatus: 'rejected',
        partnerName: 'Austin Armadillos',
      });
      const acceptedCounter = buildTradeCenterActionReceipt({
        action: 'accept_counter',
        id: 'proposal-1',
        summary: 'We need another premium pick.',
        sendAssets,
        receiveAssets,
      });
      const rejectedCounter = buildTradeCenterActionReceipt({
        action: 'reject_counter',
        id: 'proposal-1',
        summary: 'We need another premium pick.',
        sendAssets,
        receiveAssets,
      });

      expect(acceptedOffer.title).toBe('Generated Offer Accepted');
      expect(acceptedOffer.result).toContain('you send Jay Reed');
      expect(acceptedOffer.stateTouched).toContain('rosters');
      expect(acceptedOffer.source).toContain('acceptTradeOfferEngine');
      expect(acceptedOffer.boundary).toContain('does not accept another offer');
      expect(rejectedOffer.title).toBe('Generated Offer Rejected');
      expect(rejectedOffer.stateTouched).toContain('trade-rejected audio cue');
      expect(rejectedOffer.boundary).toContain('does not move players or picks');
      expect(rejectedOffer.boundary).toContain('add nearMissTracker declined-trade inputs');
      expect(rejectedOffer.boundary).toContain('not season-end What-If receipt seeds');
      expect(proposal.title).toBe('Direct Proposal Countered');
      expect(proposal.target).toContain('Austin Armadillos');
      expect(proposal.source).toContain('createTradeProposalEngine');
      expect(proposal.source).toContain('submitTradeProposalEngine');
      expect(proposal.stateTouched).not.toContain('nearMissTracker declined-trade input');
      expect(acceptedCounter.result).toContain('Accepted the counter package');
      expect(rejectedCounter.result).toContain('Rejected the counter package');
      expect(acceptedCounter.result).not.toContain('AI counter');
      expect(rejectedCounter.result).not.toContain('AI counter');
      expect(rejectedProposal.title).toBe('Direct Proposal Rejected');
      expect(rejectedProposal.stateTouched).toContain('nearMissTracker declined-trade input');
      expect(rejectedProposal.stateTouched).toContain('season-end What-If receipts');
      expect(acceptedCounter.title).toBe('Counter Accepted');
      expect(acceptedCounter.source).toContain('acceptCounterProposalEngine');
      expect(rejectedCounter.title).toBe('Counter Rejected');
      expect(rejectedCounter.stateTouched).toContain('nearMissTracker declined-trade input');
      expect(rejectedCounter.boundary).toContain('does not move players or picks');
    });

    it('renders trade action receipt source and no-extra-write copy', () => {
      const receipt = buildTradeCenterActionReceipt({
        action: 'submit_proposal',
        id: 'proposal-1',
        summary: 'Austin Armadillos proposal proposal-1',
        sendAssets,
        receiveAssets,
        forecast,
        resultStatus: 'accepted',
        partnerName: 'Austin Armadillos',
      });

      const markup = renderToStaticMarkup(<TradeCenterActionReceiptPanel receipt={receipt} />);

      expect(markup).toContain('TRADE ACTION RECEIPT');
      expect(markup).toContain('Direct Proposal Accepted');
      expect(markup).toContain('On-screen confirmation');
      expect(markup).toContain('Action used');
      expect(markup).toContain('actions.createTradeProposal');
      expect(markup).toContain('Did not also');
      expect(markup).toContain('separate confirmation log');
    });

    it('renders a guided empty state for incoming offers', () => {
    const markup = renderToStaticMarkup(<TradeCenter />);

    expect(markup).toContain('No offers on the desk');
    expect(markup).toContain('Build Offer');
    expect(markup).toContain('Scan Block');
  });

  it('uses the configured trade deadline week for market closure copy', () => {
    mockState.week = 10;

    const markup = renderToStaticMarkup(<TradeCenter />);

    expect(markup).toContain('Deadline Passed');
    expect(markup).toContain('Market is closed');
    expect(markup).toContain('CLOSED');
    expect(markup).toContain('Deadline room is closed');
  });

  it('surfaces the active trade deadline rule in the trade-window read model', () => {
    mockState.week = 11;
    mockState.game.leagueRules = {
      initializedYear: 2026,
      history: [],
      entries: {
        trade_deadline_week: {
          key: 'trade_deadline_week',
          value: 12,
          previousValue: 9,
          effectiveYear: 2026,
          source: 'commissioner_vote',
          status: 'active',
        },
      },
    };

    const markup = renderToStaticMarkup(<TradeCenter />);

    expect(markup).toContain('Deadline W2');
    expect(markup).toContain('Regular season week 11 // active deadline Week 12');
    expect(markup).toContain('OPEN');
  });

  it('explains saved conditional picks as direct proposal assets', () => {
    mockState.game.conditionalPicks = [
      {
        id: 'conditional-1',
        fromTeamId: 'team-2',
        toTeamId: 'team-1',
        playerId: 'user-wr',
        basePick: {
          round: 3,
          pick: 17,
          originalTeamId: 'team-2',
          currentTeamId: 'team-1',
          year: 2027,
          isCompPick: false,
        },
        condition: {
          type: 'games_played',
          playerId: 'user-wr',
          threshold: 8,
          upgradeRound: 2,
        },
        resolvedPick: null,
        resolved: false,
        description: 'Austin 2027 conditional third',
      },
    ];

    const markup = renderToStaticMarkup(<TradeCenter />);

    expect(markup).toContain('CONDITIONAL PICK CONTEXT');
    expect(markup).toContain('Austin 2027 conditional third');
    expect(markup).toContain('Jay Reed 8+ games played');
    expect(markup).toContain('Base round 3 / ceiling round 2');
    expect(markup).toContain('Generated market offers can carry saved conditional-pick assets');
    expect(markup).toContain('Direct proposal builder rows can now include unresolved saved conditional-pick assets');
    expect(markup).toContain('Resolved incoming picks surface through Inbox and Conditional Victory progress');
    expect(source).toContain('function fromConditionalPick');
    expect(source).toContain('selectedTarget.conditionalPicks');
    expect(source).toContain("asset.type === 'conditional_pick' ? 'CONDITIONAL PICK'");
  });

  it('renders scenario lock guidance and disables incoming trade accepts when trades are blocked', () => {
    mockState.offers = [
      {
        id: 'offer-1',
        summary: 'Austin wants your receiver for a tight end.',
        status: 'pending',
        fromTeamId: 'team-2',
        toTeamId: 'team-1',
        send: [{ type: 'player', teamId: 'team-1', playerId: 'user-wr', pickId: null, description: 'Jay Reed' }],
        receive: [{ type: 'player', teamId: 'team-2', playerId: 'target-te', pickId: null, description: 'Cole Hart' }],
      },
    ];
    mockState.scenarioState = {
      activeScenario: {
        id: 'savant',
        name: 'The Savant',
        constraints: { blockTrades: true, blockFreeAgency: true, blockDraft: false },
      },
    };

    const markup = renderToStaticMarkup(<TradeCenter />);

    expect(markup).toContain('SCENARIO LOCK');
    expect(markup).toContain('The Savant');
    expect(markup).toContain('TRADE ACCEPTS BLOCKED');
    expect(markup).toContain('Accepting generated offers, submitting direct proposals, and accepting counters are disabled');
    expect(markup).toContain('saved scenarioState.activeScenario.constraints.blockTrades');
    expect(markup).toContain('TRADES LOCKED');
    expect(markup).toContain('Scenario Locked');
    expect(markup).toContain('Reject');
    expect(markup).toContain('data-mfd-button-state="disabled"');
  });
});
