import { describe, expect, it } from 'vitest';

import { PLAYER_NAMES_991 } from '../src/data/player-names.js';

describe('player-names.js', () => {
  it('provides first and last name pools by category', () => {
    expect(PLAYER_NAMES_991.first.classic.length).toBeGreaterThan(10);
    expect(PLAYER_NAMES_991.first.modern.length).toBeGreaterThan(10);
    expect(PLAYER_NAMES_991.last.common.length).toBeGreaterThan(10);
    expect(PLAYER_NAMES_991.last.athletic.length).toBeGreaterThan(10);
  });

  it('defines position name-weight maps that sum to approximately one', () => {
    Object.values(PLAYER_NAMES_991.positionWeights).forEach((w) => {
      const total = Object.values(w).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1, 5);
    });
    expect(PLAYER_NAMES_991.positionWeights.QB.southern).toBeGreaterThan(0);
    expect(PLAYER_NAMES_991.positionWeights.K.international).toBeGreaterThan(0);
  });
});
