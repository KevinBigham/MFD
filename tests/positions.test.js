import { describe, expect, it } from 'vitest';

import {
  ALL_POSITIONS,
  DEF_POSITIONS,
  OFF_POSITIONS,
  POS_DEF,
  RATING_LABELS,
  SPEC_POSITIONS,
} from '../src/config/positions.js';

describe('positions.js', () => {
  it('defines core position groups and full position map', () => {
    expect(ALL_POSITIONS.length).toBe(11);
    expect(OFF_POSITIONS).toEqual(expect.arrayContaining(['QB', 'RB', 'WR', 'TE', 'OL']));
    expect(DEF_POSITIONS).toEqual(expect.arrayContaining(['DL', 'LB', 'CB', 'S']));
    expect(SPEC_POSITIONS).toEqual(expect.arrayContaining(['K', 'P']));
  });

  it('keeps rating/weight arrays aligned per position', () => {
    ALL_POSITIONS.forEach((pos) => {
      expect(POS_DEF[pos]).toBeTruthy();
      expect(POS_DEF[pos].r.length).toBe(20);
      expect(POS_DEF[pos].w.length).toBe(20);
      expect(POS_DEF[pos].cat).toBeTruthy();
      POS_DEF[pos].r.forEach((rating) => {
        expect(RATING_LABELS[rating]).toBeTruthy();
      });
    });
  });
});
