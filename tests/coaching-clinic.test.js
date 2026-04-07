import { describe, expect, it } from 'vitest';

import { CLINIC, CLINIC_MATH, CLINIC_TRACKS } from '../src/systems/coaching-clinic.js';

describe('coaching-clinic.js', () => {
  it('defines clinic tracks and perk ids', () => {
    expect(CLINIC_TRACKS).toHaveLength(5);
    const perkIds = CLINIC_TRACKS.flatMap((t) => t.perks.map((p) => p.id));
    expect(new Set(perkIds).size).toBe(perkIds.length);
  });

  it('earnXP routes actions to tracks and unlocks perks at thresholds', () => {
    const clinic = { xp: {}, perks: [] };
    CLINIC.earnXP(clinic, 'gameplan_change', 30);
    expect(CLINIC.getTrackXP(clinic, 'offense')).toBe(30);
    expect(CLINIC.hasPerk(clinic, 'off1')).toBe(true);

    CLINIC.earnXP(clinic, 'gameplan_change', 50);
    expect(CLINIC.getTrackXP(clinic, 'offense')).toBe(80);
    expect(CLINIC.hasPerk(clinic, 'off2')).toBe(true);
  });

  it('getMods and perk stat tracking reflect unlocked perks', () => {
    const clinic = { perks: ['off1', 'anl2', 'dev2'], perkStats: {} };
    const mods = CLINIC_MATH.getMods(clinic);
    expect(mods.scoringBoost).toBe(0.02);
    expect(mods.counterSuggest).toBe(true);
    expect(mods.padsInjReduction).toBe(0.1);

    CLINIC_MATH.logApply(clinic, 'off1');
    CLINIC_MATH.logApply(clinic, 'off1');
    expect(CLINIC_MATH.getApplyCount(clinic, 'off1')).toBe(2);
  });
});
