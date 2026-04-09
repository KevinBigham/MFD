import { describe, expect, it } from 'vitest';
import { setSeed } from '../rng';
import type { TraitId } from '../types';
import {
  assignTrait,
  assignTraits,
  checkTraitMilestones,
  getPlayerTraits,
  hasTrait,
  TRAITS,
  TRAIT_FX,
  TRAIT_MILESTONES,
} from './traits';

describe('traits direct coverage', () => {
  it('defines twenty-four traits plus the empty placeholder entry', () => {
    expect(Object.keys(TRAITS)).toHaveLength(25);
    expect(TRAITS.none.name).toBe('');
  });

  it('keeps gameplay effect data for key trait ids', () => {
    expect(TRAIT_FX.captain.morale).toBe(3);
    expect(TRAIT_FX.ironman.injury).toBe(-4);
    expect(TRAIT_FX.clutch.clutch).toBe(5);
  });

  it('tracks milestone ladders for marquee progression traits', () => {
    expect(TRAIT_MILESTONES.clutch.milestones).toHaveLength(2);
    expect(TRAIT_MILESTONES.workhorse.milestones[0]?.thresh).toBe(1500);
    expect(TRAIT_MILESTONES.ironman.milestones[1]?.powerLevel).toBe(2);
  });

  it('filters invalid and placeholder traits from player arrays', () => {
    const traits = getPlayerTraits({ traits: ['captain', 'none' as TraitId, 'ghost' as TraitId] });

    expect(traits).toEqual(['captain']);
  });

  it('checks for trait presence against normalized arrays', () => {
    expect(hasTrait({ traits: ['clutch', 'captain'] }, 'clutch')).toBe(true);
    expect(hasTrait({ traits: ['captain'] }, 'ironman')).toBe(false);
    expect(hasTrait(null, 'captain')).toBe(false);
  });

  it('assignTrait is deterministic for a fixed seed', () => {
    setSeed(17);
    const first = assignTrait();
    setSeed(17);
    const second = assignTrait();

    expect(first).toBe(second);
    expect(first in TRAITS).toBe(true);
  });

  it('assignTraits returns one to three unique traits for a fixed seed', () => {
    setSeed(29);
    const traits = assignTraits();

    expect(traits.length).toBeGreaterThanOrEqual(1);
    expect(traits.length).toBeLessThanOrEqual(3);
    expect(new Set(traits).size).toBe(traits.length);
  });

  it('returns no milestone hits when career stats are missing', () => {
    expect(checkTraitMilestones({ traits: ['captain'] })).toEqual([]);
  });

  it('records new milestone hits and raises trait power level', () => {
    const player = {
      traits: ['clutch', 'workhorse'] as TraitId[],
      careerStats: { seasons: 7, snaps: 4200 },
      traitMilestones: {},
      traitPowerLevel: {},
    };

    const hits = checkTraitMilestones(player);

    expect(hits.map((hit) => hit.milestoneKey)).toEqual([
      'clutch_1',
      'clutch_2',
      'workhorse_1',
      'workhorse_2',
    ]);
    expect(player.traitPowerLevel.clutch).toBe(2);
    expect(player.traitPowerLevel.workhorse).toBe(2);
  });

  it('does not emit already-recorded milestone hits twice', () => {
    const player = {
      traits: ['captain'] as TraitId[],
      careerStats: { seasons: 6 },
      traitMilestones: { captain_1: true },
      traitPowerLevel: { captain: 1 },
    };

    const hits = checkTraitMilestones(player);

    expect(hits.map((hit) => hit.milestoneKey)).toEqual(['captain_2']);
    expect(player.traitPowerLevel.captain).toBe(2);
  });
});
