/**
 * Sprint 45 "The Family Tree" — coach-trait-mods wired into game-sim.
 *
 * Before this sprint `getCoachTraitMods` was exported but had zero callers.
 * These tests prove:
 *   1. The aggregation is deterministic (same staff → identical mods).
 *   2. Hard caps from CAPS in coach-trait-mods.ts still clamp stacked traits.
 *   3. Traits aggregate across HC + OC + DC slots.
 *   4. Empty staff yields an all-zero mod set.
 *   5. Wiring into `simGame` actually moves the needle on sim outputs —
 *      a team with pocketBoost + qbBoost outperforms a baseline team
 *      across a statistically meaningful number of games at the same seed.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getCoachTraitMods } from './coach-trait-mods';
import { simGame } from './game-sim';
import { makeTeam } from './test-helpers';
import { setSeed } from '../rng';
import type { StaffMember, Team } from '../types';

function makeStaff(id: string, role: StaffMember['role'], traits: string[]): StaffMember {
  return {
    id,
    name: `${role} ${id}`,
    role,
    archetype: 'Strategist',
    traits,
    ratings: { leadership: 70 },
    level: 1,
  };
}

function teamWithStaff(baseId: string, ratingBase: number, staff: Team['staff']): Team {
  const team = makeTeam(baseId, 'AFC', 'East', false, ratingBase);
  return { ...team, staff };
}

beforeEach(() => {
  setSeed(42);
});

describe('getCoachTraitMods determinism', () => {
  it('returns identical mods for the same team across repeated calls', () => {
    const team = teamWithStaff('t1', 75, {
      hc: makeStaff('hc1', 'HC', ['AGGRESSIVE_4TH']),
      oc: makeStaff('oc1', 'OC', ['QB_WHISPERER']),
      dc: null,
    });
    const a = getCoachTraitMods(team);
    const b = getCoachTraitMods(team);
    expect(a).toEqual(b);
  });

  it('returns all-zero mods when no staff is assigned', () => {
    const team = makeTeam('empty', 'AFC', 'East', false, 70);
    const mods = getCoachTraitMods(team);
    expect(mods.pocketBoost).toBe(0);
    expect(mods.qbBoost).toBe(0);
    expect(mods.stallReduction).toBe(0);
    expect(mods.pressureBoost).toBe(0);
  });
});

describe('getCoachTraitMods aggregation and caps', () => {
  it('aggregates effects across HC + OC + DC', () => {
    const team = teamWithStaff('t1', 75, {
      // Stall reduction: AGGRESSIVE_4TH(0.03) + DISCIPLINE(0.02) + FILM_JUNKIE(0.02) = 0.07
      // (landing exactly on the cap, which proves both aggregation and clamp math).
      hc: makeStaff('hc', 'HC', ['AGGRESSIVE_4TH']),
      oc: makeStaff('oc', 'OC', ['DISCIPLINE']),
      dc: makeStaff('dc', 'DC', ['FILM_JUNKIE']),
    });
    const mods = getCoachTraitMods(team);
    // stallReduction cap is 0.07 in coach-trait-mods.ts — sum equals cap
    expect(mods.stallReduction).toBeCloseTo(0.07, 5);
    // bigPlayBoost has no cap in CAPS, so the raw contribution from AGGRESSIVE_4TH shows through
    expect(mods.bigPlayBoost).toBeCloseTo(0.02, 5);
  });

  it('clamps stacked pocketBoost contributions to the cap of 0.08', () => {
    // PASS_PRO_TECH gives pocketBoost: 0.04. Stacking all three slots would
    // otherwise total 0.12; the CAPS entry limits it to 0.08.
    const team = teamWithStaff('t1', 75, {
      hc: makeStaff('hc', 'HC', ['PASS_PRO_TECH']),
      oc: makeStaff('oc', 'OC', ['PASS_PRO_TECH']),
      dc: makeStaff('dc', 'DC', ['PASS_PRO_TECH']),
    });
    const mods = getCoachTraitMods(team);
    expect(mods.pocketBoost).toBeLessThanOrEqual(0.08 + 1e-9);
    expect(mods.pocketBoost).toBeCloseTo(0.08, 5);
  });

  it('clamps qbBoost to the cap of 6 when multiple QB_WHISPERER traits stack', () => {
    const team = teamWithStaff('t1', 75, {
      hc: makeStaff('hc', 'HC', ['QB_WHISPERER']),
      oc: makeStaff('oc', 'OC', ['QB_WHISPERER']),
      dc: makeStaff('dc', 'DC', ['QB_WHISPERER']),
    });
    const mods = getCoachTraitMods(team);
    // qbBoost cap = 6; raw stack = 9
    expect(mods.qbBoost).toBeLessThanOrEqual(6);
    expect(mods.qbBoost).toBe(6);
  });
});

describe('simGame wiring — coach traits move sim outcomes', () => {
  it('a team with stacked trait coaches outperforms the baseline team across 200 same-seed sims', () => {
    // Two otherwise-identical 75-rating teams; `loaded` stacks multiple
    // traits to the cap (qbBoost=6, pocketBoost=0.08, stallReduction=0.07)
    // so the signal is well above game-to-game variance. If wiring is
    // live, loaded should outscore comfortably; if dead, the scores
    // should be roughly symmetric (home-field advantage notwithstanding).
    const loaded = teamWithStaff('loaded', 75, {
      hc: makeStaff('hc', 'HC', ['PASS_PRO_TECH', 'QB_WHISPERER']),
      oc: makeStaff('oc', 'OC', ['PASS_PRO_TECH', 'QB_WHISPERER', 'AGGRESSIVE_4TH']),
      dc: makeStaff('dc', 'DC', ['PASS_PRO_TECH', 'QB_WHISPERER', 'FILM_JUNKIE', 'DISCIPLINE']),
    });
    const baseline = teamWithStaff('baseline', 75, { hc: null, oc: null, dc: null });

    let loadedPoints = 0;
    let baselinePoints = 0;
    let loadedWins = 0;
    let baselineWins = 0;

    // Alternate home/away to neutralize home-field advantage in the aggregate.
    setSeed(1234);
    for (let i = 0; i < 200; i++) {
      const res = i % 2 === 0 ? simGame(loaded, baseline) : simGame(baseline, loaded);
      if (i % 2 === 0) {
        loadedPoints += res.homeScore;
        baselinePoints += res.awayScore;
        if (res.homeScore > res.awayScore) loadedWins += 1;
        else if (res.awayScore > res.homeScore) baselineWins += 1;
      } else {
        loadedPoints += res.awayScore;
        baselinePoints += res.homeScore;
        if (res.awayScore > res.homeScore) loadedWins += 1;
        else if (res.homeScore > res.awayScore) baselineWins += 1;
      }
    }

    // With capped qbBoost=6 and capped pocketBoost=0.08 and stallReduction=0.07,
    // loaded should outscore baseline clearly over 200 games.
    expect(loadedPoints).toBeGreaterThan(baselinePoints);
    expect(loadedWins).toBeGreaterThan(baselineWins);
  });
});
