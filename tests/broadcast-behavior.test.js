import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BROADCAST_COMMENTARY,
  BROADCAST_COMMENTARY_EXPANDED,
} from "../src/data/broadcast.js";
import { setSeed } from "../src/utils/rng.js";

describe("broadcast behavior", function () {
  afterEach(function () {
    vi.restoreAllMocks();
  });

  it("fill986 replaces known tokens and preserves unknown ones", function () {
    var line = BROADCAST_COMMENTARY.fill986("{qb} to {wr} for {yds}", {
      qb: "Nix",
      wr: "Riley",
      yds: 27,
    });
    expect(line).toBe("Nix to Riley for 27");
    expect(
      BROADCAST_COMMENTARY.fill986("{qb} to {missing}", { qb: "Nix" })
    ).toBe("Nix to {missing}");
  });

  it("pick986 is seeded-deterministic and handles empty arrays", function () {
    setSeed(77);
    var seqA = [
      BROADCAST_COMMENTARY.pick986(["a", "b", "c"]),
      BROADCAST_COMMENTARY.pick986(["a", "b", "c"]),
      BROADCAST_COMMENTARY.pick986(["a", "b", "c"]),
    ];
    setSeed(77);
    var seqB = [
      BROADCAST_COMMENTARY.pick986(["a", "b", "c"]),
      BROADCAST_COMMENTARY.pick986(["a", "b", "c"]),
      BROADCAST_COMMENTARY.pick986(["a", "b", "c"]),
    ];
    expect(seqB).toEqual(seqA);
    seqA.forEach(function (v) {
      expect(["a", "b", "c"]).toContain(v);
    });
    expect(BROADCAST_COMMENTARY.pick986([])).toBe("");
  });

  it("get() resolves drives first, category fallback second, and default last", function () {
    expect(BROADCAST_COMMENTARY.get("drives", "TD", function () { return 0; })).toBe(
      BROADCAST_COMMENTARY.drives.TD[0]
    );
    expect(
      BROADCAST_COMMENTARY.get("momentum", "takeLead", function () {
        return 0;
      })
    ).toBe(BROADCAST_COMMENTARY.momentum.takeLead[0]);
    expect(
      BROADCAST_COMMENTARY.get("unknown", "unknown", function () {
        return 0;
      })
    ).toBe("Great play.");
  });

  it("keeps base and expanded packs at expected sizes", function () {
    expect(BROADCAST_COMMENTARY.pbp986.passTD).toHaveLength(10);
    expect(BROADCAST_COMMENTARY.pbp986.rushTD).toHaveLength(10);
    expect(BROADCAST_COMMENTARY.pbp986.sack).toHaveLength(7);
    expect(BROADCAST_COMMENTARY.pbp986.interception).toHaveLength(7);
    expect(BROADCAST_COMMENTARY.pbp986.fumble).toHaveLength(4);
    expect(BROADCAST_COMMENTARY.drives.TD).toHaveLength(10);
    expect(BROADCAST_COMMENTARY.drives.SAFETY).toHaveLength(5);
    expect(BROADCAST_COMMENTARY.finalScore.walkoff).toHaveLength(4);

    Object.values(BROADCAST_COMMENTARY_EXPANDED.drives).forEach(function (arr) {
      expect(arr).toHaveLength(20);
    });
    Object.values(BROADCAST_COMMENTARY_EXPANDED.momentum).forEach(function (arr) {
      expect(arr).toHaveLength(20);
    });
    Object.values(BROADCAST_COMMENTARY_EXPANDED.clutch).forEach(function (arr) {
      expect(arr).toHaveLength(20);
    });
    Object.values(BROADCAST_COMMENTARY_EXPANDED.weather).forEach(function (arr) {
      expect(arr).toHaveLength(20);
    });
  });
});
