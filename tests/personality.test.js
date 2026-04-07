import { beforeEach, describe, expect, it } from 'vitest';

import {
  PERS_ICONS,
  PERS_LABELS,
  generatePersonality,
  getContractPersonalityEffects,
  getDominantTrait,
  getPersonality,
  traitScalar,
} from '../src/systems/personality.js';
import { setSeed } from '../src/utils/rng.js';

describe('personality.js', () => {
  beforeEach(() => {
    setSeed(2026);
  });

  it('getPersonality provides defaults and clamps values 1-10', () => {
    const p = getPersonality({
      personality: {
        workEthic: 0,
        loyalty: 99,
        greed: -5,
        pressure: 7,
        ambition: undefined,
      },
    });

    expect(p).toEqual({
      workEthic: 5,
      loyalty: 10,
      greed: 1,
      pressure: 7,
      ambition: 5,
    });
  });

  it('traitScalar maps 1..10 near -1..1', () => {
    expect(traitScalar(1)).toBeCloseTo(-1, 5);
    expect(traitScalar(10)).toBeCloseTo(1, 5);
    expect(traitScalar(5.5)).toBeCloseTo(0, 5);
  });

  it('generatePersonality is deterministic with setSeed', () => {
    setSeed(99);
    const a = generatePersonality('QB', 31, 'superstar');
    setSeed(99);
    const b = generatePersonality('QB', 31, 'superstar');
    expect(a).toEqual(b);
  });

  it('generatePersonality outputs values in range', () => {
    const p = generatePersonality('WR', 24, 'normal');
    Object.values(p).forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(10);
    });
  });

  it('getDominantTrait returns null unless a trait is >= 8', () => {
    expect(getDominantTrait({ personality: { workEthic: 7, loyalty: 7, greed: 7, pressure: 7, ambition: 7 } })).toBeNull();

    expect(getDominantTrait({ personality: { workEthic: 9, loyalty: 5, greed: 4, pressure: 6, ambition: 7 } })).toEqual({
      key: 'workEthic',
      val: 9,
    });
  });

  it('getContractPersonalityEffects applies context-aware adjustments', () => {
    const player = {
      personality: {
        workEthic: 6,
        loyalty: 9,
        greed: 8,
        pressure: 8,
        ambition: 9,
      },
    };

    const out = getContractPersonalityEffects(player, {
      isContender: true,
      roleConflict: true,
      isFormerTeam: true,
    });

    expect(out).toHaveProperty('demandMultAdj');
    expect(out).toHaveProperty('walkThreshAdj');
    expect(out).toHaveProperty('faScoreAdj');
    expect(out).toHaveProperty('holdoutChanceAdj');
    expect(out.faScoreAdj).toBeGreaterThan(0);
    expect(out.holdoutChanceAdj).toBeLessThan(0);
  });

  it('exports icon/label maps for all five personality axes', () => {
    const keys = ['workEthic', 'loyalty', 'greed', 'pressure', 'ambition'];
    keys.forEach((k) => {
      expect(PERS_ICONS[k]).toBeTypeOf('string');
      expect(PERS_LABELS[k]).toBeTypeOf('string');
    });
  });
});
