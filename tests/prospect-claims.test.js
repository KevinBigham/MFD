import { describe, expect, it } from 'vitest';

import { PROSPECT_CLAIMS } from '../src/systems/prospect-claims.js';

describe('prospect-claims.js', () => {
  it('generate maps scout types and returns strongest claims first', () => {
    const prospect = {
      combine: { forty: 4.34 },
      ratings: { stamina: 86, toughness: 84, speed: 89, catching: 88, awareness: 86 },
      schemeFit: true,
    };

    const fromMeasurables = PROSPECT_CLAIMS.generate(prospect, 'measurables', 'WR');
    const fromFilmStudy = PROSPECT_CLAIMS.generate(prospect, 'film_study', 'WR');

    expect(fromMeasurables.length).toBeGreaterThan(0);
    expect(fromMeasurables.every((c) => c.source === 'combine')).toBe(true);
    expect(fromFilmStudy.every((c) => c.source === 'film')).toBe(true);
    expect(fromMeasurables[0].strength).toBeGreaterThanOrEqual(fromMeasurables[fromMeasurables.length - 1].strength);
  });

  it('verify returns INCOMPLETE for low snaps with fallback checks', () => {
    const claims = [
      { type: 'speed', strength: 2 },
      { type: 'hands', strength: 2 },
    ];
    const result = PROSPECT_CLAIMS.verify(
      claims,
      { pos: 'WR', ratings: { speed: 80, catching: 72 }, stats: {}, ovr: 72 },
      2
    );

    expect(result.status).toBe('INCOMPLETE');
    expect(result.incomplete).toEqual(expect.arrayContaining(['speed', 'hands']));
    expect(result.notes).toContain('ratings fallback');
  });

  it('verify returns VERIFIED when claims align with production', () => {
    const claims = [
      { type: 'speed', strength: 2 },
      { type: 'hands', strength: 2 },
      { type: 'iq', strength: 1 },
    ];
    const result = PROSPECT_CLAIMS.verify(
      claims,
      {
        pos: 'WR',
        ratings: { speed: 85, catching: 86, awareness: 80 },
        stats: { rec: 18, recTD: 3, recYds: 260, targets: 20 },
        ovr: 78,
      },
      10
    );

    expect(result.status).toBe('VERIFIED');
    expect(result.deltaConf).toBeGreaterThan(0);
    expect(result.hits.length).toBe(3);
  });

  it('verify returns MISREAD for fully missed claims', () => {
    const claims = [
      { type: 'speed', strength: 3 },
      { type: 'hands', strength: 2 },
    ];
    const result = PROSPECT_CLAIMS.verify(
      claims,
      {
        pos: 'WR',
        ratings: { speed: 60, catching: 58 },
        stats: { rec: 2, recTD: 0, recYds: 10, targets: 8 },
        ovr: 55,
      },
      12
    );

    expect(result.status).toBe('MISREAD');
    expect(result.deltaConf).toBeLessThan(0);
    expect(result.misses).toEqual(expect.arrayContaining(['speed', 'hands']));
  });
});
