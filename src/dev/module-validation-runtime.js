/**
 * MFD Module Validation Runtime
 *
 * Houses the heavyweight module validation checks and status row
 * construction so the app entrypoint can lazy-load this in runtime.
 */

import { RNG, mulberry32, setSeed, rng, pick, U, LZW } from '../utils/index.js';
import {
  T, SP, RAD, SH, S,
  DIFF_SETTINGS, SAVE_VERSION, CAP_MATH, getSalaryCap,
  POS_DEF, RATING_LABELS, ALL_POSITIONS, OFF_POSITIONS, DEF_POSITIONS,
  OFF_SCHEMES, DEF_SCHEMES, OFF_PLANS, DEF_PLANS,
  SCHEME_COUNTERS, SCHEME_FX, SCHEME_FLAVOR, getSchemeFlavorLine,
  GAMEPLANS, GP_COUNTERS, HOME_FIELD_ADV, RIVALRY_NAMES,
  ARCHETYPES, ARCH_BOOST, COACH_TRAITS, ARCH_TRAIT_POOLS, CLIQUE_TYPES,
  KEYMAP, ACTION_KEYS, TAB_ORDER,
} from '../config/index.js';
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
  getRivalryLabel,
  findRivalObj,
  WP_TABLE_DEEPSEEK,
  momentumDecay991,
  edgeToProbability991,
  draftPickOvr991,
  aiPickOffGPPreview,
  aiPickDefGPPreview,
  RIVALRY_TROPHIES977,
  RIVALRY_WEEK977,
  PREGAME_TALK977,
  HALFTIME_PANEL977,
  POSTGAME_LOCKER977,
  GAME_OF_WEEK977,
  buildRivalryDashboard977,
  DB_CLEANER,
  detectPositionBattles974,
  buildCutAdvisor974,
  NEGOTIATION_SCENE,
  ARC_SPOTLIGHT,
} from '../systems/index.js';
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
  FA_TIERS,
  getFATier,
  FA_PHASES,
  FA_ROLE_PITCH,
  RFA_TENDERS,
  FA_MARKET_VALUE,
  FA_PRIORITY_TAGS,
} from '../data/index.js';

import { MIN_EXPECTED_CHECK_COUNT } from './module-validation/contracts.js';
import { createCheckRunner, runCheckGroups } from './module-validation/check-runner.js';
import { runConfigChecksBatchA, runConfigChecksBatchB } from './module-validation/checks-config.js';
import { runSystemsChecksBatchA, runSystemsChecksBatchB } from './module-validation/checks-systems.js';
import { runDataChecksBatchA, runDataChecksBatchB } from './module-validation/checks-data.js';
import { validateStatusRows } from './module-validation/checks-runtime-ui.js';
import { buildModuleStatusRows } from './module-validation/status-rows.js';
import { PHASE1_SUMMARY } from './module-validation/summary.js';

export { MIN_EXPECTED_CHECK_COUNT, buildModuleStatusRows, PHASE1_SUMMARY };

