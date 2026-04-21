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
  rng, rngI, rngD, rngAI, rngT, rngDev, rngEvent,
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
  DIFF_SETTINGS, SAVE_VERSION, getDefaultHalftimeDecisionSetting,
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
export {
  MILESTONE_THRESHOLDS,
  checkRecordChases,
  detectBrokenRecords,
  getActiveMilestoneChases,
  checkMilestones,
  generateRecordNarrative,
  generateMilestoneNarrative,
  getRecordHolders,
  getLeagueLeaders,
  getCareerLeaders,
  getSeasonPaceProjection,
} from './systems/record-tracker';
export {
  buildCapScenario,
  simulateRestructure,
  simulateBackload,
  simulateCut,
  simulateExtension,
  simulateMultipleMoves,
  getCapHealth,
  identifyCapCandidates,
  buildMultiYearProjection,
  projectCapDeltas,
} from './systems/cap-laboratory';
export {
  getStatLeaderboard,
  getPlayerCareerTimeline,
  comparePlayerCareers,
  getTeamSeasonHistory,
  getLeagueAverages,
  getPositionRankings,
  buildStatSnapshot,
} from './systems/stat-central';
export { createPowerRankings, updatePowerRankings } from './systems/power-rankings';
export { formMentoringPairs, applyMentoringBonuses } from './systems/mentoring';
export { generateAwards } from './systems/awards';
export {
  FIRST_BALLOT_THRESHOLD,
  buildBallotFromEligible,
  inductHallOfFame,
  simulateHOFBallot,
} from './systems/hall-of-fame';
export type { HOFBallotEntry, HOFBallotResult } from './systems/hall-of-fame';
export {
  recordNewsItem,
  recordGovernanceNews,
  recordLaborNews,
  createRecordBreakingNews,
  createMilestoneNews,
  createStatWatchNews,
  generateWeeklyLeagueNews,
  generateOffseasonNews,
  getRecentNews,
  getTeamNews,
} from './systems/league-news';
export {
  interpolateContentPlaceholders,
  getPressConferenceScenarioContent,
  getStoryArcPhaseContent,
  getNamePool,
  getSocialPost,
  getNewsArticle,
  getTeamContent,
  getTeamFanCulture,
  getTeamRivalryContent,
  getTeamPAOverrides,
  getTeamStadiumContent,
  getTeamStadiumTradition,
  getHalftimePerformers,
  getPACall,
  getScoutingReportTemplate,
  getCoachArchetype,
  getAwardSpeech,
  getPersonalityLine,
  getAgmDialogueLine,
  getBroadcastTemplate,
  getCallYourShotReactions,
  getContingencyCallouts,
  getApologyTourBeat,
} from './content-loader';
export type {
  CoachArchetypeContent,
  AwardSpeechResult,
  PersonalityInput,
  ScoutingTemplateTier,
  CallYourShotReactionContent,
  CallYourShotReactionOutcome,
  ContingencyCalloutKey,
  ApologyTourBeatContent,
  TeamIdentityContent,
  TeamFanCultureContent,
  TeamRivalryContent,
  TeamStadiumContent,
} from './content-loader';
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
export type { StandingsRow } from './systems/standings';
export {
  calculatePlayoffMomentum,
  getPlayoffMomentumBonus,
  generatePlayoffNews,
} from './systems/playoff-momentum';
export {
  CONVENTION_SAVE_METADATA,
  generateConventionSave,
} from './systems/convention-save';
export {
  createDefaultTutorialState,
  advanceTutorial,
  dismissTutorial,
  isTutorialActive,
  getTutorialHint,
  completeTutorialAction,
  markScreenVisited,
  isFirstVisit,
  WEEK1_STEP_IDS,
  getWeek1Steps,
} from './systems/tutorial';
export {
  getAGMWeeklyRecommendations,
  getScreenTip,
  type AGMRecommendation,
  type AGMRecommendationPriority,
  type AGMScreenTip,
} from './systems/agm';
export {
  NAV_UNLOCK_RULES,
  MIDSEASON_UNLOCK_WEEK,
  getNavUnlockStatus,
  isNavItemUnlocked,
  type NavUnlockRule,
  type NavUnlockStatus,
} from './config/navigation';
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
  calculateWpSwing,
  generatePlayCommentary,
  selectHighlights,
  generateDriveSummary,
  generateFinalNarrative,
  getWpLeverageCallout,
} from './systems/broadcast';
export {
  CRITICAL_LEVERAGE_TEMPLATES,
  HIGH_LEVERAGE_TEMPLATES,
  PLAY_SPECIFIC_COMMENTARY,
  PLAYBOOK_BRIDGE_TEMPLATES,
  getPlaybookCommentary,
} from './systems/broadcast-templates';
export {
  endDynastyEra,
  generateEraSuggestions,
  getDynastyEraHistory,
  shouldPromptEraNaming,
  startDynastyEra,
} from './systems/dynasty-era';
export type { DynastyEra, EraNameSuggestion } from './systems/dynasty-era';
export {
  calculateMentorEffects,
  fireMentor,
  getAvailableMentors,
  hireMentor,
} from './systems/alumni-mentors';
export type { AlumniMentor, MentorEffect, MentorSpecialty } from './systems/alumni-mentors';
export { getSaveReminderMessage, shouldShowSaveReminder } from './systems/save-reminder';
export {
  DEFAULT_AUDIO_QUEUE_CONFIG,
  DEFAULT_DEBOUNCE_MS,
  DEFAULT_MAX_QUEUE_SIZE,
  createAudioCue,
  getEventPriority,
  shouldPlaySound,
  mapGameResultToAudioCues,
} from './systems/audio-events';
export type { SoundEvent, AudioCue, AudioQueueConfig, AudioPriority } from './systems/audio-events';
export {
  createGovernancePost,
  createLaborPost,
  createRecordBreakingPost,
  createMilestonePost,
  createRecordChasePost,
  createCapMovePost,
  generateGameDayPosts,
  generateTransactionPosts,
  generateWeeklyBuzz,
  generatePlayerReaction,
  appendToSocialFeed,
} from './systems/social-feed';
export {
  CLIQUE_ASSIGNMENT_RULES,
  CULTURE_THRESHOLDS,
  CAPTAIN_PERK_EFFECTS,
  MAX_CAPTAINS,
  CAPTAIN_MIN_OVR,
  CAPTAIN_MIN_YEARS_EXP,
  CAPTAIN_RALLY_COOLDOWN,
  assignCliques,
  initializeLockerRoom,
  electCaptains,
  appointCaptain,
  syncLockerRoomRoster,
  updateLockerRoomWeekly,
  triggerCaptainRally,
  callTeamMeeting,
  getLockerRoomGameBonus,
  getLockerRoomClutchBonuses,
  getCultureLabel,
} from './systems/locker-room';
export {
  ENDORSEMENT_BRANDS,
  ENDORSEMENT_MARKET_MULTIPLIERS,
  generateEndorsementOffers,
  acceptEndorsement,
  tickEndorsements,
  getEndorsementRevenue,
  getEndorsementNarrative,
} from './systems/endorsements';
export {
  LEAGUE_RULE_DEFINITIONS,
  LEAGUE_RULE_DEFAULTS,
  initLeagueRules,
  getActiveRule,
  applyRuleChange,
  getRuleHistory,
  diffRules,
} from './systems/league-rules';
export {
  initCBA,
  checkCBAStatus,
  generateCBAProposal,
  evaluateCBAProposal,
  negotiateCBA,
  ratifyCBA,
  getLockoutRisk,
  resolveLockout,
  cbaTermsToRuleChanges,
  applyCBADealToRules,
} from './systems/cba-engine';
export {
  initCommissioner,
  generateRuleProposal,
  castVote,
  simulateAIVotes,
  resolveVote,
  getCommissionerAgenda,
  issueRuling,
  advanceCommissioner,
} from './systems/commissioner';
export {
  initLaborState,
  updateUnionSatisfaction,
  checkWorkStoppage,
  resolveWorkStoppage,
  generateLaborEvent,
  getUnionLeader,
} from './systems/labor-relations';
export {
  detectNewRivalries,
  updateRivalryFromGame,
  getRivalryGameBonus,
  generateRivalryTrashTalk,
  createRivalryTrashTalkPost,
  decayRivalries,
  getActiveRivalries,
} from './systems/player-rivalries';
export {
  assignJerseyNumber,
  detectRetirementCandidates,
  startFarewellTour,
  generateFarewellMoment,
  shouldRetireJersey,
  generateJerseyRetirement,
  getRetiredJerseys,
} from './systems/jersey-retirement';
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
export { buildSeasonRecap } from './systems/season-recap';
export type { SeasonRecap, SeasonRecapLeader, SeasonRecapPlayoffResult } from './systems/season-recap';
export { buildScrapbookEntry, summarizeScrapbook } from './systems/scrapbook';
export type { ScrapbookEntry, ScrapbookMoment, ScrapbookSummary } from './systems/scrapbook';
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
// Systems — Franchise Setup (Sprint 32)
export {
  PHASE_ORDER,
  PHASE_META,
  createSetupState,
  createFastLaneSetupState,
  advanceSetupPhase,
  goBackSetupPhase,
  applySetupDecision,
  isPhaseComplete,
  getPhaseRequirements,
  finalizeSetup,
  generateIntelBriefing,
  generateRosterOverview,
  generateCoachingReview,
  generateSchemeContext,
  generateDepthChartContext,
  generateCapBriefing,
  generateCapPackages,
  generateGoalContext,
  generateSetupColdOpen,
  generateTeamCrisisProfile,
  generateSetupForecast,
  generateWeekOneVolatility,
  generateWeekOneCliffhanger,
  getTopPressureCard,
  previewSetupForecastChange,
  toggleSetupDrilldown,
  generateBlueprint,
} from './systems/franchise-setup';
export type {
  SetupPhase,
  SetupPhaseMeta,
  SetupState,
  SetupDecisions,
  SetupColdOpen,
  DepthChartPhilosophy,
  CapPosture,
  CultureMandate,
  CoachCandidate,
  ScoutCandidate,
  FranchiseIntelBriefing,
  RosterOverview,
  CoachingStaffReview,
  SchemeSelectionContext,
  SchemeOption,
  DepthChartContext,
  CapStrategyBriefing,
  CapPackage,
  GoalSelectionContext,
  GoalOption,
  PressureCard,
  TeamCrisisProfile,
  ForecastCard,
  ForecastBoard,
  ChoiceForecastPreview,
  WeekOneCliffhanger,
  FranchiseBlueprint,
} from './systems/franchise-setup';
export { generateDayOneNarrativePack } from './systems/day-one-narrative';
export type {
  DayOneOwnerBand,
  DayOneMediaBand,
  DayOneOpenerContext,
  DayOneNarrativeBeat,
  DayOneAgmScene,
  DayOneNarrativePack,
} from './systems/day-one-narrative';
// Systems — Assistant GM (Sprint 33)
export {
  getAGMProfiles,
  getSelectedAGM,
  getCoachCandidates,
  getScoutCandidates,
  getAGMGreeting,
  agmOnIntelBriefing,
  agmOnRosterOverview,
  agmOnHireCoach,
  agmOnHireScout,
  getAGMCoachReaction,
  getAGMScoutReaction,
  agmOnCoachingReview,
  agmOnSchemeSelection,
  agmOnDepthChart,
  agmOnCapStrategy,
  agmOnGoalSelection,
  agmOnBlueprint,
  agmReactsToSchemeChoice,
  agmReactsToGoalChoice,
  toneAdjust,
  expertiseEmphasis,
  getExpertiseInsight,
} from './systems/assistant-gm';
export {
  getSchemeReaction,
  getGoalReaction,
  getTeachingTips,
  getPhaseTransitionFlavor,
  getTransitionTip,
  getBlueprintClosingMonologue,
} from './systems/agm-setup-content';
export type {
  AGMProfile,
  AGMPhaseDialogue,
  AGMInsight,
  AGMReaction,
} from './systems/assistant-gm';
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
  generateBreakingNews,
  recordBeat,
  shouldGenerateEvent,
  getCooldownStatus,
} from './systems/narrative-director';
export type { BreakingNewsEvent } from './systems/narrative-director';
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
  buildFranchiseBook,
  detectNewEraChapter,
  partitionEras,
} from './systems/dynasty-timeline';
export {
  fireFranchiseBookChapterAlerts,
} from './systems/franchise-book-hook';
export type {
  FranchiseBookChapterAlert,
} from './systems/franchise-book-hook';
export type {
  EraArcType,
  EraChapter,
  EraRecord,
  DefiningMoment,
  DefiningMomentKind,
  SignaturePlayer,
  SignatureRole,
  FranchiseBook,
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
  calcDeadMoneyFromSlices, explainDeadMoney,
} from './systems/contract-helpers';
export type { DeadCapSplit, TradeImpact, VoidYearResult, CascadeResult, DeadMoneyExplanation } from './systems/contract-helpers';

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
export { detectPositionBattles, buildCutAdvisor, STARTER_SLOTS } from './systems/roster-management';
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
export { derivePhilosophy, applyTeamPhilosophies } from './systems/ai-philosophy';
export { getAlumniUpdates } from './systems/legends';
export { advanceStoryArcs, advanceWeeklyStoryArcs } from './systems/story-arcs';
export { seedPlayoffBracket, advancePlayoffBracket } from './systems/playoff-bracket';
export {
  initializeOffseasonState,
  submitReSignOffer,
  submitFreeAgentBid,
  signStreetFreeAgent,
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
export { runTrainingCamp, runAllTrainingCamps } from './systems/training-camp';
export type { CampStandout, CampInjury, TrainingCampResults } from './systems/training-camp';
export type { PositionBattle as CampPositionBattle } from './systems/training-camp';
export { getRookieSlot, rookieSlotContract } from './config/rookie-slots';
export { validateGameState, assertGameStateValid } from './systems/invariants';
export type { InvariantViolation, InvariantResult } from './systems/invariants';
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
  applyHalftimeDecision,
  previewHalftimeDecision,
  shouldOfferHalftimeDecision,
  suggestHalftimeSwitch,
} from './systems/halftime-decision';
export type { AdvanceFranchiseWeekOptions } from './systems/halftime-decision';
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

