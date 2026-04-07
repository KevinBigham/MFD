import { describe, expect, it } from 'vitest';

import { SPECIAL_COVERAGES_993, SPECIAL_PLAYS_993 } from '../src/systems/special-plays.js';

describe('special-plays.js', () => {
  it('contains expected counts and unique play ids', () => {
    expect(SPECIAL_PLAYS_993.trickPlays).toHaveLength(4);
    expect(SPECIAL_PLAYS_993.passVariants).toHaveLength(3);
    expect(SPECIAL_COVERAGES_993).toHaveLength(4);

    const ids = [...SPECIAL_PLAYS_993.trickPlays, ...SPECIAL_PLAYS_993.passVariants].map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('play definitions include required gameplay fields', () => {
    [...SPECIAL_PLAYS_993.trickPlays, ...SPECIAL_PLAYS_993.passVariants].forEach((play) => {
      expect(typeof play.label).toBe('string');
      expect(Array.isArray(play.ydsBase)).toBe(true);
      expect(typeof play.bigPlay).toBe('number');
      expect(typeof play.fumble).toBe('number');
      expect(Array.isArray(play.commentary)).toBe(true);
      expect(play.commentary.length).toBeGreaterThan(0);
    });
  });

  it('coverage definitions provide full modifier payloads', () => {
    SPECIAL_COVERAGES_993.forEach((cov) => {
      expect(typeof cov.mods.short).toBe('number');
      expect(typeof cov.mods.deep).toBe('number');
      expect(typeof cov.mods.rush).toBe('number');
      expect(typeof cov.mods.blitz).toBe('number');
      expect(typeof cov.mods.sackMod).toBe('number');
    });
  });
});
