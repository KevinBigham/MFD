import { describe, expect, it } from 'vitest';

import { TRADE_DEADLINE_994 } from '../src/data/trade-deadline.js';

describe('trade-deadline.js', () => {
  it('contains the expected trade deadline narrative buckets', () => {
    expect(TRADE_DEADLINE_994).toHaveProperty('deadlineFrenzy');
    expect(TRADE_DEADLINE_994).toHaveProperty('buyerModeNarrative');
    expect(TRADE_DEADLINE_994).toHaveProperty('sellerModeNarrative');
    expect(TRADE_DEADLINE_994).toHaveProperty('farewellMoment');
    expect(TRADE_DEADLINE_994).toHaveProperty('arrivalHype');
    expect(TRADE_DEADLINE_994).toHaveProperty('stoodPat');
    expect(TRADE_DEADLINE_994).toHaveProperty('lastRide');
  });

  it('keeps each narrative pool populated and string-based', () => {
    Object.values(TRADE_DEADLINE_994).forEach((pool) => {
      expect(Array.isArray(pool)).toBe(true);
      expect(pool.length).toBeGreaterThan(0);
      pool.forEach((line) => expect(typeof line).toBe('string'));
    });
    expect(TRADE_DEADLINE_994.buyerModeNarrative[0]).toContain('[TEAM]');
    expect(TRADE_DEADLINE_994.buyerModeNarrative[0]).toContain('[PLAYER]');
  });
});
