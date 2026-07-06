import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  DraftBoard,
  DraftPickReceiptPanel,
  buildDraftClosureCta,
  buildDraftMarketReceipt,
  buildDraftOfferConfidence,
  buildDraftPickForecast,
  buildDraftPickReceipt,
} from './DraftBoard';

const mockState = {
  phase: 'draft',
  userTeam: {
    id: 'user',
    draftPicks: [
      { year: 2027, round: 1, pick: 1, originalTeamId: 'user', currentTeamId: 'user', isCompPick: false },
      { year: 2027, round: 3, pick: 33, originalTeamId: 'user', currentTeamId: 'user', isCompPick: true },
    ],
  },
  year: 2027,
  leagueRules: {
    initializedYear: 2027,
    history: [],
    entries: {
      comp_pick_limit: {
        key: 'comp_pick_limit',
        value: 2,
        previousValue: 4,
        effectiveYear: 2027,
        source: 'commissioner_vote',
        status: 'active',
      },
    },
  },
  needsReport: { criticalNeeds: ['WR'] },
  draftRecaps: [] as any[],
  draftClass: [
    {
      id: 'prospect-1',
      firstName: 'Jalen',
      lastName: 'North',
      pos: 'WR',
      college: 'Texas',
      projectedRound: 1,
      scoutGrade: 81,
      bloodline: {
        parentPlayerId: 'legend-wr',
        parentName: 'Marcus North',
        parentTeamId: 'user',
        parentPosition: 'WR',
        relationship: 'son',
        legacyTag: 'famous_name',
      },
    },
  ],
  offseasonState: {
    draftOrder: [{ id: 'user-2027-1-1-user', teamId: 'user', round: 1, pick: 1, overall: 1, originalTeamId: 'user' }],
    scoutingState: {
      'prospect-1': {
        prospectId: 'prospect-1',
        actions: ['film', 'interview'],
        accuracy: 0.51,
        confidence: 51,
        visibleScoutGrade: 84,
        notes: [],
        proDayRating: null,
        assignedScoutId: 'scout-1',
        riskBand: 'balanced',
        ceilingBand: 'impact',
        characterRead: 'steady',
        privateWorkoutRatings: [],
      },
    },
  },
  currentEntry: { id: 'user-2027-1-1-user', teamId: 'user', round: 1, pick: 1, overall: 1, originalTeamId: 'user' },
  scenarioState: null as any,
  warRoomState: {
    currentPick: 1,
    onTheClock: 'user',
    draftGrade: 'B+',
    timeRemaining: 90,
    incomingOffers: [{
      from: 'cpu',
      targetPick: 1,
      urgency: 'desperate',
      reasoning: 'CPU City wants to jump the queue for WR talent that fills a top need.',
      offer: {
        offering: [
          { type: 'pick', teamId: 'cpu', playerId: null, pickId: 'cpu-1-2-cpu', description: 'Round 1, Pick 2' },
          { type: 'pick', teamId: 'cpu', playerId: null, pickId: 'cpu-future-3-cpu', description: 'Future round 3 pick' },
        ],
        requesting: [
          { type: 'pick', teamId: 'user', playerId: null, pickId: 'user-1-1-user', description: 'Round 1, Pick 1' },
        ],
        type: 'mixed',
      },
    }],
    userCanTradeUp: [],
  },
  actions: {
    acceptDraftTradeOffer: () => Promise.resolve(),
    advanceWeek: () => Promise.resolve(),
    makeDraftPick: () => Promise.resolve(),
    refreshWarRoom: () => Promise.resolve(),
    rejectDraftTradeOffer: () => Promise.resolve(),
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectCurrentDraftEntry: (state: typeof mockState) => state.currentEntry,
  selectDraftClass: (state: typeof mockState) => state.draftClass,
  selectDraftRecaps: (state: typeof mockState) => state.draftRecaps,
  selectLeagueRules: (state: typeof mockState) => state.leagueRules,
  selectOffseasonState: (state: typeof mockState) => state.offseasonState,
  selectPhase: (state: typeof mockState) => state.phase,
  selectScenarioState: (state: typeof mockState) => state.scenarioState,
  selectUserTeam: (state: typeof mockState) => state.userTeam,
  selectUserTeamNeeds: (state: typeof mockState) => state.needsReport,
  selectWarRoomState: (state: typeof mockState) => state.warRoomState,
  selectYear: (state: typeof mockState) => state.year,
}));

