import { describe, expect, it } from 'vitest';

import type { ClinicState } from '../types';
import { CLINIC_TRACKS, earnXP, getClinicMods, getTrackXP, hasPerk } from './coaching-clinic';

describe('coaching-clinic', () => {
  it('defines the five clinic tracks and their two-tier perk thresholds', () => {
    expect(CLINIC_TRACKS.map((track) => track.id)).toEqual([
      'offense',
      'defense',
      'analytics',
      'leadership',
      'development',
    ]);

    expect(CLINIC_TRACKS.map((track) => track.perks.map((perk) => [perk.id, perk.xpReq]))).toEqual([
      [['off1', 30], ['off2', 80]],
      [['def1', 30], ['def2', 80]],
      [['anl1', 30], ['anl2', 80]],
      [['ldr1', 30], ['ldr2', 80]],
      [['dev1', 30], ['dev2', 80]],
    ]);

    const perkIds = CLINIC_TRACKS.flatMap((track) => track.perks.map((perk) => perk.id));
    expect(new Set(perkIds).size).toBe(perkIds.length);
  });

  it.each([
    ['offense', 'offense'],
    ['defense', 'defense'],
    ['analytics', 'analytics'],
    ['leadership', 'leadership'],
    ['development', 'development'],
    ['gameplan_change', 'offense'],
    ['halftime_pick', 'offense'],
    ['def_plan_change', 'defense'],
    ['scout_practice', 'analytics'],
    ['dossier_scout', 'analytics'],
    ['prospect_scout', 'analytics'],
    ['press_answer', 'leadership'],
    ['captain_moment', 'leadership'],
    ['dev_camp', 'development'],
    ['recovery', 'development'],
    ['full_pads', 'development'],
  ])('maps %s clinic XP to the %s track', (action, trackId) => {
    const clinic: ClinicState = { xp: {}, perks: [] };
    const result = earnXP(clinic, action);

    expect(result).not.toBe(clinic);
    expect(result.xp).toEqual({ [trackId]: 5 });
    expect(result.perks).toEqual([]);
    expect(clinic).toEqual({ xp: {}, perks: [] });
  });

  it('ignores unknown actions by returning the original clinic object', () => {
    const clinic: ClinicState = { xp: { offense: 20 }, perks: ['off1'] };

    expect(earnXP(clinic, 'unknown_action')).toBe(clinic);
  });

  it('unlocks perks at thresholds without duplicating already unlocked perks', () => {
    const nearFirstUnlock: ClinicState = { xp: { offense: 25 }, perks: [] };
    const firstUnlock = earnXP(nearFirstUnlock, 'gameplan_change');

    expect(firstUnlock.xp.offense).toBe(30);
    expect(firstUnlock.perks).toEqual(['off1']);

    const secondUnlock = earnXP(firstUnlock, 'halftime_pick', 50);
    expect(secondUnlock.xp.offense).toBe(80);
    expect(secondUnlock.perks).toEqual(['off1', 'off2']);

    const repeated = earnXP(secondUnlock, 'gameplan_change', 5);
    expect(repeated.xp.offense).toBe(85);
    expect(repeated.perks).toEqual(['off1', 'off2']);
  });

  it('reads perk and XP state through small query helpers', () => {
    const clinic: ClinicState = { xp: { leadership: 32 }, perks: ['ldr1'] };

    expect(hasPerk(clinic, 'ldr1')).toBe(true);
    expect(hasPerk(clinic, 'ldr2')).toBe(false);
    expect(getTrackXP(clinic, 'leadership')).toBe(32);
    expect(getTrackXP(clinic, 'development')).toBe(0);
  });

  it('returns neutral modifiers for empty or malformed perk state', () => {
    expect(getClinicMods({ xp: {}, perks: [] })).toEqual({
      scoringBoost: 0,
      halftimeBoost: 0,
      sackBoost: 0,
      clutchDefBoost: 0,
      scoutConfBonus: 0,
      counterSuggest: false,
      credBonus: 0,
      captainMoraleBonus: 0,
      devBoost: 0,
      padsInjReduction: 0,
    });

    expect(getClinicMods({ xp: {} } as ClinicState)).toEqual(getClinicMods({ xp: {}, perks: [] }));
  });

  it('aggregates active perk modifiers consumed by prep and coach development', () => {
    const allPerks = CLINIC_TRACKS.flatMap((track) => track.perks.map((perk) => perk.id));

    expect(getClinicMods({ xp: {}, perks: allPerks })).toEqual({
      scoringBoost: 0.02,
      halftimeBoost: 0.03,
      sackBoost: 0.02,
      clutchDefBoost: 0.03,
      scoutConfBonus: 3,
      counterSuggest: true,
      credBonus: 1,
      captainMoraleBonus: 1,
      devBoost: 0.15,
      padsInjReduction: 0.10,
    });
  });

  it('ignores unknown perk ids when building modifiers', () => {
    expect(getClinicMods({ xp: {}, perks: ['dev1', 'future_perk'] })).toMatchObject({
      devBoost: 0.15,
      scoringBoost: 0,
      counterSuggest: false,
    });
  });
});
