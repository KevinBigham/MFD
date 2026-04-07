import { describe, expect, it } from 'vitest';

import { STADIUM_UPGRADE_995 } from '../src/data/stadium-upgrade.js';

describe('stadium-upgrade.js', () => {
  it('contains key stadium narrative categories', () => {
    expect(STADIUM_UPGRADE_995).toHaveProperty('newStadiumOpen');
    expect(STADIUM_UPGRADE_995).toHaveProperty('capacityExpansion');
    expect(STADIUM_UPGRADE_995).toHaveProperty('practiceUpgrade');
    expect(STADIUM_UPGRADE_995).toHaveProperty('fieldSurface');
    expect(STADIUM_UPGRADE_995).toHaveProperty('jumbotron');
    expect(STADIUM_UPGRADE_995).toHaveProperty('atmosphereGrowth');
  });

  it('keeps each narrative pool populated with strings', () => {
    Object.values(STADIUM_UPGRADE_995).forEach((pool) => {
      expect(Array.isArray(pool)).toBe(true);
      expect(pool.length).toBeGreaterThan(8);
      pool.forEach((line) => expect(typeof line).toBe('string'));
    });
  });
});