// Systems — Relationship Graph (Sprint 45 "The Family Tree")
export {
  addEdge as addRelationshipEdge,
  edgeId as relationshipEdgeId,
  getEdgesFor as getRelationshipEdgesFor,
  findPath as findRelationshipPath,
  pruneDeadEdges as pruneDeadRelationshipEdges,
} from './systems/relationship-graph';
export type {
  RelationshipEdge,
  RelationshipEdgeType,
} from './systems/relationship-graph';

// Systems — Revenge Games (Sprint 48 "The Reunion")
export {
  getRevengeFlavorForMatchup,
  scanRevengeMatchups,
  hashMatchupSeed,
  pickRevengeLine,
} from './systems/revenge-games';
export type {
  RevengeFlavor,
  RevengeProtagonist,
  RevengeSubjectKind,
  RevengeDeparture,
  RevengeScanOptions,
} from './systems/revenge-games';
export { buildBroadcastCommentary } from './systems/broadcast-commentary';
export type {
  BroadcastCommentaryGame,
  BroadcastCommentaryInput,
  BroadcastCommentaryOutput,
} from './systems/broadcast-commentary';

// Systems — Dev harnesses (Sprint 48 "The Reunion")
export {
  runAgeCurveHarness,
  simulateCareer,
  reportToCsv,
} from './systems/dev/age-curve-harness';
export type {
  AgeCurveReport,
  AgeCurveHarnessOptions,
  CareerSample,
  PositionStats,
} from './systems/dev/age-curve-harness';

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

