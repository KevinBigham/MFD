import { describe, expect, it } from 'vitest';
import { getTradeValue } from '../src/systems/trade-ai.js';

describe('trade cap hit penalty direction', () => {
  function makePlayer(ovr, salary) {
    return {
      ovr: ovr, pot: ovr + 5, age: 26, pos: 'WR',
      contract: { salary: salary, baseSalary: salary, years: 3, signingBonus: 0, prorated: 0 },
      traits95: [], ratings: {}, personality: {}
    };
  }

  it('expensive player trades for less than cheap equivalent', () => {
    var cheap = makePlayer(82, 5);
    var expensive = makePlayer(82, 20);
    var cheapVal = getTradeValue(cheap, null, null);
    var expVal = getTradeValue(expensive, null, null);
    expect(expVal).toBeLessThan(cheapVal);
  });

  it('cap hit penalty increases with salary', () => {
    var mid = makePlayer(80, 12);
    var high = makePlayer(80, 20);
    var midVal = getTradeValue(mid, null, null);
    var highVal = getTradeValue(high, null, null);
    expect(highVal).toBeLessThan(midVal);
  });

  it('low salary player gets no cap penalty', () => {
    var low = makePlayer(75, 3);
    var base = makePlayer(75, 8);
    var lowVal = getTradeValue(low, null, null);
    var baseVal = getTradeValue(base, null, null);
    // Both under $8M threshold — should have same value
    expect(lowVal).toBe(baseVal);
  });
});
