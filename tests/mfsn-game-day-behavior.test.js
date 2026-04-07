import { describe, expect, it } from "vitest";

import {
  MFSN_DRIVES_994,
  MFSN_FOURTH_DOWN_994,
  MFSN_OVERTIME_994,
  SOCIAL_FEED_994,
} from "../src/data/mfsn-game-day.js";

function countLines(group) {
  return Object.values(group).reduce(function (sum, arr) {
    return sum + arr.length;
  }, 0);
}

describe("mfsn-game-day behavior", function () {
  it("keeps fourth-down commentary buckets at expected sizes", function () {
    expect(MFSN_FOURTH_DOWN_994.situational.fourthDownGo).toHaveLength(20);
    expect(MFSN_FOURTH_DOWN_994.situational.fourthDownConverted).toHaveLength(20);
    expect(MFSN_FOURTH_DOWN_994.situational.fourthDownStopped).toHaveLength(20);
    expect(MFSN_FOURTH_DOWN_994.situational.twoPointSuccess).toHaveLength(17);
  });

  it("keeps drives/momentum/clutch/weather blocks internally complete", function () {
    expect(Object.keys(MFSN_DRIVES_994.drives).sort()).toEqual([
      "FG",
      "PUNT",
      "SAFETY",
      "TD",
      "TO",
    ]);
    expect(Object.keys(MFSN_DRIVES_994.momentum).sort()).toEqual([
      "comeback",
      "extendLead",
      "takeLead",
    ]);
    expect(Object.keys(MFSN_DRIVES_994.clutch).sort()).toEqual([
      "goalLine",
      "redZone",
      "twoMinute",
    ]);
    expect(Object.keys(MFSN_DRIVES_994.weather).sort()).toEqual([
      "cold",
      "rain",
      "wind",
    ]);

    Object.values(MFSN_DRIVES_994.drives).forEach(function (arr) {
      expect(arr).toHaveLength(20);
    });
    Object.values(MFSN_DRIVES_994.momentum).forEach(function (arr) {
      expect(arr).toHaveLength(20);
    });
    Object.values(MFSN_DRIVES_994.clutch).forEach(function (arr) {
      expect(arr).toHaveLength(20);
    });
    Object.values(MFSN_DRIVES_994.weather).forEach(function (arr) {
      expect(arr).toHaveLength(20);
    });
  });

  it("keeps social feed volume and tokenized templates stable", function () {
    var fans = SOCIAL_FEED_994.fans;
    var analysts = SOCIAL_FEED_994.analysts;
    var insiders = SOCIAL_FEED_994.insiders;
    var total =
      countLines(fans) + countLines(analysts) + countLines(insiders);

    expect(total).toBe(210);
    expect(fans.bigWin).toHaveLength(25);
    expect(fans.badLoss).toHaveLength(25);
    expect(fans.clutchPlay).toHaveLength(20);
    expect(fans.tradeReact).toHaveLength(20);
    expect(fans.draftDay).toHaveLength(15);
    expect(fans.offseason).toHaveLength(15);
    expect(analysts.gameThread).toHaveLength(20);
    expect(analysts.hotTake).toHaveLength(20);
    expect(analysts.tradeTake).toHaveLength(15);
    expect(insiders.sources).toHaveLength(20);
    expect(insiders.breaking).toHaveLength(15);

    fans.bigWin.forEach(function (line) {
      expect(line.includes("[TEAM]")).toBe(true);
      expect(line.includes("[SCORE]")).toBe(true);
    });
    var badLossWithTeam = fans.badLoss.filter(function (line) {
      return line.includes("[TEAM]");
    });
    var badLossWithScore = fans.badLoss.filter(function (line) {
      return line.includes("[SCORE]");
    });
    expect(badLossWithTeam.length).toBeGreaterThanOrEqual(20);
    expect(badLossWithScore.length).toBeGreaterThanOrEqual(20);
    analysts.gameThread.forEach(function (line) {
      expect(line.includes("[TEAM]")).toBe(true);
      expect(line.includes("[PLAY]")).toBe(true);
    });
    insiders.breaking.forEach(function (line) {
      expect(line.includes("[TEAM]")).toBe(true);
      expect(line.includes("[PLAYER]")).toBe(true);
    });
  });

  it("keeps overtime lines complete and themed", function () {
    expect(MFSN_OVERTIME_994.situational.twoPointFailed).toHaveLength(20);
    expect(MFSN_OVERTIME_994.situational.overtimeStart).toHaveLength(20);
    var explicitOvertimeMentions = MFSN_OVERTIME_994.situational.overtimeStart
      .filter(function (line) {
        return line.toLowerCase().includes("overtime");
      }).length;
    expect(explicitOvertimeMentions).toBeGreaterThanOrEqual(10);
  });
});
