import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TradeDeadline } from './TradeDeadline';

let mockState: { deadlineState: any | null; actions: any } = {
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

  it('renders the idle state when no deadline is active', () => {
    mockState = {
      ...mockState,
      deadlineState: null,
    };

    const markup = renderToStaticMarkup(<TradeDeadline />);

    expect(markup).toContain('DEADLINE IDLE');
    expect(markup).toContain('trade market is quiet');
  });
});
