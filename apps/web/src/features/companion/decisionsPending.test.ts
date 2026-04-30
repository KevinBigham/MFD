import { describe, expect, it } from 'vitest';
import { countPendingDecisions } from './decisionsPending';

function stateWithGame(game: Record<string, unknown>) {
  return { game };
}

function userTeam(overrides: Record<string, unknown> = {}) {
  return {
    id: 'team-1',
    isUser: true,
    roster: [],
    staff: { hc: {}, oc: {}, dc: {} },
    ...overrides,
  };
}

describe('countPendingDecisions', () => {
  it('returns all zero counts for empty state', () => {
    expect(countPendingDecisions({})).toEqual({
      tradeOffers: 0,
      expiringContracts: 0,
      emptyDepthSlots: 0,
      unspentPicks: 0,
      openStaffSlots: 0,
      total: 0,
    });
  });

  it('counts pending trade offers independently', () => {
    const counts = countPendingDecisions(stateWithGame({
      teams: { user: userTeam() },
      offseasonState: {
        tradeOffers: [
          { status: 'pending', toTeamId: 'team-1' },
          { status: 'pending', fromTeamId: 'team-1' },
        ],
      },
    }));

    expect(counts.tradeOffers).toBe(2);
    expect(counts.total).toBe(2);
  });

  it('counts expiring user contracts that have not already been renewed', () => {
    const counts = countPendingDecisions(stateWithGame({
      teams: {
        user: userTeam({
          roster: [
            { id: 'p1', contract: { years: 1 } },
            { id: 'p2', contract: { years: 0 } },
          ],
        }),
      },
      contractExtensions: [],
    }));

    expect(counts.expiringContracts).toBe(2);
  });

  it('counts empty depth slots independently', () => {
    const counts = countPendingDecisions(stateWithGame({
      teams: {
        user: userTeam({
          roster: [
            { id: 'qb1', pos: 'QB', isStarter: true },
            { id: 'rb1', pos: 'RB', isStarter: true },
          ],
        }),
      },
    }));

    expect(counts.emptyDepthSlots).toBe(7);
  });

  it('counts unspent user draft picks from the active draft order', () => {
    const counts = countPendingDecisions(stateWithGame({
      teams: { user: userTeam() },
      offseasonState: {
        currentDraftPickIndex: 1,
        completedDraftPickIds: ['pick-3'],
        draftOrder: [
          { id: 'pick-0', teamId: 'team-1' },
          { id: 'pick-1', teamId: 'team-1' },
          { id: 'pick-2', teamId: 'team-2' },
          { id: 'pick-3', teamId: 'team-1' },
          { id: 'pick-4', teamId: 'team-1' },
        ],
      },
    }));

    expect(counts.unspentPicks).toBe(2);
  });

  it('counts open staff slots independently', () => {
    const counts = countPendingDecisions(stateWithGame({
      teams: { user: userTeam({ staff: { hc: {}, oc: null, dc: null } }) },
    }));

    expect(counts.openStaffSlots).toBe(2);
  });

  it('keeps total equal to the sum of individual fields', () => {
    const counts = countPendingDecisions(stateWithGame({
      teams: { user: userTeam({ staff: { hc: null, oc: null, dc: {} } }) },
      offseasonState: { tradeOffers: [{ status: 'pending', toTeamId: 'team-1' }] },
    }));

    expect(counts.total).toBe(
      counts.tradeOffers
      + counts.expiringContracts
      + counts.emptyDepthSlots
      + counts.unspentPicks
      + counts.openStaffSlots,
    );
  });

  it('never throws on partial state and large counts', () => {
    const state = stateWithGame({
      teams: {
        user: userTeam({
          roster: Array.from({ length: 100 }, (_, index) => ({
            id: `p-${index}`,
            contract: { years: 1 },
          })),
          staff: {},
        }),
      },
      contractExtensions: [],
    });

    expect(() => countPendingDecisions(state)).not.toThrow();
    expect(countPendingDecisions(state).expiringContracts).toBe(100);
  });

  it('ignores resolved offers and already-renewed contracts', () => {
    const counts = countPendingDecisions(stateWithGame({
      teams: {
        user: userTeam({
          roster: [
            { id: 'p1', contract: { years: 1 } },
            { id: 'p2', contract: { years: 1 } },
          ],
        }),
      },
      contractExtensions: [
        { playerId: 'p1', teamId: 'team-1', status: 'accepted' },
      ],
      offseasonState: {
        tradeOffers: [
          { status: 'accepted', toTeamId: 'team-1' },
          { status: 'rejected', toTeamId: 'team-1' },
        ],
      },
    }));

    expect(counts.tradeOffers).toBe(0);
    expect(counts.expiringContracts).toBe(1);
  });
});
