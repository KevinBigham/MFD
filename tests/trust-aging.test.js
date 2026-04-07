import { describe, expect, it } from 'vitest';

import { AGING_V2, TRUST, TRUST_TREND } from '../src/systems/trust-aging.js';

describe('trust-aging.js', () => {
  it('TRUST_TREND returns expected arrows by delta bands', () => {
    expect(TRUST_TREND.getArrow(60, undefined)).toBe('➡️');
    expect(TRUST_TREND.getArrow(60, 54)).toBe('📈');
    expect(TRUST_TREND.getArrow(60, 57)).toBe('↗️');
    expect(TRUST_TREND.getArrow(60, 62)).toBe('↘️');
    expect(TRUST_TREND.getArrow(60, 67)).toBe('📉');
  });

  it('AGING_V2 multipliers vary by category/phase and default safely', () => {
    expect(AGING_V2.getMultiplier('awareness', 'peak', 0)).toBe(-0.5);
    expect(AGING_V2.getMultiplier('awareness', 'decline', 0)).toBe(0);
    expect(AGING_V2.getMultiplier('speed', 'prime', 4)).toBe(2.0);
    expect(AGING_V2.getMultiplier('speed', 'prime', 6)).toBe(1.5);
    expect(AGING_V2.getMultiplier('accuracy', 'decline', 0)).toBe(0.5);
    expect(AGING_V2.getMultiplier('unknown', 'decline', 0)).toBe(1.0);
  });

  it('TRUST.leagueSnapshot computes tiers, extrema, and reputation', () => {
    const tradeState = {
      gmTrustByTeam: { a: 80, b: 20, c: 50 },
      recentTrades: [
        { classification: 'fair' },
        { classification: 'fair' },
        { classification: 'fair' },
      ],
    };
    const teams = [
      { id: 'me', abbr: 'ME', isUser: true },
      { id: 'a', abbr: 'AAA' },
      { id: 'b', abbr: 'BBB' },
      { id: 'c', abbr: 'CCC' },
    ];

    const snap = TRUST.leagueSnapshot(tradeState, teams);
    expect(snap.avgTrust).toBe(50);
    expect(snap.friendliest.label).toBe('AAA');
    expect(snap.coldest.label).toBe('BBB');
    expect(snap.tiers.high).toBe(1);
    expect(snap.tiers.low).toBe(1);
    expect(snap.recentPattern.fairCount).toBe(3);
    expect(snap.reputation).toBe('Fair Dealer');
  });
});