// Systems — Atmosphere Engine (Sprint 22)
export { getCrowdEnergy, calculateAtmosphere, getAtmosphereBonus } from './systems/atmosphere';
export type { AtmosphereContext, AtmosphereBonus, AtmosphereIntensity } from './systems/atmosphere';

// Systems — Regional Weather (Sprint 22)
export { getWeatherRegion, getRegionWeatherOdds, generateRegionalWeather } from './systems/regional-weather';
export type { WeatherRegion, WeatherOdds } from './systems/regional-weather';

// Systems — Super Bowl Spectacle (Sprint 22)
export {
  getSuperBowlNumber, generateSuperBowlContext, generateHalftimeShow,
  generateChampionParade, generateSuperBowlMVP, generateSuperBowlNarrative,
} from './systems/super-bowl';
export type { SuperBowlContext, HalftimeShow, ChampionParade, SuperBowlMVPAward } from './systems/super-bowl';

// Systems — Coordinator Chemistry (Sprint 22)
export { calculateStaffChemistry, getChemistryBonus, evaluateCoordinatorFit } from './systems/coordinator-chemistry';
export type { StaffChemistry, ChemistryBonus, FitScore } from './systems/coordinator-chemistry';
export { coachRetirementChance } from './systems/coach-aging';

// Systems — Archetype Progression (Sprint 23)
export {
  getArchetypeProgressionMultipliers, getArchetypeAlignment,
  checkArchetypeEvolution, applyArchetypeEvolution, getArchetypeDevelopmentReport,
} from './systems/archetype-progression';
export type { ArchetypeProgressionMultipliers, ArchetypeEvolution, ArchetypeDevelopmentReport } from './systems/archetype-progression';

