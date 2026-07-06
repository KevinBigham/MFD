import { afterEach, describe, expect, it, vi } from 'vitest';
import { RNG, setSeed } from '../rng';
import {
  generatePersonality,
  getContractPersonalityEffects,
  getDominantTrait,
  getPersonality,
  PERS_LABELS,
  traitScalar,
} from './personality';

describe('player personality helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes missing and partial personality data into clamped five-axis values', () => {
    expect(getPersonality(null)).toEqual({
      workEthic: 5,
      loyalty: 5,
      greed: 5,
      pressure: 5,
      ambition: 5,
    });
    expect(getPersonality({ personality: { workEthic: 15, greed: -5, pressure: 8 } })).toEqual({
      workEthic: 10,
      loyalty: 5,
      greed: 1,
      pressure: 8,
      ambition: 5,
    });
  });

  it('maps personality axes to the centered scalar used by chemistry and scheme-fit math', () => {
    expect(traitScalar(1)).toBe(-1);
    expect(traitScalar(5.5)).toBe(0);
    expect(traitScalar(10)).toBe(1);
    expect(traitScalar(-99)).toBe(-1);
    expect(traitScalar(99)).toBe(1);
  });

  it('generates personality from draft RNG with age, dev-trait, and QB pressure modifiers', () => {
    vi.spyOn(RNG, 'draft').mockReturnValue(0.5);

    expect(generatePersonality('QB', 25, 'star')).toEqual({
      workEthic: 6,
      loyalty: 6,
      greed: 6,
      pressure: 8,
      ambition: 7,
    });
  });

  it('clamps generated senior superstar modifiers after applying age and dev-trait adjustments', () => {
    vi.spyOn(RNG, 'draft').mockReturnValue(0.99);

    expect(generatePersonality('WR', 31, 'superstar')).toEqual({
      workEthic: 10,
      loyalty: 10,
      greed: 8,
      pressure: 10,
      ambition: 10,
    });
  });

  it('keeps seeded generated personalities deterministic', () => {
    setSeed(42);
    const first = generatePersonality('QB', 25, 'star');
    setSeed(42);
    const second = generatePersonality('QB', 25, 'star');

    expect(second).toEqual(first);
  });

  it('reports only the first dominant axis at or above eight using source-order ties', () => {
    expect(getDominantTrait({ personality: { workEthic: 7, loyalty: 7, greed: 7, pressure: 7, ambition: 7 } })).toBeNull();
    expect(getDominantTrait({ personality: { workEthic: 8, loyalty: 10, greed: 5, pressure: 5, ambition: 5 } })).toEqual({
      key: 'loyalty',
      val: 10,
    });
    expect(getDominantTrait({ personality: { workEthic: 9, loyalty: 9, greed: 5, pressure: 5, ambition: 5 } })).toEqual({
      key: 'workEthic',
      val: 9,
    });
  });

  it('translates greed, loyalty, pressure, and context into contract behavior adjustments', () => {
    const mercenaryEffects = getContractPersonalityEffects(
      { personality: { greed: 10, loyalty: 1, pressure: 10, ambition: 8 } },
      { isContender: true, roleConflict: true, isFormerTeam: true },
    );
    expect(mercenaryEffects.demandMultAdj).toBeCloseTo(0.29);
    expect(mercenaryEffects.walkThreshAdj).toBeCloseTo(0.08);
    expect(mercenaryEffects.faScoreAdj).toBeCloseTo(16);
    expect(mercenaryEffects.holdoutChanceAdj).toBeCloseTo(0.18);

    const hometownEffects = getContractPersonalityEffects(
      { personality: { greed: 1, loyalty: 10, pressure: 1, ambition: 5 } },
      { isContender: true, isFormerTeam: true },
    );
    expect(hometownEffects.demandMultAdj).toBeCloseTo(-0.45);
    expect(hometownEffects.walkThreshAdj).toBeCloseTo(-0.08);
    expect(hometownEffects.faScoreAdj).toBeCloseTo(7);
    expect(hometownEffects.holdoutChanceAdj).toBeCloseTo(-0.16);
  });

  it('exports stable labels for all serialized personality axes', () => {
    expect(PERS_LABELS).toEqual({
      workEthic: 'Work Ethic',
      loyalty: 'Loyalty',
      greed: 'Greed',
      pressure: 'Clutch',
      ambition: 'Ambition',
    });
  });
});
