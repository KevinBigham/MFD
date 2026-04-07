import { describe, expect, it } from "vitest";

import {
  ACTION_KEYS,
  ARCHETYPES,
  DIFF_SETTINGS,
  GAMEPLANS,
  POS_DEF,
  ROSTER_CAP,
  T,
} from "../src/config/index.js";

describe("config index.js", function () {
  it("re-exports core config packs and helpers", function () {
    expect(typeof T).toBe("object");
    expect(typeof DIFF_SETTINGS).toBe("object");
    expect(Number.isInteger(ROSTER_CAP)).toBe(true);
    expect(typeof POS_DEF).toBe("object");
    expect(typeof GAMEPLANS).toBe("object");
    expect(typeof ARCHETYPES).toBe("object");
    expect(typeof ACTION_KEYS).toBe("object");
  });
});