export function runModuleValidation(prebuiltStatusRows) {
  var runner = createCheckRunner();
  var check = runner.check;
  var checkGroups = runCheckGroups([
    { name: 'config-a', run: runConfigChecksBatchA },
    { name: 'config-b', run: runConfigChecksBatchB },
    { name: 'systems-a', run: runSystemsChecksBatchA },
    { name: 'systems-b', run: runSystemsChecksBatchB },
    { name: 'data-a', run: runDataChecksBatchA },
    { name: 'data-b', run: runDataChecksBatchB },
  ], runner);

  // RNG
  var rng1 = mulberry32(42);
  var v1 = rng1();
  var v2 = rng1();
  check(typeof v1 !== 'number' || v1 < 0 || v1 >= 1, 'mulberry32 output out of range');
  check(v1 === v2, 'mulberry32 produced identical consecutive values');

  // Theme
  check(T.bg !== '#070d17', 'Theme T.bg mismatch'); // Bloomberg Edition
  check(!S.btn || !S.btnPrimary, 'Style objects missing');

  // Difficulty
  check(DIFF_SETTINGS.rookie.tradeMod !== 1.15, 'DIFF_SETTINGS.rookie.tradeMod mismatch');
  check(DIFF_SETTINGS.legend.injMod !== 1.5, 'DIFF_SETTINGS.legend.injMod mismatch');

  // Cap Math
  check(CAP_MATH.BASE_CAP !== 255.0, 'CAP_MATH.BASE_CAP mismatch');
  var cap2026 = getSalaryCap(2026);
  check(cap2026 !== 255, 'getSalaryCap(2026) = ' + cap2026 + ', expected 255');

  // Systems
  check(HALFTIME_V2.options.length !== 6, 'HALFTIME_V2 options count mismatch');
  check(HALFTIME_V2.recommend(-14, 80, 80) !== 'no_huddle', 'HALFTIME_V2.recommend logic error');
  check(TRAINING_CAMP_986.focuses.length !== 5, 'TRAINING_CAMP focuses count mismatch');
  check(FRANCHISE_TAG_986.types.length !== 3, 'FRANCHISE_TAG types count mismatch');
  check(INCENTIVES_986.types.length !== 7, 'INCENTIVES types count mismatch');

  // Comp Picks
  var compResult = COMP_PICKS_986.calculate(
    [{ name: 'Test', pos: 'QB', ovr: 82 }],
    []
  );
  check(compResult.length !== 1, 'COMP_PICKS calculation error');

  // Contracts
  var c = makeContract(10, 3, 6, 15);
  check(!c || c.baseSalary !== 10, 'makeContract baseSalary error');
  var hit = calcCapHit(c);
  check(hit <= 0, 'calcCapHit returned <= 0');

  // GM Rep
  var rep = GM_REP_986.calculate([], null);
  check(rep.overall !== 43, 'GM_REP base overall mismatch');

  // Positions
  check(!POS_DEF.QB || POS_DEF.QB.r.length !== 20, 'POS_DEF.QB ratings count mismatch');
  check(ALL_POSITIONS.length !== 11, 'ALL_POSITIONS count: ' + ALL_POSITIONS.length + ', expected 11');
  check(OFF_POSITIONS.length !== 5, 'OFF_POSITIONS count mismatch');
  check(DEF_POSITIONS.length !== 4, 'DEF_POSITIONS count mismatch');
  check(!RATING_LABELS.arm, 'RATING_LABELS missing arm');

  // Schemes
  check(OFF_SCHEMES.length !== 8, 'OFF_SCHEMES count: ' + OFF_SCHEMES.length);
  check(DEF_SCHEMES.length !== 5, 'DEF_SCHEMES count: ' + DEF_SCHEMES.length);
  check(OFF_PLANS.length !== 6, 'OFF_PLANS count mismatch');
  check(DEF_PLANS.length !== 6, 'DEF_PLANS count mismatch');
  check(!SCHEME_COUNTERS.air_raid, 'SCHEME_COUNTERS missing air_raid');
  check(GAMEPLANS.length !== 6, 'GAMEPLANS count mismatch');
  check(typeof getSchemeFlavorLine !== 'function', 'getSchemeFlavorLine not a function');

  // Coaching
  check(ARCHETYPES.HC.length !== 3, 'ARCHETYPES.HC count mismatch');
  check(!ARCH_BOOST['QB Guru'], 'ARCH_BOOST missing QB Guru');
  check(Object.keys(COACH_TRAITS).length !== 10, 'COACH_TRAITS count mismatch');
  check(CLIQUE_TYPES.length !== 3, 'CLIQUE_TYPES count mismatch');

  // Owner
  check(OWNER_ARCHETYPES.length !== 5, 'OWNER_ARCHETYPES count mismatch');
  check(typeof initOwner !== 'function', 'initOwner not a function');
  check(getOwnerStatus(90).label !== 'Thrilled', 'getOwnerStatus(90) label mismatch');
  check(getOwnerStatus(10).label !== 'Furious', 'getOwnerStatus(10) label mismatch');

  // Personality
  var testPers = getPersonality({ personality: { workEthic: 9, loyalty: 7, greed: 3, pressure: 8, ambition: 6 } });
  check(testPers.workEthic !== 9, 'getPersonality workEthic mismatch');
  check(typeof traitScalar !== 'function', 'traitScalar not a function');
  check(typeof generatePersonality !== 'function', 'generatePersonality not a function');
  check(!PERS_ICONS.workEthic, 'PERS_ICONS missing workEthic');
  check(!PERS_LABELS.loyalty, 'PERS_LABELS missing loyalty');
  check(typeof getDominantTrait !== 'function', 'getDominantTrait not a function');
  check(typeof getContractPersonalityEffects !== 'function', 'getContractPersonalityEffects not a function');

  // Chemistry & System Fit
  check(typeof chemistryMod !== 'function', 'chemistryMod not a function');
  check(typeof systemFitMod !== 'function', 'systemFitMod not a function');
  check(typeof updateSystemFit !== 'function', 'updateSystemFit not a function');
  check(typeof resetSystemFit !== 'function', 'resetSystemFit not a function');
  var chemTeam = { roster: [{ chemistry: 85 }, { chemistry: 90 }] };
  check(chemistryMod(chemTeam) !== 3, 'chemistryMod high-chem team mismatch');
  check(chemistryMod({ roster: [] }) !== 0, 'chemistryMod empty roster mismatch');

  // Teams / League Data
  check(TD.length !== 30, 'TD team count: ' + TD.length + ', expected 30');
  check(LEAGUE_TEAM_COUNT97 !== 30, 'LEAGUE_TEAM_COUNT97 mismatch');
  check(REG_SEASON_WEEKS97 !== 18, 'REG_SEASON_WEEKS97 mismatch');
  check(REG_SEASON_GAMES97 !== 17, 'REG_SEASON_GAMES97 mismatch');
  check(!MFD97_CONF_DIV_MAP.hawks, 'MFD97_CONF_DIV_MAP missing hawks');
  check(LEAGUE_STRUCTURE.conferences.length !== 2, 'LEAGUE_STRUCTURE conferences count mismatch');
  check(LEAGUE_STRUCTURE.divisions.length !== 6, 'LEAGUE_STRUCTURE divisions count mismatch');
  check(typeof applyLeagueAlignment97 !== 'function', 'applyLeagueAlignment97 not a function');
  check(typeof getScaledCount97 !== 'function', 'getScaledCount97 not a function');
  check(CALENDAR.length !== 16, 'CALENDAR length: ' + CALENDAR.length + ', expected 16');

  // Traits
  check(Object.keys(TRAITS).length !== 25, 'TRAITS count: ' + Object.keys(TRAITS).length + ', expected 25');
  check(!TRAITS.captain || TRAITS.captain.pct !== 6, 'TRAITS.captain mismatch');
  check(!TRAIT_FX.clutch || TRAIT_FX.clutch.clutch !== 5, 'TRAIT_FX.clutch mismatch');
  check(!TRAIT_MILESTONES95.ironman, 'TRAIT_MILESTONES95 missing ironman');
  check(typeof hasTrait95 !== 'function', 'hasTrait95 not a function');
  var testPlayer95 = { traits95: ['captain', 'clutch'] };
  check(!hasTrait95(testPlayer95, 'captain'), 'hasTrait95 failed on captain');
  check(hasTrait95(testPlayer95, 'glass'), 'hasTrait95 false positive on glass');
  var traits95 = getPlayerTraits95(testPlayer95);
  check(traits95.length !== 2, 'getPlayerTraits95 count mismatch');
  check(typeof assignTraits !== 'function', 'assignTraits not a function');
  check(typeof checkTraitMilestones95 !== 'function', 'checkTraitMilestones95 not a function');

  // Draft Utils
  check(typeof makePick !== 'function', 'makePick not a function');
  var testPk = makePick(1, 'hawks', 'hawks', 2026);
  check(!testPk.pid || testPk.round !== 1, 'makePick output error');
  check(pickConditionText972({ type: 'playoff', upgradeRound: 2 }).indexOf('playoffs') < 0, 'pickConditionText972 mismatch');
  check(pickValue(1) !== 200, 'pickValue(1) expected 200, got ' + pickValue(1));
  check(pickValue(7) !== 5, 'pickValue(7) expected 5, got ' + pickValue(7));
  var dCon = draftContract(85, 1);
  check(!dCon || dCon.years !== 4, 'draftContract(85,1) years mismatch');
  var aCon = aucContract(85, 100, 1000);
  check(!aCon || aCon.years !== 4, 'aucContract(85,100) years mismatch');

  // Scheme Fit
  check(Object.keys(SCHEME_FIT).length !== 13, 'SCHEME_FIT count: ' + Object.keys(SCHEME_FIT).length + ', expected 13');
  var fitResult = calcSchemeFit({ pos: 'QB', ratings: { accuracy: 90, speed: 80, awareness: 85 } }, 'spread');
  check(!fitResult || fitResult.score < 80, 'calcSchemeFit spread QB score too low: ' + (fitResult && fitResult.score));
  check(fitTierFromScore(92) !== 'ELITE', 'fitTierFromScore(92) mismatch');
  check(fitTierFromScore(55) !== 'POOR', 'fitTierFromScore(55) mismatch');
  check(getPlayerSide('QB') !== 'off', 'getPlayerSide(QB) mismatch');
  check(getPlayerSide('CB') !== 'def', 'getPlayerSide(CB) mismatch');
  check(getPlayerSide('K') !== 'other', 'getPlayerSide(K) mismatch');
  check(typeof calcPlayerIdentityFit !== 'function', 'calcPlayerIdentityFit not a function');
  check(typeof calcTeamFit !== 'function', 'calcTeamFit not a function');
  check(typeof getSchemeMismatchWarnings !== 'function', 'getSchemeMismatchWarnings not a function');
  check(FIT_GROUP_DEFS.length !== 7, 'FIT_GROUP_DEFS count: ' + FIT_GROUP_DEFS.length);

  // Contract Helpers
  var testCon = makeContract(10, 3, 6, 15);
  check(v36_capHit(testCon) <= 0, 'v36_capHit returned <= 0');
  check(typeof v36_deadIfTraded !== 'function', 'v36_deadIfTraded not a function');
  check(typeof v36_tradeSavings !== 'function', 'v36_tradeSavings not a function');
  check(voidYearDeadCap(testCon) !== 0, 'voidYearDeadCap on no-void contract should be 0');
  var splitResult = splitDeadCapCharge(10, 'regular', 12);
  check(!splitResult.postDeadline, 'splitDeadCapCharge post-deadline flag mismatch');
  check(splitResult.now !== 5, 'splitDeadCapCharge 50/50 split mismatch');
  var splitPre = splitDeadCapCharge(10, 'regular', 5);
  check(splitPre.postDeadline, 'splitDeadCapCharge pre-deadline should not split');
  check(typeof calcTradeImpact !== 'function', 'calcTradeImpact not a function');
  check(typeof addVoidYears !== 'function', 'addVoidYears not a function');

  // Trade AI
  check(typeof getTradeValue !== 'function', 'getTradeValue not a function');
  var testTradePlayer = { ovr: 85, pot: 90, age: 26, pos: 'QB', contract: makeContract(10, 3, 6, 15) };
  var tv = getTradeValue(testTradePlayer, null, null);
  check(tv <= 0, 'getTradeValue returned <= 0 for elite QB');
  check(typeof getTeamNeeds !== 'function', 'getTeamNeeds not a function');
  var gmMod = getGMTradeThresholdMod('rebuild');
  check(gmMod.sellMod !== 0.85, 'getGMTradeThresholdMod rebuild sellMod mismatch');
  check(gmMod.buyMod !== 1.15, 'getGMTradeThresholdMod rebuild buyMod mismatch');
  check(typeof getGMFABias !== 'function', 'getGMFABias not a function');
  check(typeof getGMDraftBias !== 'function', 'getGMDraftBias not a function');

  // Scouting
  check(STARTER_COUNTS.QB !== 1, 'STARTER_COUNTS.QB mismatch');
  check(STARTER_COUNTS.OL !== 5, 'STARTER_COUNTS.OL mismatch');
  check(SCOUT_COSTS86.full !== 100, 'SCOUT_COSTS86.full expected 100, got ' + SCOUT_COSTS86.full);
  check(SCOUT_POINT_BASE86 !== 1000, 'SCOUT_POINT_BASE86 mismatch');
  check(typeof genPickBlurb !== 'function', 'genPickBlurb not a function');
  var blurb = genPickBlurb({ pos: 'QB', ovr: 90, pot: 95, age: 22 }, []);
  check(blurb.indexOf('Elite') < 0, 'genPickBlurb 90 OVR should say Elite');
  check(typeof genRunAlerts !== 'function', 'genRunAlerts not a function');

  // Story Arcs
  check(!NARRATIVE_STATES.BREAKOUT, 'NARRATIVE_STATES missing BREAKOUT');
  check(Object.keys(NARRATIVE_STATES).length !== 9, 'NARRATIVE_STATES count: ' + Object.keys(NARRATIVE_STATES).length);
  check(!STORY_ARC_EVENTS.breakout || STORY_ARC_EVENTS.breakout.length !== 3, 'STORY_ARC_EVENTS.breakout count mismatch');
  check(typeof pickWeightedEvent !== 'function', 'pickWeightedEvent not a function');

  // Stadium Deals
  check(STADIUM_DEALS976.length !== 8, 'STADIUM_DEALS976 count: ' + STADIUM_DEALS976.length);
  check(typeof generateStadiumDeals976 !== 'function', 'generateStadiumDeals976 not a function');

  // Team Flavor
  check(Object.keys(TEAM_FLAVOR_991).length < 28, 'TEAM_FLAVOR_991 team count too low: ' + Object.keys(TEAM_FLAVOR_991).length);
  check(!TEAM_FLAVOR_991.KC || !TEAM_FLAVOR_991.KC.stadium, 'TEAM_FLAVOR_991 missing KC stadium');
  var kcStadium = getTeamFlavor991('KC', 'stadium');
  check(kcStadium !== 'Arrowhead West', 'getTeamFlavor991 KC stadium mismatch');
  check(typeof getTeamFlavor991 !== 'function', 'getTeamFlavor991 not a function');

  // Contract Value Tables (now in contracts.js)
  check(typeof CONTRACT_VALUE_TABLE_994 === 'undefined', 'CONTRACT_VALUE_TABLE_994 not defined');
  check(typeof AGE_VALUE_CURVE_994 === 'undefined', 'AGE_VALUE_CURVE_994 not defined');

  // Narrative Data — Locker Room
  check(!LOCKER_ROOM_994.newArrival, 'LOCKER_ROOM_994 missing newArrival');
  check(!LOCKER_ROOM_994.newArrival.veteranWelcome || LOCKER_ROOM_994.newArrival.veteranWelcome.length < 10, 'LOCKER_ROOM_994 veteranWelcome count low');
  check(!LOCKER_ROOM_994.chemistry, 'LOCKER_ROOM_994 missing chemistry');
  check(!LOCKER_ROOM_994.coachClash, 'LOCKER_ROOM_994 missing coachClash');

  // Coach Player Voice
  check(!COACH_PLAYER_VOICE_994.synergy, 'COACH_PLAYER_VOICE_994 missing synergy');
  check(!COACH_PLAYER_VOICE_994.synergy.grinder_workEthic, 'COACH_PLAYER_VOICE_994 missing grinder_workEthic');
  check(!COACH_PLAYER_VOICE_994.clash, 'COACH_PLAYER_VOICE_994 missing clash');

  // Playoff Narrative
  check(!PLAYOFF_NARRATIVE_993.clinchedBerth || PLAYOFF_NARRATIVE_993.clinchedBerth.length < 10, 'PLAYOFF_NARRATIVE_993 clinchedBerth count low');
  check(!PLAYOFF_NARRATIVE_993.championshipWin, 'PLAYOFF_NARRATIVE_993 missing championshipWin');
  check(!PLAYOFF_NARRATIVE_993.superBowlLoss, 'PLAYOFF_NARRATIVE_993 missing superBowlLoss');
  check(!PLAYOFF_NARRATIVE_993.firstTitleEver, 'PLAYOFF_NARRATIVE_993 missing firstTitleEver');

  // Comeback
  check(!COMEBACK_994.injuryReturn, 'COMEBACK_994 missing injuryReturn');
  check(!COMEBACK_994.injuryReturn.QB || COMEBACK_994.injuryReturn.QB.length < 5, 'COMEBACK_994 QB injury return count low');
  check(!COMEBACK_994.slumpToBaller, 'COMEBACK_994 missing slumpToBaller');
  check(!COMEBACK_994.triumphOverTrade, 'COMEBACK_994 missing triumphOverTrade');

  // Trade Deadline
  check(!TRADE_DEADLINE_994.deadlineFrenzy || TRADE_DEADLINE_994.deadlineFrenzy.length < 10, 'TRADE_DEADLINE_994 deadlineFrenzy count low');
  check(!TRADE_DEADLINE_994.buyerModeNarrative, 'TRADE_DEADLINE_994 missing buyerModeNarrative');
  check(!TRADE_DEADLINE_994.farewellMoment, 'TRADE_DEADLINE_994 missing farewellMoment');
  check(!TRADE_DEADLINE_994.lastRide, 'TRADE_DEADLINE_994 missing lastRide');

  // Dynasty Moments
  check(!DYNASTY_MOMENTS_995.firstChampionship, 'DYNASTY_MOMENTS_995 missing firstChampionship');
  check(!DYNASTY_MOMENTS_995.backToBack, 'DYNASTY_MOMENTS_995 missing backToBack');
  check(!DYNASTY_MOMENTS_995.dynastyWatch, 'DYNASTY_MOMENTS_995 missing dynastyWatch');
  check(!DYNASTY_MOMENTS_995.dynastyEnds, 'DYNASTY_MOMENTS_995 missing dynastyEnds');

  // Stadium Upgrade
  check(!STADIUM_UPGRADE_995.newStadiumOpen, 'STADIUM_UPGRADE_995 missing newStadiumOpen');
  check(!STADIUM_UPGRADE_995.capacityExpansion, 'STADIUM_UPGRADE_995 missing capacityExpansion');
  check(!STADIUM_UPGRADE_995.jumbotron, 'STADIUM_UPGRADE_995 missing jumbotron');

  // Champion Voice
  check(!CHAMPION_VOICE_995.grinder, 'CHAMPION_VOICE_995 missing grinder');
  check(!CHAMPION_VOICE_995.grinder.win || CHAMPION_VOICE_995.grinder.win.length < 5, 'CHAMPION_VOICE_995 grinder win count low');
  check(!CHAMPION_VOICE_995.dynastyCoach, 'CHAMPION_VOICE_995 missing dynastyCoach');

  // Power Rankings Show
  check(!POWER_RANKINGS_SHOW_995.rank1 || POWER_RANKINGS_SHOW_995.rank1.length < 5, 'POWER_RANKINGS_SHOW_995 rank1 count low');
  check(!POWER_RANKINGS_SHOW_995.rank21to30, 'POWER_RANKINGS_SHOW_995 missing rank21to30');

  // Game Features — Mini-systems
  check(RIVALRY_TROPHIES_986.names.length !== 16, 'RIVALRY_TROPHIES_986 names count: ' + RIVALRY_TROPHIES_986.names.length);
  check(typeof POWER_RANKINGS_986.generate !== 'function', 'POWER_RANKINGS_986.generate not a function');
  check(typeof CAP_PROJ_986.project !== 'function', 'CAP_PROJ_986.project not a function');
  check(typeof GENERATIONAL_986.shouldSpawn !== 'function', 'GENERATIONAL_986.shouldSpawn not a function');
  check(OWNER_MODE_986.ticketTiers.length !== 4, 'OWNER_MODE_986 ticketTiers count mismatch');
  check(typeof PLAYER_COMPARE_986.buildRadar !== 'function', 'PLAYER_COMPARE_986.buildRadar not a function');
  check(typeof TIMELINE_986.addEvent !== 'function', 'TIMELINE_986.addEvent not a function');
  check(typeof CEREMONY_986.generateRetirementSpeech !== 'function', 'CEREMONY_986.generateRetirementSpeech not a function');
  check(PRACTICE_SQUAD_986.MAX_SIZE !== 16, 'PRACTICE_SQUAD_986 MAX_SIZE mismatch');
  check(HOLDOUT_V2_986.types.length !== 3, 'HOLDOUT_V2_986 types count mismatch');
  check(EXPANSION_DRAFT_986.cities.length !== 10, 'EXPANSION_DRAFT_986 cities count mismatch');

  // Scout Intel
  check(SCOUT_SPEND_MENU95.length !== 12, 'SCOUT_SPEND_MENU95 count: ' + SCOUT_SPEND_MENU95.length);
  check(typeof SCOUT_MATH.getErrorBand !== 'function', 'SCOUT_MATH.getErrorBand not a function');
  check(SCOUT_MATH.getErrorBand(0, 0) !== 12, 'SCOUT_MATH base error band mismatch');
  check(typeof getScoutNoteFlavor !== 'function', 'getScoutNoteFlavor not a function');
  var snf = getScoutNoteFlavor('QB', 'workEthic');
  check(snf.indexOf('Film junkie') < 0, 'getScoutNoteFlavor QB+workEthic mismatch');

  // Unlock System
  check(UNLOCK_DEFS.length !== 5, 'UNLOCK_DEFS count: ' + UNLOCK_DEFS.length);
  check(typeof checkUnlocks !== 'function', 'checkUnlocks not a function');
  var godU = checkUnlocks(null, { week: 1, year: 2026, phase: 'regular' }, [], 'test', true);
  check(!godU.frontOffice || !godU.legacy, 'checkUnlocks godMode should unlock all');
  check(typeof isTabUnlocked !== 'function', 'isTabUnlocked not a function');
  check(!isTabUnlocked('home', {}, false), 'isTabUnlocked home should always be open');

  // LZW Compression
  check(typeof LZW.compress !== 'function', 'LZW.compress not a function');
  var lzTest = LZW.compress('hello world');
  check(LZW.decompress(lzTest) !== 'hello world', 'LZW round-trip failed');

  // Keyboard Config
  check(KEYMAP['1'] !== 'home', 'KEYMAP 1 should map to home');
  check(ACTION_KEYS[' '] !== 'simWeek', 'ACTION_KEYS space should map to simWeek');
  check(TAB_ORDER.length !== 10, 'TAB_ORDER length: ' + TAB_ORDER.length);

  // Special Plays
  check(SPECIAL_PLAYS_993.trickPlays.length !== 4, 'SPECIAL_PLAYS_993 trickPlays count: ' + SPECIAL_PLAYS_993.trickPlays.length);
  check(SPECIAL_PLAYS_993.passVariants.length !== 3, 'SPECIAL_PLAYS_993 passVariants count: ' + SPECIAL_PLAYS_993.passVariants.length);
  check(SPECIAL_COVERAGES_993.length !== 4, 'SPECIAL_COVERAGES_993 count: ' + SPECIAL_COVERAGES_993.length);

  // Win Probability Engine
  check(!EP_TABLE_993[1] || !EP_TABLE_993[4], 'EP_TABLE_993 missing downs');
  check(typeof getEP993 !== 'function', 'getEP993 not a function');
  var epTest = getEP993(1, 5, 50);
  check(typeof epTest !== 'number' || epTest < 1 || epTest > 3, 'getEP993 1st & 5 at mid expected 1-3, got ' + epTest);
  check(!LEVERAGE_INDEX_993[4] || LEVERAGE_INDEX_993[4].tied !== 3.0, 'LEVERAGE_INDEX_993 Q4 tied mismatch');
  check(typeof calcWinProbV2_993 !== 'function', 'calcWinProbV2_993 not a function');

  // Playbook
  check(!PLAYBOOK_986.offense, 'PLAYBOOK_986 missing offense');
  check(!PLAYBOOK_986.offense.run || PLAYBOOK_986.offense.run.length < 5, 'PLAYBOOK_986 run plays count low');
  check(!PLAYBOOK_986.defense, 'PLAYBOOK_986 missing defense');

  // Press Conference
  check(PRESS_CONF_986.questions.length !== 8, 'PRESS_CONF_986 questions count: ' + PRESS_CONF_986.questions.length);
  check(typeof PRESS_CONF_986.generate !== 'function', 'PRESS_CONF_986.generate not a function');
  check(!PRESS_CONF_986.responses.confident, 'PRESS_CONF_986 missing confident response');

  // Legacy System
  check(typeof LEGACY.buildStats !== 'function', 'LEGACY.buildStats not a function');
  check(typeof LEGACY.calcScore !== 'function', 'LEGACY.calcScore not a function');
  var legacyTest = LEGACY.calcScore({ games: 100, wins: 70, losses: 30, rings: 2, playoffs: 5, draftHits: 3, capMastery: 2, devSuccesses: 3, neverTanked: true, fired: false, years: 6 });
  check(!legacyTest.tier || legacyTest.score < 50, 'LEGACY.calcScore test failed');

  // Relocation
  check(RELOCATION_CITIES976.length !== 10, 'RELOCATION_CITIES976 count: ' + RELOCATION_CITIES976.length);
  check(typeof RELOCATION976.canRelocate !== 'function', 'RELOCATION976.canRelocate not a function');
  check(typeof RELOCATION976.relocate !== 'function', 'RELOCATION976.relocate not a function');

  // Coach Personalities
  check(!COACH_PERSONALITIES_991.grinder, 'COACH_PERSONALITIES_991 missing grinder');
  check(!COACH_PERSONALITIES_991.firestarter, 'COACH_PERSONALITIES_991 missing firestarter');
  check(Object.keys(COACH_PERSONALITIES_991).length !== 6, 'COACH_PERSONALITIES_991 archetype count: ' + Object.keys(COACH_PERSONALITIES_991).length);

  // Broadcast Commentary
  check(!BROADCAST_COMMENTARY.drives, 'BROADCAST_COMMENTARY missing drives');
  check(!BROADCAST_COMMENTARY.drives.TD || BROADCAST_COMMENTARY.drives.TD.length < 5, 'BROADCAST_COMMENTARY TD commentary count low');
  check(!BROADCAST_COMMENTARY_EXPANDED.drives, 'BROADCAST_COMMENTARY_EXPANDED missing drives');

  // MFSN Network
  check(!Array.isArray(MFSN_DRAFT_LINES) || MFSN_DRAFT_LINES.length < 5, 'MFSN_DRAFT_LINES count low');
  check(typeof MFSN_SHOW.buildPickCard !== 'function' || !Array.isArray(MFSN_SHOW.analysts), 'MFSN_SHOW missing structure');
  check(!MFSN_CONTENT_991, 'MFSN_CONTENT_991 not loaded');
  check(!MFSN_WEEKLY975, 'MFSN_WEEKLY975 not loaded');
  check(!MFSN_BROADCAST, 'MFSN_BROADCAST not loaded');
  check(!MFSN_DRAFT_GRADES, 'MFSN_DRAFT_GRADES not loaded');
  check(!MFSN_PREDICTIONS, 'MFSN_PREDICTIONS not loaded');

  // MFSN Expanded
  check(!MFSN_EXPANDED_993.drives, 'MFSN_EXPANDED_993 missing drives');
  check(!MFSN_EXPANDED_993.injuries, 'MFSN_EXPANDED_993 missing injuries');
  check(!MFSN_EXPANDED_993.crowd, 'MFSN_EXPANDED_993 missing crowd');

  // MFSN Game Day
  check(!MFSN_SITUATIONAL_994.situational, 'MFSN_SITUATIONAL_994 missing situational');
  check(!MFSN_FOURTH_DOWN_994, 'MFSN_FOURTH_DOWN_994 not loaded');
  check(!MFSN_DRIVES_994, 'MFSN_DRIVES_994 not loaded');
  check(!SOCIAL_FEED_994, 'SOCIAL_FEED_994 not loaded');
  check(!MFSN_OVERTIME_994, 'MFSN_OVERTIME_994 not loaded');

  // GM Strategies
  check(!GM_STRATEGIES.rebuild || !GM_STRATEGIES.contend || !GM_STRATEGIES.neutral, 'GM_STRATEGIES missing strategy modes');
  check(GM_STRATEGIES.rebuild.tradePosture !== 'seller', 'GM_STRATEGIES rebuild tradePosture mismatch');
  check(GM_STRATEGIES.contend.tradePosture !== 'buyer', 'GM_STRATEGIES contend tradePosture mismatch');
  check(typeof applyGMStrategy !== 'function', 'applyGMStrategy not a function');

  // Front Office
  check(typeof FRONT_OFFICE.generateStaff !== 'function', 'FRONT_OFFICE.generateStaff not a function');
  check(typeof FRONT_OFFICE.getBonus !== 'function', 'FRONT_OFFICE.getBonus not a function');
  check(typeof FRONT_OFFICE.getCandidates !== 'function', 'FRONT_OFFICE.getCandidates not a function');
  check(FRONT_OFFICE.roles.length !== 7, 'FRONT_OFFICE roles count: ' + FRONT_OFFICE.roles.length + ', expected 7');
  check(Object.keys(FO_TRAITS).length !== 15, 'FO_TRAITS count: ' + Object.keys(FO_TRAITS).length + ', expected 15');

  // Story Arc Engine
  check(typeof STORY_ARC_ENGINE.initPlayer !== 'function', 'STORY_ARC_ENGINE.initPlayer not a function');
  check(typeof STORY_ARC_ENGINE.tickPlayer !== 'function', 'STORY_ARC_ENGINE.tickPlayer not a function');
  check(typeof STORY_ARC_ENGINE.tickTeam !== 'function', 'STORY_ARC_ENGINE.tickTeam not a function');
  check(typeof STORY_ARC_ENGINE.normalizePlayer !== 'function', 'STORY_ARC_ENGINE.normalizePlayer not a function');
  check(typeof STORY_ARC_ENGINE.getTargetState !== 'function', 'STORY_ARC_ENGINE.getTargetState not a function');

  // Weekly Challenges
  check(!WEEKLY_CHALLENGES.pool || WEEKLY_CHALLENGES.pool.length !== 10, 'WEEKLY_CHALLENGES pool count: ' + (WEEKLY_CHALLENGES.pool && WEEKLY_CHALLENGES.pool.length) + ', expected 10');
  check(typeof WEEKLY_CHALLENGES.generateWeekly !== 'function', 'WEEKLY_CHALLENGES.generateWeekly not a function');
  check(typeof WEEKLY_CHALLENGES.checkResults !== 'function', 'WEEKLY_CHALLENGES.checkResults not a function');
  check(!WEEKLY_CHALLENGES.pool[0].check || typeof WEEKLY_CHALLENGES.pool[0].check !== 'function', 'WEEKLY_CHALLENGES pool check functions missing');

  // Trade Deadline Frenzy
  check(typeof TRADE_DEADLINE_FRENZY.isDeadlineWindow !== 'function', 'TRADE_DEADLINE_FRENZY.isDeadlineWindow not a function');
  check(typeof TRADE_DEADLINE_FRENZY.generateAITrades !== 'function', 'TRADE_DEADLINE_FRENZY.generateAITrades not a function');
  check(!TRADE_DEADLINE_FRENZY.isDeadlineWindow(9), 'TRADE_DEADLINE_FRENZY week 9 should be deadline window');
  check(TRADE_DEADLINE_FRENZY.isDeadlineWindow(5), 'TRADE_DEADLINE_FRENZY week 5 should NOT be deadline window');

  // Weather System
  check(Object.keys(TEAM_CLIMATES).length < 18, 'TEAM_CLIMATES count too low: ' + Object.keys(TEAM_CLIMATES).length);
  check(!CLIMATE_PROFILES.dome || !CLIMATE_PROFILES.cold, 'CLIMATE_PROFILES missing dome or cold');
  check(typeof WEATHER.getConditions !== 'function', 'WEATHER.getConditions not a function');
  check(typeof WEATHER.getImpact !== 'function', 'WEATHER.getImpact not a function');
  var wxTest = WEATHER.getConditions('hawks', 5, 12345);
  check(!wxTest.precip || typeof wxTest.temp !== 'number', 'WEATHER.getConditions output structure invalid');
  check(HT_CONDITIONS.length !== 5, 'HT_CONDITIONS count: ' + HT_CONDITIONS.length + ', expected 5');
  check(HT_STRATEGIES.length !== 6, 'HT_STRATEGIES count: ' + HT_STRATEGIES.length + ', expected 6');

  // Player Archetypes
  check(typeof PLAYER_ARCHETYPES.classify !== 'function', 'PLAYER_ARCHETYPES.classify not a function');
  var archTest = PLAYER_ARCHETYPES.classify({pos:'QB',ratings:{pocketPresence:90,accuracy:88,fieldVision:85,decisionSpeed:87}});
  check(!archTest || !archTest.archetype, 'PLAYER_ARCHETYPES.classify failed for QB');
  check(Object.keys(ARCHETYPE_AGING.mods).length !== 30, 'ARCHETYPE_AGING mods count: ' + Object.keys(ARCHETYPE_AGING.mods).length + ', expected 30');
  check(typeof ARCHETYPE_AGING.getCurve !== 'function', 'ARCHETYPE_AGING.getCurve not a function');
  check(!AGE_CURVES.QB || !AGE_CURVES.RB, 'AGE_CURVES missing QB or RB');
  check(Object.keys(AGE_CURVES).length !== 10, 'AGE_CURVES position count: ' + Object.keys(AGE_CURVES).length + ', expected 10');

  // Coach Skill Tree
  check(!COACH_SKILL_TREE.trees.Strategist, 'COACH_SKILL_TREE missing Strategist');
  check(!COACH_SKILL_TREE.trees.Motivator, 'COACH_SKILL_TREE missing Motivator');
  check(!COACH_SKILL_TREE.trees.Disciplinarian, 'COACH_SKILL_TREE missing Disciplinarian');
  check(COACH_SKILL_TREE.trees.Strategist.branches.length !== 3, 'COACH_SKILL_TREE Strategist branches: ' + COACH_SKILL_TREE.trees.Strategist.branches.length);
  check(typeof COACH_SKILL_TREE.getTreeKey !== 'function', 'COACH_SKILL_TREE.getTreeKey not a function');
  check(typeof COACH_SKILL_TREE.getActiveBonus !== 'function', 'COACH_SKILL_TREE.getActiveBonus not a function');
  check(COACH_SKILL_TREE.getTreeKey('QB Guru') !== 'Strategist', 'COACH_SKILL_TREE getTreeKey QB Guru mismatch');

  // Owner Extended
  check(typeof OWNER_PATIENCE.tick !== 'function', 'OWNER_PATIENCE.tick not a function');
  check(typeof OWNER_PATIENCE.status !== 'function', 'OWNER_PATIENCE.status not a function');
  check(OWNER_PATIENCE.status(90).label !== 'ECSTATIC', 'OWNER_PATIENCE status(90) label mismatch');
  check(OWNER_PATIENCE.status(5).label !== 'CRISIS', 'OWNER_PATIENCE status(5) label mismatch');
  check(OWNER_CONFIDENCE_ARC.stages.length !== 4, 'OWNER_CONFIDENCE_ARC stages count: ' + OWNER_CONFIDENCE_ARC.stages.length);
  check(typeof OWNER_CONFIDENCE_ARC.get !== 'function', 'OWNER_CONFIDENCE_ARC.get not a function');
  check(OWNER_CONSEQUENCES.ultimatums.length !== 3, 'OWNER_CONSEQUENCES ultimatums count: ' + OWNER_CONSEQUENCES.ultimatums.length);
  check(OWNER_CONSEQUENCES.furiousPenalties.length !== 3, 'OWNER_CONSEQUENCES furiousPenalties count mismatch');

  // Trade Math
  check(typeof TRADE_MATH.classify !== 'function', 'TRADE_MATH.classify not a function');
  var tmTest = TRADE_MATH.classify(20, false);
  check(tmTest.classification !== 'fleece', 'TRADE_MATH.classify(20) should be fleece');
  check(typeof TRADE_MATH.trustLabel !== 'function', 'TRADE_MATH.trustLabel not a function');
  check(TRADE_MATH.trustLabel(80).label !== 'Trusted', 'TRADE_MATH.trustLabel(80) mismatch');
  check(RECORDS_WALL.categories.length !== 13, 'RECORDS_WALL categories count: ' + RECORDS_WALL.categories.length);
  check(typeof RECORDS_WALL.build !== 'function', 'RECORDS_WALL.build not a function');
  check(typeof getGMTradePitch !== 'function', 'getGMTradePitch not a function');
  check(!GM_TRADE_PITCH.analytics || GM_TRADE_PITCH.analytics.length < 2, 'GM_TRADE_PITCH analytics count low');

  // Player Names
  check(!PLAYER_NAMES_991.first.classic || PLAYER_NAMES_991.first.classic.length < 30, 'PLAYER_NAMES_991 classic first names count low');
  check(!PLAYER_NAMES_991.first.modern || PLAYER_NAMES_991.first.modern.length < 30, 'PLAYER_NAMES_991 modern first names count low');
  check(!PLAYER_NAMES_991.last.common || PLAYER_NAMES_991.last.common.length < 40, 'PLAYER_NAMES_991 common last names count low');
  check(!PLAYER_NAMES_991.positionWeights.QB, 'PLAYER_NAMES_991 missing QB position weights');
  check(Object.keys(PLAYER_NAMES_991.positionWeights).length !== 11, 'PLAYER_NAMES_991 position weights count: ' + Object.keys(PLAYER_NAMES_991.positionWeights).length);

  // Breakout System
  check(typeof BREAKOUT_SYSTEM.isEligible !== 'function', 'BREAKOUT_SYSTEM.isEligible not a function');
  check(typeof BREAKOUT_SYSTEM.pick !== 'function', 'BREAKOUT_SYSTEM.pick not a function');
  check(typeof BREAKOUT_SYSTEM.resolve !== 'function', 'BREAKOUT_SYSTEM.resolve not a function');
  check(typeof BREAKOUT_SYSTEM.milestoneCheck !== 'function', 'BREAKOUT_SYSTEM.milestoneCheck not a function');
  check(!BREAKOUT_SYSTEM.isEligible({age:23,ovr:68,pot:78,devTrait:'normal'}), 'BREAKOUT_SYSTEM.isEligible should accept 23yr 68ovr');
  check(BREAKOUT_SYSTEM.isEligible({age:30,ovr:68,pot:78,devTrait:'normal'}), 'BREAKOUT_SYSTEM.isEligible should reject age 30');

  // Grudge Match & Revenge Game
  check(typeof GRUDGE_MATCH.markGrudge !== 'function', 'GRUDGE_MATCH.markGrudge not a function');
  check(typeof GRUDGE_MATCH.isGrudgeGame !== 'function', 'GRUDGE_MATCH.isGrudgeGame not a function');
  check(typeof GRUDGE_MATCH.applyBoost !== 'function', 'GRUDGE_MATCH.applyBoost not a function');
  check(typeof REVENGE_GAME.check !== 'function', 'REVENGE_GAME.check not a function');
  check(typeof REVENGE_GAME.getBonus !== 'function', 'REVENGE_GAME.getBonus not a function');

  // Mentor System
  check(typeof MENTOR_SYSTEM.isMentorEligible !== 'function', 'MENTOR_SYSTEM.isMentorEligible not a function');
  check(typeof MENTOR_SYSTEM.isMenteeEligible !== 'function', 'MENTOR_SYSTEM.isMenteeEligible not a function');
  check(typeof MENTOR_SYSTEM.canPair !== 'function', 'MENTOR_SYSTEM.canPair not a function');
  check(typeof MENTOR_SYSTEM.weeklyBonus !== 'function', 'MENTOR_SYSTEM.weeklyBonus not a function');
  check(Object.keys(MENTOR_SYSTEM.posGroups).length !== 7, 'MENTOR_SYSTEM posGroups count: ' + Object.keys(MENTOR_SYSTEM.posGroups).length);

  // Staff Poaching
  check(typeof STAFF_POACHING.checkPoach !== 'function', 'STAFF_POACHING.checkPoach not a function');
  check(typeof STAFF_POACHING.counterOfferCost !== 'function', 'STAFF_POACHING.counterOfferCost not a function');
  check(typeof STAFF_POACHING.applyPoach !== 'function', 'STAFF_POACHING.applyPoach not a function');

  // All-Time Records
  check(ALL_TIME_RECORDS.categories.length !== 12, 'ALL_TIME_RECORDS categories count: ' + ALL_TIME_RECORDS.categories.length);
  check(typeof ALL_TIME_RECORDS.buildRecords !== 'function', 'ALL_TIME_RECORDS.buildRecords not a function');
  var emptyRec = ALL_TIME_RECORDS.buildRecords([]);
  check(!emptyRec.passYds || !emptyRec.teamWins, 'ALL_TIME_RECORDS.buildRecords empty result structure invalid');

  // Scouting Templates
  check(!SCOUTING_TEMPLATES_991.QB, 'SCOUTING_TEMPLATES_991 missing QB');
  check(!SCOUTING_TEMPLATES_991.QB.elite || SCOUTING_TEMPLATES_991.QB.elite.length < 3, 'SCOUTING_TEMPLATES_991 QB elite count low');
  check(!SCOUTING_TEMPLATES_991.RB, 'SCOUTING_TEMPLATES_991 missing RB');
  check(!SCOUTING_TEMPLATES_991.WR, 'SCOUTING_TEMPLATES_991 missing WR');
  check(Object.keys(SCOUTING_TEMPLATES_991).length !== 9, 'SCOUTING_TEMPLATES_991 position count: ' + Object.keys(SCOUTING_TEMPLATES_991).length);

  // Draft Commentary
  check(!DRAFT_COMMENTARY.r1elite, 'DRAFT_COMMENTARY missing r1elite');
  check(typeof getDraftCommentary !== 'function', 'getDraftCommentary not a function');
  check(getDraftCommentary(1, 85) !== DRAFT_COMMENTARY.r1elite, 'getDraftCommentary(1,85) should return r1elite');
  check(getDraftCommentary(2, 75) !== DRAFT_COMMENTARY.r2steal, 'getDraftCommentary(2,75) should return r2steal');

  // Draft Analyst
  check(!DRAFT_ANALYST_993.rodPemberton, 'DRAFT_ANALYST_993 missing rodPemberton');
  check(!DRAFT_ANALYST_993.rodPemberton.steal || DRAFT_ANALYST_993.rodPemberton.steal.length < 5, 'DRAFT_ANALYST_993 rodPemberton steal count low');
  check(!DRAFT_ANALYST_993.rodPemberton.reach, 'DRAFT_ANALYST_993 missing rodPemberton.reach');
  check(!DRAFT_ANALYST_993.rodPemberton.value, 'DRAFT_ANALYST_993 missing rodPemberton.value');
  check(!DRAFT_ANALYST_993.rodPemberton.bustAlert, 'DRAFT_ANALYST_993 missing rodPemberton.bustAlert');

  // Film Study
  check(typeof FILM.analyze !== 'function', 'FILM.analyze not a function');
  check(typeof FILM.gradeOff !== 'function', 'FILM.gradeOff not a function');
  check(typeof FILM.gradeDef !== 'function', 'FILM.gradeDef not a function');
  check(typeof FILM.gradeST !== 'function', 'FILM.gradeST not a function');
  check(typeof FILM.letterGrade !== 'function', 'FILM.letterGrade not a function');
  check(FILM.letterGrade(92) !== 'A+', 'FILM.letterGrade(92) should be A+');
  check(FILM.letterGrade(55) !== 'C', 'FILM.letterGrade(55) should be C');
  check(FILM.gradeOff(28, null) < 70, 'FILM.gradeOff(28) should be >= 70');

  // Agent Types
  check(AGENT_TYPES.length !== 5, 'AGENT_TYPES count: ' + AGENT_TYPES.length + ', expected 5');
  check(!AGENT_TYPES[0].moneyWeight, 'AGENT_TYPES missing moneyWeight');
  check(typeof assignAgentType !== 'function', 'assignAgentType not a function');
  check(typeof getAgentTypeObj !== 'function', 'getAgentTypeObj not a function');
  check(getAgentTypeObj('mercenary').moneyWeight !== 0.95, 'getAgentTypeObj mercenary moneyWeight mismatch');
  check(getAgentTypeObj('ring_chaser').ringWeight !== 0.95, 'getAgentTypeObj ring_chaser ringWeight mismatch');

  // Trust & Aging
  check(typeof TRUST_TREND.getArrow !== 'function', 'TRUST_TREND.getArrow not a function');
  check(TRUST_TREND.getArrow(60, 50) !== '📈', 'TRUST_TREND.getArrow(60,50) should be 📈');
  check(TRUST_TREND.getArrow(40, 50) !== '📉', 'TRUST_TREND.getArrow(40,50) should be 📉');
  check(typeof AGING_V2.getMultiplier !== 'function', 'AGING_V2.getMultiplier not a function');
  check(AGING_V2.getMultiplier('awareness', 'prime', 5) !== -0.5, 'AGING_V2 mental prime should be -0.5');
  check(typeof TRUST.leagueSnapshot !== 'function', 'TRUST.leagueSnapshot not a function');

  // Holdout System
  check(typeof HOLDOUT_SYSTEM.checkHoldouts !== 'function', 'HOLDOUT_SYSTEM.checkHoldouts not a function');
  check(typeof HOLDOUT_SYSTEM.weeklyHoldout !== 'function', 'HOLDOUT_SYSTEM.weeklyHoldout not a function');
  check(typeof HOLDOUT_SYSTEM.resolve !== 'function', 'HOLDOUT_SYSTEM.resolve not a function');
  check(typeof getPosMarketTier86 !== 'function', 'getPosMarketTier86 not a function');
  var qbMarket = getPosMarketTier86('QB');
  check(qbMarket.tier !== 1 || qbMarket.mult !== 2.5, 'getPosMarketTier86 QB tier/mult mismatch');
  var rbMarket = getPosMarketTier86('RB');
  check(rbMarket.tier !== 3, 'getPosMarketTier86 RB tier mismatch');

  // Game Helpers
  check(typeof calcFatigueMultiplier !== 'function', 'calcFatigueMultiplier not a function');
  check(calcFatigueMultiplier(90, 100) !== 0.92, 'calcFatigueMultiplier(90,100) should be 0.92');
  check(calcFatigueMultiplier(50, 100) !== 1.0, 'calcFatigueMultiplier(50,100) should be 1.0');
  check(typeof calcGameScriptMult !== 'function', 'calcGameScriptMult not a function');
  check(calcGameScriptMult(28, 14, 'RB', 'rb1') !== 1.15, 'calcGameScriptMult blowout RB1 mismatch');
  check(typeof calcWeekDeltas !== 'function', 'calcWeekDeltas not a function');
  check(typeof attributeCause !== 'function', 'attributeCause not a function');

  // Award History
  check(!Array.isArray(AWARD_HISTORY_LOG), 'AWARD_HISTORY_LOG not an array');
  check(typeof recordAwardHistory !== 'function', 'recordAwardHistory not a function');
  check(typeof getMultiTimeWinners !== 'function', 'getMultiTimeWinners not a function');
  check(typeof getTrophyName !== 'function', 'getTrophyName not a function');
  check(getTrophyName({'a-b': 'Test Cup'}, 'a', 'b') !== 'Test Cup', 'getTrophyName lookup mismatch');
  check(getTrophyName(null, 'a', 'b') !== null, 'getTrophyName null should return null');
  check(typeof setTrophyNameForRivalry !== 'function', 'setTrophyNameForRivalry not a function');
  check(typeof buildCareerPage !== 'function', 'buildCareerPage not a function');
  check(buildCareerPage(null, null, null) !== null, 'buildCareerPage null inputs should return null');

  // Coach Legacy
  check(typeof COACH_LEGACY_LOG !== 'object', 'COACH_LEGACY_LOG not an object');
  check(typeof updateCoachLegacy !== 'function', 'updateCoachLegacy not a function');
  check(typeof recordCoachRing !== 'function', 'recordCoachRing not a function');
  check(typeof getCoachLegacyTop !== 'function', 'getCoachLegacyTop not a function');

  // DNA Impact
  check(typeof buildDNAImpactReport !== 'function', 'buildDNAImpactReport not a function');
  check(buildDNAImpactReport(null, null, null) !== null, 'buildDNAImpactReport null should return null');

  // Trade Value
  check(typeof calcTradeValue !== 'function', 'calcTradeValue not a function');
  var tvTest = calcTradeValue({ovr: 85, age: 25, pos: 'QB', pot: 90});
  check(tvTest < 150, 'calcTradeValue elite young QB too low: ' + tvTest);
  check(typeof calcPickValue !== 'function', 'calcPickValue not a function');
  check(calcPickValue(1) !== 80, 'calcPickValue(1) should be 80');
  check(calcPickValue(2) !== 50, 'calcPickValue(2) should be 50');
  check(typeof evaluateTradePackage !== 'function', 'evaluateTradePackage not a function');
  var epTest = evaluateTradePackage([{type:'pick',round:1}], [{type:'pick',round:3}]);
  check(epTest.verdict !== 'OVERPAY', 'evaluateTradePackage 1st-for-3rd should be OVERPAY');

  // Ring of Honor
  check(typeof RING_OF_HONOR_LOG !== 'object', 'RING_OF_HONOR_LOG not an object');
  check(typeof nominateForRing !== 'function', 'nominateForRing not a function');
  check(typeof autoRingOfHonor !== 'function', 'autoRingOfHonor not a function');
  check(typeof getRingOfHonor !== 'function', 'getRingOfHonor not a function');
  var emptyRing = getRingOfHonor('nonexistent');
  check(!Array.isArray(emptyRing) || emptyRing.length !== 0, 'getRingOfHonor empty team should return []');

  // Owner Personality
  check(OWNER_PERSONALITY_EVENTS.length !== 10, 'OWNER_PERSONALITY_EVENTS count: ' + OWNER_PERSONALITY_EVENTS.length + ', expected 10');
  check(typeof checkOwnerPersonality !== 'function', 'checkOwnerPersonality not a function');
  check(checkOwnerPersonality(null, null, null, function(){return 0;}) !== null, 'checkOwnerPersonality null should return null');

  // Awards Ceremony
  check(typeof buildAwardsCeremony !== 'function', 'buildAwardsCeremony not a function');
  check(buildAwardsCeremony(null) !== null, 'buildAwardsCeremony null should return null');
  var acTest = buildAwardsCeremony({mvp:{name:'Test',pos:'QB',team:'TST',line:'30 TD'},year:2026});
  check(!acTest || acTest.reveal.length !== 1, 'buildAwardsCeremony MVP-only should have 1 reveal');

  // Cap Visualization
  check(typeof buildCapVisualization !== 'function', 'buildCapVisualization not a function');
  check(buildCapVisualization(null) !== null, 'buildCapVisualization null should return null');
  var cvTest = buildCapVisualization({roster:[{pos:'QB',ovr:85,age:27,contract:{salary:20,years:3}}],deadCap:5});
  check(!cvTest || cvTest.breakdown.length !== 1, 'buildCapVisualization single-player breakdown mismatch');
  check(cvTest && cvTest.totalUsed !== 20, 'buildCapVisualization totalUsed should be 20');

  // Role Definitions
  check(!ROLE_DEFS.RB || ROLE_DEFS.RB.length !== 3, 'ROLE_DEFS.RB count: ' + (ROLE_DEFS.RB && ROLE_DEFS.RB.length));
  check(!ROLE_DEFS.WR || ROLE_DEFS.WR.length !== 3, 'ROLE_DEFS.WR count mismatch');
  check(!ROLE_DEFS.DL || ROLE_DEFS.DL.length !== 2, 'ROLE_DEFS.DL count mismatch');
  check(!ROLE_DEFS.LB || ROLE_DEFS.LB.length !== 3, 'ROLE_DEFS.LB count mismatch');
  check(typeof assignDefaultRoles !== 'function', 'assignDefaultRoles not a function');
  check(typeof getRoleSnapPct !== 'function', 'getRoleSnapPct not a function');
  check(getRoleSnapPct('RB', 'rb1') !== 65, 'getRoleSnapPct RB rb1 should be 65');

  // Dynasty Analytics
  check(typeof calcDominanceScore !== 'function', 'calcDominanceScore not a function');
  check(typeof calcDynastyIndex !== 'function', 'calcDynastyIndex not a function');
  check(calcDynastyIndex({seasons:0}) !== 0, 'calcDynastyIndex zero seasons should be 0');
  check(typeof calcPeakPower !== 'function', 'calcPeakPower not a function');
  check(typeof calcLongevity !== 'function', 'calcLongevity not a function');
  check(typeof generateIdentityTags !== 'function', 'generateIdentityTags not a function');
  check(ERA_THRESHOLD !== 30, 'ERA_THRESHOLD should be 30');
  check(typeof generateEraCards !== 'function', 'generateEraCards not a function');
  check(typeof buildHallOfSeasons !== 'function', 'buildHallOfSeasons not a function');

  // Rivalry Engine
  check(typeof rivalryKey !== 'function', 'rivalryKey not a function');
  check(rivalryKey('a','b') !== 'a|b', 'rivalryKey a,b should be a|b');
  check(rivalryKey('b','a') !== 'a|b', 'rivalryKey b,a should sort to a|b');
  check(typeof checkHateWeek !== 'function', 'checkHateWeek not a function');
  check(Object.keys(MOMENT_GRAVITY).length !== 5, 'MOMENT_GRAVITY count: ' + Object.keys(MOMENT_GRAVITY).length);
  check(typeof addRivalryMoment !== 'function', 'addRivalryMoment not a function');
  check(typeof getBiggestMoment !== 'function', 'getBiggestMoment not a function');
  check(getBiggestMoment([]) !== null, 'getBiggestMoment empty should return null');
  check(Object.keys(MOMENT_CATEGORIES).length !== 5, 'MOMENT_CATEGORIES count: ' + Object.keys(MOMENT_CATEGORIES).length);
  check(typeof categorizeMoment !== 'function', 'categorizeMoment not a function');
  check(typeof buildRivalryTrophyCase !== 'function', 'buildRivalryTrophyCase not a function');
  check(typeof buildRivalryLadder !== 'function', 'buildRivalryLadder not a function');
  check(typeof buildRivalryLadderLite !== 'function', 'buildRivalryLadderLite not a function');
  check(typeof generateHighlights !== 'function', 'generateHighlights not a function');
  check(typeof generateReceipts !== 'function', 'generateReceipts not a function');
  check(!FIX_IT_DRILLS.pressureRate, 'FIX_IT_DRILLS missing pressureRate');
  check(!FIX_IT_DRILLS.turnovers, 'FIX_IT_DRILLS missing turnovers');
  check(Object.keys(FIX_IT_DRILLS).length !== 9, 'FIX_IT_DRILLS count: ' + Object.keys(FIX_IT_DRILLS).length);

  // Rivalry Trash Talk
  check(!RIVALRY_TRASH_991.mild || RIVALRY_TRASH_991.mild.length < 10, 'RIVALRY_TRASH_991 mild count low');
  check(!RIVALRY_TRASH_991.spicy || RIVALRY_TRASH_991.spicy.length < 10, 'RIVALRY_TRASH_991 spicy count low');
  check(!RIVALRY_TRASH_991.atomic || RIVALRY_TRASH_991.atomic.length < 10, 'RIVALRY_TRASH_991 atomic count low');

  // Status rows are part of runtime validation contract.
  var statusRows = Array.isArray(prebuiltStatusRows) ? prebuiltStatusRows : buildModuleStatusRows();
  validateStatusRows(check, statusRows);

  var errors = runner.getErrors();
  var checkCount = runner.getCheckCount();
  var checkGroupLine = checkGroups.map(function (g) {
    return g.name + '=' + g.checks;
  }).join(', ');
  console.log('[MFD] Check groups: ' + checkGroupLine);

  if (errors.length === 0) {
    console.log('%c[MFD] All ' + checkCount + ' module checks passed', 'color: #34d399; font-weight: bold');
    return { ok: true, errors: [], checkCount: checkCount };
  } else {
    console.error('[MFD] Module validation errors:', errors);
    return { ok: false, errors: errors, checkCount: checkCount };
  }
}


export function buildModuleValidationSnapshot() {
  var statusRows = buildModuleStatusRows();
  return {
    validation: runModuleValidation(statusRows),
    statusRows: statusRows,
    summary: PHASE1_SUMMARY,
  };
}
