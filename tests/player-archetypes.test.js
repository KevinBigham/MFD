import { describe, expect, it } from 'vitest';

import {
  AGE_CURVES,
  ARCHETYPE_AGING,
  PLAYER_ARCHETYPES,
} from '../src/systems/player-archetypes.js';

describe('player-archetypes.js', () => {
  it('exports position age curves', () => {
    expect(AGE_CURVES.QB.prime).toEqual([26, 33]);
    expect(AGE_CURVES.RB.cliff).toBe(29);
    expect(AGE_CURVES.CB.decayRate).toBe(2.0);
  });

  it('classify returns null for invalid players and specialists', () => {
    expect(PLAYER_ARCHETYPES.classify(null)).toBeNull();
    expect(PLAYER_ARCHETYPES.classify({ pos: 'K', ratings: {} })).toBeNull();
    expect(PLAYER_ARCHETYPES.classify({ pos: 'P', ratings: {} })).toBeNull();
  });

  it('classify maps QB with arm/deep profile to gunslinger', () => {
    const qb = {
      pos: 'QB',
      ratings: {
        arm: 95,
        deepAccuracy: 90,
        throwOnRun: 88,
        release: 86,
      },
    };
    const out = PLAYER_ARCHETYPES.classify(qb);
    expect(out?.archetype).toBe('gunslinger');
  });

  it('classify maps WR speed/deep-route profile to deep threat', () => {
    const wr = {
      pos: 'WR',
      ratings: {
        speed: 95,
        deepRoute: 92,
        separation: 90,
        spectacularCatch: 88,
      },
    };
    const out = PLAYER_ARCHETYPES.classify(wr);
    expect(out?.archetype).toBe('deep_threat');
  });

  it('ARCHETYPE_AGING falls back to base curve for unknown archetype', () => {
    const c = ARCHETYPE_AGING.getCurve({ pos: 'QB', archetype: 'unknown' });
    expect(c).toEqual(AGE_CURVES.QB);
  });

  it('ARCHETYPE_AGING applies mods for known archetypes', () => {
    const c = ARCHETYPE_AGING.getCurve({ pos: 'QB', archetype: 'game_manager' });
    expect(c.cliff).toBe(38); // 36 + 2
    expect(c.decayRate).toBe(0.63); // 0.9 * 0.7
    expect(c.prime).toEqual([26, 34]);
  });

  it('ARCHETYPE_AGING handles object-form archetype payload', () => {
    const c = ARCHETYPE_AGING.getCurve({
      pos: 'RB',
      archetype: { archetype: 'speed_back' },
    });
    expect(c.cliff).toBe(28);
    expect(c.decayRate).toBe(3.6);
  });
});
