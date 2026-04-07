import { describe, expect, it } from "vitest";

import { MFSN_EXPANDED_993 } from "../src/data/mfsn-expanded.js";

function assertPoolPack(group, expectedKeys) {
  expect(Object.keys(group).sort()).toEqual(expectedKeys.slice().sort());
  Object.values(group).forEach(function (pool) {
    expect(Array.isArray(pool)).toBe(true);
    expect(pool).toHaveLength(20);
    pool.forEach(function (line) {
      expect(typeof line).toBe("string");
      expect(line.trim().length).toBeGreaterThan(30);
    });
    // Ensure each pool has strong internal variety.
    expect(new Set(pool).size).toBeGreaterThanOrEqual(18);
  });
}

describe("mfsn-expanded behavior", function () {
  it("keeps expanded drive/injury/crowd/coach packs complete", function () {
    assertPoolPack(MFSN_EXPANDED_993.drives, [
      "PUNT_RETURN_TD",
      "KICK_RETURN_TD",
      "BLOCKED_PUNT",
      "BLOCKED_FG",
      "MISSED_FG",
    ]);
    assertPoolPack(MFSN_EXPANDED_993.injuries, ["minor", "major", "return"]);
    assertPoolPack(MFSN_EXPANDED_993.crowd, [
      "homeTeamScoring",
      "awayTeamScoring",
      "blowoutHome",
      "blowoutAway",
    ]);
    assertPoolPack(MFSN_EXPANDED_993.coach, [
      "challengeWon",
      "challengeLost",
      "furious",
      "celebrating",
    ]);
  });

  it("preserves thematic language in critical pools", function () {
    var missedFgHits = MFSN_EXPANDED_993.drives.MISSED_FG.filter(function (line) {
      var text = line.toLowerCase();
      return (
        text.includes("field goal") ||
        text.includes("kick") ||
        text.includes("upright") ||
        text.includes("no good")
      );
    }).length;
    expect(missedFgHits).toBeGreaterThanOrEqual(18);

    var majorInjuryHits = MFSN_EXPANDED_993.injuries.major.filter(function (line) {
      var text = line.toLowerCase();
      return (
        text.includes("injury") ||
        text.includes("medical") ||
        text.includes("cart") ||
        text.includes("stretcher")
      );
    }).length;
    expect(majorInjuryHits).toBeGreaterThanOrEqual(14);
  });
});
