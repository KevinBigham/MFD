import { describe, expect, it } from 'vitest';

import { DRAFT_COMMENTARY, getDraftCommentary } from '../src/data/draft-commentary.js';

describe('draft-commentary.js', () => {
  it('exposes draft commentary text keys', () => {
    expect(DRAFT_COMMENTARY.r1elite).toBeTypeOf('string');
    expect(DRAFT_COMMENTARY.r2steal).toBeTypeOf('string');
    expect(DRAFT_COMMENTARY.fallback).toBeTypeOf('string');
  });

  it('routes commentary by round and ovr thresholds', () => {
    expect(getDraftCommentary(1, 82)).toBe(DRAFT_COMMENTARY.r1elite);
    expect(getDraftCommentary(1, 75)).toBe(DRAFT_COMMENTARY.r1solid);
    expect(getDraftCommentary(1, 68)).toBe(DRAFT_COMMENTARY.r1value);

    expect(getDraftCommentary(2, 75)).toBe(DRAFT_COMMENTARY.r2steal);
    expect(getDraftCommentary(2, 68)).toBe(DRAFT_COMMENTARY.r2solid);
    expect(getDraftCommentary(2, 60)).toBe(DRAFT_COMMENTARY.r2depth);

    expect(getDraftCommentary(3, 70)).toBe(DRAFT_COMMENTARY.r3gem);
    expect(getDraftCommentary(3, 64)).toBe(DRAFT_COMMENTARY.r3plus);
  });
});