// Systems — Position Coaches (Sprint 23)
export {
  generatePositionCoach, initializePositionCoaches, getPositionCoachBonus,
  evaluatePositionCoachFit, upgradePositionCoach, generateCoachingStaffReport,
  advancePositionCoachSeason,
} from './systems/position-coaches';
export type { PositionCoach, PositionCoachRole, PositionCoachStaff, PositionCoachBonus } from './systems/position-coaches';

// Systems — Development Insights (Sprint 23)
export {
  generateDevelopmentReport, projectDevelopmentCurve, identifyBreakoutCandidates,
  getDevelopmentHistory, compareDevPaths, createDevelopmentSnapshot,
} from './systems/development-insights';
export type { DevelopmentSnapshot, DevelopmentReport, DevelopmentProjection, BreakoutCandidate, DevComparison } from './systems/development-insights';

// Systems — Snap Counts (Sprint 24)
export {
  allocateGameSnaps, applySnapCounts, getSnapReport, getRotationAdvice, getSnapShareByPosition,
} from './systems/snap-counts';
export type { SnapAllocation, SnapReport, RotationAdvice, SnapManagement } from './systems/snap-counts';

// Systems — Game Flow Analysis (Sprint 24)
export {
  analyzeGameFlow, getQuarterMomentum, getDriveEfficiency,
  getScoringRuns, getWinProbabilityCurve, identifyTurningPoint,
} from './systems/game-flow';
export type { GameFlowAnalysis, QuarterMomentum, DriveEfficiencyReport, ScoringRun, WinProbPoint, TurningPoint } from './systems/game-flow';

