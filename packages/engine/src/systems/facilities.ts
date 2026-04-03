import { RNG } from '../rng';
import type {
  Facility,
  FacilityEffect,
  FacilityState,
  FacilityType,
  GameState,
  OwnerArchetypeId,
  Team,
} from '../types';

const FACILITY_LEVELS: Record<FacilityType, [FacilityEffect, FacilityEffect, FacilityEffect]> = {
  training_complex: [
    { trainingXPBonus: 1.05, recoveryBonus: 1, injuryPreventionBonus: 1, scoutingBonus: 1, moraleBonus: 1.01, fatigueGainBonus: 1 },
    { trainingXPBonus: 1.1, recoveryBonus: 1, injuryPreventionBonus: 1, scoutingBonus: 1, moraleBonus: 1.02, fatigueGainBonus: 1 },
    { trainingXPBonus: 1.15, recoveryBonus: 1, injuryPreventionBonus: 1, scoutingBonus: 1, moraleBonus: 1.03, fatigueGainBonus: 1 },
  ],
  medical_center: [
    { trainingXPBonus: 1, recoveryBonus: 1.05, injuryPreventionBonus: 0.99, scoutingBonus: 1, moraleBonus: 1, fatigueGainBonus: 1 },
    { trainingXPBonus: 1, recoveryBonus: 1.1, injuryPreventionBonus: 0.98, scoutingBonus: 1, moraleBonus: 1, fatigueGainBonus: 1 },
    { trainingXPBonus: 1, recoveryBonus: 1.15, injuryPreventionBonus: 0.97, scoutingBonus: 1, moraleBonus: 1, fatigueGainBonus: 1 },
  ],
  film_room: [
    { trainingXPBonus: 1, recoveryBonus: 1, injuryPreventionBonus: 1, scoutingBonus: 1.03, moraleBonus: 1.01, fatigueGainBonus: 1 },
    { trainingXPBonus: 1, recoveryBonus: 1, injuryPreventionBonus: 1, scoutingBonus: 1.06, moraleBonus: 1.02, fatigueGainBonus: 1 },
    { trainingXPBonus: 1, recoveryBonus: 1, injuryPreventionBonus: 1, scoutingBonus: 1.1, moraleBonus: 1.03, fatigueGainBonus: 1 },
  ],
  weight_room: [
    { trainingXPBonus: 1.01, recoveryBonus: 1, injuryPreventionBonus: 1, scoutingBonus: 1, moraleBonus: 1, fatigueGainBonus: 0.97 },
    { trainingXPBonus: 1.02, recoveryBonus: 1, injuryPreventionBonus: 1, scoutingBonus: 1, moraleBonus: 1, fatigueGainBonus: 0.94 },
    { trainingXPBonus: 1.03, recoveryBonus: 1, injuryPreventionBonus: 1, scoutingBonus: 1, moraleBonus: 1, fatigueGainBonus: 0.9 },
  ],
  recovery_suite: [
    { trainingXPBonus: 1, recoveryBonus: 1, injuryPreventionBonus: 0.95, scoutingBonus: 1, moraleBonus: 1.02, fatigueGainBonus: 1 },
    { trainingXPBonus: 1, recoveryBonus: 1, injuryPreventionBonus: 0.9, scoutingBonus: 1, moraleBonus: 1.04, fatigueGainBonus: 1 },
    { trainingXPBonus: 1, recoveryBonus: 1, injuryPreventionBonus: 0.85, scoutingBonus: 1, moraleBonus: 1.06, fatigueGainBonus: 1 },
  ],
};

const FACILITY_UPGRADE_COSTS: FacilityState['upgradeCosts'] = {
  training_complex: [4, 8, 12],
  medical_center: [4, 8, 12],
  film_room: [3, 6, 9],
  weight_room: [3, 6, 9],
  recovery_suite: [5, 10, 15],
};

const OWNER_FACILITY_BUDGETS: Record<OwnerArchetypeId, number> = {
  win_now: 10,
  patient_builder: 10,
  profit_first: 8,
  fan_favorite: 12,
  legacy_builder: 12,
};

