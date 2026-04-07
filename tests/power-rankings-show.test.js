import { describe, expect, it } from 'vitest';

import { POWER_RANKINGS_SHOW_995 } from '../src/data/power-rankings-show.js';

describe('power-rankings-show.js', () => {
  it('defines all rank tier commentary buckets', () => {
    ['rank1', 'rank2to5', 'rank6to10', 'rank11to20', 'rank21to30'].forEach((k) => {
      expect(POWER_RANKINGS_SHOW_995).toHaveProperty(k);
      expect(Array.isArray(POWER_RANKINGS_SHOW_995[k])).toBe(true);
      expect(POWER_RANKINGS_SHOW_995[k].length).toBeGreaterThan(5);
    });
  });
});
