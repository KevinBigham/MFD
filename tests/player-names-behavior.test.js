import { describe, expect, it } from "vitest";

import { PLAYER_NAMES_991 } from "../src/data/player-names.js";

describe("player-names behavior", function () {
  it("keeps first/last name pools non-empty and largely unique", function () {
    Object.values(PLAYER_NAMES_991.first).forEach(function (pool) {
      expect(pool.length).toBeGreaterThanOrEqual(30);
      pool.forEach(function (name) {
        expect(typeof name).toBe("string");
        expect(name.trim().length).toBeGreaterThan(0);
      });
      expect(new Set(pool).size).toBeGreaterThanOrEqual(pool.length - 3);
    });

    Object.values(PLAYER_NAMES_991.last).forEach(function (pool) {
      expect(pool.length).toBeGreaterThanOrEqual(30);
      pool.forEach(function (name) {
        expect(typeof name).toBe("string");
        expect(name.trim().length).toBeGreaterThan(0);
      });
      expect(new Set(pool).size).toBeGreaterThanOrEqual(pool.length - 3);
    });
  });

  it("keeps position weight schema complete and normalized", function () {
    var categories = Object.keys(PLAYER_NAMES_991.first).sort();
    Object.entries(PLAYER_NAMES_991.positionWeights).forEach(function (entry) {
      var weights = entry[1];
      expect(Object.keys(weights).sort()).toEqual(categories);
      Object.values(weights).forEach(function (v) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      });
      var total = Object.values(weights).reduce(function (a, b) {
        return a + b;
      }, 0);
      expect(total).toBeCloseTo(1, 5);
    });
  });

  it("preserves archetypal weighting intent for key positions", function () {
    var qb = PLAYER_NAMES_991.positionWeights.QB;
    var wr = PLAYER_NAMES_991.positionWeights.WR;
    var k = PLAYER_NAMES_991.positionWeights.K;

    expect(qb.classic).toBeGreaterThan(qb.international);
    expect(wr.modern).toBeGreaterThan(wr.classic);
    expect(k.international).toBeGreaterThanOrEqual(0.4);
  });
});