// Systems — Enhanced Film Room Analysis (Sprint 24)
export {
  analyzePlayTendencies, analyzeSituationalSuccess,
  analyzeCoachingAdjustments, generateEnhancedFilmReport, getSeasonTendencies,
} from './systems/film-room-analysis';
export type { PlayTendencyReport, SituationalReport, CoachingAdjustment, EnhancedFilmReport, SeasonTendencyProfile } from './systems/film-room-analysis';

// Systems — Playbook (Sprint 27)
export {
  OFFENSIVE_PLAYS, DEFENSIVE_PLAYS,
  determineSituation, scorePlay, scoreDefensivePlay,
  selectOffensivePlay, selectDefensivePlay,
  playMatchupQuality, getPlaysByCategory, getPlayById, getDefensivePlayById,
  formatPlayCommentary,
} from './systems/playbook';
export type { PlayDef, DefensivePlayDef, PlayCategory, Situation } from './systems/playbook';

// Systems — Trick Plays (Sprint 27)
export {
  TRICK_PLAYS,
  canCallTrickPlays, getAvailableTrickPlays, executeTrickPlay, shouldCallTrickPlay,
} from './systems/trick-plays';
export type { TrickPlayDef, TrickPlayResult } from './systems/trick-plays';

// Systems — Win Probability (Sprint 27)
export {
  getExpectedPoints, calculateWinProbability, calculateLeverageIndex,
  leverageLabel, winProbabilityNarrative, isTurningPoint,
} from './systems/win-probability';

