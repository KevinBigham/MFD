/**
 * @mfd/engine — Pure TypeScript game simulation engine.
 *
 * Rule 1: No React, no DOM, no browser APIs.
 * This package is runnable in Node.js, Web Worker, or test harness.
 */

// Types
export * from './types';

// RNG
export {
  mulberry32, RNG, setSeed, getSeed,
  reseedWeek, reseedSeason,
  rng, rngI, rngD, rngAI, rngT, rngDev,
  pick, pickD, uid,
} from './rng';
export type { RngChannel, PrngFn, RngState } from './rng';

// Events
export { EVENT_NAMES, EVENT_NAME_LIST, SCHEMA_VERSION, createEventLog } from './events';
export type { EventName, EventEnvelope, LiveGameState, EventLog } from './events';

// Config
export {
  POS_DEF, RATING_LABELS, ALL_POSITIONS, OFF_POSITIONS, DEF_POSITIONS, SPEC_POSITIONS,
  OFF_SCHEMES, DEF_SCHEMES, OFF_PLANS, DEF_PLANS, SCHEME_COUNTERS, SCHEME_FX,
  getSchemeFlavorLine, HOME_FIELD_ADV,
  ARCHETYPES, ARCH_BOOST, COACH_TRAITS, ARCH_TRAIT_POOLS, CLIQUE_TYPES,
  DIFF_SETTINGS, SAVE_VERSION,
  ROSTER_CAP, CAMP_CAP, PS_CAP, MIN_SALARY, CAP_MATH,
  getSalaryCap, getCapFloor, getMinSalary,
} from './config';

// Systems
export {
  TRAITS, TRAIT_FX, TRAIT_MILESTONES,
  getPlayerTraits, hasTrait, assignTrait, assignTraits, checkTraitMilestones,
} from './systems/traits';

export {
  getPersonality, traitScalar, generatePersonality,
  PERS_LABELS, getDominantTrait, getContractPersonalityEffects,
} from './systems/personality';

export {
  AGE_CURVES, classifyArchetype, getAgeCurve,
} from './systems/player-archetypes';

// Save
export { SaveStateSchema, migrate, registerMigration } from './save';
export type { SaveState } from './save';
