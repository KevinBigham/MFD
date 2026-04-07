import { describe, expect, it } from 'vitest';

import {
  EP_TABLE_993,
  LEVERAGE_INDEX_993,
  calcWinProbV2_993,
  getEP993,
  getLeverageIndex,
} from '../src/systems/win-probability.js';

describe('win-probability.js', () => {
  it('exports EP and leverage tables', () => {
    expect(EP_TABLE_993[1].short.ownGoal).toBeTypeOf('number');
    expect(LEVERAGE_INDEX_993[4].tied).toBe(3.0);
  });

  describe('getEP993', () => {
    it('maps down and distance/field buckets correctly', () => {
      expect(getEP993(1, 2, 5)).toBe(EP_TABLE_993[1].short.ownGoal);
      expect(getEP993(2, 6, 25)).toBe(EP_TABLE_993[2].medium.own20);
      expect(getEP993(3, 10, 45)).toBe(EP_TABLE_993[3].long.own40);
      expect(getEP993(4, 20, 95)).toBe(EP_TABLE_993[4].veryLong.goalLine);
    });

    it('clamps down to [1, 4]', () => {
      expect(getEP993(0, 2, 5)).toBe(EP_TABLE_993[1].short.ownGoal);
      expect(getEP993(9, 2, 5)).toBe(EP_TABLE_993[4].short.ownGoal);
    });
  });

  describe('getLeverageIndex', () => {
    it('uses tied/close/comfortable/blowout buckets by score diff', () => {
      expect(getLeverageIndex(2, 0)).toBe(LEVERAGE_INDEX_993[2].tied);
      expect(getLeverageIndex(2, 5)).toBe(LEVERAGE_INDEX_993[2].close);
      expect(getLeverageIndex(2, 14)).toBe(LEVERAGE_INDEX_993[2].comfortable);
      expect(getLeverageIndex(2, 28)).toBe(LEVERAGE_INDEX_993[2].blowout);
    });
  });

  describe('calcWinProbV2_993', () => {
    it('returns values clamped to [0.01, 0.99]', () => {
      const extremeLow = calcWinProbV2_993(-100, 4, 900, 4, 20, 1, false);
      const extremeHigh = calcWinProbV2_993(100, 4, 900, 1, 1, 99, true);
      expect(extremeLow).toBeGreaterThanOrEqual(0.01);
      expect(extremeLow).toBeLessThanOrEqual(0.99);
      expect(extremeHigh).toBeGreaterThanOrEqual(0.01);
      expect(extremeHigh).toBeLessThanOrEqual(0.99);
    });

    it('increases as score differential improves', () => {
      const losing = calcWinProbV2_993(-7, 2, 600, 1, 10, 50, false);
      const tied = calcWinProbV2_993(0, 2, 600, 1, 10, 50, false);
      const winning = calcWinProbV2_993(7, 2, 600, 1, 10, 50, false);
      expect(losing).toBeLessThan(tied);
      expect(tied).toBeLessThan(winning);
    });

    it('includes home-field advantage boost', () => {
      const away = calcWinProbV2_993(0, 2, 600, 1, 10, 50, false);
      const home = calcWinProbV2_993(0, 2, 600, 1, 10, 50, true);
      expect(home).toBeGreaterThan(away);
    });

    it('responds to EP context from field position/down-distance', () => {
      const badSpot = calcWinProbV2_993(0, 2, 600, 4, 18, 5, false);
      const goodSpot = calcWinProbV2_993(0, 2, 600, 1, 2, 90, false);
      expect(goodSpot).toBeGreaterThan(badSpot);
    });
  });
});
