import { describe, it, expect } from 'vitest';
import {
  getExpectedPoints,
  calculateWinProbability,
  calculateLeverageIndex,
  leverageLabel,
  winProbabilityNarrative,
  isTurningPoint,
} from './win-probability';

describe('Win Probability Engine', () => {
  describe('getExpectedPoints', () => {
    it('returns higher EP for 1st and short', () => {
      const ep1st = getExpectedPoints(1, 2, 50);
      const ep3rd = getExpectedPoints(3, 10, 50);
      expect(ep1st).toBeGreaterThan(ep3rd);
    });

    it('returns higher EP closer to the end zone', () => {
      const redZone = getExpectedPoints(1, 10, 85);
      const ownTerritory = getExpectedPoints(1, 10, 25);
      expect(redZone).toBeGreaterThan(ownTerritory);
    });

    it('returns lower EP on 4th down', () => {
      const first = getExpectedPoints(1, 10, 50);
      const fourth = getExpectedPoints(4, 10, 50);
      expect(first).toBeGreaterThan(fourth);
    });

    it('clamps field position to valid range', () => {
      const result = getExpectedPoints(1, 10, 150);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('handles goal line field position', () => {
      const goalLine = getExpectedPoints(1, 1, 99);
      expect(goalLine).toBeGreaterThan(5);
    });
  });

  describe('calculateWinProbability', () => {
    it('returns ~50% for tied game at start', () => {
      const wp = calculateWinProbability(0, 1, 3600, false);
      expect(wp).toBeGreaterThan(0.45);
      expect(wp).toBeLessThan(0.55);
    });

    it('team ahead has higher win probability', () => {
      const ahead = calculateWinProbability(14, 3, 900, false);
      const behind = calculateWinProbability(-14, 3, 900, false);
      expect(ahead).toBeGreaterThan(0.5);
      expect(behind).toBeLessThan(0.5);
    });

    it('score matters more late in the game', () => {
      const earlyLead = calculateWinProbability(7, 1, 3600, false);
      const lateLead = calculateWinProbability(7, 4, 300, false);
      expect(lateLead).toBeGreaterThan(earlyLead);
    });

    it('having the ball provides a small bonus', () => {
      const withBall = calculateWinProbability(0, 2, 1800, true);
      const withoutBall = calculateWinProbability(0, 2, 1800, false);
      expect(withBall).toBeGreaterThan(withoutBall);
    });

    it('never returns below 0.01 or above 0.99', () => {
      const crushed = calculateWinProbability(-50, 4, 60, false);
      const blowout = calculateWinProbability(50, 4, 60, true);
      expect(crushed).toBeGreaterThanOrEqual(0.01);
      expect(blowout).toBeLessThanOrEqual(0.99);
    });

    it('overtime with ball and tied gives slight edge', () => {
      const wp = calculateWinProbability(0, 5, 600, true);
      expect(wp).toBeGreaterThan(0.50);
    });

    it('overtime with lead gives strong probability', () => {
      const wp = calculateWinProbability(3, 5, 300, false);
      expect(wp).toBeGreaterThan(0.7);
    });
  });

  describe('calculateLeverageIndex', () => {
    it('close game in Q4 has high leverage', () => {
      const leverage = calculateLeverageIndex(3, 4, 120);
      expect(leverage).toBeGreaterThan(5);
    });

    it('blowout has low leverage', () => {
      const leverage = calculateLeverageIndex(28, 2, 1800);
      expect(leverage).toBeLessThan(3);
    });

    it('overtime is always high leverage', () => {
      const leverage = calculateLeverageIndex(0, 5, 600);
      expect(leverage).toBeGreaterThan(4);
    });

    it('Q1 tied game has moderate leverage', () => {
      const leverage = calculateLeverageIndex(0, 1, 3600);
      expect(leverage).toBeGreaterThan(1);
      expect(leverage).toBeLessThan(6);
    });

    it('returns value between 0 and 10', () => {
      for (const scoreDiff of [-21, -7, 0, 7, 21]) {
        for (const quarter of [1, 2, 3, 4, 5]) {
          const li = calculateLeverageIndex(scoreDiff, quarter, 600);
          expect(li).toBeGreaterThanOrEqual(0);
          expect(li).toBeLessThanOrEqual(10);
        }
      }
    });
  });

  describe('leverageLabel', () => {
    it('returns CRITICAL for 8+', () => {
      expect(leverageLabel(8.5)).toBe('CRITICAL');
    });

    it('returns HIGH for 6-8', () => {
      expect(leverageLabel(7.0)).toBe('HIGH');
    });

    it('returns ELEVATED for 4-6', () => {
      expect(leverageLabel(5.0)).toBe('ELEVATED');
    });

    it('returns MODERATE for 2-4', () => {
      expect(leverageLabel(3.0)).toBe('MODERATE');
    });

    it('returns LOW for under 2', () => {
      expect(leverageLabel(1.0)).toBe('LOW');
    });
  });

  describe('winProbabilityNarrative', () => {
    it('returns null for small shifts', () => {
      expect(winProbabilityNarrative('KC', 0.55, 0.57)).toBeNull();
    });

    it('generates narrative for big positive shift', () => {
      const narrative = winProbabilityNarrative('KC', 0.40, 0.70);
      expect(narrative).toContain('KC');
      expect(narrative).toContain('surges');
    });

    it('generates narrative for big negative shift', () => {
      const narrative = winProbabilityNarrative('KC', 0.70, 0.40);
      expect(narrative).toContain('KC');
      expect(narrative).toContain('drops');
    });

    it('generates moderate shift narrative', () => {
      const narrative = winProbabilityNarrative('KC', 0.50, 0.62);
      expect(narrative).toContain('KC');
      expect(narrative).toBeTruthy();
    });
  });

  describe('isTurningPoint', () => {
    it('big shift + high leverage = turning point', () => {
      expect(isTurningPoint(0.50, 0.70, 7.0)).toBe(true);
    });

    it('small shift is not a turning point', () => {
      expect(isTurningPoint(0.50, 0.55, 8.0)).toBe(false);
    });

    it('big shift + low leverage is not a turning point', () => {
      expect(isTurningPoint(0.50, 0.75, 2.0)).toBe(false);
    });
  });
});
