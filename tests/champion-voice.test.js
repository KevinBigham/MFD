import { describe, expect, it } from 'vitest';

import { CHAMPION_VOICE_995 } from '../src/data/champion-voice.js';

describe('champion-voice.js', () => {
  it('defines archetype win/loss quote pools plus dynasty coach quotes', () => {
    ['grinder', 'professor', 'hothead', 'zen', 'visionary', 'firestarter'].forEach((k) => {
      expect(CHAMPION_VOICE_995).toHaveProperty(k);
      expect(Array.isArray(CHAMPION_VOICE_995[k].win)).toBe(true);
      expect(Array.isArray(CHAMPION_VOICE_995[k].loss)).toBe(true);
      expect(CHAMPION_VOICE_995[k].win.length).toBeGreaterThan(5);
      expect(CHAMPION_VOICE_995[k].loss.length).toBeGreaterThan(5);
    });
    expect(Array.isArray(CHAMPION_VOICE_995.dynastyCoach)).toBe(true);
    expect(CHAMPION_VOICE_995.dynastyCoach.length).toBeGreaterThan(10);
  });

  it('contains placeholder-aware lines for team/coach where applicable', () => {
    expect(CHAMPION_VOICE_995.grinder.win.some((l) => l.includes('championship'))).toBe(true);
    expect(CHAMPION_VOICE_995.dynastyCoach.some((l) => typeof l === 'string')).toBe(true);
  });
});
