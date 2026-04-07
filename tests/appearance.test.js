import { describe, expect, it } from 'vitest';

import { HAIR_COLORS, SKIN_TONES } from '../src/data/appearance.js';

describe('appearance.js', () => {
  it('defines expected skin tone and hair color palettes', () => {
    expect(SKIN_TONES).toHaveLength(7);
    expect(HAIR_COLORS).toHaveLength(7);
    SKIN_TONES.forEach((c) => expect(c.startsWith('#')).toBe(true));
    HAIR_COLORS.forEach((c) => expect(c.startsWith('#')).toBe(true));
  });
});
