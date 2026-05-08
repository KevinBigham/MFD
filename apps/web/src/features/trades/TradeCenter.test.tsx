import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TradeCenter } from './TradeCenter';

const mockState = {
  game: {
    players: {
      'user-wr': { id: 'user-wr', name: 'Jay Reed', contract: null },
      'target-te': { id: 'target-te', name: 'Cole Hart', contract: null },
    },
    teams: {
      'team-1': { id: 'team-1', draftPicks: [] },
      'team-2': { id: 'team-2', draftPicks: [] },
    },
  },
  userTeam: { id: 'team-1', city: 'Chicago', name: 'Blaze' },
  offers: [],
  proposals: [],
  week: 8,
  phase: 'regular_season',
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
  ],
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
    getTradeTargets: () => [{ teamId: 'team-2', teamName: 'Austin Armadillos', tradeBlock: [], picks: [] }],
    getTradeableAssets: () => [{ type: 'player', teamId: 'team-1', playerId: 'user-wr', pickId: null, description: 'Jay Reed' }],
    calcPlayerValue: () => 10,
    calcPickValue: () => 8,
  };
});

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectActiveProposals: (state: typeof mockState) => state.proposals,
  selectPhase: (state: typeof mockState) => state.phase,
  selectTradeDeadlineState: () => null,
  selectTradeOffers: (state: typeof mockState) => state.offers,
  selectTradeSuggestions: (state: typeof mockState) => state.tradeSuggestions,
  selectUserTeam: (state: typeof mockState) => state.userTeam,
  selectWeek: (state: typeof mockState) => state.week,
}));

describe('TradeCenter', () => {
  it('renders the trade finder panel with reusable suggestions', () => {
    const markup = renderToStaticMarkup(<TradeCenter />);

    expect(markup).toContain('TRADE CENTER');
    expect(markup).toContain('TRADE FINDER');
    expect(markup).toContain('Austin Armadillos');
    expect(markup).toContain('Cole Hart');
    expect(markup).toContain('0.9');
    expect(markup).toContain('TRADE IMPACT');
    expect(markup).toContain('Immediate');
  });
});
