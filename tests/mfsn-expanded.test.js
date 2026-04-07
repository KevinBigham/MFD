import { describe, expect, it } from 'vitest';

import { MFSN_EXPANDED_993 } from '../src/data/mfsn-expanded.js';

describe('mfsn-expanded.js', () => {
  it('contains expanded drive, injury, crowd, and coach commentary groups', () => {
    expect(MFSN_EXPANDED_993).toHaveProperty('drives');
    expect(MFSN_EXPANDED_993).toHaveProperty('injuries');
    expect(MFSN_EXPANDED_993).toHaveProperty('crowd');
    expect(MFSN_EXPANDED_993).toHaveProperty('coach');

    expect(MFSN_EXPANDED_993.drives.PUNT_RETURN_TD.length).toBeGreaterThan(5);
    expect(MFSN_EXPANDED_993.injuries.minor.length).toBeGreaterThan(5);
    expect(MFSN_EXPANDED_993.crowd.homeTeamScoring.length).toBeGreaterThan(5);
    expect(MFSN_EXPANDED_993.coach.challengeWon.length).toBeGreaterThan(5);
  });

  it('keeps nested pools as arrays of strings', () => {
    Object.values(MFSN_EXPANDED_993.drives).forEach((pool) => {
      expect(Array.isArray(pool)).toBe(true);
      expect(typeof pool[0]).toBe('string');
    });
    Object.values(MFSN_EXPANDED_993.injuries).forEach((pool) => {
      expect(Array.isArray(pool)).toBe(true);
      expect(typeof pool[0]).toBe('string');
    });
  });
});
