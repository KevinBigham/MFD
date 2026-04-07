import { describe, expect, it } from 'vitest';

import { DYNASTY_MOMENTS_995 } from '../src/data/dynasty-moments.js';

describe('dynasty-moments.js', () => {
  it('contains core dynasty moment sections', () => {
    expect(DYNASTY_MOMENTS_995).toHaveProperty('firstChampionship');
    expect(DYNASTY_MOMENTS_995).toHaveProperty('backToBack');
    expect(DYNASTY_MOMENTS_995).toHaveProperty('dynastyWatch');
    expect(DYNASTY_MOMENTS_995).toHaveProperty('dynastyEnds');
    expect(DYNASTY_MOMENTS_995).toHaveProperty('coachLegacy');
    expect(DYNASTY_MOMENTS_995).toHaveProperty('fanGeneration');
  });

  it('keeps nested pools populated with expected channels/placeholders', () => {
    ['firstChampionship', 'backToBack', 'dynastyWatch'].forEach((k) => {
      const section = DYNASTY_MOMENTS_995[k];
      expect(section.broadcast.length).toBeGreaterThan(0);
      expect(section.fans.length).toBeGreaterThan(0);
      expect(section.insider.length).toBeGreaterThan(0);
      expect(section.broadcast.some((line) => line.includes('[TEAM]'))).toBe(true);
    });

    expect(DYNASTY_MOMENTS_995.coachLegacy.broadcast.some((line) => line.includes('[COACH]'))).toBe(true);
    expect(Array.isArray(DYNASTY_MOMENTS_995.fanGeneration)).toBe(true);
    expect(DYNASTY_MOMENTS_995.fanGeneration.length).toBeGreaterThan(10);
  });
});