const FACILITY_TYPES: FacilityType[] = [
  'training_complex',
  'medical_center',
  'film_room',
  'weight_room',
  'recovery_suite',
];

export function getFacilityLevelEffect(type: FacilityType, level: 1 | 2 | 3): FacilityEffect {
  const effect = FACILITY_LEVELS[type][level - 1]!;
  return {
    trainingXPBonus: effect.trainingXPBonus,
    recoveryBonus: effect.recoveryBonus,
    injuryPreventionBonus: effect.injuryPreventionBonus,
    scoutingBonus: effect.scoutingBonus,
    moraleBonus: effect.moraleBonus,
    fatigueGainBonus: effect.fatigueGainBonus,
  };
}

function createFacility(type: FacilityType, level: 1 | 2 | 3): Facility {
  return {
    type,
    level,
    effect: getFacilityLevelEffect(type, level),
  };
}

export function createFacilityState(
  ownerArchetypeId: OwnerArchetypeId,
  aiRandomize = false,
  rand: () => number = RNG.ai,
): FacilityState {
  return {
    facilities: FACILITY_TYPES.map((type) => {
      const level = aiRandomize ? ((rand() < 0.35 ? 2 : 1) as 1 | 2) : 1;
      return createFacility(type, level);
    }),
    budget: OWNER_FACILITY_BUDGETS[ownerArchetypeId] ?? 10,
    maxFacilities: 5,
    upgradeCosts: {
      training_complex: [...FACILITY_UPGRADE_COSTS.training_complex],
      medical_center: [...FACILITY_UPGRADE_COSTS.medical_center],
      film_room: [...FACILITY_UPGRADE_COSTS.film_room],
      weight_room: [...FACILITY_UPGRADE_COSTS.weight_room],
      recovery_suite: [...FACILITY_UPGRADE_COSTS.recovery_suite],
    },
  };
}

export function getFacility(state: FacilityState, type: FacilityType): Facility | null {
  return state.facilities.find((facility) => facility.type === type) ?? null;
}

export function applyFacilityBonuses(team: Team): FacilityEffect {
  return (team.facilityState?.facilities ?? []).reduce<FacilityEffect>((aggregate, facility) => ({
    trainingXPBonus: Number((aggregate.trainingXPBonus * facility.effect.trainingXPBonus).toFixed(4)),
    recoveryBonus: Number((aggregate.recoveryBonus * facility.effect.recoveryBonus).toFixed(4)),
    injuryPreventionBonus: Number((aggregate.injuryPreventionBonus * facility.effect.injuryPreventionBonus).toFixed(4)),
    scoutingBonus: Number((aggregate.scoutingBonus * facility.effect.scoutingBonus).toFixed(4)),
    moraleBonus: Number((aggregate.moraleBonus * facility.effect.moraleBonus).toFixed(4)),
    fatigueGainBonus: Number((aggregate.fatigueGainBonus * facility.effect.fatigueGainBonus).toFixed(4)),
  }), {
    trainingXPBonus: 1,
    recoveryBonus: 1,
    injuryPreventionBonus: 1,
    scoutingBonus: 1,
    moraleBonus: 1,
    fatigueGainBonus: 1,
  });
}

export function upgradeFacility(game: GameState, teamId: string, facilityType: FacilityType): boolean {
  const team = game.teams[teamId];
  if (!team) return false;

  const facility = getFacility(team.facilityState, facilityType);
  if (!facility || facility.level >= 3) return false;

  const nextLevel = (facility.level + 1) as 2 | 3;
  const cost = team.facilityState.upgradeCosts[facilityType][facility.level - 1] ?? 0;
  if (team.facilityState.budget < cost) return false;

  team.facilityState.budget = Number((team.facilityState.budget - cost).toFixed(2));
  facility.level = nextLevel;
  facility.effect = getFacilityLevelEffect(facilityType, nextLevel);
  return true;
}

export function replenishFacilityBudget(team: Team): number {
  const budget = OWNER_FACILITY_BUDGETS[team.owner.archetypeId] ?? 10;
  if (!team.facilityState) {
    team.facilityState = createFacilityState(team.owner.archetypeId);
  }
  team.facilityState.budget = budget;
  return budget;
}