vi.mock('@mfd/engine', async () => {
  const actual = await vi.importActual<object>('@mfd/engine');
  return {
    ...actual,
    calcPickValue: () => 100,
  };
});

describe('DraftBoard', () => {
  it('builds post-draft closure CTA copy from phase and saved recap state', () => {
    expect(buildDraftClosureCta({
      phase: 'draft',
      year: 2027,
      currentYearRecapSaved: false,
    })).toBeNull();

    expect(buildDraftClosureCta({
      phase: 'post_draft',
      year: 2027,
      currentYearRecapSaved: false,
    })).toMatchObject({
      status: 'needs-recap',
      action: 'finalize',
      actionLabel: 'Finalize Recap',
    });

    expect(buildDraftClosureCta({
      phase: 'post_draft',
      year: 2027,
      currentYearRecapSaved: true,
    })).toMatchObject({
      status: 'recap-ready',
      action: 'review',
      actionLabel: 'Review Draft Recap',
    });
  });

  it('builds a read-only draft-pick forecast from saved scouting and pick context', () => {
    const forecast = buildDraftPickForecast(mockState.draftClass[0] as never, {
      currentEntry: mockState.currentEntry,
      scouting: mockState.offseasonState.scoutingState['prospect-1'] as never,
      criticalNeeds: mockState.needsReport.criticalNeeds,
    });

    expect(forecast.label).toBe('Board-aligned');
    expect(forecast.needFit).toContain('matches a critical need');
    expect(forecast.scoutConfidence).toContain('51% confidence');
    expect(forecast.riskRead).toContain('Risk balanced');
    expect(forecast.source).toContain('offseasonState.scoutingState');
    expect(forecast.source).toContain('makeDraftPick');
    expect(forecast.warnings).toEqual([]);
  });

  it('builds a read-only draft offer confidence read from war-room offer state', () => {
    const confidence = buildDraftOfferConfidence(mockState.warRoomState.incomingOffers[0] as never, {
      currentEntry: mockState.currentEntry,
      criticalNeeds: mockState.needsReport.criticalNeeds,
      topProspect: mockState.draftClass[0] as never,
    });

    expect(confidence.label).toBe('Leverage-positive');
    expect(confidence.chartSummary).toContain('Offer chart +100');
    expect(confidence.leverageRead).toContain('desperate urgency');
    expect(confidence.leverageRead).toContain('top-board need fit');
    expect(confidence.source).toContain('selectWarRoomState incomingOffers');
    expect(confidence.source).toContain('acceptDraftTradeOffer/rejectDraftTradeOffer');
    expect(confidence.warnings).toContain('1 future pick value uses a final-pick chart estimate.');
    expect(confidence.warnings).toContain('Top visible prospect WR matches a critical need.');
  });

  it('builds a draft market receipt from saved incoming-offer fields', () => {
    const confidence = buildDraftOfferConfidence(mockState.warRoomState.incomingOffers[0] as never, {
      currentEntry: mockState.currentEntry,
      criticalNeeds: mockState.needsReport.criticalNeeds,
      topProspect: mockState.draftClass[0] as never,
    });
    const receipt = buildDraftMarketReceipt(mockState.warRoomState.incomingOffers[0] as never, confidence);

    expect(receipt).toEqual({
      label: 'Leverage window',
      accent: 'green',
      detail: 'cpu wants pick #1: CPU City wants to jump the queue for WR talent that fills a top need. They offer Round 1, Pick 2 + Future round 3 pick for Round 1, Pick 1. Leverage-positive: Offer chart +100: offered 200 vs asking 100.',
      boundary: 'Read-only until Accept or Reject. Movement, draft-order updates, autosave, and war-room refresh stay with acceptDraftTradeOffer/rejectDraftTradeOffer.',
    });
  });

  it('renders scouting confidence and intel badges on the big board', () => {
    const markup = renderToStaticMarkup(<DraftBoard />);

    expect(markup).toContain('DRAFT BOARD');
    expect(markup).toContain('NEXT CALL');
    expect(markup).toContain('Make the board pick');
    expect(markup).toContain('DRAFT BOARD SOURCES');
    expect(markup).toContain('SAVED DRAFT CLASS');
    expect(markup).toContain('game.draftClass');
    expect(markup).toContain('offseasonState.scoutingState');
    expect(markup).toContain('selectWarRoomState');
    expect(markup).toContain('Offer Confidence and Draft Market Receipt are route-local reads');
    expect(markup).toContain('makeDraftPick');
    expect(markup).toContain('route-local presentation, not durable pick history');
    expect(markup).toContain('Offer Confidence');
    expect(markup).toContain('Leverage-positive');
    expect(markup).toContain('Offer chart +100');
    expect(markup).toContain('Draft Market Receipt');
    expect(markup).toContain('Leverage window');
    expect(markup).toContain('cpu wants pick #1: CPU City wants to jump the queue for WR talent');
    expect(markup).toContain('Read-only until Accept or Reject');
    expect(markup).toContain('Movement, draft-order updates, autosave, and war-room refresh stay with acceptDraftTradeOffer/rejectDraftTradeOffer');
    expect(markup).toContain('selectWarRoomState incomingOffers + calcPickValue');
    expect(markup).toContain('acceptDraftTradeOffer/rejectDraftTradeOffer');
    expect(markup).toContain('Pick Forecast');
    expect(markup).toContain('Board-aligned');
    expect(markup).toContain('WR matches a critical need.');
    expect(markup).toContain('51% confidence from saved scouting intel.');
    expect(markup).toContain('Source: offseasonState.scoutingState via film + interview');
    expect(markup).toContain('51%');
    expect(markup).toContain('Bloodline');
    expect(markup).toContain('balanced');
    expect(markup).toContain('steady');
    expect(markup).toContain('COMP PICK CONTEXT');
    expect(markup).toContain('1 COMP PICK');
    expect(markup).toContain('ACTIVE LIMIT 2');
    expect(markup).toContain('FA ROUND 3 RECEIPT');
    expect(markup).toContain('Awarded picks on this board: R3 P33.');
    expect(markup).toContain('saved team.draftPicks rows with isCompPick');
    expect(markup).toContain('LOSE_FA departures minus SIGN_FA additions');
    expect(markup).toContain('active comp_pick_limit rule (2 for 2027)');
    expect(markup).toContain('League Office news');
    expect(markup).toContain('Comp Pick Master');
    expect(markup).not.toContain('DRAFT PICK RECEIPT');
  });

  it('renders scenario lock guidance when active constraints block draft actions', () => {
    mockState.scenarioState = {
      activeScenario: {
        id: 'locked-draft',
        name: 'Locked Draft',
        constraints: { blockDraft: true, blockTrades: true, blockFreeAgency: false },
      },
    };

    try {
      const markup = renderToStaticMarkup(<DraftBoard />);

      expect(markup).toContain('SCENARIO LOCK');
      expect(markup).toContain('Locked Draft');
      expect(markup).toContain('DRAFT PICKS BLOCKED');
      expect(markup).toContain('TRADE ACCEPTS BLOCKED');
      expect(markup).toContain('Draft Player buttons are disabled here');
      expect(markup).toContain('Draft-night trade Accept buttons are disabled here');
      expect(markup).toContain('saved scenarioState.activeScenario.constraints');
      expect(markup).toContain('blocked draft-war-room accepts');
      expect(markup).toContain('data-mfd-button-state="disabled"');
    } finally {
      mockState.scenarioState = null;
    }
  });

  it('renders post-draft recap finalization guidance when the current-year recap is not archived', () => {
    mockState.phase = 'post_draft';
    mockState.currentEntry = null as never;
    mockState.draftRecaps = [];

    try {
      const markup = renderToStaticMarkup(<DraftBoard />);

      expect(markup).toContain('DRAFT CLOSURE');
      expect(markup).toContain('NEEDS RECAP');
      expect(markup).toContain('Draft board is complete.');
      expect(markup).toContain('finalizePostDraft');
      expect(markup).toContain('does not generate or repair recaps during render');
      expect(markup).toContain('Finalize Recap');
    } finally {
      mockState.phase = 'draft';
      mockState.currentEntry = { id: 'user-2027-1-1-user', teamId: 'user', round: 1, pick: 1, overall: 1, originalTeamId: 'user' };
      mockState.draftRecaps = [];
    }
  });

  it('routes to the saved current-year draft recap when it is already archived', () => {
    mockState.phase = 'post_draft';
    mockState.currentEntry = null as never;
    mockState.draftRecaps = [{ year: 2027 }];

    try {
      const markup = renderToStaticMarkup(<DraftBoard />);

      expect(markup).toContain('DRAFT CLOSURE');
      expect(markup).toContain('RECAP READY');
      expect(markup).toContain('Current-year draft recap is saved.');
      expect(markup).toContain('selectDraftRecaps found a saved recap for the current year');
      expect(markup).toContain('Review Draft Recap');
    } finally {
      mockState.phase = 'draft';
      mockState.currentEntry = { id: 'user-2027-1-1-user', teamId: 'user', round: 1, pick: 1, overall: 1, originalTeamId: 'user' };
      mockState.draftRecaps = [];
    }
  });

  it('builds draft pick receipts from the existing makeDraftPick commit path', () => {
    const forecast = buildDraftPickForecast(mockState.draftClass[0] as never, {
      currentEntry: mockState.currentEntry,
      scouting: mockState.offseasonState.scoutingState['prospect-1'] as never,
      criticalNeeds: mockState.needsReport.criticalNeeds,
    });
    const receipt = buildDraftPickReceipt({
      prospect: mockState.draftClass[0] as never,
      forecast,
      currentEntry: mockState.currentEntry as never,
      teamName: 'Chicago Blaze',
      year: 2027,
    });

    expect(receipt).toMatchObject({
      id: 'draft-pick:prospect-1:1',
      title: 'Draft Pick Submitted',
      accent: 'green',
    });
    expect(receipt.target).toContain('Jalen North // WR // Texas // Round 1, Pick 1, Overall #1 // Chicago Blaze');
    expect(receipt.result).toContain('Chicago Blaze selected Jalen North in 2027');
    expect(receipt.result).toContain('Pre-pick forecast was Board-aligned');
    expect(receipt.stateTouched).toContain('draftClass');
    expect(receipt.stateTouched).toContain('post-draft press conference queue');
    expect(receipt.source).toContain('actions.makeDraftPick -> makeDraftPickEngine -> applyDraftSelection -> commitGame');
    expect(receipt.boundary).toContain('does not draft another prospect');
    expect(receipt.boundary).toContain('reroll saved outcomes');
    expect(receipt.warnings).toEqual([]);
  });

  it('renders draft pick receipt source copy and no-extra-write boundary', () => {
    const forecast = buildDraftPickForecast(mockState.draftClass[0] as never, {
      currentEntry: mockState.currentEntry,
      scouting: undefined,
      criticalNeeds: [],
    });
    const receipt = buildDraftPickReceipt({
      prospect: mockState.draftClass[0] as never,
      forecast,
      currentEntry: mockState.currentEntry as never,
      teamName: 'Chicago Blaze',
      year: 2027,
    });

    const markup = renderToStaticMarkup(<DraftPickReceiptPanel receipt={receipt} />);

    expect(markup).toContain('DRAFT PICK RECEIPT');
    expect(markup).toContain('On-screen confirmation');
    expect(markup).toContain('Jalen North // WR // Texas // Round 1, Pick 1, Overall #1 // Chicago Blaze');
    expect(markup).toContain('Changed now');
    expect(markup).toContain('GameState.players');
    expect(markup).toContain('Action used');
    expect(markup).toContain('actions.makeDraftPick -&gt; makeDraftPickEngine -&gt; applyDraftSelection -&gt; commitGame');
    expect(markup).toContain('Did not also');
    expect(markup).toContain('This confirmation does not draft another prospect');
    expect(markup).toContain('Watch: No saved scouting action for this prospect yet.');
  });
});
