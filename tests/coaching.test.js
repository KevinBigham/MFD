import { describe, expect, it } from 'vitest';

import { ARCH_BOOST, ARCH_TRAIT_POOLS, ARCHETYPES, CLIQUE_TYPES, COACH_TRAITS } from '../src/config/coaching.js';

describe('coaching config', () => {
  it('defines archetypes by role and trait pools', () => {
    expect(ARCHETYPES.HC.length).toBeGreaterThan(0);
    expect(ARCHETYPES.OC.length).toBeGreaterThan(0);
    expect(ARCHETYPES.DC.length).toBeGreaterThan(0);
    expect(Object.keys(ARCH_TRAIT_POOLS).length).toBeGreaterThan(5);
  });

  it('provides boosts, trait metadata, and clique types', () => {
    expect(ARCH_BOOST['QB Guru'].arm).toBeGreaterThan(0);
    expect(COACH_TRAITS.AGGRESSIVE_4TH.effects).toBeTypeOf('object');
    expect(CLIQUE_TYPES.length).toBe(3);
    CLIQUE_TYPES.forEach((c) => expect(typeof c.label).toBe('string'));
  });
});
