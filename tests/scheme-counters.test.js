import { describe, expect, it } from 'vitest';

import { DEF_PLANS, OFF_PLANS, SCHEME_COUNTERS, SCHEME_FX } from '../src/config/schemes.js';

describe('scheme counters', () => {
  it('defines numeric counter entries for every core offense-vs-defense plan pair', () => {
    OFF_PLANS.forEach(function (offPlan) {
      var row = SCHEME_COUNTERS[offPlan.id];
      expect(row && typeof row).toBe('object');
      DEF_PLANS.forEach(function (defPlan) {
        expect(typeof row[defPlan.id]).toBe('number');
      });
    });
  });

  it('counter matrix includes both favorable and unfavorable matchups', () => {
    var allValues = [];
    OFF_PLANS.forEach(function (offPlan) {
      allValues = allValues.concat(Object.values(SCHEME_COUNTERS[offPlan.id] || {}));
    });
    var hasPositive = allValues.some(function (v) { return v > 0; });
    var hasNegative = allValues.some(function (v) { return v < 0; });
    expect(hasPositive).toBe(true);
    expect(hasNegative).toBe(true);
  });

  it('SCHEME_FX entries are finite numeric adjustments', () => {
    Object.entries(SCHEME_FX).forEach(function (entry) {
      var planRow = entry[1];
      Object.values(planRow).forEach(function (fx) {
        ['passMod', 'rushMod', 'blitzAdj', 'covAdj', 'bigPlayAdj', 'turnoverAdj'].forEach(function (k) {
          expect(typeof fx[k]).toBe('number');
          expect(Number.isFinite(fx[k])).toBe(true);
        });
      });
    });
  });

  it('known strategic relationships remain intact', () => {
    expect(SCHEME_COUNTERS.air_raid.run_stuff).toBeGreaterThan(SCHEME_COUNTERS.air_raid.prevent);
    expect(SCHEME_COUNTERS.ground_pound.run_stuff).toBeLessThan(0);
    expect(SCHEME_COUNTERS.play_action.zone_cov).toBeGreaterThan(0);
  });
});
