import { describe, expect, it } from "vitest";

import { HELP_SECTIONS } from "../src/data/help-sections.js";

describe("help-sections behavior", function () {
  it("keeps canonical section ordering and non-overlapping titles", function () {
    var titles = HELP_SECTIONS.map(function (s) {
      return s.title;
    });
    expect(titles).toEqual(["Navigation", "Simulation", "Save"]);
    expect(new Set(titles).size).toBe(HELP_SECTIONS.length);
  });

  it("keeps keybind rows well-formed and de-duplicated within each section", function () {
    HELP_SECTIONS.forEach(function (section) {
      var keys = section.keys.map(function (entry) {
        expect(typeof entry.k).toBe("string");
        expect(typeof entry.desc).toBe("string");
        expect(entry.k.trim().length).toBeGreaterThan(0);
        expect(entry.desc.trim().length).toBeGreaterThan(0);
        return entry.k;
      });
      expect(new Set(keys).size).toBe(keys.length);
    });
  });

  it("preserves critical gameplay shortcuts in the help overlay", function () {
    var allKeys = HELP_SECTIONS.flatMap(function (section) {
      return section.keys.map(function (entry) {
        return entry.k;
      });
    });
    [
      "D",
      "R",
      "G",
      "O",
      "Space / W",
      "N",
      "P",
      "Ctrl+S",
      "Ctrl+Shift+C",
      "Esc",
    ].forEach(function (required) {
      expect(allKeys.includes(required)).toBe(true);
    });
  });
});
