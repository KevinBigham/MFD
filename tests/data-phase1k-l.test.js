import { describe, expect, it } from 'vitest';

import {
  DRAFT_COMMENTARY,
  PLAYER_NAMES_991,
  SCOUTING_TEMPLATES_991,
  getDraftCommentary,
} from '../src/data/index.js';

describe('data phase1k/l packs', () => {
  it('PLAYER_NAMES_991 contains first/last pools and position weights', () => {
    expect(PLAYER_NAMES_991.first.classic.length).toBeGreaterThan(10);
    expect(PLAYER_NAMES_991.last.common.length).toBeGreaterThan(10);

    Object.entries(PLAYER_NAMES_991.positionWeights).forEach(([, weights]) => {
      const sum = Object.values(weights).reduce((s, v) => s + v, 0);
      expect(sum).toBeCloseTo(1, 5);
    });
  });

  it('SCOUTING_TEMPLATES_991 has template arrays for major positions', () => {
    ['QB', 'RB', 'WR', 'DL', 'LB', 'CB', 'S', 'TE', 'OL'].forEach((pos) => {
      const pack = SCOUTING_TEMPLATES_991[pos];
      expect(pack).toBeTruthy();
      expect(Object.keys(pack).length).toBeGreaterThan(1);
      Object.values(pack).forEach((arr) => {
        expect(Array.isArray(arr)).toBe(true);
        expect(arr.length).toBeGreaterThan(0);
      });
    });
  });

  it('getDraftCommentary maps round/ovr thresholds correctly', () => {
    expect(getDraftCommentary(1, 82)).toBe(DRAFT_COMMENTARY.r1elite);
    expect(getDraftCommentary(1, 74)).toBe(DRAFT_COMMENTARY.r1solid);
    expect(getDraftCommentary(1, 68)).toBe(DRAFT_COMMENTARY.r1value);

    expect(getDraftCommentary(2, 73)).toBe(DRAFT_COMMENTARY.r2steal);
    expect(getDraftCommentary(2, 67)).toBe(DRAFT_COMMENTARY.r2solid);
    expect(getDraftCommentary(2, 60)).toBe(DRAFT_COMMENTARY.r2depth);

    expect(getDraftCommentary(3, 69)).toBe(DRAFT_COMMENTARY.r3gem);
    expect(getDraftCommentary(4, 60)).toBe(DRAFT_COMMENTARY.r3plus);
  });
});