// Systems — Halftime Adjustments (Sprint 27)
export {
  generateHalftimeAdjustments, shouldMakeAdjustments,
} from './systems/halftime';
export type { HalftimeAdjustment, HalftimeReport } from './systems/halftime';

// Systems — Dynasty Window (Sprint 27)
export {
  calculateDynastyWindow, windowPhaseLabel, windowPhaseColor,
} from './systems/dynasty-window';
export type { WindowPhase, DynastyWindowResult } from './systems/dynasty-window';

// Systems — Named Games (Sprint 27)
export { detectNamedGame, checkForNamedGame, formatNamedGame, NAMED_GAME_PRIORITY } from './systems/named-games';
export type { NamedGameArchetype, NamedGameContext, NamedGameEvent as NamedGame } from './systems/named-games';

// Systems — Apology Tour (Sprint 38)
export { syncApologyTourThreads } from './systems/apology-tour';

// Systems — Career Epilogues (Sprint 27)
export { generateCareerEpilogue, isEpilogueWorthy } from './systems/career-epilogues';
export type { CareerEpilogue, EpilogueCategory } from './systems/career-epilogues';

// Systems — Near-Miss Receipts (Sprint 27)
export {
  createNearMissTracker, recordDeclinedTrade, recordPassedPick, recordMissedFA,
  generateNearMissReceipts, hasNotableNearMisses,
} from './systems/near-miss-receipts';
export type { NearMissEntry, NearMissTracker } from './systems/near-miss-receipts';

// Systems — Contingency Plans (Sprint 27)
export {
  CONTINGENCY_TRIGGERS, CONTINGENCY_RESPONSES, MAX_CONTINGENCIES,
  limitContingencyRules, shouldFireContingency, applyContingency, getContingencyCallout,
  checkTrigger, applyContingencyAction, evaluateContingencies, createContingencyRule,
} from './systems/contingency-plans';
export type {
  ContingencyTrigger,
  ContingencyResponse,
  LegacyContingencyAction as ContingencyAction,
  ContingencyRule,
  ContingencyCheckContext,
  SimAdjustments,
} from './systems/contingency-plans';

// Systems — Call Your Shot (Sprint 27)
export {
  isCallYourShotEligible, getDeclarations, evaluateCallYourShotResult, resolveCallYourShot,
} from './systems/call-your-shot';
export type { ShotDeclaration, CallYourShotResult, CallYourShotEligibility } from './systems/call-your-shot';

// Systems — Ghost Broadcasts (Sprint 27)
export {
  determineCommentaryStyle, generateGhostLine, shouldIncludeGhostBroadcast,
} from './systems/ghost-broadcasts';
export type { GhostCommentator, GhostBroadcastLine } from './systems/ghost-broadcasts';

// Systems — Franchise Doctrines (Sprint 27)
export {
  DOCTRINE_DEFS, getAllDoctrines, getDoctrineById,
  checkDoctrineEligibility, awardDoctrine, getDoctrinesByCategory,
} from './systems/franchise-doctrines';
export type { DoctrineDef, EarnedDoctrine, DoctrineId } from './systems/franchise-doctrines';

// Save
export { SaveStateSchema, migrate, registerMigration } from './save';
export type { SaveState } from './save';
