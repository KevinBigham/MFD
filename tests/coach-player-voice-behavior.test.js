import { describe, expect, it } from "vitest";

import { COACH_PLAYER_VOICE_994 } from "../src/data/coach-player-voice.js";

describe("coach-player-voice behavior", function () {
  it("keeps synergy and clash archetype pools at expected sizes", function () {
    expect(Object.keys(COACH_PLAYER_VOICE_994.synergy).sort()).toEqual([
      "firestarter_greed",
      "grinder_workEthic",
      "hothead_pressure",
      "professor_discipline",
      "visionary_loyalty",
      "zen_ambition",
    ]);
    expect(Object.keys(COACH_PLAYER_VOICE_994.clash).sort()).toEqual([
      "grinder_entitled",
      "hothead_zenPlayer",
      "professor_instinct",
    ]);

    Object.values(COACH_PLAYER_VOICE_994.synergy).forEach(function (pool) {
      expect(pool).toHaveLength(10);
      expect(new Set(pool).size).toBe(10);
    });
    expect(COACH_PLAYER_VOICE_994.clash.hothead_zenPlayer).toHaveLength(10);
    expect(COACH_PLAYER_VOICE_994.clash.professor_instinct).toHaveLength(10);
    expect(COACH_PLAYER_VOICE_994.clash.grinder_entitled).toHaveLength(8);
  });

  it("enforces placeholder token contracts for synergy/clash pools", function () {
    Object.values(COACH_PLAYER_VOICE_994.synergy).forEach(function (pool) {
      var pairCount = pool.filter(function (line) {
        return line.includes("[COACH]") && line.includes("[PLAYER]");
      }).length;
      // Most lines should remain tokenized, with room for a few generic variants.
      expect(pairCount).toBeGreaterThanOrEqual(Math.floor(pool.length * 0.5));
    });

    Object.values(COACH_PLAYER_VOICE_994.clash).forEach(function (pool) {
      var pairCount = pool.filter(function (line) {
        return line.includes("[COACH]") && line.includes("[PLAYER]");
      }).length;
      expect(pairCount).toBeGreaterThanOrEqual(Math.floor(pool.length * 0.75));
    });
  });

  it("keeps coordinator and firing narrative templates tokenized", function () {
    var hire = COACH_PLAYER_VOICE_994.coordinatorHire;
    var fire = COACH_PLAYER_VOICE_994.coordinatorFire;
    var mid = COACH_PLAYER_VOICE_994.midseasonFiring;

    var hireFull = hire.filter(function (line) {
      return (
        line.includes("[COACH]") &&
        line.includes("[TEAM]") &&
        line.includes("[ROLE]")
      );
    }).length;
    var fireWithRoleCoach = fire.filter(function (line) {
      return line.includes("[COACH]") && line.includes("[ROLE]");
    }).length;
    var fireWithTeam = fire.filter(function (line) {
      return line.includes("[TEAM]");
    }).length;
    var midWithCoach = mid.filter(function (line) {
      return line.includes("[COACH]");
    }).length;
    var midWithTeam = mid.filter(function (line) {
      return line.includes("[TEAM]");
    }).length;

    expect(hireFull).toBe(10);
    expect(fireWithRoleCoach).toBeGreaterThanOrEqual(9);
    expect(fireWithTeam).toBeGreaterThanOrEqual(9);
    expect(midWithCoach).toBe(8);
    expect(midWithTeam).toBeGreaterThanOrEqual(7);
    expect(COACH_PLAYER_VOICE_994.coordinatorHire).toHaveLength(10);
    expect(COACH_PLAYER_VOICE_994.coordinatorFire).toHaveLength(10);
    expect(COACH_PLAYER_VOICE_994.midseasonFiring).toHaveLength(8);
  });
});
