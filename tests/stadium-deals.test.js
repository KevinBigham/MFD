import { beforeEach, describe, expect, it } from 'vitest';

import { setSeed } from '../src/utils/rng.js';
import { STADIUM_DEALS976, generateStadiumDeals976 } from '../src/data/stadium-deals.js';

describe('stadium-deals.js', () => {
  beforeEach(() => {
    setSeed(99);
  });

  it('defines stadium deal templates with expected fields', () => {
    expect(STADIUM_DEALS976.length).toBe(8);
    STADIUM_DEALS976.forEach((d) => {
      expect(typeof d.name).toBe('string');
      expect(typeof d.revenue).toBe('number');
      expect(typeof d.years).toBe('number');
      expect(typeof d.prestige).toBe('number');
      expect(typeof d.icon).toBe('string');
    });
  });

  it('generates 3 unique offers with bounded revenue variance', () => {
    const offers = generateStadiumDeals976();
    expect(offers).toHaveLength(3);
    expect(new Set(offers.map((o) => o.name)).size).toBe(3);

    offers.forEach((offer) => {
      const base = STADIUM_DEALS976.find((d) => d.name === offer.name);
      expect(base).toBeTruthy();
      expect(offer.years).toBe(base.years);
      expect(offer.prestige).toBe(base.prestige);
      expect(offer.revenue).toBeGreaterThanOrEqual(Math.round(base.revenue * 0.8 * 10) / 10 - 0.1);
      expect(offer.revenue).toBeLessThanOrEqual(Math.round(base.revenue * 1.2 * 10) / 10 + 0.1);
    });
  });
});
