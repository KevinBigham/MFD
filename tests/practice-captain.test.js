import { describe, expect, it } from 'vitest';

import { CAPTAIN_MOMENT_TYPES, CAPTAIN_RULES, PRACTICE_FOCUS } from '../src/systems/practice-captain.js';

describe('practice-captain.js', () => {
  it('defines practice focus entries with complete fx payloads', () => {
    expect(PRACTICE_FOCUS).toHaveLength(4);
    PRACTICE_FOCUS.forEach((f) => {
      expect(typeof f.id).toBe('string');
      expect(typeof f.fx.dev).toBe('number');
      expect(typeof f.fx.injuryRisk).toBe('number');
      expect(typeof f.fx.system).toBe('number');
      expect(typeof f.fx.morale).toBe('number');
    });
  });

  it('captain rules and moment types expose expected structure', () => {
    expect(CAPTAIN_RULES.eligibleMinOvr).toBe(70);
    expect(CAPTAIN_RULES.triggersPerSeason).toBe(3);
    expect(CAPTAIN_MOMENT_TYPES).toHaveLength(3);
    expect(CAPTAIN_MOMENT_TYPES.map((m) => m.id)).toEqual(
      expect.arrayContaining(['calm_drive', 'big_stop', 'clutch_convert'])
    );
  });

  it('captain moment fx keys align with their described gameplay impact', () => {
    const calm = CAPTAIN_MOMENT_TYPES.find((m) => m.id === 'calm_drive');
    const stop = CAPTAIN_MOMENT_TYPES.find((m) => m.id === 'big_stop');
    const clutch = CAPTAIN_MOMENT_TYPES.find((m) => m.id === 'clutch_convert');

    expect(calm.fx.intReduction).toBeGreaterThan(0);
    expect(stop.fx.pressureBoost).toBeGreaterThan(0);
    expect(clutch.fx.scoringBoost).toBeGreaterThan(0);
  });
});
