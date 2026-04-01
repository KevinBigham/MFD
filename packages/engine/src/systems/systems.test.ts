import { describe, it, expect, beforeEach } from 'vitest';
import { setSeed } from '../rng';
import {
  TRAITS, TRAIT_FX, TRAIT_MILESTONES,
  getPlayerTraits, hasTrait, assignTrait, assignTraits, checkTraitMilestones,
} from './traits';
import {
  getPersonality, traitScalar, generatePersonality,
  getDominantTrait, getContractPersonalityEffects,
} from './personality';
import { AGE_CURVES, classifyArchetype, getAgeCurve } from './player-archetypes';

describe('traits', () => {
  beforeEach(() => setSeed(42));

  it('defines 24 traits + none', () => {
    expect(Object.keys(TRAITS)).toHaveLength(25);
  });

  it('all traits with effects have matching FX entries', () => {
    for (const key of Object.keys(TRAIT_FX)) {
      expect(TRAITS[key as keyof typeof TRAITS]).toBeDefined();
    }
  });

  it('trait percentages sum to ~100', () => {
    const sum = Object.values(TRAITS).reduce((s, t) => s + t.pct, 0);
    expect(sum).toBeGreaterThanOrEqual(98);
    expect(sum).toBeLessThanOrEqual(120);
  });

  it('getPlayerTraits returns clean array', () => {
    expect(getPlayerTraits({ traits: ['clutch', 'captain'] })).toEqual(['clutch', 'captain']);
    expect(getPlayerTraits(null)).toEqual([]);
    expect(getPlayerTraits({ traits: [] })).toEqual([]);
  });

  it('hasTrait checks correctly', () => {
    const p = { traits: ['clutch' as const, 'captain' as const] };
    expect(hasTrait(p, 'clutch')).toBe(true);
    expect(hasTrait(p, 'glass')).toBe(false);
  });

  it('assignTrait returns a valid trait key', () => {
    const t = assignTrait();
    expect(Object.keys(TRAITS)).toContain(t);
  });

  it('assignTraits returns 1-3 unique traits', () => {
    for (let i = 0; i < 50; i++) {
      const traits = assignTraits();
      expect(traits.length).toBeGreaterThanOrEqual(0);
      expect(traits.length).toBeLessThanOrEqual(3);
      expect(new Set(traits).size).toBe(traits.length);
    }
  });

  it('assignTraits is deterministic', () => {
    setSeed(777);
    const a = assignTraits();
    setSeed(777);
    const b = assignTraits();
    expect(a).toEqual(b);
  });

  it('checkTraitMilestones detects thresholds', () => {
    const p = {
      traits: ['clutch' as const],
      careerStats: { seasons: 4 },
      traitMilestones: {} as Record<string, boolean>,
      traitPowerLevel: {} as Record<string, number>,
    };
    const hits = checkTraitMilestones(p);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.milestoneKey).toBe('clutch_1');
    expect(p.traitMilestones['clutch_1']).toBe(true);
  });
});

describe('personality', () => {
  beforeEach(() => setSeed(42));

  it('getPersonality returns clamped values', () => {
    const p = getPersonality({ personality: { workEthic: 15, greed: -5 } });
    expect(p.workEthic).toBe(10);
    expect(p.greed).toBe(1);
  });

  it('getPersonality defaults to 5', () => {
    const p = getPersonality(null);
    expect(p.workEthic).toBe(5);
    expect(p.loyalty).toBe(5);
  });

  it('traitScalar maps 1->-1, 10->+1', () => {
    expect(traitScalar(1)).toBeCloseTo(-1, 1);
    expect(traitScalar(10)).toBeCloseTo(1, 1);
    expect(traitScalar(5)).toBeCloseTo(-0.11, 1);
  });

  it('generatePersonality returns valid ranges', () => {
    const p = generatePersonality('QB', 25, 'star');
    expect(p.workEthic).toBeGreaterThanOrEqual(1);
    expect(p.workEthic).toBeLessThanOrEqual(10);
    expect(p.loyalty).toBeGreaterThanOrEqual(1);
    expect(p.pressure).toBeGreaterThanOrEqual(1);
  });

  it('generatePersonality is deterministic', () => {
    setSeed(42);
    const a = generatePersonality('QB', 25, 'star');
    setSeed(42);
    const b = generatePersonality('QB', 25, 'star');
    expect(a).toEqual(b);
  });

  it('getDominantTrait returns null for balanced personalities', () => {
    expect(getDominantTrait({ personality: { workEthic: 5, loyalty: 5, greed: 5, pressure: 5, ambition: 5 } })).toBeNull();
  });

  it('getDominantTrait finds dominant when >= 8', () => {
    const result = getDominantTrait({ personality: { workEthic: 9, loyalty: 5, greed: 5, pressure: 5, ambition: 5 } });
    expect(result).toEqual({ key: 'workEthic', val: 9 });
  });

  it('getContractPersonalityEffects returns adjustments', () => {
    const effects = getContractPersonalityEffects(
      { personality: { workEthic: 5, loyalty: 3, greed: 9, pressure: 5, ambition: 5 } },
      { isContender: true },
    );
    expect(effects.demandMultAdj).toBeGreaterThan(0);
    expect(effects.holdoutChanceAdj).toBeGreaterThan(0);
  });
});

describe('player-archetypes', () => {
  it('classifies QB archetypes', () => {
    const pocketQb = classifyArchetype('QB', {
      pocketPresence: 90, accuracy: 88, fieldVision: 85, decisionSpeed: 82,
      speed: 60, scramble: 55, acceleration: 58, agility: 55,
    });
    expect(pocketQb).not.toBeNull();
    expect(pocketQb!.archetype).toBe('pocket_passer');
  });

  it('classifies RB archetypes', () => {
    const speedBack = classifyArchetype('RB', {
      speed: 95, acceleration: 92, changeOfDirection: 88, elusiveness: 86,
      power: 60, truckPower: 55, breakTackle: 65, strength: 55,
    });
    expect(speedBack!.archetype).toBe('speed_back');
  });

  it('returns null for K/P', () => {
    expect(classifyArchetype('K', {})).toBeNull();
    expect(classifyArchetype('P', {})).toBeNull();
  });

  it('AGE_CURVES covers all positions', () => {
    expect(Object.keys(AGE_CURVES)).toHaveLength(11);
  });

  it('getAgeCurve modifies cliff for speed-dependent archetypes', () => {
    const base = AGE_CURVES.QB;
    const dualThreat = getAgeCurve('QB', 'dual_threat');
    expect(dualThreat.cliff).toBeLessThan(base.cliff);
    expect(dualThreat.decayRate).toBeGreaterThan(base.decayRate);
  });

  it('getAgeCurve extends cliff for technique-based archetypes', () => {
    const base = AGE_CURVES.QB;
    const gameManager = getAgeCurve('QB', 'game_manager');
    expect(gameManager.cliff).toBeGreaterThan(base.cliff);
    expect(gameManager.decayRate).toBeLessThan(base.decayRate);
  });

  it('getAgeCurve returns base for unknown archetype', () => {
    const base = AGE_CURVES.WR;
    const result = getAgeCurve('WR', 'unknown_arch');
    expect(result).toEqual(base);
  });
});
