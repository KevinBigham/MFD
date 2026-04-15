/**
 * Draft, scouting, and facility types.
 */

import type {
  Position,
  Personality,
  PlayerArchetype,
  PlayerRatings,
  TraitId,
} from './player.js';

// ── Draft Picks ─────────────────────────────────────────

export interface DraftPick {
  round: number;
  pick: number;
  originalTeamId: string;
  currentTeamId: string;
  year: number;
  isCompPick: boolean;
}

// ── Scouting ────────────────────────────────────────────

export interface Scout {
  id: string;
  name: string;
  tier: 'elite' | 'good' | 'average' | 'poor';
  specialty: Position | null;
  scope: 'national' | 'regional';
  region: 'east' | 'south' | 'midwest' | 'west' | null;
  salary: number;
  accuracy: number;
}

export interface ScoutingDepartment {
  scouts: Scout[];
  availableScouts: Scout[];
  budget: number;
  maxScouts: number;
  privateWorkoutsRemaining: number;
}

export type ScoutingRegion = 'east' | 'south' | 'midwest' | 'west';
export type ProspectRiskBand = 'unknown' | 'safe' | 'balanced' | 'volatile';
export type ProspectCeilingBand = 'unknown' | 'starter' | 'impact' | 'star';
export type ProspectCharacterRead = 'unknown' | 'leader' | 'steady' | 'mercurial' | 'red_flag';

// ── Medical / Fatigue / Facilities ──────────────────────

export interface MedicalStaff {
  id: string;
  name: string;
  tier: 'elite' | 'good' | 'average' | 'poor';
  salary: number;
  recoveryBonus: number;
  preventionBonus: number;
}

export interface FatigueState {
  playerId: string;
  fatigue: number;
  weeklySnaps: number[];
  seasonSnaps: number;
  restWeeks: number;
  conditioningBonus: number;
}

export type FacilityType =
  | 'training_complex'
  | 'medical_center'
  | 'film_room'
  | 'weight_room'
  | 'recovery_suite';

export interface FacilityEffect {
  trainingXPBonus: number;
  recoveryBonus: number;
  injuryPreventionBonus: number;
  scoutingBonus: number;
  moraleBonus: number;
  fatigueGainBonus: number;
}

export interface Facility {
  type: FacilityType;
  level: 1 | 2 | 3;
  effect: FacilityEffect;
}

export interface FacilityState {
  facilities: Facility[];
  budget: number;
  maxFacilities: number;
  upgradeCosts: Record<FacilityType, number[]>;
}

// ── Combine / Prospects ─────────────────────────────────

export interface CombineMeasurables {
  fortyYard: number;
  benchPress: number;
  vertical: number;
  broadJump: number;
  threeCone: number;
  shuttle: number;
}

export interface DraftProspect {
  id: string;
  firstName: string;
  lastName: string;
  pos: Position;
  college: string;
  region: ScoutingRegion;
  ratings: PlayerRatings;
  projectedRound: number;
  scoutGrade: number;
  trueGrade: number;
  personality: Personality;
  traits: TraitId[];
  archetype: PlayerArchetype | null;
  characterArchetype: string;
  bustProbability: number;
  stealProbability: number;
  scoutingReports: ScoutingReport[];
  combine: CombineMeasurables | null;
}

export interface ScoutingReport {
  type: 'film' | 'combine' | 'interview';
  accuracy: number;
  grade: number;
  notes: string;
}

export type ScoutingAction = 'film' | 'combine' | 'interview' | 'private_workout';

export interface ProspectScoutingState {
  prospectId: string;
  actions: ScoutingAction[];
  accuracy: number;
  confidence: number;
  visibleScoutGrade: number;
  notes: string[];
  proDayRating: string | null;
  assignedScoutId: string | null;
  riskBand: ProspectRiskBand;
  ceilingBand: ProspectCeilingBand;
  characterRead: ProspectCharacterRead;
  privateWorkoutRatings: string[];
}
