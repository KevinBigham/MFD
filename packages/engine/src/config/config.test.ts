import { describe, it, expect } from 'vitest';
import {
  POS_DEF, ALL_POSITIONS, OFF_POSITIONS, DEF_POSITIONS, SPEC_POSITIONS,
  RATING_LABELS,
} from './positions';
import { getSalaryCap, getCapFloor, getMinSalary, ROSTER_CAP } from './cap-math';
import { DIFF_SETTINGS, getDefaultDifficultyFlags, getDefaultHalftimeDecisionSetting } from './difficulty';
import { OFF_SCHEMES, DEF_SCHEMES, OFF_PLANS, DEF_PLANS, SCHEME_COUNTERS } from './schemes';
import { ARCHETYPES, COACH_TRAITS, ARCH_TRAIT_POOLS } from './coaching';

describe('positions', () => {
  it('defines 11 positions', () => {
    expect(ALL_POSITIONS).toHaveLength(11);
  });

  it('each position has exactly 20 ratings and 20 weights', () => {
    for (const pos of ALL_POSITIONS) {
      expect(POS_DEF[pos].r).toHaveLength(20);
      expect(POS_DEF[pos].w).toHaveLength(20);
    }
  });

  it('offense/defense/special partition is complete', () => {
    expect(OFF_POSITIONS.length + DEF_POSITIONS.length + SPEC_POSITIONS.length).toBe(11);
  });

  it('all rating names have labels', () => {
    for (const pos of ALL_POSITIONS) {
      for (const r of POS_DEF[pos].r) {
        expect(RATING_LABELS[r]).toBeDefined();
      }
    }
  });
});

describe('cap-math', () => {
  it('base cap is 255M in 2026', () => {
    expect(getSalaryCap(2026)).toBe(255);
  });

  it('cap grows by 5% annually', () => {
    expect(getSalaryCap(2027)).toBe(267);
    expect(getSalaryCap(2028)).toBe(281);
  });

  it('cap floor is 90% of cap', () => {
    expect(getCapFloor(2026)).toBe(229);
  });

  it('min salary tiers are correct', () => {
    expect(getMinSalary(0)).toBe(0.795);
    expect(getMinSalary(2)).toBe(1.125);
    expect(getMinSalary(5)).toBe(1.21);
  });

  it('roster cap is 53', () => {
    expect(ROSTER_CAP).toBe(53);
  });
});

describe('difficulty', () => {
  it('has 4 tiers', () => {
    expect(Object.keys(DIFF_SETTINGS)).toEqual(['rookie', 'pro', 'allpro', 'legend']);
  });

  it('pro is baseline 1.0 for key mods', () => {
    expect(DIFF_SETTINGS.pro.tradeMod).toBe(1.0);
    expect(DIFF_SETTINGS.pro.injMod).toBe(1.0);
    expect(DIFF_SETTINGS.pro.ownerMod).toBe(1.0);
  });

  it('legend is hardest', () => {
    expect(DIFF_SETTINGS.legend.tradeMod).toBeGreaterThan(DIFF_SETTINGS.allpro.tradeMod);
  });

  it('sets rookie-only default skip flags without changing save settings shape', () => {
    expect(getDefaultDifficultyFlags('rookie')).toEqual({
      skipHalftimeDecision: true,
    });
    for (const difficulty of ['pro', 'allpro', 'legend'] as const) {
      expect(getDefaultDifficultyFlags(difficulty)).toEqual({
        skipHalftimeDecision: false,
      });
    }
  });

  it('derives halftime decision defaults from difficulty flags', () => {
    expect(getDefaultHalftimeDecisionSetting('rookie')).toBe('off');
    expect(getDefaultHalftimeDecisionSetting('pro')).toBe('on');
    expect(getDefaultHalftimeDecisionSetting('allpro')).toBe('on');
    expect(getDefaultHalftimeDecisionSetting('legend')).toBe('on');
  });
});

describe('schemes', () => {
  it('has 8 offensive schemes', () => {
    expect(OFF_SCHEMES).toHaveLength(8);
  });

  it('has 5 defensive schemes', () => {
    expect(DEF_SCHEMES).toHaveLength(5);
  });

  it('has 6 offensive game plans', () => {
    expect(OFF_PLANS).toHaveLength(6);
  });

  it('has 6 defensive game plans', () => {
    expect(DEF_PLANS).toHaveLength(6);
  });

  it('scheme counter matrix has entries', () => {
    expect(Object.keys(SCHEME_COUNTERS).length).toBeGreaterThan(0);
  });
});

describe('coaching', () => {
  it('has 3 roles with archetypes', () => {
    expect(ARCHETYPES.HC).toHaveLength(3);
    expect(ARCHETYPES.OC).toHaveLength(3);
    expect(ARCHETYPES.DC).toHaveLength(3);
  });

  it('has 10 coach traits', () => {
    expect(Object.keys(COACH_TRAITS)).toHaveLength(10);
  });

  it('every archetype has a trait pool', () => {
    for (const role of Object.values(ARCHETYPES)) {
      for (const arch of role) {
        expect(ARCH_TRAIT_POOLS[arch]).toBeDefined();
        expect(ARCH_TRAIT_POOLS[arch]!.length).toBeGreaterThan(0);
      }
    }
  });
});
