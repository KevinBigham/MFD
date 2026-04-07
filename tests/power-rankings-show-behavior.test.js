import { describe, expect, it } from "vitest";

import { POWER_RANKINGS_SHOW_995 } from "../src/data/power-rankings-show.js";

describe("power-rankings-show behavior", function () {
  it("keeps all ranking tiers present with fixed line counts", function () {
    expect(Object.keys(POWER_RANKINGS_SHOW_995).sort()).toEqual([
      "rank1",
      "rank11to20",
      "rank21to30",
      "rank2to5",
      "rank6to10",
    ]);
    Object.values(POWER_RANKINGS_SHOW_995).forEach(function (pool) {
      expect(Array.isArray(pool)).toBe(true);
      expect(pool).toHaveLength(10);
      expect(new Set(pool).size).toBe(10);
    });
  });

  it("keeps tier framing language aligned to each ranking bucket", function () {
    var rank1 = POWER_RANKINGS_SHOW_995.rank1.join(" ").toLowerCase();
    var rank2130 = POWER_RANKINGS_SHOW_995.rank21to30.join(" ").toLowerCase();
    expect(
      rank1.includes("top") ||
        rank1.includes("elite") ||
        rank1.includes("standard") ||
        rank1.includes("dominating")
    ).toBe(true);
    expect(
      rank2130.includes("building") ||
        rank2130.includes("not there yet") ||
        rank2130.includes("rebuilding") ||
        rank2130.includes("progress")
    ).toBe(true);
  });
});
