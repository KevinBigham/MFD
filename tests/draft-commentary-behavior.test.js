import { describe, expect, it } from "vitest";

import {
  DRAFT_COMMENTARY,
  getDraftCommentary,
} from "../src/data/draft-commentary.js";

describe("draft-commentary behavior", function () {
  it("uses default round/ovr when inputs are missing", function () {
    expect(getDraftCommentary()).toBe(DRAFT_COMMENTARY.r1value);
    expect(getDraftCommentary(undefined, 82)).toBe(DRAFT_COMMENTARY.r1elite);
    expect(getDraftCommentary(2)).toBe(DRAFT_COMMENTARY.r2depth);
  });

  it("honors exact threshold boundaries by round", function () {
    expect(getDraftCommentary(1, 80)).toBe(DRAFT_COMMENTARY.r1elite);
    expect(getDraftCommentary(1, 79)).toBe(DRAFT_COMMENTARY.r1solid);
    expect(getDraftCommentary(1, 72)).toBe(DRAFT_COMMENTARY.r1solid);
    expect(getDraftCommentary(1, 71)).toBe(DRAFT_COMMENTARY.r1value);

    expect(getDraftCommentary(2, 72)).toBe(DRAFT_COMMENTARY.r2steal);
    expect(getDraftCommentary(2, 71)).toBe(DRAFT_COMMENTARY.r2solid);
    expect(getDraftCommentary(2, 66)).toBe(DRAFT_COMMENTARY.r2solid);
    expect(getDraftCommentary(2, 65)).toBe(DRAFT_COMMENTARY.r2depth);

    expect(getDraftCommentary(3, 68)).toBe(DRAFT_COMMENTARY.r3gem);
    expect(getDraftCommentary(3, 67)).toBe(DRAFT_COMMENTARY.r3plus);
  });

  it("routes rounds beyond round two through day-three logic", function () {
    expect(getDraftCommentary(4, 75)).toBe(DRAFT_COMMENTARY.r3gem);
    expect(getDraftCommentary(7, 50)).toBe(DRAFT_COMMENTARY.r3plus);
  });
});
