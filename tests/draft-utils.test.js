import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CAP_MATH } from '../src/config/cap-math.js';
import {
  aucContract,
  draftContract,
  makePick,
  maybeBuildPickCondition972,
  pickConditionText972,
  pickValue,
} from '../src/systems/draft-utils.js';
import { RNG, setSeed } from '../src/utils/rng.js';

describe('draft-utils.js', () => {
  let oldAi;
  let oldPlay;

  beforeEach(() => {
    setSeed(2026);
    oldAi = RNG.ai;
    oldPlay = RNG.play;
  });

  afterEach(() => {
    RNG.ai = oldAi;
    RNG.play = oldPlay;
  });

  describe('makePick', () => {
    it('creates pick with expected ownership fields', () => {
      const p = makePick(2, 'BUF', 'MIA', 2028);
      expect(p.round).toBe(2);
      expect(p.original).toBe('BUF');
      expect(p.owner).toBe('MIA');
      expect(p.originalOwner).toBe('BUF');
      expect(p.currentOwner).toBe('MIA');
      expect(p.year).toBe(2028);
      expect(typeof p.pid).toBe('string');
      expect(p.pid.length).toBeGreaterThan(0);
    });

    it('defaults year to 2026 when omitted', () => {
      expect(makePick(3, 'NE', 'NE').year).toBe(2026);
    });
  });

  describe('pickConditionText972', () => {
    it('returns empty text when no condition', () => {
      expect(pickConditionText972(null)).toBe('');
    });

    it('formats playoff, record, and top10pick conditions', () => {
      expect(pickConditionText972({ type: 'playoff', upgradeRound: 2 })).toBe('→Rd2 if playoffs');
      expect(pickConditionText972({ type: 'record', upgradeRound: 3 })).toBe('→Rd3 if 10+ wins');
      expect(pickConditionText972({ type: 'top10pick', upgradeRound: 1 })).toBe('→Rd1 if top-10 pick');
    });

    it('falls back to generic text for unknown type', () => {
      expect(pickConditionText972({ type: 'unknown' })).toBe('Conditional');
    });
  });

  describe('maybeBuildPickCondition972', () => {
    it('returns null for invalid inputs and protected picks', () => {
      expect(maybeBuildPickCondition972(null)).toBeNull();
      expect(maybeBuildPickCondition972({ round: 3, condition: {} })).toBeNull();
      expect(maybeBuildPickCondition972({ round: 1 })).toBeNull();
      expect(maybeBuildPickCondition972({ round: 6 })).toBeNull();
    });

    it('returns null when AI roll misses chance threshold', () => {
      RNG.ai = () => 0.9;
      expect(maybeBuildPickCondition972({ round: 3 })).toBeNull();
    });

    it('builds deterministic condition when chance succeeds', () => {
      RNG.ai = () => 0.1;
      RNG.play = () => 0;
      const c = maybeBuildPickCondition972({ round: 4 });
      expect(c).toEqual({
        type: 'playoff',
        upgradeRound: 3,
        downgradeRound: 5,
      });
    });

    it('clamps upgrade/downgrade rounds to [1, 7]', () => {
      RNG.ai = () => 0.1;
      RNG.play = () => 0.7;
      expect(maybeBuildPickCondition972({ round: 2 })).toMatchObject({ upgradeRound: 1, downgradeRound: 3 });
      expect(maybeBuildPickCondition972({ round: 5 })).toMatchObject({ upgradeRound: 4, downgradeRound: 6 });
    });
  });

  describe('pickValue', () => {
    it('returns mapped values for rounds 1-7', () => {
      expect(pickValue(1)).toBe(200);
      expect(pickValue(2)).toBe(120);
      expect(pickValue(3)).toBe(70);
      expect(pickValue(4)).toBe(35);
      expect(pickValue(5)).toBe(15);
      expect(pickValue(6)).toBe(8);
      expect(pickValue(7)).toBe(5);
    });

    it('falls back to 3 for unknown rounds', () => {
      expect(pickValue(0)).toBe(3);
      expect(pickValue(20)).toBe(3);
    });
  });

  describe('draftContract', () => {
    it('returns rookie-floor salary minimum', () => {
      const c = draftContract(50, 100);
      expect(c.baseSalary).toBeGreaterThanOrEqual(CAP_MATH.MIN_SAL.ROOKIE);
    });

    it('assigns years by round buckets', () => {
      expect(draftContract(82, 1).years).toBe(4);
      expect(draftContract(82, 3).years).toBe(3);
      expect(draftContract(82, 10).years).toBe(2);
      expect(draftContract(82, 31).years).toBe(1);
    });

    it('adds signing bonus only for rounds <= 5', () => {
      expect(draftContract(80, 5).signingBonus).toBeGreaterThan(0);
      expect(draftContract(80, 6).signingBonus).toBe(0);
    });

    it('caps salary at 22M', () => {
      const c = draftContract(99, 1);
      expect(c.baseSalary).toBeLessThanOrEqual(22.0);
    });
  });

  describe('aucContract', () => {
    it('scales years by bid tier', () => {
      expect(aucContract(80, 100, 1000).years).toBe(4);
      expect(aucContract(80, 50, 1000).years).toBe(3);
      expect(aucContract(80, 20, 1000).years).toBe(2);
      expect(aucContract(80, 10, 1000).years).toBe(1);
    });

    it('applies bonus only for bids >= 50', () => {
      expect(aucContract(82, 60, 1000).signingBonus).toBeGreaterThan(0);
      expect(aucContract(82, 40, 1000).signingBonus).toBe(0);
    });

    it('respects salary floor and cap', () => {
      const low = aucContract(50, 1, 1000);
      const high = aucContract(99, 1000, 1000);
      expect(low.baseSalary).toBeGreaterThanOrEqual(CAP_MATH.MIN_SAL.ROOKIE);
      expect(high.baseSalary).toBeLessThanOrEqual(26.0);
    });

    it('higher bids generally increase salary at same ovr', () => {
      const lowBid = aucContract(84, 5, 1000);
      const highBid = aucContract(84, 500, 1000);
      expect(highBid.baseSalary).toBeGreaterThan(lowBid.baseSalary);
    });
  });
});
