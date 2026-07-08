import { describe, expect, it } from 'vitest';
import type { TransactionLogEntry } from '../types';
import { calculateReputation, getRepLabel } from './gm-reputation';

function tx(type: string, index: number): TransactionLogEntry {
  return {
    type,
    year: 2026,
    week: index + 1,
    playerId: `${type.toLowerCase()}-${index}`,
  };
}

describe('GM reputation', () => {
  it('uses neutral defaults when there are no transactions or trust entries', () => {
    expect(calculateReputation([], null)).toEqual({
      fairDealer: 50,
      aggressive: 30,
      loyalty: 50,
      overall: 43,
    });
    expect(calculateReputation([], { gmTrustByTeam: {}, recentTrades: [] })).toEqual({
      fairDealer: 50,
      aggressive: 30,
      loyalty: 50,
      overall: 43,
    });
  });

  it('counts trades and free-agent signings while ignoring unrelated transaction types', () => {
    const result = calculateReputation(
      [
        tx('TRADE', 0),
        tx('TRADE', 1),
        tx('SIGN_FA', 2),
        tx('SIGN_FA', 3),
        tx('CUT', 4),
        tx('WAIVER_CLAIM', 5),
      ],
      { gmTrustByTeam: { afce1: 80, afce2: 41 }, recentTrades: [] },
    );

    expect(result).toEqual({
      fairDealer: 54,
      aggressive: 38,
      loyalty: 61,
      overall: 51,
    });
  });

  it('clamps trade-volume derived scores to 100', () => {
    const heavyTradeLog = [
      ...Array.from({ length: 40 }, (_, index) => tx('TRADE', index)),
      ...Array.from({ length: 30 }, (_, index) => tx('SIGN_FA', index + 40)),
    ];

    expect(calculateReputation(heavyTradeLog, { gmTrustByTeam: { rival: 100 }, recentTrades: [] })).toEqual({
      fairDealer: 100,
      aggressive: 100,
      loyalty: 100,
      overall: 100,
    });
  });

  it('maps score thresholds to public reputation labels', () => {
    expect(getRepLabel(85)).toEqual({ label: 'Elite GM', icon: 'crown', color: 'gold' });
    expect(getRepLabel(70)).toEqual({ label: 'Respected', icon: 'handshake', color: 'green' });
    expect(getRepLabel(50)).toEqual({ label: 'Average', icon: 'clipboard', color: 'slate' });
    expect(getRepLabel(30)).toEqual({ label: 'Questionable', icon: 'help-circle', color: 'amber' });
    expect(getRepLabel(29)).toEqual({ label: 'Untrusted', icon: 'alert-triangle', color: 'red' });
  });
});
