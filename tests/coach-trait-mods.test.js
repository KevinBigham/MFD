import { describe, expect, it } from 'vitest';

import { getCoachTraitMods } from '../src/systems/coach-trait-mods.js';

describe('coach-trait-mods.js', () => {
  it('returns zeroed modifiers when staff is missing', () => {
    const mods = getCoachTraitMods({});
    expect(mods.stallReduction).toBe(0);
    expect(mods.devRate).toBe(0);
    expect(mods.moraleBoost).toBe(0);
  });

  it('aggregates and caps stacked trait effects across staff', () => {
    const team = {
      staff: {
        hc: { traits: ['PLAYER_COACH', 'DEV_FACTORY', 'QB_WHISPERER', 'PASS_PRO_TECH', 'BALL_HAWKS'] },
        oc: { traits: ['PLAYER_COACH', 'DEV_FACTORY', 'QB_WHISPERER', 'PASS_PRO_TECH', 'BALL_HAWKS'] },
        dc: { traits: ['PLAYER_COACH', 'DEV_FACTORY', 'QB_WHISPERER', 'PASS_PRO_TECH', 'BALL_HAWKS'] },
      },
    };

    const mods = getCoachTraitMods(team);
    expect(mods.moraleBoost).toBe(8);
    expect(mods.devRate).toBe(0.25);
    expect(mods.qbBoost).toBe(6);
    expect(mods.pocketBoost).toBe(0.08);
    expect(mods.intBoost).toBe(0.03);
  });
});
