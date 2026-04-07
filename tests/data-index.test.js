import { describe, expect, it } from "vitest";

import {
  CALENDAR,
  MFSN_SHOW,
  PRESS_CONFERENCE_993,
  DRAFT_ANALYST_993,
  FA_TIERS,
  HELP_SECTIONS,
  TEAM_FLAVOR_991,
} from "../src/data/index.js";

describe("data index.js", function () {
  it("re-exports core data packs", function () {
    expect(Array.isArray(CALENDAR)).toBe(true);
    expect(typeof TEAM_FLAVOR_991).toBe("object");
    expect(typeof MFSN_SHOW.buildPickCard).toBe("function");
    expect(typeof DRAFT_ANALYST_993).toBe("object");
    expect(typeof PRESS_CONFERENCE_993).toBe("object");
    expect(typeof FA_TIERS).toBe("object");
    expect(typeof HELP_SECTIONS).toBe("object");
  });
});
