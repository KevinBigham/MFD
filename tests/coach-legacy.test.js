import { describe, expect, it } from 'vitest';

import { COACH_LEGACY_LOG, getCoachLegacyTop, recordCoachRing, updateCoachLegacy } from '../src/systems/coach-legacy.js';

describe('coach-legacy.js', () => {
  it('updateCoachLegacy accumulates coach records and best season', () => {
    const startA = COACH_LEGACY_LOG['Coach Alpha'] ? COACH_LEGACY_LOG['Coach Alpha'].seasons : 0;
    const teams = [
      { id: 'a', abbr: 'PHI', wins: 12, losses: 5, coaches: { HC: { name: 'Coach Alpha' } } },
      { id: 'b', abbr: 'DAL', wins: 9, losses: 8, coaches: { HC: { name: 'Coach Beta' } } },
    ];

    updateCoachLegacy(teams, { year: 2028 });
    updateCoachLegacy([{ id: 'a', abbr: 'PHI', wins: 13, losses: 4, coaches: { HC: { name: 'Coach Alpha' } } }], { year: 2029 });

    expect(COACH_LEGACY_LOG['Coach Alpha'].seasons).toBe(startA + 2);
    expect(COACH_LEGACY_LOG['Coach Alpha'].totalWins).toBeGreaterThanOrEqual(25);
    expect(COACH_LEGACY_LOG['Coach Alpha'].bestSeason.year).toBe(2029);
  });

  it('recordCoachRing increments ring count for champion coach', () => {
    const before = (COACH_LEGACY_LOG['Coach Alpha'] && COACH_LEGACY_LOG['Coach Alpha'].rings) || 0;
    recordCoachRing(
      [{ id: 'a', abbr: 'PHI', coaches: { HC: { name: 'Coach Alpha' } } }],
      'a'
    );
    expect(COACH_LEGACY_LOG['Coach Alpha'].rings).toBe(before + 1);
  });

  it('getCoachLegacyTop returns sorted entries', () => {
    const top = getCoachLegacyTop(5);
    expect(top.length).toBeGreaterThan(0);
    if (top.length > 1) {
      expect(top[0].totalWins).toBeGreaterThanOrEqual(top[1].totalWins);
    }
  });
});
