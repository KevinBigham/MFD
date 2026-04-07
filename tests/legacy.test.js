import { describe, expect, it } from 'vitest';

import { LEGACY } from '../src/systems/legacy.js';

describe('legacy.js', () => {
  it('buildStats aggregates historical team records and season flags', () => {
    const history = [
      {
        year: 2026,
        winnerId: 'me',
        madePlayoffs: true,
        teamRecords: [
          { id: 'me', wins: 12, losses: 5, madePlayoffs: true },
        ],
        legacyStats91: { draftHits: 2, capMastery: 1, devSuccesses: 3 },
      },
      {
        year: 2027,
        teamRecords: [
          { id: 'me', wins: 3, losses: 14, madePlayoffs: false },
        ],
        legacyStats91: { draftHits: 1, capMastery: 0, devSuccesses: 1 },
      },
    ];
    const teams = [{ id: 'me', wins: 5, losses: 2 }];

    const s = LEGACY.buildStats(history, 'me', teams, { year: 2027 });
    expect(s.years).toBe(2);
    expect(s.rings).toBe(1);
    expect(s.playoffs).toBe(1);
    expect(s.draftHits).toBe(3);
    expect(s.capMastery).toBe(1);
    expect(s.devSuccesses).toBe(4);
    expect(s.neverTanked).toBe(false);
  });

  it('calcScore clamps to 0-100 and returns tier + breakdown', () => {
    const result = LEGACY.calcScore({
      games: 200,
      wins: 140,
      losses: 60,
      rings: 4,
      playoffs: 8,
      draftHits: 6,
      capMastery: 5,
      devSuccesses: 9,
      neverTanked: true,
      fired: false,
      years: 10,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(typeof result.tier).toBe('string');
    expect(result.breakdown).toBeTruthy();
  });

  it('calcScore applies fired penalty and legacy floor', () => {
    const bad = LEGACY.calcScore({
      games: 10, wins: 1, losses: 9, rings: 0, playoffs: 0,
      draftHits: 0, capMastery: 0, devSuccesses: 0, neverTanked: false, fired: true, years: 1,
    });
    expect(bad.score).toBe(0);
    expect(bad.breakdown.firedPenalty).toBe(-15);
  });
});
