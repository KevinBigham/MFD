import { describe, expect, it } from 'vitest';

import { GM_STRATEGIES, applyGMStrategy } from '../src/systems/gm-strategies.js';

describe('gm-strategies.js', () => {
  it('defines rebuild, contend, and neutral strategies', () => {
    expect(Object.keys(GM_STRATEGIES).sort()).toEqual(['contend', 'neutral', 'rebuild']);
  });

  it('applyGMStrategy returns undefined for unknown strategy', () => {
    const team = { roster: [] };
    expect(applyGMStrategy(team, 'unknown')).toBeUndefined();
    expect(team.gmStrategy).toBeUndefined();
  });

  it('rebuild marks older productive players as trade block candidates', () => {
    const team = {
      roster: [
        { age: 30, ovr: 80, tradeBlock: false },
        { age: 27, ovr: 80, tradeBlock: false },
        { age: 31, ovr: 70, tradeBlock: true },
      ],
    };

    const strat = applyGMStrategy(team, 'rebuild');
    expect(strat.id).toBe('rebuild');
    expect(team.gmStrategy).toBe('rebuild');
    expect(team.roster[0].tradeBlock).toBe(true);
    expect(team.roster[1].tradeBlock).toBe(false);
    expect(team.roster[2].tradeBlock).toBe(false);
  });

  it('contend blocks underperforming older vets', () => {
    const team = {
      roster: [
        { age: 27, ovr: 64, tradeBlock: false },
        { age: 26, ovr: 64, tradeBlock: false },
        { age: 30, ovr: 80, tradeBlock: true },
      ],
    };

    const strat = applyGMStrategy(team, 'contend');
    expect(strat.id).toBe('contend');
    expect(team.gmStrategy).toBe('contend');
    expect(team.roster[0].tradeBlock).toBe(true);
    expect(team.roster[1].tradeBlock).toBe(true);
    expect(team.roster[2].tradeBlock).toBe(false);
  });

  it('neutral clears all trade block flags', () => {
    const team = {
      roster: [
        { age: 33, ovr: 85, tradeBlock: true },
        { age: 24, ovr: 70, tradeBlock: true },
      ],
    };

    const strat = applyGMStrategy(team, 'neutral');
    expect(strat.id).toBe('neutral');
    expect(team.gmStrategy).toBe('neutral');
    expect(team.roster[0].tradeBlock).toBe(false);
    expect(team.roster[1].tradeBlock).toBe(false);
  });
});
