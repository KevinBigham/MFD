import { beforeEach, describe, expect, it } from 'vitest';

import { setSeed } from '../src/utils/rng.js';
import { BUST_STEAL_CALC, DRAFT_DAY_TRADES, DRAFT_EVAL, PROSPECT_CHARACTER } from '../src/systems/draft-day.js';

describe('draft-day.js', () => {
  beforeEach(() => {
    setSeed(12345);
  });

  it('assigns a weighted prospect character type', () => {
    const type = PROSPECT_CHARACTER.assign({ id: 'p1' }, 'star');
    expect(type).toBeTruthy();
    expect(PROSPECT_CHARACTER.types.some((t) => t.id === type.id)).toBe(true);
  });

  it('calculates bust/steal percentages with risk label', () => {
    const risky = BUST_STEAL_CALC.calc({
      ovr: 67,
      pot: 70,
      age: 23,
      isBust: true,
      combine: { forty: 4.43 },
      character75: { id: 'character_concern' },
    });
    const upside = BUST_STEAL_CALC.calc({
      ovr: 74,
      pot: 90,
      age: 21,
      isGem: true,
      combine: { forty: 4.40 },
      character75: { id: 'film_junkie' },
    });

    expect(risky.bustPct).toBeGreaterThan(upside.bustPct);
    expect(upside.stealPct).toBeGreaterThan(risky.stealPct);
    expect(risky.riskLabel).toMatch(/RISK|SAFE BET/);
  });

  it('shouldTradeUp returns a trade package only for valid high-need scenarios', () => {
    const team = {
      roster: [{ pos: 'QB', ovr: 58, isStarter: true }],
      draftPicks: [{ round: 3, id: 'r3' }, { round: 4, id: 'r4' }, { round: 5, id: 'r5' }],
    };
    const prospect = { name: 'Future QB', pos: 'QB', ovr: 78 };

    const offer = DRAFT_DAY_TRADES.shouldTradeUp(team, prospect, 18, 9, [{ id: 'AAA' }]);
    expect(offer).not.toBeNull();
    expect(offer.targetPick).toBe(9);
    expect(offer.cost).toBeGreaterThan(0);
    expect(offer.picks.length).toBe(offer.cost);

    const noOffer = DRAFT_DAY_TRADES.shouldTradeUp(team, { name: 'WR Depth', pos: 'WR', ovr: 70 }, 18, 9, [{ id: 'AAA' }]);
    expect(noOffer).toBeNull();
  });

  it('makeOffer builds picks payload and optional player plus safety comparison math', () => {
    const aiTeam = {
      id: 9,
      abbr: 'BOT',
      icon: '🤖',
      draftPicks: [{ round: 1 }, { round: 2, id: 'r2' }, { round: 3, id: 'r3' }],
      roster: [{ id: 'p', name: 'Trade Chip', pos: 'CB', ovr: 70, contract: { years: 2 } }],
    };
    const offer = DRAFT_DAY_TRADES.makeOffer(aiTeam, { round: 1 }, 14);

    expect(offer.from).toBe('BOT');
    expect(offer.pickNum).toBe(14);
    expect(offer.picks.length).toBeGreaterThan(0);

    expect(
      DRAFT_EVAL.compareSafety(
        { conf: 50, tells: ['a', 'b'], redFlags: [], verified: true },
        { conf: 30, tells: [], redFlags: ['x'], verified: false }
      )
    ).toBeGreaterThan(0);
  });
});
