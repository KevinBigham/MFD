import { beforeEach, describe, expect, it } from 'vitest';

import {
  TRAITS,
  TRAIT_MILESTONES95,
  assignTrait,
  assignTraits,
  checkTraitMilestones95,
  getPlayerTraits95,
  hasTrait95,
} from '../src/systems/traits.js';
import { setSeed } from '../src/utils/rng.js';

describe('traits.js', () => {
  beforeEach(() => {
    setSeed(2026);
  });

  it('normalizes player trait lists and checks presence', () => {
    const player = { traits95: ['clutch', 'none', 'clutch', 'mentor'] };
    expect(getPlayerTraits95(player)).toEqual(['clutch', 'mentor']);
    expect(hasTrait95(player, 'clutch')).toBe(true);
    expect(hasTrait95(player, 'glass')).toBe(false);
    expect(getPlayerTraits95({ trait: 'loyal' })).toEqual(['loyal']);
  });

  it('assignTrait and assignTraits return valid bounded trait sets', () => {
    const t = assignTrait();
    expect(TRAITS[t]).toBeTruthy();

    const bundle = assignTraits();
    expect(bundle.length).toBeGreaterThanOrEqual(1);
    expect(bundle.length).toBeLessThanOrEqual(3);
    expect(new Set(bundle).size).toBe(bundle.length);
    bundle.forEach((k) => expect(TRAITS[k]).toBeTruthy());
  });

  it('unlocks milestones and updates trait power levels once', () => {
    expect(TRAIT_MILESTONES95.clutch.milestones.length).toBeGreaterThan(0);

    const player = {
      traits95: ['clutch', 'workhorse'],
      careerStats: { seasons: 7, snaps: 4100 },
      traitMilestones95: {},
      traitPowerLevel95: {},
    };

    const hits = checkTraitMilestones95(player);
    expect(hits.length).toBeGreaterThanOrEqual(4);
    expect(player.traitPowerLevel95.clutch).toBe(2);
    expect(player.traitPowerLevel95.workhorse).toBe(2);

    const secondPass = checkTraitMilestones95(player);
    expect(secondPass).toEqual([]);
  });
});
