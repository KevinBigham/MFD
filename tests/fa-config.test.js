import { describe, expect, it } from 'vitest';

import {
  FA_MARKET_VALUE,
  FA_PHASES,
  FA_PRIORITY_TAGS,
  FA_ROLE_PITCH,
  FA_TIERS,
  RFA_TENDERS,
  getFATier,
} from '../src/data/fa-config.js';

describe('fa-config.js', () => {
  it('maps overall ratings to expected free agency tiers', () => {
    expect(getFATier(80)).toBe(FA_TIERS.ELITE);
    expect(getFATier(72)).toBe(FA_TIERS.SOLID);
    expect(getFATier(65)).toBe(FA_TIERS.DEPTH);
    expect(getFATier(55)).toBe(FA_TIERS.CAMP);
  });

  it('defines phases, role pitches, tenders, and priority tags', () => {
    expect(FA_PHASES.TAMPERING.id).toBe('tampering');
    expect(FA_PHASES.OPEN.id).toBe('open');
    expect(FA_ROLE_PITCH.STARTER.weight).toBeGreaterThan(FA_ROLE_PITCH.DEPTH.weight);
    expect(RFA_TENDERS.FIRST.compRound).toBe(1);
    expect(FA_PRIORITY_TAGS.length).toBeGreaterThan(3);
  });

  it('calculates market values with scarcity, age, and demand modifiers', () => {
    const youngQb = FA_MARKET_VALUE.calc({ pos: 'QB', ovr: 80, age: 24 }, 4);
    const olderRb = FA_MARKET_VALUE.calc({ pos: 'RB', ovr: 80, age: 32 }, 1);

    expect(youngQb).toBeGreaterThan(olderRb);
    expect(FA_MARKET_VALUE.ageMod(24)).toBeGreaterThan(FA_MARKET_VALUE.ageMod(32));
  });
});
