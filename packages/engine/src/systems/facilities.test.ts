import { describe, expect, it } from 'vitest';
import {
  applyFacilityBonuses,
  createFacilityState,
  getFacility,
  getFacilityLevelEffect,
  upgradeFacility,
} from './facilities';
import { makeLeagueState } from './test-helpers';

describe('facilities', () => {
  it('training complex level 3 gives a 15% XP bonus', () => {
    const effect = getFacilityLevelEffect('training_complex', 3);

    expect(effect.trainingXPBonus).toBe(1.15);
  });

  it('medical center reduces injury chance', () => {
    const game = makeLeagueState();
    game.teams.afce1.facilityState = createFacilityState('win_now');
    getFacility(game.teams.afce1.facilityState, 'medical_center')!.level = 3;
    getFacility(game.teams.afce1.facilityState, 'medical_center')!.effect = getFacilityLevelEffect('medical_center', 3);

    const bonuses = applyFacilityBonuses(game.teams.afce1);

    expect(bonuses.recoveryBonus).toBeGreaterThan(1);
    expect(bonuses.injuryPreventionBonus).toBeLessThan(1);
  });

  it('weight room reduces fatigue accumulation', () => {
    const game = makeLeagueState();
    game.teams.afce1.facilityState = createFacilityState('win_now');
    getFacility(game.teams.afce1.facilityState, 'weight_room')!.level = 3;
    getFacility(game.teams.afce1.facilityState, 'weight_room')!.effect = getFacilityLevelEffect('weight_room', 3);

    const bonuses = applyFacilityBonuses(game.teams.afce1);

    expect(bonuses.fatigueGainBonus).toBe(0.9);
  });

  it('upgrade costs escalate correctly', () => {
    const game = makeLeagueState();
    game.teams.afce1.facilityState = createFacilityState('win_now');

    const upgraded = upgradeFacility(game, 'afce1', 'film_room');

    expect(upgraded).toBe(true);
    expect(game.teams.afce1.facilityState.budget).toBe(7);
    expect(getFacility(game.teams.afce1.facilityState, 'film_room')!.level).toBe(2);
  });

  it('max 3 levels per facility enforced', () => {
    const game = makeLeagueState();
    game.teams.afce1.facilityState = createFacilityState('win_now');
    const facility = getFacility(game.teams.afce1.facilityState, 'recovery_suite')!;
    facility.level = 3;
    facility.effect = getFacilityLevelEffect('recovery_suite', 3);

    expect(upgradeFacility(game, 'afce1', 'recovery_suite')).toBe(false);
  });
});
