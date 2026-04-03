import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FreeAgencyHub } from './FreeAgencyHub';

const mockState = {
  game: {
    agents: [
      {
        id: 'agent-1',
        name: 'Jordan Bishop',
        style: 'hardball',
        demandMultiplier: 1.2,
      },
    ],
  },
  phase: 'offseason',
  roster: [
    {
      id: 'p1',
      name: 'Jay Stone',
      pos: 'QB',
      ovr: 88,
      age: 27,
      holdout: true,
      agentId: 'agent-1',
    },
  ],
  offseasonState: {
    round: 1,
    expiringPlayerIds: ['p1'],
    reSignDecisions: {
      p1: {
        playerId: 'p1',
        teamId: 'team-1',
        askingPrice: { years: 4, salary: 25, signingBonus: 10, guaranteed: 42 },
        agentDemand: { years: 4, salary: 29, signingBonus: 12, guaranteed: 47 },
        lastOffer: { years: 4, salary: 24, signingBonus: 9, guaranteed: 39 },
        counterOffer: { years: 4, salary: 26.5, signingBonus: 10.5, guaranteed: 43 },
        agentResponse: 'Jordan Bishop counters for a middle ground on Jay Stone.',
        patienceWeeksRemaining: 2,
        status: 'countered',
      },
    },
    freeAgencyBids: {},
  },
  freeAgents: [],
  userTeamId: 'team-1',
  actions: {
    advanceWeek: async () => null,
    submitFreeAgentBid: async () => undefined,
    negotiateContract: async () => undefined,
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectPhase: (state: typeof mockState) => state.phase,
  selectRoster: (state: typeof mockState) => state.roster,
  selectOffseasonState: (state: typeof mockState) => state.offseasonState,
  selectFreeAgentPlayers: (state: typeof mockState) => state.freeAgents,
  selectUserTeamId: (state: typeof mockState) => state.userTeamId,
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
  });
});
