import { describe, expect, it } from 'vitest';
import {
  applyWeeklyRecovery,
  calculateGameFatigue,
  getFatigueModifier,
  getInjuryRiskMultiplier,
} from './fatigue';
import { makePlayer } from './test-helpers';

describe('fatigue', () => {
  it('starters gain more fatigue than backups', () => {
    const player = makePlayer('p1', 't1', 'WR', 80);

    expect(calculateGameFatigue(player, true, 1)).toBeGreaterThan(calculateGameFatigue(player, false, 1));
  });

  it('RBs gain more fatigue than OL', () => {
    const rb = makePlayer('rb', 't1', 'RB', 82);
    const ol = makePlayer('ol', 't1', 'OL', 82);

    expect(calculateGameFatigue(rb, true, 1)).toBeGreaterThan(calculateGameFatigue(ol, true, 1));
  });

  it('rest training focus recovers more fatigue', () => {
    const rest = applyWeeklyRecovery({ fatigue: 70, conditioningBonus: 0, restWeeks: 0 }, 'rest', 26, 1);
    const film = applyWeeklyRecovery({ fatigue: 70, conditioningBonus: 0, restWeeks: 0 }, 'film_study', 26, 1);

    expect(rest.fatigue).toBeLessThan(film.fatigue);
  });

  it('fatigue above 60 applies an OVR penalty', () => {
    expect(getFatigueModifier(65)).toBe(-3);
  });

  it('fatigue above 80 increases injury risk', () => {
    expect(getInjuryRiskMultiplier(85)).toBe(1.5);
  });

  it('older players recover slower', () => {
    const veteran = applyWeeklyRecovery({ fatigue: 70, conditioningBonus: 0, restWeeks: 0 }, 'film_study', 32, 1);
    const young = applyWeeklyRecovery({ fatigue: 70, conditioningBonus: 0, restWeeks: 0 }, 'film_study', 24, 1);

    expect(veteran.fatigue).toBeGreaterThan(young.fatigue);
  });
});
