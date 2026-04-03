import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WaiverWire } from './WaiverWire';

const mockState = {
  userTeam: { id: 'team-1', city: 'Chicago', name: 'Blaze' },
  userTeamId: 'team-1',
  waiverBoard: [
    {
      playerId: 'p1',
      name: 'Keenan Ward',
      pos: 'WR',
      ovr: 79,
      age: 25,
      salary: 3.2,
      releasedByTeamId: 'team-2',
      releasedByName: 'Austin Armadillos',
      countdown: '1 day',
      claimPending: false,
    },
  ],
  waiverPriority: [
    { teamId: 'team-1', teamName: 'Chicago Blaze', priority: 1, isUser: true },
    { teamId: 'team-2', teamName: 'Austin Armadillos', priority: 2, isUser: false },
  ],
  claimResults: [
    {
      id: 'wr-1',
      year: 2031,
      week: 8,
      successfulClaims: [{ playerId: 'p2', playerName: 'Sam North', winningTeamName: 'Chicago Blaze' }],
      lostClaims: [{ playerId: 'p3', playerName: 'Drew Vale', winningTeamName: 'Austin Armadillos' }],
      clearedPlayers: [{ playerId: 'p4', playerName: 'Mason Pike' }],
    },
  ],
  transactionLog: [
    { type: 'CUT', year: 2031, week: 7, playerId: 'p5', notes: 'Released to waivers' },
    { type: 'WAIVER_CLAIM', year: 2031, week: 8, playerId: 'p2', notes: 'Won priority claim' },
  ],
  actions: {
    submitWaiverClaim: () => Promise.resolve(),
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => state.userTeam,
  selectUserTeamId: (state: typeof mockState) => state.userTeamId,
  selectWaiverWireBoard: (state: typeof mockState) => state.waiverBoard,
  selectWaiverPriority: (state: typeof mockState) => state.waiverPriority,
  selectClaimResults: (state: typeof mockState) => state.claimResults,
  selectTransactionLog: (state: typeof mockState) => state.transactionLog,
}));

describe('WaiverWire', () => {
  it('renders the board, priority order, claim results, and transaction log', () => {
    const markup = renderToStaticMarkup(<WaiverWire />);

    expect(markup).toContain('WAIVER WIRE');
    expect(markup).toContain('Keenan Ward');
    expect(markup).toContain('Austin Armadillos');
    expect(markup).toContain('1 day');
    expect(markup).toContain('CLAIM RESULTS');
    expect(markup).toContain('Sam North');
    expect(markup).toContain('TRANSACTION LOG');
    expect(markup).toContain('WAIVER_CLAIM');
  });
});
