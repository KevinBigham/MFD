import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  TradeDeadline,
  TradeDeadlineActionReceiptPanel,
  buildDeadlineDealReceipt,
  buildTradeDeadlineActionReceipt,
} from './TradeDeadline';

let mockState: { deadlineState: any | null; scenarioState: any | null; actions: any } = {
  deadlineState: {
    minutesRemaining: 30,
    urgencyLevel: 'frantic',
    completedDeals: [
      {
        id: 'deal-1',
        teams: ['CHI', 'DET'],
        players: ['p1'],
        picks: ['2nd-round pick'],
        timestamp: 44,
        grade: 'A-',
        splash: true,
        narrative: 'In a stunning move, Chicago lands a veteran pass rusher.',
      },
    ],
    pendingOffers: [
      {
        id: 'offer-1',
        summary: 'Detroit offers a second-rounder for your backup edge rusher.',
        send: [{ description: 'Backup edge rusher' }],
        receive: [{ description: '2027 2nd-round pick' }],
      },
    ],
    tickerMessages: ['BREAKING: Chicago lands a veteran pass rusher.'],
  },
  scenarioState: null,
  actions: {
    acceptDeadlineOffer: () => Promise.resolve(),
    advanceDeadlineClock: () => Promise.resolve(),
    finalizeDeadline: () => Promise.resolve(),
    rejectDeadlineOffer: () => Promise.resolve(),
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectTradeDeadlineState: (state: typeof mockState) => state.deadlineState,
  selectScenarioState: (state: typeof mockState) => state.scenarioState,
}));

