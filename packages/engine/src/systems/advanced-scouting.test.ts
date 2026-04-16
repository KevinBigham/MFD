import { describe, expect, it } from 'vitest';
import type { DraftProspect, Scout } from '../types';
import {
  assignProspectRegion,
  buildInitialScoutingState,
  deriveCharacterRead,
  deriveRiskBand,
  deriveCeilingBand,
  resolvePrivateWorkout,
  toggleScoutingWatchlist,
} from './advanced-scouting';

function makeProspect(overrides: Partial<DraftProspect> = {}): DraftProspect {
  return {
    id: overrides.id ?? 'prospect-1',
    firstName: overrides.firstName ?? 'Test',
    lastName: overrides.lastName ?? 'Prospect',
    pos: overrides.pos ?? 'WR',
    college: overrides.college ?? 'Texas',
    ratings: overrides.ratings ?? { awareness: 78, speed: 88, stamina: 82, routeRunning: 91, release: 89, catching: 86 },
    projectedRound: overrides.projectedRound ?? 1,
    scoutGrade: overrides.scoutGrade ?? 80,
    trueGrade: overrides.trueGrade ?? 86,
    personality: overrides.personality ?? { workEthic: 8, loyalty: 6, greed: 4, pressure: 6, ambition: 8 },
    traits: overrides.traits ?? ['captain'],
    archetype: overrides.archetype ?? null,
    characterArchetype: overrides.characterArchetype ?? 'balanced',
    bustProbability: overrides.bustProbability ?? 0.11,
    stealProbability: overrides.stealProbability ?? 0.14,
    scoutingReports: overrides.scoutingReports ?? [],
    combine: overrides.combine ?? null,
    bloodline: overrides.bloodline ?? null,
  } as DraftProspect;
}

function makeScout(overrides: Partial<Scout> = {}): Scout {
  return {
    id: overrides.id ?? 'scout-1',
    name: overrides.name ?? 'Avery Mason',
    tier: overrides.tier ?? 'good',
    specialty: overrides.specialty ?? 'WR',
    salary: overrides.salary ?? 1.5,
    accuracy: overrides.accuracy ?? 0.87,
  } as Scout;
}

describe('advanced scouting', () => {
  it('assigns mapped and fallback prospect regions deterministically', () => {
    expect(assignProspectRegion('Texas')).toBe('south');
    expect(assignProspectRegion('Unknown Tech')).toBe(assignProspectRegion('Unknown Tech'));
  });

  it('builds initial scouting state with confidence and unknown intel bands', () => {
    const prospect = makeProspect();
    const scout = makeScout();

    const state = buildInitialScoutingState(prospect, scout);

    expect(state).toMatchObject({
      prospectId: prospect.id,
      assignedScoutId: scout.id,
      riskBand: 'unknown',
      ceilingBand: 'unknown',
      characterRead: 'unknown',
      privateWorkoutRatings: [],
    });
    expect(state.confidence).toBeGreaterThan(0);
  });

  it('adds a small initial confidence bonus for bloodline prospects without changing grades', () => {
    const scout = makeScout();
    const regular = makeProspect({ id: 'regular' });
    const bloodline = makeProspect({
      id: 'bloodline',
      bloodline: {
        parentPlayerId: 'legend-wr',
        parentName: 'Marcus North',
        parentTeamId: 'afce1',
        parentPosition: 'WR',
        relationship: 'son',
        legacyTag: 'famous_name',
      },
    });

    const regularState = buildInitialScoutingState(regular, scout);
    const bloodlineState = buildInitialScoutingState(bloodline, scout);

    expect(bloodlineState.confidence - regularState.confidence).toBe(3);
    expect(bloodlineState.visibleScoutGrade).toBe(regularState.visibleScoutGrade);
  });

  it('derives character intel from personality and traits', () => {
    expect(deriveCharacterRead(makeProspect({ traits: ['captain'], personality: { workEthic: 9, loyalty: 8, greed: 3, pressure: 7, ambition: 8 } }))).toBe('leader');
    expect(deriveCharacterRead(makeProspect({ traits: ['ego'], personality: { workEthic: 4, loyalty: 3, greed: 8, pressure: 8, ambition: 9 } }))).toBe('red_flag');
  });

  it('gates risk and ceiling bands until enough intel is collected', () => {
    const prospect = makeProspect({ trueGrade: 90, bustProbability: 0.08, stealProbability: 0.18 });

    expect(deriveRiskBand(prospect, 40, false, false)).toBe('unknown');
    expect(deriveRiskBand(prospect, 56, false, false)).toBe('safe');
    expect(deriveCeilingBand(prospect, 40, false)).toBe('unknown');
    expect(deriveCeilingBand(prospect, 56, false)).toBe('star');
  });

  it('reveals the top two workout ratings and consumes one workout slot', () => {
    const prospect = makeProspect();
    const state = buildInitialScoutingState(prospect, makeScout());

    const result = resolvePrivateWorkout(prospect, state, 3);

    expect(result.remainingWorkouts).toBe(2);
    expect(result.nextState.privateWorkoutRatings).toEqual(['routeRunning: 91', 'release: 89']);
    expect(result.nextState.actions).toContain('private_workout');
    expect(result.nextState.confidence).toBeGreaterThan(state.confidence);
  });

  it('toggles prospects in and out of the scouting watchlist', () => {
    expect(toggleScoutingWatchlist([], 'prospect-1')).toEqual(['prospect-1']);
    expect(toggleScoutingWatchlist(['prospect-1'], 'prospect-1')).toEqual([]);
  });
});
