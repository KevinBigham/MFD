import { describe, expect, it } from "vitest";

import { DRAFT_PRESSER975 } from "../src/data/draft-presser.js";

var TEAM = { id: "hawks", abbr: "ATL" };
var PICKS_FULL = [
  { name: "Franchise QB", pos: "QB", _draftRound: 1 },
  { name: "Late Gem", pos: "LB", _draftRound: 5 },
];

describe("draft-presser behavior", function () {
  it("branches opening question by grade tier", function () {
    var high = DRAFT_PRESSER975.generateQuestions(
      { grade: "A+" },
      PICKS_FULL,
      TEAM,
      2026
    );
    var mid = DRAFT_PRESSER975.generateQuestions(
      { grade: "B" },
      PICKS_FULL,
      TEAM,
      2026
    );
    var low = DRAFT_PRESSER975.generateQuestions(
      { grade: "D" },
      PICKS_FULL,
      TEAM,
      2026
    );

    expect(high[0].q).toContain("MFSN gave you an A+");
    expect(mid[0].q).toBe("How do you feel about your draft class?");
    expect(low[0].q).toContain("Analysts are calling this draft a D");
  });

  it("injects first-round and late-round player context into follow-up questions", function () {
    var questions = DRAFT_PRESSER975.generateQuestions(
      { grade: "A" },
      PICKS_FULL,
      TEAM,
      2026
    );
    expect(questions.length).toBe(3);
    expect(questions[1].q).toContain("Franchise QB");
    expect(questions[1].q).toContain("Why QB?");
    expect(questions[2].q).toContain("5-round pick Late Gem");
  });

  it("omits optional follow-ups when corresponding pick types are absent", function () {
    var noRound1 = DRAFT_PRESSER975.generateQuestions(
      { grade: "B+" },
      [{ name: "Depth WR", pos: "WR", _draftRound: 4 }],
      TEAM,
      2026
    );
    expect(noRound1.length).toBe(2);
    expect(noRound1[0].q).toBe("MFSN gave you an B+ for this draft. Walk us through your strategy.");
    expect(noRound1[1].q).toContain("4-round pick Depth WR");

    var noLate = DRAFT_PRESSER975.generateQuestions(
      { grade: "B+" },
      [{ name: "Day1 OT", pos: "OT", _draftRound: 1 }],
      TEAM,
      2026
    );
    expect(noLate.length).toBe(2);
    expect(noLate[1].q).toContain("You took Day1 OT with your first-round pick. Why OT?");
  });

  it("normalizes unknown/missing grades to middle branch and caps output at three", function () {
    var unknown = DRAFT_PRESSER975.generateQuestions(
      { grade: "Z" },
      PICKS_FULL.concat([{ name: "Another Late", pos: "CB", _draftRound: 6 }]),
      TEAM,
      2026
    );
    var missing = DRAFT_PRESSER975.generateQuestions({}, PICKS_FULL, TEAM, 2026);

    expect(unknown[0].q).toBe("How do you feel about your draft class?");
    expect(unknown.length).toBeLessThanOrEqual(3);
    expect(missing[0].q).toBe("How do you feel about your draft class?");
    expect(missing.length).toBe(3);
  });
});
