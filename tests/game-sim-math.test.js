import { describe, expect, it } from 'vitest';

import {
  WP_TABLE_DEEPSEEK,
  draftPickOvr991,
  edgeToProbability991,
  momentumDecay991,
} from '../src/systems/game-sim-math.js';

describe('game-sim-math.js', () => {
  it('WP_TABLE_DEEPSEEK has 28 entries', () => {
    expect(Object.keys(WP_TABLE_DEEPSEEK)).toHaveLength(28);
  });

  it('momentumDecay991 decays positive, negative, and zero values toward zero', () => {
    expect(momentumDecay991(4)).toBe(3.5);
    expect(momentumDecay991(-4)).toBe(-3.5);
    expect(momentumDecay991(0)).toBe(0);
  });

  it('edgeToProbability991 maps edge=0 to ~0.50 and is symmetric', () => {
    const p0 = edgeToProbability991(0);
    const p8 = edgeToProbability991(8);
    const n8 = edgeToProbability991(-8);

    expect(p0).toBeCloseTo(0.5, 10);
    expect(p8 + n8).toBeCloseTo(1, 10);
  });

  it('draftPickOvr991 always returns values in [40, 99]', () => {
    for (let round = 1; round <= 7; round += 1) {
      for (let pick = 1; pick <= 32; pick += 1) {
        const rating = draftPickOvr991(round, pick);
        expect(rating).toBeGreaterThanOrEqual(40);
        expect(rating).toBeLessThanOrEqual(99);
      }
    }
  });
});
