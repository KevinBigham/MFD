import { describe, expect, it } from 'vitest';
import { initializeOffseasonState } from '../systems/offseason';
import { makeLeagueState } from '../systems/test-helpers';
import type { TradeOffer } from '../types';
import { runCounterfactualFutures, summarizeMetricDistribution } from './counterfactual-futures';

describe('counterfactual futures', () => {
  it('summarizes finite canonical values with stable percentile semantics', () => {
    expect(summarizeMetricDistribution([4, 1, 3, 2])).toEqual({ min: 1, p10: 1.3, median: 2.5, mean: 2.5, p90: 3.7, max: 4 });
  });
  it('rejects stale offers without simulation or a success receipt', () => {
    const state = makeLeagueState('offseason'); state.offseasonState = initializeOffseasonState(state);
    const offer: TradeOffer = { id: 'stale', fromTeamId: 'afce2', toTeamId: 'afce1', direction: 'inbound', summary: 'stale', status: 'pending', send: [], receive: [{ type: 'player', teamId: 'afce2', playerId: 'missing', pickId: null, description: 'missing' }] };
    state.offseasonState.tradeOffers = [offer]; const before = JSON.stringify(state);
    const result = runCounterfactualFutures(state, { id: 'stale-scenario', label: 'stale', teamId: 'afce1', offerId: offer.id }, { seed: 54030, samples: 1, horizonSeasons: 1 });
    expect(result.ok).toBe(false); expect(JSON.stringify(state)).toBe(before); if (!result.ok) expect(result.receipt).toBeNull();
  });
});
