import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Player } from '@mfd/engine';

type MockPlayer = {
  id: string;
  name: string;
  pos: string;
  ovr: number;
  isStarter: boolean;
  injury: null;
};

const mockState = {
  game: {
    week: 8,
    year: 2026,
    teams: {
      'team-1': {
        id: 'team-1',
        city: 'Dallas',
        name: 'Cowboys',
        abbr: 'DAL',
        wins: 5,
        losses: 3,
        ownerId: 'owner-1',
        capSpace: 30,
        roster: [] as MockPlayer[],
        staff: { hc: null },
        owner: null,
        fatigueState: {},
        practiceSquad: [],
        mentoringPairs: [],
        trainingAssignments: {},
      },
    },
    userTeamId: 'team-1',
    handshakes: [],
    players: {},
  },
  actions: {
    makePromise: vi.fn(),
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => state.game.teams['team-1'],
  selectYear: (state: typeof mockState) => state.game.year,
  selectWeek: (state: typeof mockState) => state.game.week,
  selectRoster: (state: typeof mockState) => state.game.teams['team-1'].roster,
  selectHandshakes: (state: typeof mockState) => state.game.handshakes,
}));

import {
  buildHandshakePromiseReceipt,
  HandshakeLedger,
  HandshakePromiseReceiptPanel,
} from './HandshakeLedger';

const promiseTarget = {
  id: 'player-1',
  name: 'Micah Reed',
  pos: 'WR',
  ovr: 88,
  isStarter: false,
  injury: null,
};

describe('HandshakeLedger', () => {
  it('renders screen header with Handshake Ledger title', () => {
    const markup = renderToStaticMarkup(<HandshakeLedger />);

    expect(markup).toContain('HANDSHAKE LEDGER');
    expect(markup).toContain('trust promises');
  });

  it('renders empty state when no handshakes exist', () => {
    const markup = renderToStaticMarkup(<HandshakeLedger />);

    expect(markup).toContain('No open promises right now');
    expect(markup).toContain('ACTIVE PROMISES (0)');
  });

  it('labels handshake sources and commit boundaries without implying render-time writes', () => {
    const markup = renderToStaticMarkup(<HandshakeLedger />);

    expect(markup).toContain('HANDSHAKE SOURCES');
    expect(markup).toContain('selectHandshakes reads');
    expect(markup).toContain('game.handshakes');
    expect(markup).toContain('owner_mandate mirrors');
    expect(markup).toContain('selectRoster feeds');
    expect(markup).toContain('Rendering this list does not create promises.');
    expect(markup).toContain('generateOwnerDemands');
    expect(markup).toContain('upsertOwnerMandateHandshakes');
    expect(markup).toContain('actions.makePromise');
    expect(markup).toContain('makePlayerPromise');
    expect(markup).toContain('evaluateHandshakes runs during week/offseason progression, not during render');
    expect(markup).toContain('does not generate owner demands, evaluate promises, award achievements, autosave, play games, reroll saved outcomes, or move players');
  });

  it('builds route-local promise receipts without changing the saved commit path', () => {
    const receipt = buildHandshakePromiseReceipt({
      player: promiseTarget as unknown as Player,
      promiseType: 'restructure',
      year: 2026,
      week: 8,
      priorPromiseCount: 2,
    });

    expect(receipt).toMatchObject({
      id: 'player-1-restructure-2026-8-2',
      playerName: 'Micah Reed',
      promiseLabel: 'Promise Restructure',
      deadline: 'Due 2026-W12',
      accent: 'green',
    });
    expect(receipt.commitment).toContain('restructured contract');
    expect(receipt.detail).toContain('saved game.handshakes');
    expect(receipt.detail).toContain('evaluateHandshakes owns fulfilled, broken, or expired status later');
    expect(receipt.source).toContain('actions.makePromise -> makePlayerPromise -> commitGame');
    expect(receipt.source).toContain('This confirmation appears here only');
    expect(receipt.source).toContain('does not evaluate promises, award achievements, play games, reroll saved outcomes, or move players');
  });

  it('renders promise receipt copy with the saved ledger and no-extra-write boundary', () => {
    const receipt = buildHandshakePromiseReceipt({
      player: promiseTarget as unknown as Player,
      promiseType: 'no_trade',
      year: 2026,
      week: 16,
      priorPromiseCount: 1,
    });

    const markup = renderToStaticMarkup(<HandshakePromiseReceiptPanel receipt={receipt} />);

    expect(markup).toContain('PROMISE RECEIPT');
    expect(markup).toContain('Promise No Trade');
    expect(markup).toContain('Micah Reed // WR // 88 OVR');
    expect(markup).toContain('Due 2026-W18');
    expect(markup).toContain('On-screen confirmation');
    expect(markup).toContain('Saved ledger: game.handshakes');
    expect(markup).toContain('actions.makePromise -&gt; makePlayerPromise -&gt; commitGame');
    expect(markup).toContain('reading it does not evaluate promises');
  });

  it('renders make-promise targets from the roster without creating the receipt during render', () => {
    mockState.game.teams['team-1'].roster = [promiseTarget];
    try {
      const markup = renderToStaticMarkup(<HandshakeLedger />);

      expect(markup).toContain('Promise Starter');
      expect(markup).toContain('Promise No Trade');
      expect(markup).toContain('Promise Restructure');
      expect(markup).toContain('selectRoster feeds 1 displayed Make Promise target');
      expect(markup).not.toContain('PROMISE RECEIPT');
    } finally {
      mockState.game.teams['team-1'].roster = [];
    }
  });
});
