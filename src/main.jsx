/**
 * MFD v100 — Vite Entry Point
 *
 * This is the new modular entry point. Currently it validates
 * that the extracted modules load correctly, then falls back
 * to the original monolithic App for actual gameplay.
 *
 * As Phase 3 progresses, AppCore will be fully ported to use
 * these modules instead of inline definitions.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../mr-football-v100.jsx';
import { APP_SUBTITLE, APP_TITLE } from './app/launcher-copy.js';
import LauncherShell from './app/launcher-shell.jsx';

// Validate extracted modules load correctly
import { RNG, mulberry32, setSeed, rng, pick, U, LZW } from './utils/index.js';
import {
  T, SP, RAD, SH, S,
  DIFF_SETTINGS, SAVE_VERSION, CAP_MATH, getSalaryCap,
  POS_DEF, RATING_LABELS, ALL_POSITIONS, OFF_POSITIONS, DEF_POSITIONS,
  OFF_SCHEMES, DEF_SCHEMES, OFF_PLANS, DEF_PLANS,
  SCHEME_COUNTERS, SCHEME_FX, SCHEME_FLAVOR, getSchemeFlavorLine,
  GAMEPLANS, GP_COUNTERS, HOME_FIELD_ADV, RIVALRY_NAMES,
  ARCHETYPES, ARCH_BOOST, COACH_TRAITS, ARCH_TRAIT_POOLS, CLIQUE_TYPES,
  KEYMAP, ACTION_KEYS, TAB_ORDER,
} from './config/index.js';
import {
  HALFTIME_V2,
  TRAINING_CAMP_986,
  FRANCHISE_TAG_986,
  COMP_PICKS_986,
  INCENTIVES_986,
  GM_REP_986,
  COACH_CAROUSEL_986,
  makeContract,
  calcCapHit,
  calcDeadMoney,
  restructureContract,
  CONTRACT_VALUE_TABLE_994,
  AGE_VALUE_CURVE_994,
  calcContractScore994,
  calcDeadCap994,
  calcFourthDownEV995,
  OWNER_ARCHETYPES,
  initOwner,
  updateOwnerApproval,
  getOwnerStatus,
  getPersonality,
  traitScalar,
  generatePersonality,
  PERS_ICONS,
  PERS_LABELS,
  getDominantTrait,
  getContractPersonalityEffects,
  chemistryMod,
  systemFitMod,
  updateSystemFit,
  resetSystemFit,
  TRAITS,
  TRAIT_FX,
  TRAIT_MILESTONES95,
  getPlayerTraits95,
  hasTrait95,
  assignTraits,
  checkTraitMilestones95,
  makePick,
  pickConditionText972,
  pickValue,
  draftContract,
  aucContract,
  SCHEME_FIT,
  calcSchemeFit,
  fitTierFromScore,
  getPlayerSide,
  calcPlayerIdentityFit,
  calcTeamFit,
  getSchemeMismatchWarnings,
  FIT_GROUP_DEFS,
  voidYearDeadCap,
  v36_capHit,
  v36_deadIfTraded,
  v36_tradeSavings,
  splitDeadCapCharge,
  calcTradeImpact,
  addVoidYears,
  getTradeValue,
  getTeamNeeds,
  getGMTradeThresholdMod,
  getGMFABias,
  getGMDraftBias,
  STARTER_COUNTS,
  SCOUT_COSTS86,
  SCOUT_POINT_BASE86,
  genPickBlurb,
  genRunAlerts,
  NARRATIVE_STATES,
  STORY_ARC_EVENTS,
  pickWeightedEvent,
  RIVALRY_TROPHIES_986,
  POWER_RANKINGS_986,
  CAP_PROJ_986,
  GENERATIONAL_986,
  OWNER_MODE_986,
  PLAYER_COMPARE_986,
  TIMELINE_986,
  CEREMONY_986,
  PRACTICE_SQUAD_986,
  HOLDOUT_V2_986,
  EXPANSION_DRAFT_986,
  SCOUT_SPEND_MENU95,
  SCOUT_MATH,
  SCOUT_NOTE_FLAVOR,
  getScoutNoteFlavor,
  UNLOCK_DEFS,
  DEFAULT_UNLOCKS,
  checkUnlocks,
  isTabUnlocked,
  SPECIAL_PLAYS_993,
  SPECIAL_COVERAGES_993,
  EP_TABLE_993,
  getEP993,
  LEVERAGE_INDEX_993,
  calcWinProbV2_993,
  PLAYBOOK_986,
  PRESS_CONF_986,
  LEGACY,
  RELOCATION_CITIES976,
  RELOCATION976,
  GM_STRATEGIES,
  applyGMStrategy,
  FO_TRAITS,
  FRONT_OFFICE,
  STORY_ARC_ENGINE,
  WEEKLY_CHALLENGES,
  TRADE_DEADLINE_FRENZY,
  TEAM_CLIMATES,
  CLIMATE_PROFILES,
  WEATHER,
  HT_CONDITIONS,
  HT_STRATEGIES,
  AGE_CURVES,
  PLAYER_ARCHETYPES,
  ARCHETYPE_AGING,
  COACH_SKILL_TREE,
  OWNER_PATIENCE,
  OWNER_CONFIDENCE_ARC,
  OWNER_CONSEQUENCES,
  TRADE_MATH,
  RECORDS_WALL,
  GM_TRADE_PITCH,
  getGMTradePitch,
  BREAKOUT_SYSTEM,
  GRUDGE_MATCH,
  REVENGE_GAME,
  MENTOR_SYSTEM,
  STAFF_POACHING,
  ALL_TIME_RECORDS,
  FILM,
  AGENT_TYPES,
  assignAgentType,
  getAgentTypeObj,
  TRUST_TREND,
  AGING_V2,
  TRUST,
  getPosMarketTier86,
  HOLDOUT_SYSTEM,
  calcFatigueMultiplier,
  calcGameScriptMult,
  calcWeekDeltas,
  attributeCause,
  AWARD_HISTORY_LOG,
  recordAwardHistory,
  getMultiTimeWinners,
  getTrophyName,
  setTrophyNameForRivalry,
  buildCareerPage,
  COACH_LEGACY_LOG,
  updateCoachLegacy,
  recordCoachRing,
  getCoachLegacyTop,
  buildDNAImpactReport,
  calcTradeValue,
  calcPickValue,
  evaluateTradePackage,
  RING_OF_HONOR_LOG,
  nominateForRing,
  autoRingOfHonor,
  getRingOfHonor,
  OWNER_PERSONALITY_EVENTS,
  checkOwnerPersonality,
  buildAwardsCeremony,
  buildCapVisualization,
  ROLE_DEFS,
  assignDefaultRoles,
  getRoleSnapPct,
  calcDominanceScore,
  calcDynastyIndex,
  calcPeakPower,
  calcLongevity,
  generateIdentityTags,
  ERA_THRESHOLD,
  generateEraCards,
  buildHallOfSeasons,
  rivalryKey,
  checkHateWeek,
  MOMENT_GRAVITY,
  addRivalryMoment,
  getBiggestMoment,
  MOMENT_CATEGORIES,
  categorizeMoment,
  buildRivalryTrophyCase,
  buildRivalryLadder,
  buildRivalryLadderLite,
  generateHighlights,
  generateReceipts,
  FIX_IT_DRILLS,
  PRACTICE_FOCUS,
  CAPTAIN_RULES,
  CAPTAIN_MOMENT_TYPES,
  PROSPECT_CLAIMS,
  CLINIC_TRACKS,
  CLINIC,
  CLINIC_MATH,
  MEDIA_TAGS,
  PRESS_TAG_MAP,
  getMediaPersona,
  CREDIBILITY_MATH,
  RIVALRY_MATH,
  PRESS_QUESTIONS,
  HEADLINES,
  HALL_OF_FAME_LOG,
  HOF_SPEECHES,
  getHOFSpeech,
  calcLegacyScore,
  autoHallOfFame,
  buildCapFixes,
  SCOUT,
  OC_SPECIALTIES,
  DC_SPECIALTIES,
  assignCoordSpecialty,
  PROSPECT_CHARACTER,
  BUST_STEAL_CALC,
  DRAFT_DAY_TRADES,
  DRAFT_EVAL,
  INJURY_REPORT,
  buildBracketTree,
  DOSSIER,
  SCOUT_REPORT,
  PROSPECT_DOSSIER,
  DRAFT_WAR_ROOM,
  OFFSEASON_EVENTS,
  OWNER_GOAL_TEMPLATES,
  COACH_GOAL_TEMPLATES,
  PLAYER_GOAL_TEMPLATES,
  generateSeasonGoals,
  generatePlayerGoals,
  updateGoalProgress,
  evaluateGoals,
  LOCKER_EVENTS,
  checkLockerEvents,
  getCoachTraitMods,
  OWNER_TYPES,
  OWNER_GOALS,
  STAT_HEADLINES,
  getStatHeadline,
  getTraitMoraleExplainer,
  STORY_TEMPLATES,
  PRESSER_TAG_TRIGGERS,
  gradeL,
  getFuzzyRating,
  getFuzzyGrade,
  OFFSEASON_NEWS,
} from './systems/index.js';
import {
  TD,
  LEAGUE_TEAM_COUNT97,
  REG_SEASON_WEEKS97,
  REG_SEASON_GAMES97,
  LEAGUE_POOL_SCALE97,
  MFD97_CONF_DIV_MAP,
  LEAGUE_STRUCTURE,
  applyLeagueAlignment97,
  getScaledCount97,
  CALENDAR,
  STADIUM_DEALS976,
  generateStadiumDeals976,
  TEAM_FLAVOR_991,
  getTeamFlavor991,
  LOCKER_ROOM_994,
  COACH_PLAYER_VOICE_994,
  PLAYOFF_NARRATIVE_993,
  COMEBACK_994,
  TRADE_DEADLINE_994,
  DYNASTY_MOMENTS_995,
  STADIUM_UPGRADE_995,
  CHAMPION_VOICE_995,
  POWER_RANKINGS_SHOW_995,
  COACH_PERSONALITIES_991,
  BROADCAST_COMMENTARY,
  BROADCAST_COMMENTARY_EXPANDED,
  MFSN_DRAFT_LINES,
  MFSN_SHOW,
  MFSN_CONTENT_991,
  MFSN_WEEKLY975,
  MFSN_BROADCAST,
  MFSN_DRAFT_GRADES,
  MFSN_PREDICTIONS,
  MFSN_EXPANDED_993,
  MFSN_SITUATIONAL_994,
  MFSN_FOURTH_DOWN_994,
  MFSN_DRIVES_994,
  SOCIAL_FEED_994,
  MFSN_OVERTIME_994,
  PLAYER_NAMES_991,
  SCOUTING_TEMPLATES_991,
  DRAFT_COMMENTARY,
  getDraftCommentary,
  DRAFT_ANALYST_993,
  RIVALRY_TRASH_991,
  COL_POWER,
  COL_G5,
  COL_FCS,
  COL_WEIGHTED,
  pickCollege,
  BROADCAST_VOICES_991,
  DRAFT_PRESSER975,
  HELP_SECTIONS,
  SKIN_TONES,
  HAIR_COLORS,
  FA_NARRATIVE_993,
  PRESS_CONFERENCE_993,
} from './data/index.js';

// Module validation — runs on boot, logs to console
function validateModules() {
  var errors = [];

  // RNG
  var rng1 = mulberry32(42);
  var v1 = rng1();
  var v2 = rng1();
  if (typeof v1 !== 'number' || v1 < 0 || v1 >= 1) errors.push('mulberry32 output out of range');
  if (v1 === v2) errors.push('mulberry32 produced identical consecutive values');

  // Theme
  if (T.bg !== '#070d17') errors.push('Theme T.bg mismatch'); // Bloomberg Edition
  if (!S.btn || !S.btnPrimary) errors.push('Style objects missing');

  // Difficulty
  if (DIFF_SETTINGS.rookie.tradeMod !== 0.85) errors.push('DIFF_SETTINGS.rookie.tradeMod mismatch');
  if (DIFF_SETTINGS.legend.injMod !== 1.5) errors.push('DIFF_SETTINGS.legend.injMod mismatch');

  // Cap Math
  if (CAP_MATH.BASE_CAP !== 255.0) errors.push('CAP_MATH.BASE_CAP mismatch');
  var cap2026 = getSalaryCap(2026);
  if (cap2026 !== 255) errors.push('getSalaryCap(2026) = ' + cap2026 + ', expected 255');

  // Systems
  if (HALFTIME_V2.options.length !== 6) errors.push('HALFTIME_V2 options count mismatch');
  if (HALFTIME_V2.recommend(-14, 80, 80) !== 'no_huddle') errors.push('HALFTIME_V2.recommend logic error');
  if (TRAINING_CAMP_986.focuses.length !== 5) errors.push('TRAINING_CAMP focuses count mismatch');
  if (FRANCHISE_TAG_986.types.length !== 3) errors.push('FRANCHISE_TAG types count mismatch');
  if (INCENTIVES_986.types.length !== 7) errors.push('INCENTIVES types count mismatch');

  // Comp Picks
  var compResult = COMP_PICKS_986.calculate(
    [{ name: 'Test', pos: 'QB', ovr: 82 }],
    []
  );
  if (compResult.length !== 1) errors.push('COMP_PICKS calculation error');

  // Contracts
  var c = makeContract(10, 3, 6, 15);
  if (!c || c.baseSalary !== 10) errors.push('makeContract baseSalary error');
  var hit = calcCapHit(c);
  if (hit <= 0) errors.push('calcCapHit returned <= 0');

  // GM Rep
  var rep = GM_REP_986.calculate([], null);
  if (rep.overall !== 43) errors.push('GM_REP base overall mismatch');

  // Positions
  if (!POS_DEF.QB || POS_DEF.QB.r.length !== 20) errors.push('POS_DEF.QB ratings count mismatch');
  if (ALL_POSITIONS.length !== 11) errors.push('ALL_POSITIONS count: ' + ALL_POSITIONS.length + ', expected 11');
  if (OFF_POSITIONS.length !== 5) errors.push('OFF_POSITIONS count mismatch');
  if (DEF_POSITIONS.length !== 4) errors.push('DEF_POSITIONS count mismatch');
  if (!RATING_LABELS.arm) errors.push('RATING_LABELS missing arm');

  // Schemes
  if (OFF_SCHEMES.length !== 8) errors.push('OFF_SCHEMES count: ' + OFF_SCHEMES.length);
  if (DEF_SCHEMES.length !== 5) errors.push('DEF_SCHEMES count: ' + DEF_SCHEMES.length);
  if (OFF_PLANS.length !== 6) errors.push('OFF_PLANS count mismatch');
  if (DEF_PLANS.length !== 6) errors.push('DEF_PLANS count mismatch');
  if (!SCHEME_COUNTERS.air_raid) errors.push('SCHEME_COUNTERS missing air_raid');
  if (GAMEPLANS.length !== 6) errors.push('GAMEPLANS count mismatch');
  if (typeof getSchemeFlavorLine !== 'function') errors.push('getSchemeFlavorLine not a function');

  // Coaching
  if (ARCHETYPES.HC.length !== 3) errors.push('ARCHETYPES.HC count mismatch');
  if (!ARCH_BOOST['QB Guru']) errors.push('ARCH_BOOST missing QB Guru');
  if (Object.keys(COACH_TRAITS).length !== 10) errors.push('COACH_TRAITS count mismatch');
  if (CLIQUE_TYPES.length !== 3) errors.push('CLIQUE_TYPES count mismatch');

  // Owner
  if (OWNER_ARCHETYPES.length !== 5) errors.push('OWNER_ARCHETYPES count mismatch');
  if (typeof initOwner !== 'function') errors.push('initOwner not a function');
  if (getOwnerStatus(90).label !== 'Thrilled') errors.push('getOwnerStatus(90) label mismatch');
  if (getOwnerStatus(10).label !== 'Furious') errors.push('getOwnerStatus(10) label mismatch');

  // Personality
  var testPers = getPersonality({ personality: { workEthic: 9, loyalty: 7, greed: 3, pressure: 8, ambition: 6 } });
  if (testPers.workEthic !== 9) errors.push('getPersonality workEthic mismatch');
  if (typeof traitScalar !== 'function') errors.push('traitScalar not a function');
  if (typeof generatePersonality !== 'function') errors.push('generatePersonality not a function');
  if (!PERS_ICONS.workEthic) errors.push('PERS_ICONS missing workEthic');
  if (!PERS_LABELS.loyalty) errors.push('PERS_LABELS missing loyalty');
  if (typeof getDominantTrait !== 'function') errors.push('getDominantTrait not a function');
  if (typeof getContractPersonalityEffects !== 'function') errors.push('getContractPersonalityEffects not a function');

  // Chemistry & System Fit
  if (typeof chemistryMod !== 'function') errors.push('chemistryMod not a function');
  if (typeof systemFitMod !== 'function') errors.push('systemFitMod not a function');
  if (typeof updateSystemFit !== 'function') errors.push('updateSystemFit not a function');
  if (typeof resetSystemFit !== 'function') errors.push('resetSystemFit not a function');
  var chemTeam = { roster: [{ chemistry: 85 }, { chemistry: 90 }] };
  if (chemistryMod(chemTeam) !== 3) errors.push('chemistryMod high-chem team mismatch');
  if (chemistryMod({ roster: [] }) !== 0) errors.push('chemistryMod empty roster mismatch');

  // Teams / League Data
  if (TD.length !== 30) errors.push('TD team count: ' + TD.length + ', expected 30');
  if (LEAGUE_TEAM_COUNT97 !== 30) errors.push('LEAGUE_TEAM_COUNT97 mismatch');
  if (REG_SEASON_WEEKS97 !== 18) errors.push('REG_SEASON_WEEKS97 mismatch');
  if (REG_SEASON_GAMES97 !== 17) errors.push('REG_SEASON_GAMES97 mismatch');
  if (!MFD97_CONF_DIV_MAP.hawks) errors.push('MFD97_CONF_DIV_MAP missing hawks');
  if (LEAGUE_STRUCTURE.conferences.length !== 2) errors.push('LEAGUE_STRUCTURE conferences count mismatch');
  if (LEAGUE_STRUCTURE.divisions.length !== 6) errors.push('LEAGUE_STRUCTURE divisions count mismatch');
  if (typeof applyLeagueAlignment97 !== 'function') errors.push('applyLeagueAlignment97 not a function');
  if (typeof getScaledCount97 !== 'function') errors.push('getScaledCount97 not a function');
  if (CALENDAR.length !== 16) errors.push('CALENDAR length: ' + CALENDAR.length + ', expected 16');

  // Traits
  if (Object.keys(TRAITS).length !== 25) errors.push('TRAITS count: ' + Object.keys(TRAITS).length + ', expected 25');
  if (!TRAITS.captain || TRAITS.captain.pct !== 6) errors.push('TRAITS.captain mismatch');
  if (!TRAIT_FX.clutch || TRAIT_FX.clutch.clutch !== 5) errors.push('TRAIT_FX.clutch mismatch');
  if (!TRAIT_MILESTONES95.ironman) errors.push('TRAIT_MILESTONES95 missing ironman');
  if (typeof hasTrait95 !== 'function') errors.push('hasTrait95 not a function');
  var testPlayer95 = { traits95: ['captain', 'clutch'] };
  if (!hasTrait95(testPlayer95, 'captain')) errors.push('hasTrait95 failed on captain');
  if (hasTrait95(testPlayer95, 'glass')) errors.push('hasTrait95 false positive on glass');
  var traits95 = getPlayerTraits95(testPlayer95);
  if (traits95.length !== 2) errors.push('getPlayerTraits95 count mismatch');
  if (typeof assignTraits !== 'function') errors.push('assignTraits not a function');
  if (typeof checkTraitMilestones95 !== 'function') errors.push('checkTraitMilestones95 not a function');

  // Draft Utils
  if (typeof makePick !== 'function') errors.push('makePick not a function');
  var testPk = makePick(1, 'hawks', 'hawks', 2026);
  if (!testPk.pid || testPk.round !== 1) errors.push('makePick output error');
  if (pickConditionText972({ type: 'playoff', upgradeRound: 2 }).indexOf('playoffs') < 0) errors.push('pickConditionText972 mismatch');
  if (pickValue(1) !== 200) errors.push('pickValue(1) expected 200, got ' + pickValue(1));
  if (pickValue(7) !== 5) errors.push('pickValue(7) expected 5, got ' + pickValue(7));
  var dCon = draftContract(85, 1);
  if (!dCon || dCon.years !== 4) errors.push('draftContract(85,1) years mismatch');
  var aCon = aucContract(85, 100, 1000);
  if (!aCon || aCon.years !== 4) errors.push('aucContract(85,100) years mismatch');

  // Scheme Fit
  if (Object.keys(SCHEME_FIT).length !== 13) errors.push('SCHEME_FIT count: ' + Object.keys(SCHEME_FIT).length + ', expected 13');
  var fitResult = calcSchemeFit({ pos: 'QB', ratings: { accuracy: 90, speed: 80, awareness: 85 } }, 'spread');
  if (!fitResult || fitResult.score < 80) errors.push('calcSchemeFit spread QB score too low: ' + (fitResult && fitResult.score));
  if (fitTierFromScore(92) !== 'ELITE') errors.push('fitTierFromScore(92) mismatch');
  if (fitTierFromScore(55) !== 'FRINGE') errors.push('fitTierFromScore(55) mismatch');
  if (getPlayerSide('QB') !== 'off') errors.push('getPlayerSide(QB) mismatch');
  if (getPlayerSide('CB') !== 'def') errors.push('getPlayerSide(CB) mismatch');
  if (getPlayerSide('K') !== 'other') errors.push('getPlayerSide(K) mismatch');
  if (typeof calcPlayerIdentityFit !== 'function') errors.push('calcPlayerIdentityFit not a function');
  if (typeof calcTeamFit !== 'function') errors.push('calcTeamFit not a function');
  if (typeof getSchemeMismatchWarnings !== 'function') errors.push('getSchemeMismatchWarnings not a function');
  if (FIT_GROUP_DEFS.length !== 7) errors.push('FIT_GROUP_DEFS count: ' + FIT_GROUP_DEFS.length);

  // Contract Helpers
  var testCon = makeContract(10, 3, 6, 15);
  if (v36_capHit(testCon) <= 0) errors.push('v36_capHit returned <= 0');
  if (typeof v36_deadIfTraded !== 'function') errors.push('v36_deadIfTraded not a function');
  if (typeof v36_tradeSavings !== 'function') errors.push('v36_tradeSavings not a function');
  if (voidYearDeadCap(testCon) !== 0) errors.push('voidYearDeadCap on no-void contract should be 0');
  var splitResult = splitDeadCapCharge(10, 'regular', 12);
  if (!splitResult.postDeadline) errors.push('splitDeadCapCharge post-deadline flag mismatch');
  if (splitResult.now !== 5) errors.push('splitDeadCapCharge 50/50 split mismatch');
  var splitPre = splitDeadCapCharge(10, 'regular', 5);
  if (splitPre.postDeadline) errors.push('splitDeadCapCharge pre-deadline should not split');
  if (typeof calcTradeImpact !== 'function') errors.push('calcTradeImpact not a function');
  if (typeof addVoidYears !== 'function') errors.push('addVoidYears not a function');

  // Trade AI
  if (typeof getTradeValue !== 'function') errors.push('getTradeValue not a function');
  var testTradePlayer = { ovr: 85, pot: 90, age: 26, pos: 'QB', contract: makeContract(10, 3, 6, 15) };
  var tv = getTradeValue(testTradePlayer, null, null);
  if (tv <= 0) errors.push('getTradeValue returned <= 0 for elite QB');
  if (typeof getTeamNeeds !== 'function') errors.push('getTeamNeeds not a function');
  var gmMod = getGMTradeThresholdMod('rebuild');
  if (gmMod.sellMod !== 0.85) errors.push('getGMTradeThresholdMod rebuild sellMod mismatch');
  if (gmMod.buyMod !== 1.15) errors.push('getGMTradeThresholdMod rebuild buyMod mismatch');
  if (typeof getGMFABias !== 'function') errors.push('getGMFABias not a function');
  if (typeof getGMDraftBias !== 'function') errors.push('getGMDraftBias not a function');

  // Scouting
  if (STARTER_COUNTS.QB !== 1) errors.push('STARTER_COUNTS.QB mismatch');
  if (STARTER_COUNTS.OL !== 5) errors.push('STARTER_COUNTS.OL mismatch');
  if (SCOUT_COSTS86.full !== 100) errors.push('SCOUT_COSTS86.full expected 100, got ' + SCOUT_COSTS86.full);
  if (SCOUT_POINT_BASE86 !== 1000) errors.push('SCOUT_POINT_BASE86 mismatch');
  if (typeof genPickBlurb !== 'function') errors.push('genPickBlurb not a function');
  var blurb = genPickBlurb({ pos: 'QB', ovr: 90, pot: 95, age: 22 }, []);
  if (blurb.indexOf('Elite') < 0) errors.push('genPickBlurb 90 OVR should say Elite');
  if (typeof genRunAlerts !== 'function') errors.push('genRunAlerts not a function');

  // Story Arcs
  if (!NARRATIVE_STATES.BREAKOUT) errors.push('NARRATIVE_STATES missing BREAKOUT');
  if (Object.keys(NARRATIVE_STATES).length !== 9) errors.push('NARRATIVE_STATES count: ' + Object.keys(NARRATIVE_STATES).length);
  if (!STORY_ARC_EVENTS.breakout || STORY_ARC_EVENTS.breakout.length !== 3) errors.push('STORY_ARC_EVENTS.breakout count mismatch');
  if (typeof pickWeightedEvent !== 'function') errors.push('pickWeightedEvent not a function');

  // Stadium Deals
  if (STADIUM_DEALS976.length !== 8) errors.push('STADIUM_DEALS976 count: ' + STADIUM_DEALS976.length);
  if (typeof generateStadiumDeals976 !== 'function') errors.push('generateStadiumDeals976 not a function');

  // Team Flavor
  if (Object.keys(TEAM_FLAVOR_991).length < 28) errors.push('TEAM_FLAVOR_991 team count too low: ' + Object.keys(TEAM_FLAVOR_991).length);
  if (!TEAM_FLAVOR_991.KC || !TEAM_FLAVOR_991.KC.stadium) errors.push('TEAM_FLAVOR_991 missing KC stadium');
  var kcStadium = getTeamFlavor991('KC', 'stadium');
  if (kcStadium !== 'Arrowhead West') errors.push('getTeamFlavor991 KC stadium mismatch');
  if (typeof getTeamFlavor991 !== 'function') errors.push('getTeamFlavor991 not a function');

  // Contract Value Tables (now in contracts.js)
  if (typeof CONTRACT_VALUE_TABLE_994 === 'undefined') errors.push('CONTRACT_VALUE_TABLE_994 not defined');
  if (typeof AGE_VALUE_CURVE_994 === 'undefined') errors.push('AGE_VALUE_CURVE_994 not defined');

  // Narrative Data — Locker Room
  if (!LOCKER_ROOM_994.newArrival) errors.push('LOCKER_ROOM_994 missing newArrival');
  if (!LOCKER_ROOM_994.newArrival.veteranWelcome || LOCKER_ROOM_994.newArrival.veteranWelcome.length < 10) errors.push('LOCKER_ROOM_994 veteranWelcome count low');
  if (!LOCKER_ROOM_994.chemistry) errors.push('LOCKER_ROOM_994 missing chemistry');
  if (!LOCKER_ROOM_994.coachClash) errors.push('LOCKER_ROOM_994 missing coachClash');

  // Coach Player Voice
  if (!COACH_PLAYER_VOICE_994.synergy) errors.push('COACH_PLAYER_VOICE_994 missing synergy');
  if (!COACH_PLAYER_VOICE_994.synergy.grinder_workEthic) errors.push('COACH_PLAYER_VOICE_994 missing grinder_workEthic');
  if (!COACH_PLAYER_VOICE_994.friction) errors.push('COACH_PLAYER_VOICE_994 missing friction');

  // Playoff Narrative
  if (!PLAYOFF_NARRATIVE_993.clinchedBerth || PLAYOFF_NARRATIVE_993.clinchedBerth.length < 10) errors.push('PLAYOFF_NARRATIVE_993 clinchedBerth count low');
  if (!PLAYOFF_NARRATIVE_993.championshipWin) errors.push('PLAYOFF_NARRATIVE_993 missing championshipWin');
  if (!PLAYOFF_NARRATIVE_993.superBowlLoss) errors.push('PLAYOFF_NARRATIVE_993 missing superBowlLoss');
  if (!PLAYOFF_NARRATIVE_993.firstTitleEver) errors.push('PLAYOFF_NARRATIVE_993 missing firstTitleEver');

  // Comeback
  if (!COMEBACK_994.injuryReturn) errors.push('COMEBACK_994 missing injuryReturn');
  if (!COMEBACK_994.injuryReturn.QB || COMEBACK_994.injuryReturn.QB.length < 5) errors.push('COMEBACK_994 QB injury return count low');
  if (!COMEBACK_994.slumpToBaller) errors.push('COMEBACK_994 missing slumpToBaller');
  if (!COMEBACK_994.triumphOverTrade) errors.push('COMEBACK_994 missing triumphOverTrade');

  // Trade Deadline
  if (!TRADE_DEADLINE_994.deadlineFrenzy || TRADE_DEADLINE_994.deadlineFrenzy.length < 10) errors.push('TRADE_DEADLINE_994 deadlineFrenzy count low');
  if (!TRADE_DEADLINE_994.buyerModeNarrative) errors.push('TRADE_DEADLINE_994 missing buyerModeNarrative');
  if (!TRADE_DEADLINE_994.farewellMoment) errors.push('TRADE_DEADLINE_994 missing farewellMoment');
  if (!TRADE_DEADLINE_994.lastRide) errors.push('TRADE_DEADLINE_994 missing lastRide');

  // Dynasty Moments
  if (!DYNASTY_MOMENTS_995.firstChampionship) errors.push('DYNASTY_MOMENTS_995 missing firstChampionship');
  if (!DYNASTY_MOMENTS_995.backToBack) errors.push('DYNASTY_MOMENTS_995 missing backToBack');
  if (!DYNASTY_MOMENTS_995.dynastyWatch) errors.push('DYNASTY_MOMENTS_995 missing dynastyWatch');
  if (!DYNASTY_MOMENTS_995.dynastyEnds) errors.push('DYNASTY_MOMENTS_995 missing dynastyEnds');

  // Stadium Upgrade
  if (!STADIUM_UPGRADE_995.newStadiumOpen) errors.push('STADIUM_UPGRADE_995 missing newStadiumOpen');
  if (!STADIUM_UPGRADE_995.capacityExpansion) errors.push('STADIUM_UPGRADE_995 missing capacityExpansion');
  if (!STADIUM_UPGRADE_995.jumbotron) errors.push('STADIUM_UPGRADE_995 missing jumbotron');

  // Champion Voice
  if (!CHAMPION_VOICE_995.grinder) errors.push('CHAMPION_VOICE_995 missing grinder');
  if (!CHAMPION_VOICE_995.grinder.win || CHAMPION_VOICE_995.grinder.win.length < 5) errors.push('CHAMPION_VOICE_995 grinder win count low');
  if (!CHAMPION_VOICE_995.dynastyCoach) errors.push('CHAMPION_VOICE_995 missing dynastyCoach');

  // Power Rankings Show
  if (!POWER_RANKINGS_SHOW_995.rank1 || POWER_RANKINGS_SHOW_995.rank1.length < 5) errors.push('POWER_RANKINGS_SHOW_995 rank1 count low');
  if (!POWER_RANKINGS_SHOW_995.rank21to30) errors.push('POWER_RANKINGS_SHOW_995 missing rank21to30');

  // Game Features — Mini-systems
  if (RIVALRY_TROPHIES_986.names.length !== 16) errors.push('RIVALRY_TROPHIES_986 names count: ' + RIVALRY_TROPHIES_986.names.length);
  if (typeof POWER_RANKINGS_986.generate !== 'function') errors.push('POWER_RANKINGS_986.generate not a function');
  if (typeof CAP_PROJ_986.project !== 'function') errors.push('CAP_PROJ_986.project not a function');
  if (typeof GENERATIONAL_986.shouldSpawn !== 'function') errors.push('GENERATIONAL_986.shouldSpawn not a function');
  if (OWNER_MODE_986.ticketTiers.length !== 4) errors.push('OWNER_MODE_986 ticketTiers count mismatch');
  if (typeof PLAYER_COMPARE_986.buildRadar !== 'function') errors.push('PLAYER_COMPARE_986.buildRadar not a function');
  if (typeof TIMELINE_986.addEvent !== 'function') errors.push('TIMELINE_986.addEvent not a function');
  if (typeof CEREMONY_986.generateRetirementSpeech !== 'function') errors.push('CEREMONY_986.generateRetirementSpeech not a function');
  if (PRACTICE_SQUAD_986.MAX_SIZE !== 16) errors.push('PRACTICE_SQUAD_986 MAX_SIZE mismatch');
  if (HOLDOUT_V2_986.types.length !== 3) errors.push('HOLDOUT_V2_986 types count mismatch');
  if (EXPANSION_DRAFT_986.cities.length !== 10) errors.push('EXPANSION_DRAFT_986 cities count mismatch');

  // Scout Intel
  if (SCOUT_SPEND_MENU95.length !== 12) errors.push('SCOUT_SPEND_MENU95 count: ' + SCOUT_SPEND_MENU95.length);
  if (typeof SCOUT_MATH.getErrorBand !== 'function') errors.push('SCOUT_MATH.getErrorBand not a function');
  if (SCOUT_MATH.getErrorBand(0, 0) !== 12) errors.push('SCOUT_MATH base error band mismatch');
  if (typeof getScoutNoteFlavor !== 'function') errors.push('getScoutNoteFlavor not a function');
  var snf = getScoutNoteFlavor('QB', 'workEthic');
  if (snf.indexOf('Film junkie') < 0) errors.push('getScoutNoteFlavor QB+workEthic mismatch');

  // Unlock System
  if (UNLOCK_DEFS.length !== 5) errors.push('UNLOCK_DEFS count: ' + UNLOCK_DEFS.length);
  if (typeof checkUnlocks !== 'function') errors.push('checkUnlocks not a function');
  var godU = checkUnlocks(null, { week: 1, year: 2026, phase: 'regular' }, [], 'test', true);
  if (!godU.frontOffice || !godU.legacy) errors.push('checkUnlocks godMode should unlock all');
  if (typeof isTabUnlocked !== 'function') errors.push('isTabUnlocked not a function');
  if (!isTabUnlocked('home', {}, false)) errors.push('isTabUnlocked home should always be open');

  // LZW Compression
  if (typeof LZW.compress !== 'function') errors.push('LZW.compress not a function');
  var lzTest = LZW.compress('hello world');
  if (LZW.decompress(lzTest) !== 'hello world') errors.push('LZW round-trip failed');

  // Keyboard Config
  if (KEYMAP['1'] !== 'home') errors.push('KEYMAP 1 should map to home');
  if (ACTION_KEYS[' '] !== 'simWeek') errors.push('ACTION_KEYS space should map to simWeek');
  if (TAB_ORDER.length !== 10) errors.push('TAB_ORDER length: ' + TAB_ORDER.length);

  // Special Plays
  if (SPECIAL_PLAYS_993.trickPlays.length !== 4) errors.push('SPECIAL_PLAYS_993 trickPlays count: ' + SPECIAL_PLAYS_993.trickPlays.length);
  if (SPECIAL_PLAYS_993.passVariants.length !== 3) errors.push('SPECIAL_PLAYS_993 passVariants count: ' + SPECIAL_PLAYS_993.passVariants.length);
  if (SPECIAL_COVERAGES_993.length !== 4) errors.push('SPECIAL_COVERAGES_993 count: ' + SPECIAL_COVERAGES_993.length);

  // Win Probability Engine
  if (!EP_TABLE_993[1] || !EP_TABLE_993[4]) errors.push('EP_TABLE_993 missing downs');
  if (typeof getEP993 !== 'function') errors.push('getEP993 not a function');
  var epTest = getEP993(1, 5, 50);
  if (typeof epTest !== 'number' || epTest < 1 || epTest > 3) errors.push('getEP993 1st & 5 at mid expected 1-3, got ' + epTest);
  if (!LEVERAGE_INDEX_993[4] || LEVERAGE_INDEX_993[4].tied !== 3.0) errors.push('LEVERAGE_INDEX_993 Q4 tied mismatch');
  if (typeof calcWinProbV2_993 !== 'function') errors.push('calcWinProbV2_993 not a function');

  // Playbook
  if (!PLAYBOOK_986.offense) errors.push('PLAYBOOK_986 missing offense');
  if (!PLAYBOOK_986.offense.run || PLAYBOOK_986.offense.run.length < 5) errors.push('PLAYBOOK_986 run plays count low');
  if (!PLAYBOOK_986.defense) errors.push('PLAYBOOK_986 missing defense');

  // Press Conference
  if (PRESS_CONF_986.questions.length !== 8) errors.push('PRESS_CONF_986 questions count: ' + PRESS_CONF_986.questions.length);
  if (typeof PRESS_CONF_986.generate !== 'function') errors.push('PRESS_CONF_986.generate not a function');
  if (!PRESS_CONF_986.responses.confident) errors.push('PRESS_CONF_986 missing confident response');

  // Legacy System
  if (typeof LEGACY.buildStats !== 'function') errors.push('LEGACY.buildStats not a function');
  if (typeof LEGACY.calcScore !== 'function') errors.push('LEGACY.calcScore not a function');
  var legacyTest = LEGACY.calcScore({ games: 100, wins: 70, losses: 30, rings: 2, playoffs: 5, draftHits: 3, capMastery: 2, devSuccesses: 3, neverTanked: true, fired: false, years: 6 });
  if (!legacyTest.tier || legacyTest.score < 50) errors.push('LEGACY.calcScore test failed');

  // Relocation
  if (RELOCATION_CITIES976.length !== 10) errors.push('RELOCATION_CITIES976 count: ' + RELOCATION_CITIES976.length);
  if (typeof RELOCATION976.canRelocate !== 'function') errors.push('RELOCATION976.canRelocate not a function');
  if (typeof RELOCATION976.relocate !== 'function') errors.push('RELOCATION976.relocate not a function');

  // Coach Personalities
  if (!COACH_PERSONALITIES_991.grinder) errors.push('COACH_PERSONALITIES_991 missing grinder');
  if (!COACH_PERSONALITIES_991.firestarter) errors.push('COACH_PERSONALITIES_991 missing firestarter');
  if (Object.keys(COACH_PERSONALITIES_991).length !== 6) errors.push('COACH_PERSONALITIES_991 archetype count: ' + Object.keys(COACH_PERSONALITIES_991).length);

  // Broadcast Commentary
  if (!BROADCAST_COMMENTARY.drives) errors.push('BROADCAST_COMMENTARY missing drives');
  if (!BROADCAST_COMMENTARY.drives.TD || BROADCAST_COMMENTARY.drives.TD.length < 5) errors.push('BROADCAST_COMMENTARY TD commentary count low');
  if (!BROADCAST_COMMENTARY_EXPANDED.drives) errors.push('BROADCAST_COMMENTARY_EXPANDED missing drives');

  // MFSN Network
  if (!Array.isArray(MFSN_DRAFT_LINES) || MFSN_DRAFT_LINES.length < 5) errors.push('MFSN_DRAFT_LINES count low');
  if (!MFSN_SHOW.generateBroadcast && !MFSN_SHOW.segments) errors.push('MFSN_SHOW missing structure');
  if (!MFSN_CONTENT_991) errors.push('MFSN_CONTENT_991 not loaded');
  if (!MFSN_WEEKLY975) errors.push('MFSN_WEEKLY975 not loaded');
  if (!MFSN_BROADCAST) errors.push('MFSN_BROADCAST not loaded');
  if (!MFSN_DRAFT_GRADES) errors.push('MFSN_DRAFT_GRADES not loaded');
  if (!MFSN_PREDICTIONS) errors.push('MFSN_PREDICTIONS not loaded');

  // MFSN Expanded
  if (!MFSN_EXPANDED_993.drives) errors.push('MFSN_EXPANDED_993 missing drives');
  if (!MFSN_EXPANDED_993.injuries) errors.push('MFSN_EXPANDED_993 missing injuries');
  if (!MFSN_EXPANDED_993.crowd) errors.push('MFSN_EXPANDED_993 missing crowd');

  // MFSN Game Day
  if (!MFSN_SITUATIONAL_994.situational) errors.push('MFSN_SITUATIONAL_994 missing situational');
  if (!MFSN_FOURTH_DOWN_994) errors.push('MFSN_FOURTH_DOWN_994 not loaded');
  if (!MFSN_DRIVES_994) errors.push('MFSN_DRIVES_994 not loaded');
  if (!SOCIAL_FEED_994) errors.push('SOCIAL_FEED_994 not loaded');
  if (!MFSN_OVERTIME_994) errors.push('MFSN_OVERTIME_994 not loaded');

  // GM Strategies
  if (!GM_STRATEGIES.rebuild || !GM_STRATEGIES.contend || !GM_STRATEGIES.neutral) errors.push('GM_STRATEGIES missing strategy modes');
  if (GM_STRATEGIES.rebuild.tradePosture !== 'seller') errors.push('GM_STRATEGIES rebuild tradePosture mismatch');
  if (GM_STRATEGIES.contend.tradePosture !== 'buyer') errors.push('GM_STRATEGIES contend tradePosture mismatch');
  if (typeof applyGMStrategy !== 'function') errors.push('applyGMStrategy not a function');

  // Front Office
  if (typeof FRONT_OFFICE.generateStaff !== 'function') errors.push('FRONT_OFFICE.generateStaff not a function');
  if (typeof FRONT_OFFICE.getBonus !== 'function') errors.push('FRONT_OFFICE.getBonus not a function');
  if (typeof FRONT_OFFICE.getCandidates !== 'function') errors.push('FRONT_OFFICE.getCandidates not a function');
  if (FRONT_OFFICE.roles.length !== 7) errors.push('FRONT_OFFICE roles count: ' + FRONT_OFFICE.roles.length + ', expected 7');
  if (Object.keys(FO_TRAITS).length !== 15) errors.push('FO_TRAITS count: ' + Object.keys(FO_TRAITS).length + ', expected 15');

  // Story Arc Engine
  if (typeof STORY_ARC_ENGINE.initPlayer !== 'function') errors.push('STORY_ARC_ENGINE.initPlayer not a function');
  if (typeof STORY_ARC_ENGINE.tickPlayer !== 'function') errors.push('STORY_ARC_ENGINE.tickPlayer not a function');
  if (typeof STORY_ARC_ENGINE.tickTeam !== 'function') errors.push('STORY_ARC_ENGINE.tickTeam not a function');
  if (typeof STORY_ARC_ENGINE.normalizePlayer !== 'function') errors.push('STORY_ARC_ENGINE.normalizePlayer not a function');
  if (typeof STORY_ARC_ENGINE.getTargetState !== 'function') errors.push('STORY_ARC_ENGINE.getTargetState not a function');

  // Weekly Challenges
  if (!WEEKLY_CHALLENGES.pool || WEEKLY_CHALLENGES.pool.length !== 10) errors.push('WEEKLY_CHALLENGES pool count: ' + (WEEKLY_CHALLENGES.pool && WEEKLY_CHALLENGES.pool.length) + ', expected 10');
  if (typeof WEEKLY_CHALLENGES.generateWeekly !== 'function') errors.push('WEEKLY_CHALLENGES.generateWeekly not a function');
  if (typeof WEEKLY_CHALLENGES.checkResults !== 'function') errors.push('WEEKLY_CHALLENGES.checkResults not a function');
  if (!WEEKLY_CHALLENGES.pool[0].check || typeof WEEKLY_CHALLENGES.pool[0].check !== 'function') errors.push('WEEKLY_CHALLENGES pool check functions missing');

  // Trade Deadline Frenzy
  if (typeof TRADE_DEADLINE_FRENZY.isDeadlineWindow !== 'function') errors.push('TRADE_DEADLINE_FRENZY.isDeadlineWindow not a function');
  if (typeof TRADE_DEADLINE_FRENZY.generateAITrades !== 'function') errors.push('TRADE_DEADLINE_FRENZY.generateAITrades not a function');
  if (!TRADE_DEADLINE_FRENZY.isDeadlineWindow(9)) errors.push('TRADE_DEADLINE_FRENZY week 9 should be deadline window');
  if (TRADE_DEADLINE_FRENZY.isDeadlineWindow(5)) errors.push('TRADE_DEADLINE_FRENZY week 5 should NOT be deadline window');

  // Weather System
  if (Object.keys(TEAM_CLIMATES).length < 18) errors.push('TEAM_CLIMATES count too low: ' + Object.keys(TEAM_CLIMATES).length);
  if (!CLIMATE_PROFILES.dome || !CLIMATE_PROFILES.cold) errors.push('CLIMATE_PROFILES missing dome or cold');
  if (typeof WEATHER.getConditions !== 'function') errors.push('WEATHER.getConditions not a function');
  if (typeof WEATHER.getImpact !== 'function') errors.push('WEATHER.getImpact not a function');
  var wxTest = WEATHER.getConditions('hawks', 5, 12345);
  if (!wxTest.precip || typeof wxTest.temp !== 'number') errors.push('WEATHER.getConditions output structure invalid');
  if (HT_CONDITIONS.length !== 5) errors.push('HT_CONDITIONS count: ' + HT_CONDITIONS.length + ', expected 5');
  if (HT_STRATEGIES.length !== 6) errors.push('HT_STRATEGIES count: ' + HT_STRATEGIES.length + ', expected 6');

  // Player Archetypes
  if (typeof PLAYER_ARCHETYPES.classify !== 'function') errors.push('PLAYER_ARCHETYPES.classify not a function');
  var archTest = PLAYER_ARCHETYPES.classify({pos:'QB',ratings:{pocketPresence:90,accuracy:88,fieldVision:85,decisionSpeed:87}});
  if (!archTest || !archTest.archetype) errors.push('PLAYER_ARCHETYPES.classify failed for QB');
  if (Object.keys(ARCHETYPE_AGING.mods).length !== 30) errors.push('ARCHETYPE_AGING mods count: ' + Object.keys(ARCHETYPE_AGING.mods).length + ', expected 30');
  if (typeof ARCHETYPE_AGING.getCurve !== 'function') errors.push('ARCHETYPE_AGING.getCurve not a function');
  if (!AGE_CURVES.QB || !AGE_CURVES.RB) errors.push('AGE_CURVES missing QB or RB');
  if (Object.keys(AGE_CURVES).length !== 10) errors.push('AGE_CURVES position count: ' + Object.keys(AGE_CURVES).length + ', expected 10');

  // Coach Skill Tree
  if (!COACH_SKILL_TREE.trees.Strategist) errors.push('COACH_SKILL_TREE missing Strategist');
  if (!COACH_SKILL_TREE.trees.Motivator) errors.push('COACH_SKILL_TREE missing Motivator');
  if (!COACH_SKILL_TREE.trees.Disciplinarian) errors.push('COACH_SKILL_TREE missing Disciplinarian');
  if (COACH_SKILL_TREE.trees.Strategist.branches.length !== 3) errors.push('COACH_SKILL_TREE Strategist branches: ' + COACH_SKILL_TREE.trees.Strategist.branches.length);
  if (typeof COACH_SKILL_TREE.getTreeKey !== 'function') errors.push('COACH_SKILL_TREE.getTreeKey not a function');
  if (typeof COACH_SKILL_TREE.getActiveBonus !== 'function') errors.push('COACH_SKILL_TREE.getActiveBonus not a function');
  if (COACH_SKILL_TREE.getTreeKey('QB Guru') !== 'Strategist') errors.push('COACH_SKILL_TREE getTreeKey QB Guru mismatch');

  // Owner Extended
  if (typeof OWNER_PATIENCE.tick !== 'function') errors.push('OWNER_PATIENCE.tick not a function');
  if (typeof OWNER_PATIENCE.status !== 'function') errors.push('OWNER_PATIENCE.status not a function');
  if (OWNER_PATIENCE.status(90).label !== 'ECSTATIC') errors.push('OWNER_PATIENCE status(90) label mismatch');
  if (OWNER_PATIENCE.status(5).label !== 'CRISIS') errors.push('OWNER_PATIENCE status(5) label mismatch');
  if (OWNER_CONFIDENCE_ARC.stages.length !== 4) errors.push('OWNER_CONFIDENCE_ARC stages count: ' + OWNER_CONFIDENCE_ARC.stages.length);
  if (typeof OWNER_CONFIDENCE_ARC.get !== 'function') errors.push('OWNER_CONFIDENCE_ARC.get not a function');
  if (OWNER_CONSEQUENCES.ultimatums.length !== 3) errors.push('OWNER_CONSEQUENCES ultimatums count: ' + OWNER_CONSEQUENCES.ultimatums.length);
  if (OWNER_CONSEQUENCES.furiousPenalties.length !== 3) errors.push('OWNER_CONSEQUENCES furiousPenalties count mismatch');

  // Trade Math
  if (typeof TRADE_MATH.classify !== 'function') errors.push('TRADE_MATH.classify not a function');
  var tmTest = TRADE_MATH.classify(20, false);
  if (tmTest.classification !== 'fleece') errors.push('TRADE_MATH.classify(20) should be fleece');
  if (typeof TRADE_MATH.trustLabel !== 'function') errors.push('TRADE_MATH.trustLabel not a function');
  if (TRADE_MATH.trustLabel(80).label !== 'Trusted') errors.push('TRADE_MATH.trustLabel(80) mismatch');
  if (RECORDS_WALL.categories.length !== 13) errors.push('RECORDS_WALL categories count: ' + RECORDS_WALL.categories.length);
  if (typeof RECORDS_WALL.build !== 'function') errors.push('RECORDS_WALL.build not a function');
  if (typeof getGMTradePitch !== 'function') errors.push('getGMTradePitch not a function');
  if (!GM_TRADE_PITCH.analytics || GM_TRADE_PITCH.analytics.length < 2) errors.push('GM_TRADE_PITCH analytics count low');

  // Player Names
  if (!PLAYER_NAMES_991.first.classic || PLAYER_NAMES_991.first.classic.length < 30) errors.push('PLAYER_NAMES_991 classic first names count low');
  if (!PLAYER_NAMES_991.first.modern || PLAYER_NAMES_991.first.modern.length < 30) errors.push('PLAYER_NAMES_991 modern first names count low');
  if (!PLAYER_NAMES_991.last.common || PLAYER_NAMES_991.last.common.length < 40) errors.push('PLAYER_NAMES_991 common last names count low');
  if (!PLAYER_NAMES_991.positionWeights.QB) errors.push('PLAYER_NAMES_991 missing QB position weights');
  if (Object.keys(PLAYER_NAMES_991.positionWeights).length !== 11) errors.push('PLAYER_NAMES_991 position weights count: ' + Object.keys(PLAYER_NAMES_991.positionWeights).length);

  // Breakout System
  if (typeof BREAKOUT_SYSTEM.isEligible !== 'function') errors.push('BREAKOUT_SYSTEM.isEligible not a function');
  if (typeof BREAKOUT_SYSTEM.pick !== 'function') errors.push('BREAKOUT_SYSTEM.pick not a function');
  if (typeof BREAKOUT_SYSTEM.resolve !== 'function') errors.push('BREAKOUT_SYSTEM.resolve not a function');
  if (typeof BREAKOUT_SYSTEM.milestoneCheck !== 'function') errors.push('BREAKOUT_SYSTEM.milestoneCheck not a function');
  if (!BREAKOUT_SYSTEM.isEligible({age:23,ovr:68,pot:78,devTrait:'normal'})) errors.push('BREAKOUT_SYSTEM.isEligible should accept 23yr 68ovr');
  if (BREAKOUT_SYSTEM.isEligible({age:30,ovr:68,pot:78,devTrait:'normal'})) errors.push('BREAKOUT_SYSTEM.isEligible should reject age 30');

  // Grudge Match & Revenge Game
  if (typeof GRUDGE_MATCH.markGrudge !== 'function') errors.push('GRUDGE_MATCH.markGrudge not a function');
  if (typeof GRUDGE_MATCH.isGrudgeGame !== 'function') errors.push('GRUDGE_MATCH.isGrudgeGame not a function');
  if (typeof GRUDGE_MATCH.applyBoost !== 'function') errors.push('GRUDGE_MATCH.applyBoost not a function');
  if (typeof REVENGE_GAME.check !== 'function') errors.push('REVENGE_GAME.check not a function');
  if (typeof REVENGE_GAME.getBonus !== 'function') errors.push('REVENGE_GAME.getBonus not a function');

  // Mentor System
  if (typeof MENTOR_SYSTEM.isMentorEligible !== 'function') errors.push('MENTOR_SYSTEM.isMentorEligible not a function');
  if (typeof MENTOR_SYSTEM.isMenteeEligible !== 'function') errors.push('MENTOR_SYSTEM.isMenteeEligible not a function');
  if (typeof MENTOR_SYSTEM.canPair !== 'function') errors.push('MENTOR_SYSTEM.canPair not a function');
  if (typeof MENTOR_SYSTEM.weeklyBonus !== 'function') errors.push('MENTOR_SYSTEM.weeklyBonus not a function');
  if (Object.keys(MENTOR_SYSTEM.posGroups).length !== 7) errors.push('MENTOR_SYSTEM posGroups count: ' + Object.keys(MENTOR_SYSTEM.posGroups).length);

  // Staff Poaching
  if (typeof STAFF_POACHING.checkPoach !== 'function') errors.push('STAFF_POACHING.checkPoach not a function');
  if (typeof STAFF_POACHING.counterOfferCost !== 'function') errors.push('STAFF_POACHING.counterOfferCost not a function');
  if (typeof STAFF_POACHING.applyPoach !== 'function') errors.push('STAFF_POACHING.applyPoach not a function');

  // All-Time Records
  if (ALL_TIME_RECORDS.categories.length !== 12) errors.push('ALL_TIME_RECORDS categories count: ' + ALL_TIME_RECORDS.categories.length);
  if (typeof ALL_TIME_RECORDS.buildRecords !== 'function') errors.push('ALL_TIME_RECORDS.buildRecords not a function');
  var emptyRec = ALL_TIME_RECORDS.buildRecords([]);
  if (!emptyRec.passYds || !emptyRec.teamWins) errors.push('ALL_TIME_RECORDS.buildRecords empty result structure invalid');

  // Scouting Templates
  if (!SCOUTING_TEMPLATES_991.QB) errors.push('SCOUTING_TEMPLATES_991 missing QB');
  if (!SCOUTING_TEMPLATES_991.QB.elite || SCOUTING_TEMPLATES_991.QB.elite.length < 3) errors.push('SCOUTING_TEMPLATES_991 QB elite count low');
  if (!SCOUTING_TEMPLATES_991.RB) errors.push('SCOUTING_TEMPLATES_991 missing RB');
  if (!SCOUTING_TEMPLATES_991.WR) errors.push('SCOUTING_TEMPLATES_991 missing WR');
  if (Object.keys(SCOUTING_TEMPLATES_991).length !== 9) errors.push('SCOUTING_TEMPLATES_991 position count: ' + Object.keys(SCOUTING_TEMPLATES_991).length);

  // Draft Commentary
  if (!DRAFT_COMMENTARY.r1elite) errors.push('DRAFT_COMMENTARY missing r1elite');
  if (typeof getDraftCommentary !== 'function') errors.push('getDraftCommentary not a function');
  if (getDraftCommentary(1, 85) !== DRAFT_COMMENTARY.r1elite) errors.push('getDraftCommentary(1,85) should return r1elite');
  if (getDraftCommentary(2, 75) !== DRAFT_COMMENTARY.r2steal) errors.push('getDraftCommentary(2,75) should return r2steal');

  // Draft Analyst
  if (!DRAFT_ANALYST_993.rodPemberton) errors.push('DRAFT_ANALYST_993 missing rodPemberton');
  if (!DRAFT_ANALYST_993.rodPemberton.steal || DRAFT_ANALYST_993.rodPemberton.steal.length < 5) errors.push('DRAFT_ANALYST_993 rodPemberton steal count low');
  if (!DRAFT_ANALYST_993.rodPemberton.reach) errors.push('DRAFT_ANALYST_993 missing rodPemberton.reach');
  if (!DRAFT_ANALYST_993.rodPemberton.meh) errors.push('DRAFT_ANALYST_993 missing rodPemberton.meh');
  if (!DRAFT_ANALYST_993.rodPemberton.flop) errors.push('DRAFT_ANALYST_993 missing rodPemberton.flop');

  // Film Study
  if (typeof FILM.analyze !== 'function') errors.push('FILM.analyze not a function');
  if (typeof FILM.gradeOff !== 'function') errors.push('FILM.gradeOff not a function');
  if (typeof FILM.gradeDef !== 'function') errors.push('FILM.gradeDef not a function');
  if (typeof FILM.gradeST !== 'function') errors.push('FILM.gradeST not a function');
  if (typeof FILM.letterGrade !== 'function') errors.push('FILM.letterGrade not a function');
  if (FILM.letterGrade(92) !== 'A+') errors.push('FILM.letterGrade(92) should be A+');
  if (FILM.letterGrade(55) !== 'C') errors.push('FILM.letterGrade(55) should be C');
  if (FILM.gradeOff(28, null) < 70) errors.push('FILM.gradeOff(28) should be >= 70');

  // Agent Types
  if (AGENT_TYPES.length !== 5) errors.push('AGENT_TYPES count: ' + AGENT_TYPES.length + ', expected 5');
  if (!AGENT_TYPES[0].moneyWeight) errors.push('AGENT_TYPES missing moneyWeight');
  if (typeof assignAgentType !== 'function') errors.push('assignAgentType not a function');
  if (typeof getAgentTypeObj !== 'function') errors.push('getAgentTypeObj not a function');
  if (getAgentTypeObj('mercenary').moneyWeight !== 0.95) errors.push('getAgentTypeObj mercenary moneyWeight mismatch');
  if (getAgentTypeObj('ring_chaser').ringWeight !== 0.95) errors.push('getAgentTypeObj ring_chaser ringWeight mismatch');

  // Trust & Aging
  if (typeof TRUST_TREND.getArrow !== 'function') errors.push('TRUST_TREND.getArrow not a function');
  if (TRUST_TREND.getArrow(60, 50) !== '📈') errors.push('TRUST_TREND.getArrow(60,50) should be 📈');
  if (TRUST_TREND.getArrow(40, 50) !== '📉') errors.push('TRUST_TREND.getArrow(40,50) should be 📉');
  if (typeof AGING_V2.getMultiplier !== 'function') errors.push('AGING_V2.getMultiplier not a function');
  if (AGING_V2.getMultiplier('awareness', 'prime', 5) !== -0.5) errors.push('AGING_V2 mental prime should be -0.5');
  if (typeof TRUST.leagueSnapshot !== 'function') errors.push('TRUST.leagueSnapshot not a function');

  // Holdout System
  if (typeof HOLDOUT_SYSTEM.checkHoldouts !== 'function') errors.push('HOLDOUT_SYSTEM.checkHoldouts not a function');
  if (typeof HOLDOUT_SYSTEM.weeklyHoldout !== 'function') errors.push('HOLDOUT_SYSTEM.weeklyHoldout not a function');
  if (typeof HOLDOUT_SYSTEM.resolve !== 'function') errors.push('HOLDOUT_SYSTEM.resolve not a function');
  if (typeof getPosMarketTier86 !== 'function') errors.push('getPosMarketTier86 not a function');
  var qbMarket = getPosMarketTier86('QB');
  if (qbMarket.tier !== 1 || qbMarket.mult !== 2.5) errors.push('getPosMarketTier86 QB tier/mult mismatch');
  var rbMarket = getPosMarketTier86('RB');
  if (rbMarket.tier !== 3) errors.push('getPosMarketTier86 RB tier mismatch');

  // Game Helpers
  if (typeof calcFatigueMultiplier !== 'function') errors.push('calcFatigueMultiplier not a function');
  if (calcFatigueMultiplier(90, 100) !== 0.92) errors.push('calcFatigueMultiplier(90,100) should be 0.92');
  if (calcFatigueMultiplier(50, 100) !== 1.0) errors.push('calcFatigueMultiplier(50,100) should be 1.0');
  if (typeof calcGameScriptMult !== 'function') errors.push('calcGameScriptMult not a function');
  if (calcGameScriptMult(28, 14, 'RB', 'rb1') !== 1.15) errors.push('calcGameScriptMult blowout RB1 mismatch');
  if (typeof calcWeekDeltas !== 'function') errors.push('calcWeekDeltas not a function');
  if (typeof attributeCause !== 'function') errors.push('attributeCause not a function');

  // Award History
  if (Array.isArray(AWARD_HISTORY_LOG)) {} else errors.push('AWARD_HISTORY_LOG not an array');
  if (typeof recordAwardHistory !== 'function') errors.push('recordAwardHistory not a function');
  if (typeof getMultiTimeWinners !== 'function') errors.push('getMultiTimeWinners not a function');
  if (typeof getTrophyName !== 'function') errors.push('getTrophyName not a function');
  if (getTrophyName({'a-b': 'Test Cup'}, 'a', 'b') !== 'Test Cup') errors.push('getTrophyName lookup mismatch');
  if (getTrophyName(null, 'a', 'b') !== null) errors.push('getTrophyName null should return null');
  if (typeof setTrophyNameForRivalry !== 'function') errors.push('setTrophyNameForRivalry not a function');
  if (typeof buildCareerPage !== 'function') errors.push('buildCareerPage not a function');
  if (buildCareerPage(null, null, null) !== null) errors.push('buildCareerPage null inputs should return null');

  // Coach Legacy
  if (typeof COACH_LEGACY_LOG !== 'object') errors.push('COACH_LEGACY_LOG not an object');
  if (typeof updateCoachLegacy !== 'function') errors.push('updateCoachLegacy not a function');
  if (typeof recordCoachRing !== 'function') errors.push('recordCoachRing not a function');
  if (typeof getCoachLegacyTop !== 'function') errors.push('getCoachLegacyTop not a function');

  // DNA Impact
  if (typeof buildDNAImpactReport !== 'function') errors.push('buildDNAImpactReport not a function');
  if (buildDNAImpactReport(null, null, null) !== null) errors.push('buildDNAImpactReport null should return null');

  // Trade Value
  if (typeof calcTradeValue !== 'function') errors.push('calcTradeValue not a function');
  var tvTest = calcTradeValue({ovr: 85, age: 25, pos: 'QB', pot: 90});
  if (tvTest < 150) errors.push('calcTradeValue elite young QB too low: ' + tvTest);
  if (typeof calcPickValue !== 'function') errors.push('calcPickValue not a function');
  if (calcPickValue(1) !== 80) errors.push('calcPickValue(1) should be 80');
  if (calcPickValue(2) !== 50) errors.push('calcPickValue(2) should be 50');
  if (typeof evaluateTradePackage !== 'function') errors.push('evaluateTradePackage not a function');
  var epTest = evaluateTradePackage([{type:'pick',round:1}], [{type:'pick',round:3}]);
  if (epTest.verdict !== 'OVERPAY') errors.push('evaluateTradePackage 1st-for-3rd should be OVERPAY');

  // Ring of Honor
  if (typeof RING_OF_HONOR_LOG !== 'object') errors.push('RING_OF_HONOR_LOG not an object');
  if (typeof nominateForRing !== 'function') errors.push('nominateForRing not a function');
  if (typeof autoRingOfHonor !== 'function') errors.push('autoRingOfHonor not a function');
  if (typeof getRingOfHonor !== 'function') errors.push('getRingOfHonor not a function');
  var emptyRing = getRingOfHonor('nonexistent');
  if (!Array.isArray(emptyRing) || emptyRing.length !== 0) errors.push('getRingOfHonor empty team should return []');

  // Owner Personality
  if (OWNER_PERSONALITY_EVENTS.length !== 10) errors.push('OWNER_PERSONALITY_EVENTS count: ' + OWNER_PERSONALITY_EVENTS.length + ', expected 10');
  if (typeof checkOwnerPersonality !== 'function') errors.push('checkOwnerPersonality not a function');
  if (checkOwnerPersonality(null, null, null, function(){return 0;}) !== null) errors.push('checkOwnerPersonality null should return null');

  // Awards Ceremony
  if (typeof buildAwardsCeremony !== 'function') errors.push('buildAwardsCeremony not a function');
  if (buildAwardsCeremony(null) !== null) errors.push('buildAwardsCeremony null should return null');
  var acTest = buildAwardsCeremony({mvp:{name:'Test',pos:'QB',team:'TST',line:'30 TD'},year:2026});
  if (!acTest || acTest.reveal.length !== 1) errors.push('buildAwardsCeremony MVP-only should have 1 reveal');

  // Cap Visualization
  if (typeof buildCapVisualization !== 'function') errors.push('buildCapVisualization not a function');
  if (buildCapVisualization(null) !== null) errors.push('buildCapVisualization null should return null');
  var cvTest = buildCapVisualization({roster:[{pos:'QB',ovr:85,age:27,contract:{salary:20,years:3}}],deadCap:5});
  if (!cvTest || cvTest.breakdown.length !== 1) errors.push('buildCapVisualization single-player breakdown mismatch');
  if (cvTest && cvTest.totalUsed !== 20) errors.push('buildCapVisualization totalUsed should be 20');

  // Role Definitions
  if (!ROLE_DEFS.RB || ROLE_DEFS.RB.length !== 3) errors.push('ROLE_DEFS.RB count: ' + (ROLE_DEFS.RB && ROLE_DEFS.RB.length));
  if (!ROLE_DEFS.WR || ROLE_DEFS.WR.length !== 3) errors.push('ROLE_DEFS.WR count mismatch');
  if (!ROLE_DEFS.DL || ROLE_DEFS.DL.length !== 2) errors.push('ROLE_DEFS.DL count mismatch');
  if (!ROLE_DEFS.LB || ROLE_DEFS.LB.length !== 3) errors.push('ROLE_DEFS.LB count mismatch');
  if (typeof assignDefaultRoles !== 'function') errors.push('assignDefaultRoles not a function');
  if (typeof getRoleSnapPct !== 'function') errors.push('getRoleSnapPct not a function');
  if (getRoleSnapPct('RB', 'rb1') !== 65) errors.push('getRoleSnapPct RB rb1 should be 65');

  // Dynasty Analytics
  if (typeof calcDominanceScore !== 'function') errors.push('calcDominanceScore not a function');
  if (typeof calcDynastyIndex !== 'function') errors.push('calcDynastyIndex not a function');
  if (calcDynastyIndex({seasons:0}) !== 0) errors.push('calcDynastyIndex zero seasons should be 0');
  if (typeof calcPeakPower !== 'function') errors.push('calcPeakPower not a function');
  if (typeof calcLongevity !== 'function') errors.push('calcLongevity not a function');
  if (typeof generateIdentityTags !== 'function') errors.push('generateIdentityTags not a function');
  if (ERA_THRESHOLD !== 30) errors.push('ERA_THRESHOLD should be 30');
  if (typeof generateEraCards !== 'function') errors.push('generateEraCards not a function');
  if (typeof buildHallOfSeasons !== 'function') errors.push('buildHallOfSeasons not a function');

  // Rivalry Engine
  if (typeof rivalryKey !== 'function') errors.push('rivalryKey not a function');
  if (rivalryKey('a','b') !== 'a|b') errors.push('rivalryKey a,b should be a|b');
  if (rivalryKey('b','a') !== 'a|b') errors.push('rivalryKey b,a should sort to a|b');
  if (typeof checkHateWeek !== 'function') errors.push('checkHateWeek not a function');
  if (Object.keys(MOMENT_GRAVITY).length !== 5) errors.push('MOMENT_GRAVITY count: ' + Object.keys(MOMENT_GRAVITY).length);
  if (typeof addRivalryMoment !== 'function') errors.push('addRivalryMoment not a function');
  if (typeof getBiggestMoment !== 'function') errors.push('getBiggestMoment not a function');
  if (getBiggestMoment([]) !== null) errors.push('getBiggestMoment empty should return null');
  if (Object.keys(MOMENT_CATEGORIES).length !== 5) errors.push('MOMENT_CATEGORIES count: ' + Object.keys(MOMENT_CATEGORIES).length);
  if (typeof categorizeMoment !== 'function') errors.push('categorizeMoment not a function');
  if (typeof buildRivalryTrophyCase !== 'function') errors.push('buildRivalryTrophyCase not a function');
  if (typeof buildRivalryLadder !== 'function') errors.push('buildRivalryLadder not a function');
  if (typeof buildRivalryLadderLite !== 'function') errors.push('buildRivalryLadderLite not a function');
  if (typeof generateHighlights !== 'function') errors.push('generateHighlights not a function');
  if (typeof generateReceipts !== 'function') errors.push('generateReceipts not a function');
  if (!FIX_IT_DRILLS.pressureRate) errors.push('FIX_IT_DRILLS missing pressureRate');
  if (!FIX_IT_DRILLS.turnovers) errors.push('FIX_IT_DRILLS missing turnovers');
  if (Object.keys(FIX_IT_DRILLS).length !== 9) errors.push('FIX_IT_DRILLS count: ' + Object.keys(FIX_IT_DRILLS).length);

  // Rivalry Trash Talk
  if (!RIVALRY_TRASH_991.mild || RIVALRY_TRASH_991.mild.length < 10) errors.push('RIVALRY_TRASH_991 mild count low');
  if (!RIVALRY_TRASH_991.spicy || RIVALRY_TRASH_991.spicy.length < 10) errors.push('RIVALRY_TRASH_991 spicy count low');
  if (!RIVALRY_TRASH_991.atomic || RIVALRY_TRASH_991.atomic.length < 10) errors.push('RIVALRY_TRASH_991 atomic count low');

  if (errors.length === 0) {
    console.log('%c[MFD] All ' + 466 + ' module checks passed', 'color: #34d399; font-weight: bold');
    return true;
  } else {
    console.error('[MFD] Module validation errors:', errors);
    return false;
  }
}

var modulesOk = validateModules();

// For now, render a status page showing the module system is working
function ModuleStatusApp() {
  var systems = [
    { name: 'RNG (mulberry32)', status: true },
    { name: 'Theme (T, SP, RAD, SH, S)', status: !!T.bg },
    { name: 'Difficulty Settings', status: !!DIFF_SETTINGS.rookie },
    { name: 'Cap Math', status: getSalaryCap(2026) === 255 },
    { name: 'Halftime Adjustments v2', status: HALFTIME_V2.options.length === 6 },
    { name: 'Training Camp', status: TRAINING_CAMP_986.focuses.length === 5 },
    { name: 'Franchise Tags', status: FRANCHISE_TAG_986.types.length === 3 },
    { name: 'Compensatory Picks', status: typeof COMP_PICKS_986.calculate === 'function' },
    { name: 'Contract Incentives', status: INCENTIVES_986.types.length === 7 },
    { name: 'GM Reputation', status: typeof GM_REP_986.calculate === 'function' },
    { name: 'Position Definitions (11 pos, 20 ratings each)', status: ALL_POSITIONS.length === 11 },
    { name: 'Rating Labels', status: !!RATING_LABELS.arm },
    { name: 'Offensive Schemes (8)', status: OFF_SCHEMES.length === 8 },
    { name: 'Defensive Schemes (5)', status: DEF_SCHEMES.length === 5 },
    { name: 'Game Plans (Off: 6, Def: 6)', status: OFF_PLANS.length === 6 && DEF_PLANS.length === 6 },
    { name: 'Scheme Counter Matrix', status: !!SCHEME_COUNTERS.air_raid },
    { name: 'Scheme FX & Flavor Text', status: !!SCHEME_FX.air_raid && !!SCHEME_FLAVOR.spread },
    { name: 'Coaching Archetypes (HC/OC/DC)', status: ARCHETYPES.HC.length === 3 },
    { name: 'Coach Traits (10 traits)', status: Object.keys(COACH_TRAITS).length === 10 },
    { name: 'Clique Types', status: CLIQUE_TYPES.length === 3 },
    { name: 'Owner Archetypes (5 types)', status: OWNER_ARCHETYPES.length === 5 },
    { name: 'Owner Approval System', status: typeof initOwner === 'function' },
    { name: 'Coach Carousel', status: typeof COACH_CAROUSEL_986.fireCoach === 'function' },
    { name: 'Contract System', status: typeof makeContract === 'function' },
    { name: 'Contract Scoring', status: typeof calcContractScore994 === 'function' },
    { name: 'Dead Cap Calculator', status: typeof calcDeadCap994 === 'function' },
    { name: '4th Down EV Calculator', status: typeof calcFourthDownEV995 === 'function' },
    { name: 'Personality System (5 axes)', status: typeof getPersonality === 'function' },
    { name: 'Personality Icons & Labels', status: !!PERS_ICONS.workEthic && !!PERS_LABELS.loyalty },
    { name: 'Dominant Trait Detection', status: typeof getDominantTrait === 'function' },
    { name: 'Contract Personality Effects', status: typeof getContractPersonalityEffects === 'function' },
    { name: 'Chemistry Modifier', status: typeof chemistryMod === 'function' },
    { name: 'System Fit Modifier', status: typeof systemFitMod === 'function' },
    { name: 'System Fit Growth/Reset', status: typeof updateSystemFit === 'function' && typeof resetSystemFit === 'function' },
    { name: 'Team Definitions (30 teams)', status: TD.length === 30 },
    { name: 'League Structure (2 conf, 6 div)', status: LEAGUE_STRUCTURE.conferences.length === 2 && LEAGUE_STRUCTURE.divisions.length === 6 },
    { name: 'Conference/Division Map', status: !!MFD97_CONF_DIV_MAP.hawks },
    { name: 'Season Calendar (16 events)', status: CALENDAR.length === 16 },
    { name: 'League Scaling Utilities', status: typeof getScaledCount97 === 'function' },
    { name: 'Player Traits (25 traits)', status: Object.keys(TRAITS).length === 25 },
    { name: 'Trait Effects (FX)', status: !!TRAIT_FX.clutch },
    { name: 'Trait Milestones (10 traits)', status: !!TRAIT_MILESTONES95.ironman },
    { name: 'Trait Detection (hasTrait95)', status: typeof hasTrait95 === 'function' },
    { name: 'Trait Assignment (up to 3)', status: typeof assignTraits === 'function' },
    { name: 'Draft Pick Creation', status: typeof makePick === 'function' },
    { name: 'Conditional Pick Logic', status: typeof pickConditionText972 === 'function' },
    { name: 'Pick Value Chart', status: pickValue(1) === 200 },
    { name: 'Draft Contracts', status: typeof draftContract === 'function' },
    { name: 'Auction Contracts', status: typeof aucContract === 'function' },
    { name: 'Scheme Fit Profiles (13 schemes)', status: Object.keys(SCHEME_FIT).length === 13 },
    { name: 'Scheme Fit Calculator', status: typeof calcSchemeFit === 'function' },
    { name: 'Player Identity Fit (composite)', status: typeof calcPlayerIdentityFit === 'function' },
    { name: 'Team Fit Aggregation', status: typeof calcTeamFit === 'function' },
    { name: 'Scheme Mismatch Warnings', status: typeof getSchemeMismatchWarnings === 'function' },
    { name: 'Fit Group Definitions', status: FIT_GROUP_DEFS.length === 7 },
    { name: 'Contract Cap Hit (v36)', status: typeof v36_capHit === 'function' },
    { name: 'Dead Cap & Trade Savings', status: typeof v36_deadIfTraded === 'function' },
    { name: 'Void Year Dead Cap', status: typeof voidYearDeadCap === 'function' },
    { name: 'Dead Cap Split (post-deadline)', status: typeof splitDeadCapCharge === 'function' },
    { name: 'Trade Impact Calculator', status: typeof calcTradeImpact === 'function' },
    { name: 'Void Year Management', status: typeof addVoidYears === 'function' },
    { name: 'Trade Value Calculator', status: typeof getTradeValue === 'function' },
    { name: 'Team Needs Analysis', status: typeof getTeamNeeds === 'function' },
    { name: 'GM Strategy Modifiers', status: typeof getGMTradeThresholdMod === 'function' },
    { name: 'GM FA & Draft Bias', status: typeof getGMFABias === 'function' && typeof getGMDraftBias === 'function' },
    { name: 'Starter Counts (11 pos)', status: STARTER_COUNTS.QB === 1 && STARTER_COUNTS.OL === 5 },
    { name: 'Scout Costs & Points', status: SCOUT_COSTS86.full === 100 },
    { name: 'Draft Blurb Generator', status: typeof genPickBlurb === 'function' },
    { name: 'Draft Run Alerts', status: typeof genRunAlerts === 'function' },
    { name: 'Narrative States (9 arcs)', status: Object.keys(NARRATIVE_STATES).length === 9 },
    { name: 'Story Arc Events', status: !!STORY_ARC_EVENTS.breakout },
    { name: 'Weighted Event Picker', status: typeof pickWeightedEvent === 'function' },
    { name: 'Stadium Deals (8 templates)', status: STADIUM_DEALS976.length === 8 },
    { name: 'Stadium Deal Generator', status: typeof generateStadiumDeals976 === 'function' },
    { name: 'Team Flavor (30 stadiums/fans)', status: Object.keys(TEAM_FLAVOR_991).length >= 28 },
    { name: 'Contract Value Tables (11 pos)', status: !!CONTRACT_VALUE_TABLE_994.QB },
    { name: 'Age Value Curves (11 pos)', status: !!AGE_VALUE_CURVE_994.QB },
    { name: 'Locker Room Narratives', status: !!LOCKER_ROOM_994.newArrival },
    { name: 'Coach-Player Voice (synergy/friction)', status: !!COACH_PLAYER_VOICE_994.synergy },
    { name: 'Playoff Narrative (9 categories)', status: !!PLAYOFF_NARRATIVE_993.clinchedBerth },
    { name: 'Comeback & Redemption Arcs', status: !!COMEBACK_994.injuryReturn },
    { name: 'Trade Deadline Narrative (7 categories)', status: !!TRADE_DEADLINE_994.deadlineFrenzy },
    { name: 'Dynasty Moments (6 event types)', status: !!DYNASTY_MOMENTS_995.firstChampionship },
    { name: 'Stadium Upgrade Narrative', status: !!STADIUM_UPGRADE_995.newStadiumOpen },
    { name: 'Champion Voice (6 archetypes)', status: !!CHAMPION_VOICE_995.grinder },
    { name: 'Power Rankings Show (5 tiers)', status: !!POWER_RANKINGS_SHOW_995.rank1 },
    { name: 'Rivalry Trophies (16 names)', status: RIVALRY_TROPHIES_986.names.length === 16 },
    { name: 'Power Rankings Generator', status: typeof POWER_RANKINGS_986.generate === 'function' },
    { name: 'Cap Projections (3-year)', status: typeof CAP_PROJ_986.project === 'function' },
    { name: 'Generational Players', status: typeof GENERATIONAL_986.shouldSpawn === 'function' },
    { name: 'Owner Mode (tickets/stadium)', status: OWNER_MODE_986.ticketTiers.length === 4 },
    { name: 'Player Comparison Radar', status: typeof PLAYER_COMPARE_986.buildRadar === 'function' },
    { name: 'Franchise Timeline', status: typeof TIMELINE_986.addEvent === 'function' },
    { name: 'Retirement & HoF Ceremonies', status: typeof CEREMONY_986.generateRetirementSpeech === 'function' },
    { name: 'Practice Squad System', status: PRACTICE_SQUAD_986.MAX_SIZE === 16 },
    { name: 'Player Holdouts v2', status: HOLDOUT_V2_986.types.length === 3 },
    { name: 'Expansion Draft Event', status: EXPANSION_DRAFT_986.cities.length === 10 },
    { name: 'Scout Spending Menu (12 options)', status: SCOUT_SPEND_MENU95.length === 12 },
    { name: 'Scout Math (error bands)', status: typeof SCOUT_MATH.getErrorBand === 'function' },
    { name: 'Scout Note Flavor Text', status: typeof getScoutNoteFlavor === 'function' },
    { name: 'Unlock System (5 progressive)', status: UNLOCK_DEFS.length === 5 },
    { name: 'Tab Unlock Logic', status: typeof isTabUnlocked === 'function' },
    { name: 'LZW Compression', status: typeof LZW.compress === 'function' },
    { name: 'Keyboard Shortcuts', status: KEYMAP['1'] === 'home' },
    { name: 'Action Keys', status: ACTION_KEYS[' '] === 'simWeek' },
    { name: 'Tab Navigation Order', status: TAB_ORDER.length === 10 },
    { name: 'Special Plays (4 trick + 3 pass)', status: SPECIAL_PLAYS_993.trickPlays.length === 4 },
    { name: 'Special Coverages (4 packages)', status: SPECIAL_COVERAGES_993.length === 4 },
    { name: 'Expected Points Table (4 downs)', status: !!EP_TABLE_993[1] && !!EP_TABLE_993[4] },
    { name: 'Win Probability Engine v2', status: typeof calcWinProbV2_993 === 'function' },
    { name: 'Playbook (offense + defense)', status: !!PLAYBOOK_986.offense && !!PLAYBOOK_986.defense },
    { name: 'Press Conference System', status: PRESS_CONF_986.questions.length === 8 },
    { name: 'Legacy Score System', status: typeof LEGACY.calcScore === 'function' },
    { name: 'Relocation System (10 cities)', status: RELOCATION_CITIES976.length === 10 },
    { name: 'Coach Personalities (6 archetypes)', status: Object.keys(COACH_PERSONALITIES_991).length === 6 },
    { name: 'Broadcast Commentary (base)', status: !!BROADCAST_COMMENTARY.drives },
    { name: 'Broadcast Commentary (expanded)', status: !!BROADCAST_COMMENTARY_EXPANDED.drives },
    { name: 'MFSN Draft Commentary', status: MFSN_DRAFT_LINES.length >= 5 },
    { name: 'MFSN Show System', status: !!MFSN_SHOW },
    { name: 'MFSN Content Templates', status: !!MFSN_CONTENT_991 },
    { name: 'MFSN Weekly Show', status: !!MFSN_WEEKLY975 },
    { name: 'MFSN Broadcast Data', status: !!MFSN_BROADCAST },
    { name: 'MFSN Draft Grades', status: !!MFSN_DRAFT_GRADES },
    { name: 'MFSN Predictions', status: !!MFSN_PREDICTIONS },
    { name: 'MFSN Expanded (ST, injuries, crowd)', status: !!MFSN_EXPANDED_993.drives },
    { name: 'MFSN Situational Commentary', status: !!MFSN_SITUATIONAL_994.situational },
    { name: 'MFSN Fourth Down Analysis', status: !!MFSN_FOURTH_DOWN_994 },
    { name: 'MFSN Drive Summaries', status: !!MFSN_DRIVES_994 },
    { name: 'Social Media Feed', status: !!SOCIAL_FEED_994 },
    { name: 'MFSN Overtime Drama', status: !!MFSN_OVERTIME_994 },
    { name: 'GM Strategies (rebuild/contend/neutral)', status: !!GM_STRATEGIES.rebuild && !!GM_STRATEGIES.contend },
    { name: 'Front Office (7 roles, 15 traits)', status: FRONT_OFFICE.roles.length === 7 },
    { name: 'Story Arc Engine (state machine)', status: typeof STORY_ARC_ENGINE.tickPlayer === 'function' },
    { name: 'Weekly Challenges (10 pool)', status: WEEKLY_CHALLENGES.pool.length === 10 },
    { name: 'Trade Deadline Frenzy (AI trades)', status: typeof TRADE_DEADLINE_FRENZY.generateAITrades === 'function' },
    { name: 'Weather System (climate + impacts)', status: typeof WEATHER.getConditions === 'function' },
    { name: 'Halftime Conditions (5 states)', status: HT_CONDITIONS.length === 5 },
    { name: 'Halftime Strategies (6 options)', status: HT_STRATEGIES.length === 6 },
    { name: 'Player Archetypes (9 positions)', status: typeof PLAYER_ARCHETYPES.classify === 'function' },
    { name: 'Archetype Aging (30 curves)', status: Object.keys(ARCHETYPE_AGING.mods).length === 30 },
    { name: 'Age Curves (10 positions)', status: Object.keys(AGE_CURVES).length === 10 },
    { name: 'Coach Skill Tree (3 trees x 3 branches)', status: !!COACH_SKILL_TREE.trees.Strategist },
    { name: 'Owner Patience System', status: typeof OWNER_PATIENCE.tick === 'function' },
    { name: 'Owner Confidence Arc (4 stages)', status: OWNER_CONFIDENCE_ARC.stages.length === 4 },
    { name: 'Owner Consequences & Ultimatums', status: OWNER_CONSEQUENCES.ultimatums.length === 3 },
    { name: 'Trade Math (classify/trust/decay)', status: typeof TRADE_MATH.classify === 'function' },
    { name: 'Records Wall (13 categories)', status: RECORDS_WALL.categories.length === 13 },
    { name: 'GM Trade Pitch (6 personality types)', status: typeof getGMTradePitch === 'function' },
    { name: 'Player Names (4 pools x 11 pos)', status: !!PLAYER_NAMES_991.first.classic },
    { name: 'Breakout System (pick/resolve/milestone)', status: typeof BREAKOUT_SYSTEM.pick === 'function' },
    { name: 'Grudge Match (player revenge)', status: typeof GRUDGE_MATCH.applyBoost === 'function' },
    { name: 'Revenge Game (rivalry bonuses)', status: typeof REVENGE_GAME.check === 'function' },
    { name: 'Mentor System (7 pos groups)', status: Object.keys(MENTOR_SYSTEM.posGroups).length === 7 },
    { name: 'Staff Poaching (check/counter/apply)', status: typeof STAFF_POACHING.checkPoach === 'function' },
    { name: 'All-Time Records (12 categories)', status: ALL_TIME_RECORDS.categories.length === 12 },
    { name: 'Scouting Templates (9 positions)', status: Object.keys(SCOUTING_TEMPLATES_991).length === 9 },
    { name: 'Draft Commentary (round/OVR lines)', status: typeof getDraftCommentary === 'function' },
    { name: 'Draft Analyst (multi-personality)', status: !!DRAFT_ANALYST_993.rodPemberton },
    { name: 'Film Study (off/def/ST grading)', status: typeof FILM.analyze === 'function' },
    { name: 'Agent Types (5 FA personalities)', status: AGENT_TYPES.length === 5 },
    { name: 'Agent Type Assignment', status: typeof assignAgentType === 'function' },
    { name: 'Trust Trend Indicators', status: typeof TRUST_TREND.getArrow === 'function' },
    { name: 'Aging v2 (physical/mental/technique)', status: typeof AGING_V2.getMultiplier === 'function' },
    { name: 'GM Trust Snapshot', status: typeof TRUST.leagueSnapshot === 'function' },
    { name: 'Holdout System (5 stages)', status: typeof HOLDOUT_SYSTEM.checkHoldouts === 'function' },
    { name: 'Position Market Tiers', status: typeof getPosMarketTier86 === 'function' },
    { name: 'Fatigue Multiplier (snap-based)', status: typeof calcFatigueMultiplier === 'function' },
    { name: 'Game Script Multiplier', status: typeof calcGameScriptMult === 'function' },
    { name: 'Week-over-Week Deltas', status: typeof calcWeekDeltas === 'function' },
    { name: 'Performance Attribution Engine', status: typeof attributeCause === 'function' },
    { name: 'Award History Tracking', status: Array.isArray(AWARD_HISTORY_LOG) },
    { name: 'Multi-Time Award Winners', status: typeof getMultiTimeWinners === 'function' },
    { name: 'Rivalry Trophy Names', status: typeof getTrophyName === 'function' },
    { name: 'Player Career Pages', status: typeof buildCareerPage === 'function' },
    { name: 'Coach Legacy Tracking', status: typeof updateCoachLegacy === 'function' },
    { name: 'Coach Ring Records', status: typeof recordCoachRing === 'function' },
    { name: 'DNA Impact Reports', status: typeof buildDNAImpactReport === 'function' },
    { name: 'Trade Value Calculator (simple)', status: typeof calcTradeValue === 'function' },
    { name: 'Pick Value Chart (simple)', status: calcPickValue(1) === 80 },
    { name: 'Trade Package Evaluator', status: typeof evaluateTradePackage === 'function' },
    { name: 'Ring of Honor System', status: typeof nominateForRing === 'function' },
    { name: 'Ring of Honor (auto-nom)', status: typeof autoRingOfHonor === 'function' },
    { name: 'Owner Personality Events (10)', status: OWNER_PERSONALITY_EVENTS.length === 10 },
    { name: 'Owner Personality Checker', status: typeof checkOwnerPersonality === 'function' },
    { name: 'Awards Ceremony Builder', status: typeof buildAwardsCeremony === 'function' },
    { name: 'Cap Visualization (breakdown)', status: typeof buildCapVisualization === 'function' },
    { name: 'Role Definitions (RB/WR/DL/LB)', status: !!ROLE_DEFS.RB && ROLE_DEFS.RB.length === 3 },
    { name: 'Role Assignment & Snap %', status: typeof assignDefaultRoles === 'function' && typeof getRoleSnapPct === 'function' },
    { name: 'Dominance Score Calculator', status: typeof calcDominanceScore === 'function' },
    { name: 'Dynasty Index (multi-factor)', status: typeof calcDynastyIndex === 'function' },
    { name: 'Peak Power Window (5-year)', status: typeof calcPeakPower === 'function' },
    { name: 'Longevity Tracker', status: typeof calcLongevity === 'function' },
    { name: 'Identity Tags (up to 3)', status: typeof generateIdentityTags === 'function' },
    { name: 'Era Card Generator', status: typeof generateEraCards === 'function' },
    { name: 'Hall of Seasons (top 20)', status: typeof buildHallOfSeasons === 'function' },
    { name: 'Rivalry Key & Hate Week', status: typeof rivalryKey === 'function' && typeof checkHateWeek === 'function' },
    { name: 'Rivalry Moments (5 gravity levels)', status: Object.keys(MOMENT_GRAVITY).length === 5 },
    { name: 'Rivalry Trophy Case', status: typeof buildRivalryTrophyCase === 'function' },
    { name: 'Rivalry Ladder (full + lite)', status: typeof buildRivalryLadder === 'function' && typeof buildRivalryLadderLite === 'function' },
    { name: 'Game Highlights & Receipts', status: typeof generateHighlights === 'function' && typeof generateReceipts === 'function' },
    { name: 'Fix-It Drills (9 types)', status: Object.keys(FIX_IT_DRILLS).length === 9 },
    { name: 'Rivalry Trash Talk (3 tiers)', status: !!RIVALRY_TRASH_991.mild && !!RIVALRY_TRASH_991.spicy && !!RIVALRY_TRASH_991.atomic },
    { name: 'College Pipeline (Power 50)', status: COL_POWER.length === 50 },
    { name: 'College Pipeline (G5 29)', status: COL_G5.length === 29 },
    { name: 'College Pipeline (FCS 9)', status: COL_FCS.length === 9 },
    { name: 'College Weighted Pool', status: COL_WEIGHTED.length > 50 },
    { name: 'Pick College Function', status: typeof pickCollege === 'function' },
    { name: 'Broadcast Voices (3 announcers)', status: BROADCAST_VOICES_991.voices.length === 3 },
    { name: 'Broadcast Voice Calls', status: typeof BROADCAST_VOICES_991.getCall === 'function' },
    { name: 'Practice Focus (4 options)', status: PRACTICE_FOCUS.length === 4 },
    { name: 'Captain Rules (system)', status: CAPTAIN_RULES.eligibleMinOvr === 70 },
    { name: 'Captain Moment Types (3)', status: CAPTAIN_MOMENT_TYPES.length === 3 },
    { name: 'Prospect Claims (generate)', status: typeof PROSPECT_CLAIMS.generate === 'function' },
    { name: 'Prospect Claims (verify)', status: typeof PROSPECT_CLAIMS.verify === 'function' },
    { name: 'Coaching Clinic Tracks (5)', status: CLINIC_TRACKS.length === 5 },
    { name: 'Coaching Clinic (earnXP)', status: typeof CLINIC.earnXP === 'function' },
    { name: 'Coaching Clinic Math (getMods)', status: typeof CLINIC_MATH.getMods === 'function' },
    { name: 'Media Tags (6 archetypes)', status: Object.keys(MEDIA_TAGS).length === 6 },
    { name: 'Press Tag Map (18 mappings)', status: Object.keys(PRESS_TAG_MAP).length >= 17 },
    { name: 'Media Persona Detection', status: typeof getMediaPersona === 'function' },
    { name: 'Credibility Math (calcDelta)', status: typeof CREDIBILITY_MATH.calcDelta === 'function' },
    { name: 'Rivalry Math (calcDelta)', status: typeof RIVALRY_MATH.calcDelta === 'function' },
    { name: 'Press Questions (5 scenarios)', status: PRESS_QUESTIONS.length === 5 },
    { name: 'Headlines Generator', status: typeof HEADLINES.generate === 'function' },
    { name: 'Hall of Fame Log (array)', status: Array.isArray(HALL_OF_FAME_LOG) },
    { name: 'HOF Speeches (6 traits)', status: Object.keys(HOF_SPEECHES).length === 6 },
    { name: 'HOF Speech Getter', status: typeof getHOFSpeech === 'function' },
    { name: 'Legacy Score Calculator', status: typeof calcLegacyScore === 'function' },
    { name: 'Auto Hall of Fame', status: typeof autoHallOfFame === 'function' },
    { name: 'Cap Fixes Builder', status: typeof buildCapFixes === 'function' },
    { name: 'Scout Perception (gaussian)', status: typeof SCOUT.gaussian === 'function' },
    { name: 'Scout Perceived Rating', status: typeof SCOUT.getPerceived === 'function' },
    { name: 'Scout Range Calculator', status: typeof SCOUT.getRange === 'function' },
    { name: 'Scout Grade Range', status: typeof SCOUT.getGradeRange === 'function' },
    { name: 'OC Specialties (5 types)', status: OC_SPECIALTIES.length === 5 },
    { name: 'DC Specialties (5 types)', status: DC_SPECIALTIES.length === 5 },
    { name: 'Coordinator Assignment', status: typeof assignCoordSpecialty === 'function' },
    { name: 'Prospect Character (10 types)', status: PROSPECT_CHARACTER.types.length === 10 },
    { name: 'Prospect Character Assignment', status: typeof PROSPECT_CHARACTER.assign === 'function' },
    { name: 'Bust/Steal Calculator', status: typeof BUST_STEAL_CALC.calc === 'function' },
    { name: 'Draft Day Trade-Up Logic', status: typeof DRAFT_DAY_TRADES.shouldTradeUp === 'function' },
    { name: 'Draft Day AI Offers', status: typeof DRAFT_DAY_TRADES.makeOffer === 'function' },
    { name: 'Draft Eval (safety compare)', status: typeof DRAFT_EVAL.compareSafety === 'function' },
    { name: 'Injury Report Generator', status: typeof INJURY_REPORT.generate === 'function' },
    { name: 'Playoff Bracket Tree', status: typeof buildBracketTree === 'function' },
    { name: 'Draft Presser (questions)', status: typeof DRAFT_PRESSER975.generateQuestions === 'function' },
    { name: 'Dossier (getEntry)', status: typeof DOSSIER.getEntry === 'function' },
    { name: 'Dossier (scout)', status: typeof DOSSIER.scout === 'function' },
    { name: 'Dossier (decay)', status: typeof DOSSIER.decay === 'function' },
    { name: 'Dossier (verify)', status: typeof DOSSIER.verify === 'function' },
    { name: 'Scout Report Generator', status: typeof SCOUT_REPORT.generate === 'function' },
    { name: 'Prospect Dossier (getEntry)', status: typeof PROSPECT_DOSSIER.getEntry === 'function' },
    { name: 'Prospect Dossier (scout)', status: typeof PROSPECT_DOSSIER.scout === 'function' },
    { name: 'Prospect Dossier (decay)', status: typeof PROSPECT_DOSSIER.decay === 'function' },
    { name: 'Prospect Dossier (verify)', status: typeof PROSPECT_DOSSIER.verify === 'function' },
    { name: 'Draft War Room (getIntel)', status: typeof DRAFT_WAR_ROOM.getIntel === 'function' },
    { name: 'Draft War Room (schemeFit)', status: typeof DRAFT_WAR_ROOM.schemeFitScore === 'function' },
    { name: 'Offseason Events (8 templates)', status: OFFSEASON_EVENTS.templates.length === 8 },
    { name: 'Offseason Events Generator', status: typeof OFFSEASON_EVENTS.generate === 'function' },
    { name: 'Owner Goal Templates (7)', status: OWNER_GOAL_TEMPLATES.length === 7 },
    { name: 'Coach Goal Templates (5)', status: COACH_GOAL_TEMPLATES.length === 5 },
    { name: 'Player Goal Templates (11)', status: PLAYER_GOAL_TEMPLATES.length === 11 },
    { name: 'Season Goals Generator', status: typeof generateSeasonGoals === 'function' },
    { name: 'Player Goals Generator', status: typeof generatePlayerGoals === 'function' },
    { name: 'Goal Progress Updater', status: typeof updateGoalProgress === 'function' },
    { name: 'Goals Evaluator', status: typeof evaluateGoals === 'function' },
    { name: 'Help Sections (3 groups)', status: HELP_SECTIONS.length === 3 },
    { name: 'Skin Tones (7 values)', status: SKIN_TONES.length === 7 },
    { name: 'Hair Colors (7 values)', status: HAIR_COLORS.length === 7 },
    { name: 'Locker Events (18 events)', status: LOCKER_EVENTS.length === 18 },
    { name: 'Locker Events Checker', status: typeof checkLockerEvents === 'function' },
    { name: 'Coach Trait Mods', status: typeof getCoachTraitMods === 'function' },
    { name: 'Owner Types (3)', status: OWNER_TYPES.length === 3 },
    { name: 'Owner Goals (9)', status: OWNER_GOALS.length === 9 },
    { name: 'Stat Headlines (13)', status: STAT_HEADLINES.length === 13 },
    { name: 'Stat Headline Getter', status: typeof getStatHeadline === 'function' },
    { name: 'Trait Morale Explainer', status: typeof getTraitMoraleExplainer === 'function' },
    { name: 'Story Templates (15)', status: STORY_TEMPLATES.length === 15 },
    { name: 'Presser Tag Triggers (6)', status: PRESSER_TAG_TRIGGERS.length === 6 },
    { name: 'Grade Letter Function', status: typeof gradeL === 'function' },
    { name: 'Fuzzy Rating Display', status: typeof getFuzzyRating === 'function' },
    { name: 'Fuzzy Grade Display', status: typeof getFuzzyGrade === 'function' },
    { name: 'Offseason News (8 templates)', status: OFFSEASON_NEWS.templates.length === 8 },
    { name: 'Offseason News Generator', status: typeof OFFSEASON_NEWS.generate === 'function' },
    { name: 'FA Narrative (7 categories)', status: Object.keys(FA_NARRATIVE_993).length === 7 },
    { name: 'FA Narrative (bigSigning)', status: FA_NARRATIVE_993.bigSigning.length >= 20 },
    { name: 'Press Conference Expanded (questions)', status: Object.keys(PRESS_CONFERENCE_993.questions).length === 13 },
    { name: 'Press Conference Expanded (answers)', status: Object.keys(PRESS_CONFERENCE_993.answers).length === 13 },
    { name: 'Press Conference Expanded (reactions)', status: PRESS_CONFERENCE_993.mediaReaction.length >= 15 },
  ];

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'Segoe UI', sans-serif", padding: 40 }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: T.gold, letterSpacing: 1.5, marginBottom: APP_SUBTITLE ? 8 : 24 }}>
          {APP_TITLE}
        </div>
        {APP_SUBTITLE ? (
          <div style={{ fontSize: 12, color: T.dim, marginBottom: 24 }}>
            {APP_SUBTITLE}
          </div>
        ) : null}

        <div style={{
          ...S.card,
          marginBottom: 20,
        }}>
          <div style={{ ...S.sectionTitle, color: T.gold }}>
            Extracted Module Status
          </div>
          {systems.map(function (sys) {
            return (
              <div key={sys.name} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 0', borderBottom: '1px solid ' + T.border,
                fontSize: 12,
              }}>
                <span style={{ color: sys.status ? T.green : T.red, fontWeight: 900 }}>
                  {sys.status ? '\u2713' : '\u2717'}
                </span>
                <span>{sys.name}</span>
              </div>
            );
          })}
        </div>

        <div style={{ ...S.card }}>
          <div style={{ ...S.sectionTitle, color: T.cyan }}>
            Phase 1 Summary
          </div>
          <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.8 }}>
            <div><strong style={{ color: T.text }}>Files extracted:</strong> 127 modules</div>
            <div><strong style={{ color: T.text }}>Systems:</strong> RNG, Theme, Difficulty, Cap Math, Positions, Schemes, Coaching, Keyboard, Halftime, Training Camp, Franchise Tags, Comp Picks, Incentives, GM Rep, Coach Carousel, Contracts, Owner, Personality, Chemistry, Teams, Traits, Draft Utils, Scheme Fit, Contract Helpers, Trade AI, Scouting, Scout Intel, Story Arcs, Game Features, Unlocks, LZW, Special Plays, Win Probability, Playbook, Press Conference, Legacy, Relocation, GM Strategies, Front Office, Story Arc Engine, Weekly Challenges, Trade Deadline Frenzy, Weather, Player Archetypes, Coach Skill Tree, Owner Extended, Trade Math, Breakout, Grudge/Revenge, Mentor, Staff Poaching, All-Time Records, Film Study, Agent Types, Trust/Aging, Holdout System, Game Helpers, Award History, Coach Legacy, DNA Impact, Trade Value, Ring of Honor, Owner Personality, Awards Ceremony, Cap Visualization, Role Definitions, Dynasty Analytics, Rivalry Engine, Practice/Captain, Prospect Claims, Coaching Clinic, Media Persona, Postgame Presser, Hall of Fame, Scout Perception, Coordinator Specialties, Draft Day, Injury Report, Bracket Tree, Dossier, Scout Report, Prospect Dossier, Draft War Room, Offseason Events, Season Goals, Locker Events, Coach Trait Mods, Owner Goals V2, Stat Headlines, Story Templates, Fuzzy Grades, Offseason News</div>
            <div><strong style={{ color: T.text }}>Narrative Data:</strong> Locker Room, Coach-Player Voice, Playoff Narrative, Comeback, Trade Deadline, Dynasty Moments, Stadium Upgrade, Champion Voice, Power Rankings Show, Team Flavor, Stadium Deals, Player Names, Scouting Templates, Draft Commentary, Draft Analyst, Rivalry Trash Talk, College Pipeline, Broadcast Voices, Draft Presser, Help Sections, Appearance, FA Narrative, Press Conference Expanded</div>
            <div><strong style={{ color: T.text }}>Build system:</strong> Vite + React 18</div>
            <div><strong style={{ color: T.text }}>Original game:</strong> Still available at /mr-football-dynasty/index.html</div>
          </div>
        </div>

        <div style={{ marginTop: 20, fontSize: 10, color: T.faint, textAlign: 'center' }}>
          The original game is preserved and unchanged. This page validates the new module system.
        </div>
      </div>
    </div>
  );
}

// Render LauncherShell as app root (Phase 3+ integration point)
// LauncherShell wraps the game and provides the launcher UI layer
createRoot(document.getElementById('root')).render(
  <LauncherShell basePath={import.meta.env.BASE_URL || '/'} />
);