describe('TradeDeadline', () => {
  it('renders the countdown, urgency badge, and completed deals', () => {
    const markup = renderToStaticMarkup(<TradeDeadline />);

    expect(markup).toContain('TRADE DEADLINE');
    expect(markup).toContain('0:30');
    expect(markup).toContain('FRANTIC');
    expect(markup).toContain('A-');
    expect(markup).toContain('Accept');
    expect(markup).toContain('Reject');
    expect(markup).toContain('DEADLINE SOURCES');
    expect(markup).not.toContain('DEADLINE ACTION RECEIPT');
    expect(markup).toContain('selectTradeDeadlineState');
    expect(markup).toContain('without generating new offers during render');
    expect(markup).toContain('Finalize calls the engine deadline finalizer');
    expect(markup).toContain('Deadline Deal Receipt');
    expect(markup).toContain('Splash buy');
    expect(markup).toContain('CHI buying from DET: p1 for 2nd-round pick. A- grade, 44 minutes left.');
    expect(markup).toContain('do not move players or picks until the Finalize Deadline action');
  });

  it('builds deterministic completed-deal receipts from saved deadline rows', () => {
    const splash = buildDeadlineDealReceipt(mockState.deadlineState.completedDeals[0]);
    const value = buildDeadlineDealReceipt({
      ...mockState.deadlineState.completedDeals[0],
      id: 'deal-2',
      splash: false,
      grade: 'B+',
      timestamp: 18,
    });
    const churn = buildDeadlineDealReceipt({
      ...mockState.deadlineState.completedDeals[0],
      id: 'deal-3',
      splash: false,
      grade: 'C',
      timestamp: 8,
      picks: [],
    });

    expect(splash).toEqual({
      label: 'Splash buy',
      detail: 'CHI buying from DET: p1 for 2nd-round pick. A- grade, 44 minutes left. This saved completed-deal receipt stays pending movement until Finalize Deadline applies completed deals.',
      accent: 'gold',
    });
    expect(value).toEqual({
      label: 'Value buy',
      detail: 'CHI buying from DET: p1 for 2nd-round pick. B+ grade, 18 minutes left. Strong saved grade marks a buyer-favorable market move, but it still waits for Finalize Deadline before rosters or picks change.',
      accent: 'green',
    });
    expect(churn).toEqual({
      label: 'Market churn',
      detail: 'CHI buying from DET: p1 for listed pick compensation. C grade, 8 minutes left. This is deadline feed context only until the finalizer commits completed deals.',
      accent: 'cyan',
    });
  });

  it('builds accept, reject, and clock receipts from pre-action deadline context', () => {
    const offer = mockState.deadlineState.pendingOffers[0];
    const accepted = buildTradeDeadlineActionReceipt({
      action: 'accept_offer',
      offerId: offer.id,
      offerSummary: offer.summary,
      sendAssets: offer.send,
      receiveAssets: offer.receive,
    });
    const rejected = buildTradeDeadlineActionReceipt({
      action: 'reject_offer',
      offerId: offer.id,
      offerSummary: offer.summary,
      sendAssets: offer.send,
      receiveAssets: offer.receive,
    });
    const advanced = buildTradeDeadlineActionReceipt({
      action: 'advance_clock',
      minutesBefore: 30,
      minutesAdvanced: 30,
      urgencyBefore: 'frantic',
      completedDealsBefore: 1,
    });

    expect(accepted.title).toBe('Deadline Offer Accepted');
    expect(accepted.result).toContain('you send Backup edge rusher');
    expect(accepted.result).toContain('you receive 2027 2nd-round pick');
    expect(accepted.stateTouched).toContain('rosters or picks moved');
    expect(accepted.source).toContain('acceptDeadlineOffer');
    expect(accepted.boundary).toContain('does not accept another offer');
    expect(rejected.title).toBe('Deadline Offer Rejected');
    expect(rejected.stateTouched).toContain('deadline pending offers');
    expect(rejected.boundary).toContain('does not move players or picks');
    expect(advanced.title).toBe('Deadline Clock Advanced');
    expect(advanced.target).toContain('0:30 -> 0:00');
    expect(advanced.result).toContain('Advanced the saved countdown by 30 minutes');
    expect(advanced.source).toContain('advanceDeadlineClockEngine');
  });

  it('renders deadline action receipt source and no-extra-write copy', () => {
    const receipt = buildTradeDeadlineActionReceipt({
      action: 'accept_offer',
      offerId: 'offer-1',
      offerSummary: 'Detroit offers a second-rounder for your backup edge rusher.',
      sendAssets: [{ description: 'Backup edge rusher' }],
      receiveAssets: [{ description: '2027 2nd-round pick' }],
    });

    const markup = renderToStaticMarkup(<TradeDeadlineActionReceiptPanel receipt={receipt} />);

    expect(markup).toContain('DEADLINE ACTION RECEIPT');
    expect(markup).toContain('Deadline Offer Accepted');
    expect(markup).toContain('On-screen confirmation');
    expect(markup).toContain('Action used');
    expect(markup).toContain('actions.acceptDeadlineOffer');
    expect(markup).toContain('Did not also');
    expect(markup).toContain('separate confirmation log');
  });

  it('renders the finalize button when the clock has expired', () => {
    mockState = {
      ...mockState,
      deadlineState: {
        ...mockState.deadlineState,
        minutesRemaining: 0,
      },
    };

    const markup = renderToStaticMarkup(<TradeDeadline />);

    expect(markup).toContain('Finalize Deadline');

    mockState = {
      ...mockState,
      deadlineState: {
        ...mockState.deadlineState,
        minutesRemaining: 30,
      },
    };
  });

  it('renders scenario lock guidance and disables deadline accepts when trades are blocked', () => {
    const originalScenarioState = mockState.scenarioState;
    try {
      mockState = {
        ...mockState,
        scenarioState: {
          activeScenario: {
            id: 'savant',
            name: 'The Savant',
            constraints: { blockTrades: true, blockFreeAgency: true, blockDraft: false },
          },
        },
      };

      const markup = renderToStaticMarkup(<TradeDeadline />);

      expect(markup).toContain('SCENARIO LOCK');
      expect(markup).toContain('The Savant');
      expect(markup).toContain('DEADLINE ACCEPTS BLOCKED');
      expect(markup).toContain('Accepting pending deadline offers is disabled');
      expect(markup).toContain('saved scenarioState.activeScenario.constraints.blockTrades');
      expect(markup).toContain('TRADES LOCKED');
      expect(markup).toContain('Scenario Locked');
      expect(markup).toContain('Reject');
      expect(markup).toContain('data-mfd-button-state="disabled"');
    } finally {
      mockState = {
        ...mockState,
        scenarioState: originalScenarioState,
      };
    }
  });

  it('renders the idle state when no deadline is active', () => {
    mockState = {
      ...mockState,
      deadlineState: null,
    };

    const markup = renderToStaticMarkup(<TradeDeadline />);

    expect(markup).toContain('DEADLINE IDLE');
    expect(markup).toContain('trade market is quiet');
    expect(markup).toContain('DEADLINE SOURCES');
    expect(markup).toContain('No active state');
  });
});
