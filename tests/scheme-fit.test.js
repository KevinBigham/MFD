import { describe, expect, it } from 'vitest';

import {
  calcPlayerIdentityFit,
  calcSchemeFit,
  calcSpecialtyFitAdj,
  calcTeamFit,
  fitTierFromScore,
  getPlayerSide,
  getSchemeMismatchWarnings,
} from '../src/systems/scheme-fit.js';

describe('scheme-fit.js', () => {
  it('calcSchemeFit computes profile-based score and fallback neutral behavior', () => {
    const qb = {
      pos: 'QB',
      ovr: 80,
      ratings: { accuracy: 90, speed: 84, awareness: 88 },
    };
    const fit = calcSchemeFit(qb, 'spread');
    expect(fit.score).toBeGreaterThanOrEqual(1);
    expect(fit.score).toBeLessThanOrEqual(99);
    expect(['Perfect Fit', 'Good Fit', 'Ok Fit', 'Poor Fit']).toContain(fit.label);

    const neutral = calcSchemeFit({ pos: 'P', ovr: 73 }, 'spread');
    expect(neutral.label).toBe('Neutral');
    expect(neutral.score).toBe(73);
  });

  it('fit tier and side helpers map values correctly', () => {
    expect(fitTierFromScore(92)).toBe('ELITE');
    expect(fitTierFromScore(81)).toBe('STRONG');
    expect(fitTierFromScore(69)).toBe('SOLID');
    expect(fitTierFromScore(40)).toBe('POOR');

    expect(getPlayerSide('QB')).toBe('off');
    expect(getPlayerSide('CB')).toBe('def');
    expect(getPlayerSide('K')).toBe('other');
  });

  it('calcSpecialtyFitAdj applies coordinator specialty boosts by side/position', () => {
    const offTeam = { staff: { oc: { specialty75: { id: 'pass_arch', label: 'Pass Architect' } } } };
    const defTeam = { staff: { dc: { specialty75: { id: 'blitz_des', label: 'Blitz Designer' } } } };

    expect(calcSpecialtyFitAdj(offTeam, { pos: 'QB', ratings: {} }, 'off')).toBeGreaterThanOrEqual(4);
    expect(calcSpecialtyFitAdj(defTeam, { pos: 'DL', ratings: {} }, 'def')).toBeGreaterThanOrEqual(4);
    expect(calcSpecialtyFitAdj(offTeam, { pos: 'K', ratings: {} }, 'off')).toBe(0);
  });

  it('calcPlayerIdentityFit and team aggregators return consistent structures', () => {
    const team = {
      id: 'me',
      schemeOff: 'west_coast',
      schemeDef: '4-3',
      staff: {
        oc: { specialty75: { id: 'pass_arch', label: 'Pass Architect' } },
        dc: { specialty75: { id: 'cov_spec', label: 'Coverage Specialist' } },
      },
      roster: [
        {
          id: 'qb1', name: 'QB One', pos: 'QB', isStarter: true, ovr: 82, systemFit: 60,
          ratings: { accuracy: 88, awareness: 84, arm: 80 }, personality: { workEthic: 8, greed: 4, loyalty: 6, ambition: 7 },
        },
        {
          id: 'cb1', name: 'CB One', pos: 'CB', isStarter: true, ovr: 79, systemFit: 58,
          ratings: { coverage: 83, speed: 84, ballSkills: 80 }, personality: { workEthic: 6, greed: 5, loyalty: 5, ambition: 5 },
        },
      ],
    };

    const pFit = calcPlayerIdentityFit(team.roster[0], team);
    expect(pFit.score).toBeGreaterThanOrEqual(20);
    expect(pFit.score).toBeLessThanOrEqual(99);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(pFit.letter);

    const tf = calcTeamFit(team);
    expect(tf.total).toBeGreaterThan(0);
    expect(Object.keys(tf.fits)).toEqual(expect.arrayContaining(['A', 'B', 'C', 'D', 'F']));

    const warnings = getSchemeMismatchWarnings({
      ...team,
      roster: [
        ...team.roster,
        { id: 'rb1', name: 'RB Low Fit', pos: 'RB', isStarter: true, ovr: 55, ratings: { catching: 40, elusiveness: 40, speed: 40 } },
      ],
    });
    expect(Array.isArray(warnings)).toBe(true);
  });
});
