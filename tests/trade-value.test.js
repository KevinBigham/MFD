import { describe, expect, it } from 'vitest';

import { calcPickValue, calcTradeValue, evaluateTradePackage } from '../src/systems/trade-value.js';

describe('trade-value.js', () => {
  it('calcTradeValue applies age, position, potential, and contract adjustments', () => {
    const youngQb = calcTradeValue({
      ovr: 85,
      age: 24,
      pos: 'QB',
      pot: 92,
      contract: { salary: 6 },
    });
    const olderExpensive = calcTradeValue({
      ovr: 85,
      age: 33,
      pos: 'QB',
      pot: 86,
      contract: { salary: 14 },
    });

    expect(youngQb).toBeGreaterThan(olderExpensive);
    expect(calcTradeValue(null)).toBe(0);
  });

  it('calcTradeValue floors at minimum value of 5', () => {
    const floor = calcTradeValue({
      ovr: 40,
      age: 36,
      pos: 'RB',
      contract: { salary: 100 },
    });
    expect(floor).toBe(5);
  });

  it('calcPickValue maps rounds to expected buckets', () => {
    expect(calcPickValue(1)).toBe(80);
    expect(calcPickValue(2)).toBe(50);
    expect(calcPickValue(3)).toBe(30);
    expect(calcPickValue(7)).toBe(15);
  });

  it('evaluateTradePackage returns verdict tiers and accept logic', () => {
    const myAssets = [
      { type: 'player', player: { ovr: 90, age: 24, pos: 'QB', pot: 94, contract: { salary: 8 } } },
      { type: 'pick', round: 1 },
    ];
    const theirAssets = [
      { type: 'player', player: { ovr: 78, age: 29, pos: 'WR', pot: 79, contract: { salary: 5 } } },
      { type: 'pick', round: 3 },
    ];
    const overpay = evaluateTradePackage(myAssets, theirAssets);
    expect(overpay.verdict).toBe('OVERPAY');
    expect(overpay.willAccept).toBe(true);

    const steal = evaluateTradePackage(theirAssets, myAssets);
    expect(steal.verdict).toBe('STEAL');
    expect(steal.willAccept).toBe(false);
  });
});
