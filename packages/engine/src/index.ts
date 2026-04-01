/**
 * @mfd/engine — Pure TypeScript game simulation engine.
 *
 * Rule 1: No React, no DOM, no browser APIs.
 * This package is runnable in Node.js, Web Worker, or test harness.
 */

// Types
export * from './types';

// Utils
export { cl, sum, avg } from './utils';

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

// Systems — Traits & Personality (Phase 0)
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

// Systems — Contracts (Phase 2)
export {
  makeContract, calcCapHit, calcDeadMoney,
  restructureContract, backloadContract, extendAndRestructure,
  CONTRACT_VALUE_TABLE, AGE_VALUE_CURVE,
  calcContractScore, calcDeadCap,
} from './systems/contracts';
export type { RestructureResult, BackloadResult, ContractScore, DeadCapResult } from './systems/contracts';

export {
  voidYearDeadCap, v36CapHit, v36CashPaid, v36DeadIfCut, v36DeadIfTraded, v36TradeSavings,
  splitDeadCapCharge, applyDeadCapCharge,
  calcTradeImpact, addVoidYears, restructureCascade,
} from './systems/contract-helpers';
export type { DeadCapSplit, TradeImpact, VoidYearResult, CascadeResult } from './systems/contract-helpers';

export {
  FRANCHISE_TAG_TYPES, getFranchiseTagSalary, applyFranchiseTag,
} from './systems/franchise-tag';
export type { FranchiseTagDef, TagReaction, TagResult } from './systems/franchise-tag';

export {
  INCENTIVE_DEFS, checkIncentives, getAvailableIncentives,
} from './systems/incentives';
export type { IncentiveDef, IncentiveHit, IncentiveCheckResult } from './systems/incentives';

export { buildCapVisualization } from './systems/cap-visualization';
export type { CapBreakdown, TopHit, CapProjection, CapVisualization } from './systems/cap-visualization';

// Systems — Owner (Phase 2)
export {
  OWNER_ARCHETYPES, initOwner, updateOwnerApproval, getOwnerStatus,
} from './systems/owner';
export type { OwnerArchetype, OwnerStatusInfo } from './systems/owner';

export {
  tickPatience, getPatienceStatus, calcConfidenceArc,
  generateUltimatums, FURIOUS_PENALTIES, checkHotSeat,
} from './systems/owner-extended';
export type { PatienceTick, ConfidenceStage, ConfidenceArc, Ultimatum, FuriousPenalty, HotSeatStatus } from './systems/owner-extended';

export { checkOwnerPersonality } from './systems/owner-personality';
export type { OwnerPersonalityEvent, OwnerEventResult } from './systems/owner-personality';

export { OWNER_TYPES, OWNER_GOALS, evaluateGoals } from './systems/owner-goals';
export type { OwnerType, OwnerGoal, GoalResult } from './systems/owner-goals';

// Systems — Trust & Aging (Phase 2)
export {
  getTrustArrow, getTrustArrowLabel, leagueSnapshot, getAgingMultiplier,
} from './systems/trust-aging';
export type { TrustArrow, TrustReputation, LeagueTrustSnapshot, AgingPhase, RatingCategory } from './systems/trust-aging';

// Systems — GM (Phase 2)
export { GM_STRATEGIES, applyGmStrategy, suggestStrategy } from './systems/gm-strategies';
export type { GmStrategyDef } from './systems/gm-strategies';

export { calculateReputation, getRepLabel } from './systems/gm-reputation';
export type { GmReputation, RepLabel } from './systems/gm-reputation';

// Systems — Roster (Phase 2)
export { detectPositionBattles, buildCutAdvisor } from './systems/roster-management';
export type { PositionBattle, CutSuggestion, CutAdvisorResult } from './systems/roster-management';

export { ROLE_DEFS, assignDefaultRoles, getRoleSnapPct } from './systems/role-defs';
export type { RoleDef } from './systems/role-defs';

// Systems — Scheme Fit (Phase 2)
export {
  SCHEME_FIT, fitTierFromScore, calcSchemeFit,
  getPlayerSide, getSpecialtyBonus, calcSpecialtyFitAdj,
  calcPersonalityFitAdj, calcPlayerIdentityFit,
  calcTeamFit, getSchemeMismatchWarnings,
} from './systems/scheme-fit';
export type { SchemeFitResult, FitTier, PlayerSide, PlayerIdentityFit, TeamFitSummary, SchemeMismatch } from './systems/scheme-fit';

// Systems — Chemistry (Phase 2)
export { chemistryMod, systemFitMod, updateSystemFit, resetSystemFit } from './systems/chemistry';

// Systems — Coaching (Phase 2)
export {
  CLINIC_TRACKS, earnXP, hasPerk, getTrackXP, getClinicMods,
} from './systems/coaching-clinic';
export type { ClinicPerk, ClinicTrack, ClinicMods } from './systems/coaching-clinic';

export { SKILL_TREES, getTreeKey, getActiveBonus } from './systems/coach-skill-tree';
export type { SkillTier, SkillBranch, SkillTree } from './systems/coach-skill-tree';

export { getCoachTraitMods } from './systems/coach-trait-mods';
export type { CoachTraitMods } from './systems/coach-trait-mods';

export { OC_SPECIALTIES, DC_SPECIALTIES, assignCoordSpecialty, getSpecialtyById } from './systems/coordinator-specialties';

// Systems — Hooks Engine (Phase 2)
export { generateHooks, checkNemesisTrigger, checkNemesisResolved, generateDraftCrush } from './systems/hooks-engine';
export type { HookCategory, Hook, HookState, Nemesis, DraftCrush } from './systems/hooks-engine';

// Systems — Dynasty Cartridge (Phase 2)
export {
  CARTRIDGE_VERSION, buildCartridge, parseCartridge,
  generateFileName, shouldPromptBackup,
} from './systems/dynasty-cartridge';
export type { CartridgeEnvelope, CartridgeMeta, BuildResult, BuildError, ParseResult, ParseError } from './systems/dynasty-cartridge';

// Save
export { SaveStateSchema, migrate, registerMigration } from './save';
export type { SaveState } from './save';
