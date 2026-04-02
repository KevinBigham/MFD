import { describe, expect, it } from 'vitest';
import type { DraftProspect, Scout } from '../types';
import { makeLeagueState } from './test-helpers';
import {
  applyScoutAccuracy,
  fireScout,
  generateScoutPool,
  hireScout,
  runCombine,
} from './scouting-staff';

function makeProspect(id: string, pos: DraftProspect['pos'], trueGrade: number): DraftProspect {
  return {
    id,
    firstName: 'Scout',
    lastName: `Prospect${id}`,
    pos,
    college: 'Test State',
    ratings: { awareness: trueGrade, speed: trueGrade + 1, stamina: trueGrade - 1 },
    projectedRound: 1,
    scoutGrade: trueGrade - 5,
    trueGrade,
    personality: { workEthic: 7, loyalty: 5, greed: 4, pressure: 6, ambition: 7 },
    traits: [],
    archetype: null,
    characterArchetype: 'balanced',
    bustProbability: 0.12,
    stealProbability: 0.08,
    scoutingReports: [],
    combine: null,
  };
}

function makeScout(overrides: Partial<Scout>): Scout {
  return {
    id: overrides.id ?? 'scout-1',
    name: overrides.name ?? 'Test Scout',
    tier: overrides.tier ?? 'good',
    specialty: overrides.specialty ?? null,
    salary: overrides.salary ?? 1.4,
    accuracy: overrides.accuracy ?? 0.82,
  };
}

describe('scouting staff system', () => {
  it('keeps elite scout grades within +/-2 of the true grade', () => {
    const prospect = makeProspect('elite-prospect', 'WR', 89);
    const scout = makeScout({ tier: 'elite', specialty: 'WR', accuracy: 0.95 });

    const seen = Array.from({ length: 20 }, (_, index) =>
      applyScoutAccuracy(prospect, scout, () => ((index * 997) % 1000) / 1000));

    for (const grade of seen) {
      expect(Math.abs(grade - prospect.trueGrade)).toBeLessThanOrEqual(2);
    }
  });

  it('keeps poor scout grades within +/-8 of the true grade', () => {
    const prospect = makeProspect('poor-prospect', 'CB', 81);
    const scout = makeScout({ tier: 'poor', specialty: null, accuracy: 0.6 });

    const seen = Array.from({ length: 20 }, (_, index) =>
      applyScoutAccuracy(prospect, scout, () => ((index * 613) % 1000) / 1000));

    for (const grade of seen) {
      expect(Math.abs(grade - prospect.trueGrade)).toBeLessThanOrEqual(8);
    }
  });

  it('improves average accuracy when the scout specialty matches the prospect position', () => {
    const prospect = makeProspect('specialty-prospect', 'QB', 86);
    const specialist = makeScout({ id: 'specialist', tier: 'good', specialty: 'QB', accuracy: 0.85 });
    const generalist = makeScout({ id: 'generalist', tier: 'good', specialty: null, accuracy: 0.85 });

    const seeds = Array.from({ length: 24 }, (_, index) => ((index * 137) % 1000) / 1000);
    const specialistError = seeds.reduce((sum, seed) => sum + Math.abs(applyScoutAccuracy(prospect, specialist, () => seed) - prospect.trueGrade), 0);
    const generalistError = seeds.reduce((sum, seed) => sum + Math.abs(applyScoutAccuracy(prospect, generalist, () => seed) - prospect.trueGrade), 0);

    expect(specialistError).toBeLessThan(generalistError);
  });

  it('runs the combine deterministically and populates measurables on prospects', () => {
    const game = makeLeagueState('offseason', 1);
    game.draftClass = [
      makeProspect('p1', 'WR', 84),
      makeProspect('p2', 'RB', 80),
    ];

    runCombine(game, () => 0.42);
    const firstRun = game.draftClass.map((prospect) => prospect.combine);
    game.draftClass.forEach((prospect) => {
      prospect.combine = null;
    });
    runCombine(game, () => 0.42);

    expect(game.draftClass.every((prospect) => prospect.combine !== null)).toBe(true);
    expect(game.draftClass.map((prospect) => prospect.combine)).toEqual(firstRun);
  });

  it('deducts salary on hire and returns a partial refund on fire', () => {
    const game = makeLeagueState('offseason', 1);
    const scout = makeScout({ id: 'hire-me', salary: 1.8 });
    game.scoutingDepartment.availableScouts = [scout];

    const hired = hireScout(game, scout.id);
    expect(hired.nextState.scoutingDepartment.scouts).toHaveLength(1);
    expect(hired.nextState.scoutingDepartment.budget).toBeCloseTo(game.scoutingDepartment.budget - scout.salary, 5);

    const fired = fireScout(hired.nextState, scout.id);
    expect(fired.nextState.scoutingDepartment.scouts).toHaveLength(0);
    expect(fired.nextState.scoutingDepartment.budget).toBeCloseTo(
      game.scoutingDepartment.budget - scout.salary + scout.salary * 0.5,
      5,
    );
  });

  it('generates a valid scout pool', () => {
    const scouts = generateScoutPool(() => 0.37, 2027);

    expect(scouts.length).toBeGreaterThanOrEqual(8);
    expect(scouts.length).toBeLessThanOrEqual(12);
    expect(scouts.every((scout) => scout.salary > 0)).toBe(true);
    expect(scouts.every((scout) => scout.accuracy >= 0.6 && scout.accuracy <= 0.95)).toBe(true);
  });
});
