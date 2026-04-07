import { describe, expect, it } from 'vitest';

import { CAP_MATH, getCapFloor, getMinSalary, getSalaryCap } from '../src/config/cap-math.js';

describe('cap validation', () => {
  it('salary cap growth is monotonic from 2026 through 2100', () => {
    var prev = getSalaryCap(2026);
    for (var yr = 2027; yr <= 2100; yr += 1) {
      var cap = getSalaryCap(yr);
      expect(cap).toBeGreaterThanOrEqual(prev);
      prev = cap;
    }
  });

  it('cap floor remains exactly 90% floored for sampled years', () => {
    [2026, 2029, 2035, 2045, 2060, 2080].forEach(function (yr) {
      expect(getCapFloor(yr)).toBe(Math.floor(getSalaryCap(yr) * CAP_MATH.CAP_FLOOR));
    });
  });

  it('minimum salary tiers remain non-decreasing with experience', () => {
    for (var yoe = 0; yoe <= 15; yoe += 1) {
      var now = getMinSalary(yoe);
      var next = getMinSalary(yoe + 1);
      expect(next).toBeGreaterThanOrEqual(now);
    }
  });

  it('handles nullish/legacy year inputs without NaN', () => {
    var vals = [getSalaryCap(), getSalaryCap(null), getSalaryCap(undefined), getSalaryCap(0), getSalaryCap(1900)];
    vals.forEach(function (v) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    });
  });
});
