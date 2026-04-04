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
export {
  syncPlayerArchiveEntry,
  syncAllPlayerArchiveEntries,
  recordPlayerRetirement,
  archiveSeasonHistory,
} from './systems/history';
export { progressPlayers } from './systems/progression';
export type { ProgressionResult } from './systems/progression';
export {
  createEmptyRecordBook,
  updateSingleGameRecords,
  updateRecordsFromGameResult,
  updateSeasonRecords,
  updateCareerRecords,
  getSeasonRecordNotes,
} from './systems/records';
export { createPowerRankings, updatePowerRankings } from './systems/power-rankings';
export { formMentoringPairs, applyMentoringBonuses } from './systems/mentoring';
export { generateAwards } from './systems/awards';
export { inductHallOfFame } from './systems/hall-of-fame';
export {
  recordNewsItem,
  generateWeeklyLeagueNews,
  generateOffseasonNews,
  getRecentNews,
  getTeamNews,
} from './systems/league-news';
export {
  createTradeProposal,
  submitProposal,
  generateCounterOffer,
  getTradeTargets,
  getTradeableAssets,
  acceptCounterProposal,
  rejectCounterProposal,
} from './systems/trade-negotiation';
export {
  assignTraining,
  processWeeklyTraining,
  calculateTrainingXP,
  getTrainingProgress,
  buildTrainingProgressionBonuses,
  clearTrainingAssignments,
} from './systems/player-development';
export {
  createFacilityState,
  getFacilityLevelEffect,
  getFacility,
  applyFacilityBonuses,
  upgradeFacility,
  replenishFacilityBudget,
} from './systems/facilities';
export {
  isPlayerUnavailable,
  getInjuryPenalty,
  calculateRecoveryGames,
  generateInjury,
  processInjuryRecovery,
  placeOnIR,
  activateFromIR,
  generateMedicalStaffPool,
  hireMedicalStaff,
  maybeGenerateTeamInjury,
} from './systems/injury-system';
export {
  calculateGameFatigue,
  applyWeeklyRecovery,
  getFatigueModifier,
  getInjuryRiskMultiplier,
  processWeeklyFatigue,
  getWorkloadReport,
  buildFatiguePlayerBonuses,
} from './systems/fatigue';
export {
  createDefaultDifficultyState,
  updateAdaptiveDifficulty,
  getAdaptiveModifier,
} from './systems/adaptive-difficulty';
export {
  calculateAdvancedStats,
  calculatePlayerEfficiency,
  getStatLeaders as getAnalyticsStatLeaders,
  getTeamRankings,
  getPlayerComparison,
  getWeeklyTrend,
} from './systems/analytics';
export {
  buildPlayoffPicture,
  getDivisionStandings,
  getClinchedStatus,
  getStatLeaders,
} from './systems/standings';
export {
  calculatePlayoffMomentum,
  getPlayoffMomentumBonus,
  generatePlayoffNews,
} from './systems/playoff-momentum';
export {
  createDefaultTutorialState,
  advanceTutorial,
  dismissTutorial,
  isTutorialActive,
  getTutorialHint,
  completeTutorialAction,
} from './systems/tutorial';
export {
  createDefaultAchievements,
  getAchievementCatalog,
  checkAchievements,
  getUnlockedAchievements,
  getAchievementProgress,
} from './systems/achievements';
export {
  createDefaultDashboardState,
  createLayout,
  switchLayout,
  pinWidget,
  unpinWidget,
  reorderWidgets,
  getActiveDashboardLayout,
} from './systems/dashboard-config';
export {
  assignBroadcasts,
  flexSchedule,
  getFullSchedule,
  getWeekSchedule,
} from './systems/flex-schedule';
export {
  generateBroadcast,
  generatePlayCommentary,
  selectHighlights,
  generateDriveSummary,
  generateFinalNarrative,
} from './systems/broadcast';
export {
  generateGameDayPosts,
  generateTransactionPosts,
  generateWeeklyBuzz,
  generatePlayerReaction,
  appendToSocialFeed,
} from './systems/social-feed';
export {
  initializeDeadline,
  advanceDeadlineClock,
  generateDeadlineDeal,
  gradeDeadlineDeal,
  getTickerMessage,
  finalizeDeadline,
} from './systems/trade-deadline';
export {
  getAvailableScenarios,
  startScenario,
  checkScenarioProgress,
  gradeScenarioCompletion,
  advanceScenarioSeason,
  getScenarioConstraints,
} from './systems/scenario-challenge';
export {
  createDefaultSpecialTeamsState,
  buildSpecialTeamsState,
  assignKickReturner,
  assignPuntReturner,
  autoAssignSpecialTeams,
  calculateReturnYards,
  simulateSpecialTeams,
} from './systems/special-teams';
export {
  RELOCATION_DESTINATIONS,
  STADIUM_SPONSORS,
  STADIUM_UPGRADE_COSTS,
  STADIUM_REVENUE_BONUS,
  STADIUM_PRESTIGE_BONUS,
  STADIUM_CROWD_BONUS,
  createDefaultFranchiseIdentity,
  initializeFranchiseIdentity,
  updateFanbase,
  updatePrestige,
  updateAttendance,
  getStadiumHomeFieldBonus,
  generateStadiumDeals,
  acceptStadiumDeal,
  tickStadiumDeal,
  upgradeStadium,
  canRelocate,
  getRelocationDestinations,
  relocateTeam,
  getFanbaseEffect,
} from './systems/franchise-identity';
export { buildSeasonSchedule } from './systems/season-schedule';
export { generateSeasonReport } from './systems/season-report';
export {
  applyGamePlan,
  generateAiGamePlan,
  generateOpponentScouting,
  getStoredOpponentReport,
  resetGamePlan,
  setGamePlan,
  upsertOpponentReport,
} from './systems/game-plan';
export { generateDraftRecap } from './systems/draft-recap';
export { findTradeTargets } from './systems/trade-finder';
export {
  buildPlayerSeasonHistoryEntry,
  archivePlayerSeasonHistory,
  buildPlayerProfile,
  getPlayerValue,
  getPlayerComparables,
  getPlayerProjection,
} from './systems/player-profile';
export {
  buildLeagueAverageByGroup,
  analyzeTeamNeeds,
  compareTeamNeeds,
} from './systems/team-needs';
export {
  addToWatchlist,
  removeFromWatchlist,
  buildFATargetBoard,
  buildFATargetBoardState,
  refreshStoredFATargetBoard,
} from './systems/fa-target-board';
export {
  generateDraftTradeOffers,
  evaluateTradeUp,
  evaluateTradeDown,
  updateDraftWarRoomState,
  buildDraftWarRoomState,
  applyDraftTradeOffer,
} from './systems/draft-war-room';
export {
  generateExtensionOffer,
  evaluateExtension,
  postJune1Cut,
  capProjection,
  applyExtensionOffer,
} from './systems/contract-extensions';
export {
  buildCoachingMarket,
  scoreStaffFit,
  hireStaffCandidate,
  fireStaffMember,
  promoteCoordinator,
} from './systems/coaching-market';
export {
  snapshotTeamIdentity,
  projectSchemeTransition,
  applySchemeChange,
} from './systems/scheme-install';
export {
  buildOpponentIntel,
  evaluateWeeklyPrep,
  applyWeeklyPrepToSim,
} from './systems/weekly-prep';
export {
  buildCoachRetentionDecision,
  advanceCoachDevelopment,
  resolvePoachingCycle,
} from './systems/coach-retention';
export {
  gradeGamePlanExecution,
  buildFilmRoomReport,
} from './systems/film-room';
export {
  generateAgentPool,
  ensureAgentsInitialized,
  getPlayerAgent,
  getAgentPatienceWeeks,
  agentDemand,
  negotiateOffer,
  holdoutCheck,
  agentMediaLeak,
  processCarryoverHoldouts,
} from './systems/player-agents';
export {
  createDefaultNarrativeIntensity,
  calculateIntensity,
  recordBeat,
  shouldGenerateEvent,
  getCooldownStatus,
} from './systems/narrative-director';
export {
  recordCeremony,
  generateChampionshipCeremony,
  generateAwardsNight,
  generateHOFInduction,
  generateRingCeremony,
} from './systems/ceremonies';
export {
  recordDynastyEvent,
  getDynastyHighlights,
  getDynastyByYear,
} from './systems/dynasty-timeline';

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
export {
  GM_STRATEGIES,
  applyGmStrategy,
  suggestStrategy,
  evaluateStrategy,
  reevaluateLeagueStrategies,
} from './systems/gm-strategies';
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
export { emptyPlayerStats, createEmptySeasonStats, ensureSeasonStats, applyGameToSeasonStats, tickInjuries } from './systems/season-stats';
export { simGame, applyPlayerLines } from './systems/game-sim';
export type { SimGameContext, SimGameResult, SimTeamContext } from './systems/game-sim';
export { buildWeeklySummary } from './systems/weekly-summary';
export { buildGameDayPackage } from './systems/game-day-package';
export {
  clearSeasonLivingWorldState,
  expireTimedEffects,
  generateWeeklyOffFieldEvents,
  getGameEffectBonuses,
  getTimedEffectDelta,
} from './systems/off-field-events';
export {
  createPostGamePressConference,
  createTransactionalPressConference,
  maybeCreateMidweekPressConference,
  recordPressConference,
} from './systems/press-conference';
export {
  decayLeagueRivalries,
  getRivalryGameContext,
  seedLeagueRivalries,
  updateLeagueRivalriesFromGame,
} from './systems/rivalries';
export { advanceStoryArcs } from './systems/story-arcs';
export { seedPlayoffBracket, advancePlayoffBracket } from './systems/playoff-bracket';
export {
  initializeOffseasonState,
  submitReSignOffer,
  submitFreeAgentBid,
  advanceOffseason,
  advanceFreeAgency,
} from './systems/offseason';
export { runCoachingCarousel } from './systems/coaching-carousel';
export {
  runScoutingAction,
  runPrivateWorkout,
  makeDraftPick,
  advanceDraft,
  finalizePostDraft,
} from './systems/draft';
export {
  createDefaultScoutingDepartment,
  generateScoutPool,
  applyScoutAccuracy,
  hireScout,
  fireScout,
  bestScoutForProspect,
  runCombine,
  runProDay,
} from './systems/scouting-staff';
export {
  SCOUTING_REGIONS,
  assignProspectRegion,
  buildInitialScoutingState,
  buildActionNote,
  deriveCharacterRead,
  deriveCeilingBand,
  deriveConfidence,
  deriveRiskBand,
  normalizeScoutingState,
  resolvePrivateWorkout,
  scoutFitScore,
  tightenVisibleGrade,
  toggleScoutingWatchlist,
} from './systems/advanced-scouting';
export { calculateCompPicks } from './systems/comp-picks';
export { resolveConditions, conditionalPickExpectedValue } from './systems/conditional-picks';
export {
  addToPracticeSquad,
  removeFromPracticeSquad,
  elevateFromPracticeSquad,
  cutPlayerToWaivers,
  submitWaiverClaim,
  processWaiverClaims,
  aiWaiverLogic,
} from './systems/practice-squad';
export {
  generateOwnerDemands,
  makePlayerPromise,
  evaluateHandshakes,
} from './systems/handshake-ledger';
export {
  acceptTradeOffer,
  rejectTradeOffer,
} from './systems/trade-market';
export {
  calcPlayerValue,
  calcPickValue,
  evaluateTradeOffer,
} from './systems/trade-value';
export { advanceFranchiseWeek } from './systems/franchise-week';
export {
  EXPANSION_CITIES,
  EXPANSION_CHANCE_PER_YEAR,
  EXPANSION_MIN_YEAR,
  PROTECT_LIMIT,
  finalizeExpansionDraft,
  getExpansionTeamNeeds,
  initializeExpansionDraft,
  makeExpansionPick,
  protectPlayers,
  shouldTriggerExpansion,
} from './systems/expansion-draft';
export {
  buildFranchiseDashboard,
  detectFranchiseEras,
} from './systems/franchise-dashboard';
export {
  calculateLegacyScore,
  generateAllDecadeTeam,
  generateLegendHighlights,
  getDecadeNarrative,
  getFranchiseLegends,
  shouldGenerateAllDecadeTeam,
} from './systems/franchise-legends';

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
