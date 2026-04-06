import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

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
        roster: [],
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
  selectWeek: (state: typeof mockState) => state.game.week,
  selectRoster: (state: typeof mockState) => state.game.teams['team-1'].roster,
  selectHandshakes: (state: typeof mockState) => state.game.handshakes,
}));

import { HandshakeLedger } from './HandshakeLedger';

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
});
