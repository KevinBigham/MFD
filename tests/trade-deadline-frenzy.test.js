import { afterEach, describe, expect, it } from 'vitest';

import { TRADE_DEADLINE_FRENZY } from '../src/systems/trade-deadline-frenzy.js';
import { RNG } from '../src/utils/rng.js';

describe('trade-deadline-frenzy.js', () => {
  const originalAi = RNG.ai;

  afterEach(() => {
    RNG.ai = originalAi;
  });

  it('isDeadlineWindow matches weeks 8-10 inclusive', () => {
    expect(TRADE_DEADLINE_FRENZY.isDeadlineWindow(7)).toBe(false);
    expect(TRADE_DEADLINE_FRENZY.isDeadlineWindow(8)).toBe(true);
    expect(TRADE_DEADLINE_FRENZY.isDeadlineWindow(10)).toBe(true);
    expect(TRADE_DEADLINE_FRENZY.isDeadlineWindow(11)).toBe(false);
  });

  it('generateAITrades returns empty list outside deadline window', () => {
    const teams = [{ id: 'a', wins: 6, losses: 2, roster: [] }];
    expect(TRADE_DEADLINE_FRENZY.generateAITrades(teams, 7, 'me')).toEqual([]);
    expect(TRADE_DEADLINE_FRENZY.generateAITrades(teams, 11, 'me')).toEqual([]);
  });

  it('generateAITrades emits trades when contender need and seller fit align', () => {
    RNG.ai = () => 0;
    const teams = [
      {
        id: 'cont', abbr: 'PHI', icon: '🦅', wins: 7, losses: 2,
        roster: [{ name: 'QB1', pos: 'QB', ovr: 68 }],
      },
      {
        id: 'sell', abbr: 'NYG', icon: '🗽', wins: 2, losses: 7,
        roster: [{ name: 'Vet QB', pos: 'QB', ovr: 76 }],
      },
      { id: 'me', abbr: 'DAL', icon: '⭐', wins: 5, losses: 4, roster: [] },
    ];

    const trades = TRADE_DEADLINE_FRENZY.generateAITrades(teams, 9, 'me');
    expect(trades.length).toBeGreaterThan(0);
    expect(trades.length).toBeLessThanOrEqual(3);
    expect(trades[0].buyer).toBe('PHI');
    expect(trades[0].seller).toBe('NYG');
    expect(trades[0].player).toBe('Vet QB');
  });

  it('generateAITrades can yield no trades when RNG gate fails', () => {
    RNG.ai = () => 0.99;
    const teams = [
      { id: 'cont', abbr: 'PHI', icon: '🦅', wins: 7, losses: 2, roster: [{ name: 'QB1', pos: 'QB', ovr: 68 }] },
      { id: 'sell', abbr: 'NYG', icon: '🗽', wins: 2, losses: 7, roster: [{ name: 'Vet QB', pos: 'QB', ovr: 76 }] },
    ];
    expect(TRADE_DEADLINE_FRENZY.generateAITrades(teams, 9, 'none')).toEqual([]);
  });
});
