import { describe, expect, it } from 'vitest';

import { HELP_SECTIONS } from '../src/data/help-sections.js';

describe('help-sections.js', () => {
  it('defines core help sections with keyboard mappings', () => {
    expect(HELP_SECTIONS.length).toBe(3);
    expect(HELP_SECTIONS.map((s) => s.title)).toEqual(['Navigation', 'Simulation', 'Save']);
  });

  it('keeps each keybind entry structured and non-empty', () => {
    HELP_SECTIONS.forEach((section) => {
      expect(Array.isArray(section.keys)).toBe(true);
      expect(section.keys.length).toBeGreaterThan(0);
      section.keys.forEach((entry) => {
        expect(typeof entry.k).toBe('string');
        expect(typeof entry.desc).toBe('string');
      });
    });
  });
});
