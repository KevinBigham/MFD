import { describe, expect, it } from 'vitest';

import { COMEBACK_994 } from '../src/data/comeback.js';

describe('comeback.js', () => {
  it('contains comeback narrative categories and position-specific injury returns', () => {
    expect(COMEBACK_994).toHaveProperty('injuryReturn');
    expect(COMEBACK_994.injuryReturn).toHaveProperty('QB');
    expect(COMEBACK_994.injuryReturn).toHaveProperty('RB');
    expect(COMEBACK_994.injuryReturn).toHaveProperty('WR');
    expect(COMEBACK_994.injuryReturn).toHaveProperty('DL');
    expect(COMEBACK_994).toHaveProperty('slumpToBaller');
    expect(COMEBACK_994).toHaveProperty('lateCareerRenaissance');
    expect(COMEBACK_994).toHaveProperty('redemptionAfterDrama');
    expect(COMEBACK_994).toHaveProperty('suspensionReturn');
    expect(COMEBACK_994).toHaveProperty('triumphOverTrade');
  });

  it('keeps narrative pools populated with string lines', () => {
    Object.values(COMEBACK_994.injuryReturn).forEach((pool) => {
      expect(Array.isArray(pool)).toBe(true);
      expect(pool.length).toBeGreaterThan(5);
      pool.forEach((line) => expect(typeof line).toBe('string'));
    });
    ['slumpToBaller', 'lateCareerRenaissance', 'redemptionAfterDrama', 'suspensionReturn', 'triumphOverTrade'].forEach((k) => {
      expect(Array.isArray(COMEBACK_994[k])).toBe(true);
      expect(COMEBACK_994[k].length).toBeGreaterThan(5);
    });
  });
});
