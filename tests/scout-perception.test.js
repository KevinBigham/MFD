import { describe, expect, it } from 'vitest';

import { SCOUT } from '../src/systems/scout-perception.js';

describe('scout-perception.js', () => {
  it('gaussian is deterministic for the same seed', () => {
    const a = SCOUT.gaussian(75, 4, 1234);
    const b = SCOUT.gaussian(75, 4, 1234);
    expect(a).toBeCloseTo(b, 10);
  });

  it('getPerceived is bounded [30, 99] and deterministic per player/week', () => {
    const x1 = SCOUT.getPerceived(82, 6, 'p17', 5);
    const x2 = SCOUT.getPerceived(82, 6, 'p17', 5);
    const x3 = SCOUT.getPerceived(82, 6, 'p17', 6);

    expect(x1).toBeGreaterThanOrEqual(30);
    expect(x1).toBeLessThanOrEqual(99);
    expect(x1).toBe(x2);
    expect(x3).not.toBe(x2);
  });

  it('getRange narrows with higher scout level and sets confidence flag', () => {
    const low = SCOUT.getRange(80, 0);
    const high = SCOUT.getRange(80, 10);

    expect(low.lo).toBeLessThan(high.lo);
    expect(low.hi).toBeGreaterThan(high.hi);
    expect(low.confident).toBe(false);
    expect(high.confident).toBe(true);
  });

  it('getGradeRange returns letter-grade span', () => {
    const gr = SCOUT.getGradeRange(88, 5);
    expect(gr).toMatch(/^[A-F][+]?\s–\s[A-F][+]?$/);
  });
});
