import { beforeEach, describe, expect, it } from 'vitest';

import {
  chemistryMod,
  resetSystemFit,
  systemFitMod,
  updateSystemFit,
} from '../src/systems/chemistry.js';
import { setSeed } from '../src/utils/rng.js';

describe('chemistry.js', () => {
  beforeEach(() => {
    setSeed(2026);
  });

  it('chemistryMod returns expected tiered modifiers', () => {
    expect(chemistryMod({ roster: [] })).toBe(0);
    expect(chemistryMod({ roster: [{ chemistry: 85 }, { chemistry: 80 }] })).toBe(3);
    expect(chemistryMod({ roster: [{ chemistry: 72 }, { chemistry: 70 }] })).toBe(1.5);
    expect(chemistryMod({ roster: [{ chemistry: 60 }, { chemistry: 55 }] })).toBe(0);
    expect(chemistryMod({ roster: [{ chemistry: 45 }, { chemistry: 40 }] })).toBe(-1);
    expect(chemistryMod({ roster: [{ chemistry: 30 }, { chemistry: 35 }] })).toBe(-2);
  });

  it('systemFitMod returns expected tiered modifiers', () => {
    expect(systemFitMod({ roster: [] })).toBe(0);
    expect(systemFitMod({ roster: [{ systemFit: 80 }, { systemFit: 75 }] })).toBe(0.02);
    expect(systemFitMod({ roster: [{ systemFit: 60 }, { systemFit: 55 }] })).toBe(0.01);
    expect(systemFitMod({ roster: [{ systemFit: 40 }, { systemFit: 35 }] })).toBe(0);
    expect(systemFitMod({ roster: [{ systemFit: 20 }, { systemFit: 30 }] })).toBe(-0.01);
  });

  it('updateSystemFit safely handles missing roster', () => {
    expect(() => updateSystemFit({})).not.toThrow();
  });

  it('updateSystemFit increases fit within [0,100] and applies growth rules', () => {
    const team = {
      staff: { hc: { ratings: { strategy: 80 } } },
      roster: [
        {
          pos: 'QB',
          isStarter: true,
          holdout75: false,
          systemFit: 50,
          personality: { workEthic: 9, loyalty: 5, greed: 4, pressure: 5, ambition: 9 },
        },
      ],
    };

    updateSystemFit(team);
    expect(team.roster[0].systemFit).toBeGreaterThan(50);
    expect(team.roster[0].systemFit).toBeLessThanOrEqual(100);
  });

  it('resetSystemFit reduces fit and respects keep-rate clamps', () => {
    const team = {
      id: 'BUF',
      roster: [
        {
          systemFit: 80,
          holdout75: false,
          personality: { workEthic: 9, loyalty: 9, greed: 2, pressure: 5, ambition: 5 },
        },
        {
          systemFit: 80,
          holdout75: true,
          personality: { workEthic: 3, loyalty: 3, greed: 9, pressure: 5, ambition: 5 },
        },
      ],
    };

    resetSystemFit(team, 0.4);
    expect(team.roster[0].systemFit).toBeGreaterThan(team.roster[1].systemFit);
    expect(team.roster[0].systemFit).toBeLessThanOrEqual(80);
    expect(team.roster[1].systemFit).toBeGreaterThanOrEqual(16); // 20% floor of 80
  });
});
