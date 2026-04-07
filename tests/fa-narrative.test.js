import { describe, expect, it } from 'vitest';

import { FA_NARRATIVE_993 } from '../src/data/fa-narrative.js';

describe('fa-narrative.js', () => {
  it('contains expected free agency narrative buckets', () => {
    expect(FA_NARRATIVE_993).toHaveProperty('bigSigning');
    expect(FA_NARRATIVE_993).toHaveProperty('biddingWar');
    expect(FA_NARRATIVE_993).toHaveProperty('playerHoldout');
    expect(FA_NARRATIVE_993).toHaveProperty('marketUpdate');
    expect(FA_NARRATIVE_993).toHaveProperty('quietPeriodOver');
    expect(FA_NARRATIVE_993).toHaveProperty('bustedSigning');
    expect(FA_NARRATIVE_993).toHaveProperty('veteranRelease');
  });

  it('keeps pools populated with string templates and placeholders where needed', () => {
    Object.values(FA_NARRATIVE_993).forEach((pool) => {
      expect(Array.isArray(pool)).toBe(true);
      expect(pool.length).toBeGreaterThan(0);
      pool.forEach((line) => expect(typeof line).toBe('string'));
    });

    expect(FA_NARRATIVE_993.bigSigning[0]).toContain('[PLAYER]');
    expect(FA_NARRATIVE_993.bigSigning[0]).toContain('[TEAM]');
    expect(FA_NARRATIVE_993.biddingWar[0]).toContain('[TEAM1]');
    expect(FA_NARRATIVE_993.biddingWar[0]).toContain('[TEAM2]');
  });
});
