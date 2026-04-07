import { describe, expect, it } from 'vitest';

import {
  CAMP_CAP,
  CAP_MATH,
  MIN_SALARY,
  PS_CAP,
  ROSTER_CAP,
  getCapFloor,
  getMinSalary,
  getSalaryCap,
} from '../src/config/cap-math.js';

describe('cap-math.js', () => {
  it('exports roster constants', () => {
    expect(ROSTER_CAP).toBe(53);
    expect(CAMP_CAP).toBe(75);
    expect(PS_CAP).toBe(8);
    expect(MIN_SALARY).toBe(0.5);
  });

  it('exports expected cap math constants', () => {
    expect(CAP_MATH.BASE_CAP).toBe(255.0);
    expect(CAP_MATH.GROWTH_RATE).toBe(0.05);
    expect(CAP_MATH.CAP_FLOOR).toBe(0.9);
    expect(CAP_MATH.MIN_SAL.ROOKIE).toBe(0.795);
  });

  it('getSalaryCap(2026) returns base cap', () => {
    expect(getSalaryCap(2026)).toBe(255);
  });

  it('getSalaryCap grows over time', () => {
    expect(getSalaryCap(2027)).toBe(267);
    expect(getSalaryCap(2030)).toBeGreaterThan(getSalaryCap(2028));
  });

  it('getSalaryCap clamps years before 2026 to base cap', () => {
    expect(getSalaryCap(2025)).toBe(255);
    expect(getSalaryCap(1900)).toBe(255);
  });

  it('getSalaryCap defaults to 2026 when year is omitted', () => {
    expect(getSalaryCap()).toBe(255);
  });

  it('getCapFloor is 90% of salary cap (floored)', () => {
    expect(getCapFloor(2026)).toBe(Math.floor(255 * 0.9));
    expect(getCapFloor(2031)).toBe(Math.floor(getSalaryCap(2031) * 0.9));
  });

  it('getMinSalary returns rookie minimum for <= 0 years', () => {
    expect(getMinSalary(0)).toBe(0.795);
    expect(getMinSalary(-2)).toBe(0.795);
  });

  it('getMinSalary returns vet minimum for 1-3 years', () => {
    expect(getMinSalary(1)).toBe(1.125);
    expect(getMinSalary(3)).toBe(1.125);
  });

  it('getMinSalary returns veteran max tier for 4+ years', () => {
    expect(getMinSalary(4)).toBe(1.21);
    expect(getMinSalary(12)).toBe(1.21);
  });

  it('min salary tiers are monotonic', () => {
    expect(getMinSalary(0)).toBeLessThan(getMinSalary(1));
    expect(getMinSalary(1)).toBeLessThan(getMinSalary(4));
  });
});
