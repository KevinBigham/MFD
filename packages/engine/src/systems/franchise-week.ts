import { cl } from '../utils';
import { generateWeeklyMediaCycle } from '../media-cycle';
import { RNG, mulberry32, reseedSeason, reseedWeek, setSeed } from '../rng';
import {
  advanceStorylineThreads,
  closeCompletedThreads,
  seedThreadsForWeek,
} from '../storyline-threads';
import { getAdaptiveModifier, updateAdaptiveDifficulty } from './adaptive-difficulty';
import { checkAchievements } from './achievements';
import { applyHalftimeDecision, type AdvanceFranchiseWeekOptions } from './halftime-decision';
import { advanceDraft, ensureDraftClass, finalizePostDraft } from './draft';
import { resolveCallYourShot, type CallYourShotResult } from './call-your-shot';
import { generateNearMissReceipts, hasNotableNearMisses } from './near-miss-receipts';
import { runAllTrainingCamps } from './training-camp';
import { detectNamedGame } from './named-games';
import { syncApologyTourThreads } from './apology-tour';
import { calculateDynastyWindow } from './dynasty-window';
import {
  buildHallOfFamerCommentator,
  generateGhostLine,
  shouldIncludeGhostBroadcast,
  triggerFromGameContext,
} from './ghost-broadcasts';
import { awardDoctrine, checkDoctrineEligibility, type DoctrineId } from './franchise-doctrines';
import { fireFranchiseBookChapterAlerts } from './franchise-book-hook';
import { checkCBAStatus, initCBA } from './cba-engine';
import { advanceCoachDevelopment, resolvePoachingCycle } from './coach-retention';
import { advancePositionCoachSeason } from './position-coaches';
import { recordCeremony, generateRingCeremony } from './ceremonies';
import {
  getLockerRoomClutchBonuses,
  getLockerRoomGameBonus,
  initializeLockerRoom,
  updateLockerRoomWeekly,
} from './locker-room';
import { assignBroadcasts, flexSchedule } from './flex-schedule';
import { generateAiGamePlan, generateOpponentScouting, resetGamePlan, upsertOpponentReport } from './game-plan';
import { recordDynastyEvent } from './dynasty-timeline';
import {
  createMilestoneNews,
  createRecordBreakingNews,
  createStatWatchNews,
  generateWeeklyLeagueNews,
  recordLaborNews,
  recordNewsItem,
} from './league-news';
import { checkWorkStoppage, generateLaborEvent, initLaborState, updateUnionSatisfaction } from './labor-relations';
import { recordBeat, shouldGenerateEvent } from './narrative-director';
import { advanceFreeAgency, advanceOffseason, initializeOffseasonState } from './offseason';
import { advancePlayoffBracket, seedPlayoffBracket } from './playoff-bracket';
import { generatePlayoffNews, calculatePlayoffMomentum, getPlayoffMomentumBonus } from './playoff-momentum';
import { processWeeklyTraining } from './player-development';
import { archivePlayerSeasonHistory } from './player-profile';
import { processCarryoverHoldouts } from './player-agents';
import { archiveSeasonHistory } from './history';
import { generateFarewellMoment } from './jersey-retirement';
import {
  checkMilestones,
  checkRecordChases,
  detectBrokenRecords,
  getLeagueLeaders,
} from './record-tracker';
import { advanceStoryArcs, advanceWeeklyStoryArcs } from './story-arcs';
import { buildGameDayPackage } from './game-day-package';
import { buildFilmRoomReport } from './film-room';
import { evaluateHandshakes, generateOwnerDemands } from './handshake-ledger';
import { evaluateOwnerMandates, refreshOwnerMandates } from './owner-goals';
import {
  ensureLivingWorldState,
  expireTimedEffects,
  generateWeeklyOffFieldEvents,
  getGameEffectBonuses,
} from './off-field-events';
import { aiWaiverLogic, processWaiverClaims } from './practice-squad';
import {
  createPostGamePressConference,
  maybeCreateMidweekPressConference,
  recordPressConference,
} from './press-conference';
import { updatePowerRankings } from './power-rankings';
import { shouldShowSaveReminder } from './save-reminder';
import {
  createRivalryTrashTalkPost,
  detectNewRivalries,
  getRivalryGameBonus,
  updateRivalryFromGame,
} from './player-rivalries';
import { updateRecordsFromGameResult } from './records';
import { getRivalryGameContext, seedLeagueRivalries, updateLeagueRivalriesFromGame } from './rivalries';
import { createRivalryHeatSpikePost, detectRivalryTierAscension } from './league-pulse';
import { getActiveRule, initLeagueRules } from './league-rules';
import { getRegularSeasonWeekCount } from './season-schedule';
import { generateTradeOffers } from './trade-market';
import { findTradeTargets } from './trade-finder';
import { buildWeeklySummary } from './weekly-summary';
import { autoAssignSpecialTeams } from './special-teams';
import {
  appendToSocialFeed,
  createLaborPost,
  createMilestonePost,
  createRecordBreakingPost,
  createRecordChasePost,
  generateGameDayPosts,
  generateWeeklyBuzz,
} from './social-feed';
import { generateBroadcast } from './broadcast';
import { allocateGameSnaps, applySnapCounts, type SnapManagement } from './snap-counts';
import { advanceScenarioSeason, checkScenarioProgress } from './scenario-challenge';
import { initializeDeadline } from './trade-deadline';
import { applyWeeklyPrepToSim, buildOpponentIntel, evaluateWeeklyPrep } from './weekly-prep';
import { createDefaultFranchiseIdentity, getStadiumHomeFieldBonus, updateAttendance } from './franchise-identity';
import { initializeExpansionDraft, shouldTriggerExpansion } from './expansion-draft';
import { initCommissioner } from './commissioner';
import {
  cloneGame,
  findUserTeam,
  ensureWeeklyWeather,
  generateWeatherForGame,
  makeEvent,
  refreshNarrative,
  simulateGame,
  syncPlayers,
  tickInjuries,
  processInjuryRecovery,
  buildPlayerBonuses,
  buildFatiguePlayerBonuses,
  updateOwner,
} from './franchise-week-helpers';
import { calculateAtmosphere, getAtmosphereBonus } from './atmosphere';
import { generateRegionalWeather } from './regional-weather';
import type { SimGameContext } from './game-sim-types';
import type { AIBiasConfig } from './ai-bias';
import type {
  Consequence,
  EngineOutput,
  GameEvent,
  GameResult,
  GameState,
  PlayoffRound,
  PressConference,
  RivalryGameContext,
  Team,
  WeeklyInjurySummary,
} from '../types';

const PLAYOFF_ROUNDS: PlayoffRound[] = ['wild_card', 'divisional', 'conference', 'super_bowl'];

function playoffRoundForWeek(game: GameState, week: number): PlayoffRound {
  const firstPlayoffWeek = getRegularSeasonWeekCount(game) + 1;
  const index = Math.min(Math.max(week - firstPlayoffWeek, 0), PLAYOFF_ROUNDS.length - 1);
  return PLAYOFF_ROUNDS[index]!;
}

function playoffRoundLabel(round: PlayoffRound): string {
  if (round === 'wild_card') return 'Wild Card';
  if (round === 'divisional') return 'Divisional';
  if (round === 'conference') return 'Conference Final';
  return 'Championship';
}

function buildSimPlanContext(nextState: GameState, team: Team, opponent: Team) {
  const report = generateOpponentScouting(nextState, team.id, opponent.id);
  const storedPrep = nextState.weeklyPrepPlans?.[team.id];
  const hasStoredPrep = Boolean(
    storedPrep
    && storedPrep.year === nextState.year
    && storedPrep.week === nextState.week
    && storedPrep.opponentTeamId === opponent.id,
  );
  const prepIntel = hasStoredPrep ? buildOpponentIntel(nextState, team.id, opponent.id) : null;
  const prepOutcome = storedPrep && prepIntel ? evaluateWeeklyPrep(team, prepIntel, storedPrep, nextState) : null;
  const prepContext = prepOutcome ? applyWeeklyPrepToSim(team, prepOutcome) : {};
  if (team.isUser) {
    const storedReport = upsertOpponentReport(nextState, report);
    return {
      gamePlan: nextState.gamePlan ?? generateAiGamePlan(nextState, team.id, opponent.id),
      opponentReport: storedReport,
      prepIntel,
      prepOutcome,
      prepContext,
    };
  }

  return {
    gamePlan: generateAiGamePlan(nextState, team.id, opponent.id),
    opponentReport: report,
    prepIntel,
    prepOutcome,
    prepContext,
  };
}

function resolvePlaytestSnapManagement(
  team: Team,
  fallback: SnapManagement,
  aiBias?: AIBiasConfig,
): SnapManagement {
  if (team.isUser) return fallback;
  return aiBias?.snapManagement ?? fallback;
}

function shouldIgnorePlaytestFatigue(team: Team, aiBias?: AIBiasConfig): boolean {
  return Boolean(!team.isUser && aiBias?.fatigueIgnore);
}

function playtestFatigueIgnoreIds(teams: Team[], aiBias?: AIBiasConfig): string[] {
  return teams
    .filter((team) => shouldIgnorePlaytestFatigue(team, aiBias))
    .map((team) => team.id);
}

function applyNonGamePhase(nextState: GameState, aiBias?: AIBiasConfig): void {
  if (nextState.phase === 'offseason') advanceOffseason(nextState, aiBias);
  else if (nextState.phase === 'free_agency') advanceFreeAgency(nextState, aiBias);
  else if (nextState.phase === 'draft') advanceDraft(nextState);
  else if (nextState.phase === 'post_draft') finalizePostDraft(nextState);

  syncPlayers(nextState);
  refreshNarrative(nextState);
  const userTeam = findUserTeam(nextState);
  if (userTeam) {
    nextState.narrativeState.activeArcs = advanceWeeklyStoryArcs(nextState, { team: userTeam, opponent: null, summary: null });
  }
}

function appendGameDayPackage(
  nextState: GameState,
  team: Team,
  opponent: Team | null,
  result: GameResult,
  summary: ReturnType<typeof buildWeeklySummary>,
  options?: {
    pressConference?: PressConference | null;
    rivalry?: RivalryGameContext | null;
    activeEffectSummaries?: string[];
    filmRoomReport?: ReturnType<typeof buildFilmRoomReport> | null;
    recordsMoments?: GameState['recentBrokenRecords'];
    milestoneMoments?: GameState['recentMilestones'];
    callYourShotResult?: CallYourShotResult;
  },
): void {
  refreshNarrative(nextState);
  nextState.narrativeState.activeArcs = advanceWeeklyStoryArcs(nextState, { team, opponent, summary });

  const packageData = buildGameDayPackage({
    team,
    opponent,
    result,
    summary,
    hooks: nextState.narrativeState.hooks,
    activeArcs: nextState.narrativeState.activeArcs,
    pressConference: options?.pressConference ?? null,
    rivalry: options?.rivalry ?? null,
    activeEffectSummaries: options?.activeEffectSummaries ?? [],
    recordsMoments: options?.recordsMoments ?? [],
    milestoneMoments: options?.milestoneMoments ?? [],
    callYourShotResult: options?.callYourShotResult,
  });
  if (options?.filmRoomReport) {
    packageData.prepGrade = options.filmRoomReport.grade;
    packageData.coachingNotes = options.filmRoomReport.executionNotes;
    packageData.carryForwardRecommendations = options.filmRoomReport.carryForward;
  }

  nextState.gameDayState.recentPackages = [...nextState.gameDayState.recentPackages, packageData].slice(-8);
  nextState.gameDayState.latestPackageId = packageData.id;
  nextState.narrativeState.recentHeadlines = [summary.headline, ...nextState.narrativeState.recentHeadlines].slice(0, 8);
}

function buildTeamOvrBonus(team: Team, baseBonus: number, adaptiveModifier: number): number {
  return cl(baseBonus + (team.isUser ? 0 : adaptiveModifier), -5, 5);
}

function advanceSeasonEndCoaching(game: GameState): void {
  for (const team of Object.values(game.teams)) {
    if (team.positionCoaches?.coaches.length) {
      team.positionCoaches = advancePositionCoachSeason(team.positionCoaches);
    }

    if (!team.staff?.hc && !team.staff?.oc && !team.staff?.dc) continue;
    advanceCoachDevelopment(game, team.id);
  }
  resolvePoachingCycle(game, RNG.ai);
}

function mergePlayerBonuses(...maps: Array<Record<string, number> | undefined>): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const map of maps) {
    if (!map) continue;
    for (const [playerId, bonus] of Object.entries(map)) {
      merged[playerId] = (merged[playerId] ?? 0) + bonus;
    }
  }
  return merged;
}

function resolveActiveCallYourShot(
  game: GameState,
  result: GameResult,
  userTeamId: string | null,
): CallYourShotResult | undefined {
  if (!userTeamId || !game.activeCallYourShot) return undefined;
  if (result.homeTeamId !== userTeamId && result.awayTeamId !== userTeamId) return undefined;

  return resolveCallYourShot(game, result, RNG.event);
}

function applyUserHalftimeChoice(
  simContext: SimGameContext,
  params: {
    startingUser: Team | null;
    home: Team;
    away: Team;
    halftimeDecision?: AdvanceFranchiseWeekOptions['halftimeDecision'];
  },
): SimGameContext {
  const { startingUser, home, away, halftimeDecision } = params;
  if (!startingUser || !halftimeDecision) return simContext;
  if (startingUser.id !== home.id && startingUser.id !== away.id) return simContext;

  return applyHalftimeDecision(simContext, {
    side: startingUser.id === home.id ? 'home' : 'away',
    choice: halftimeDecision.choice,
    suggestion: halftimeDecision.suggestion,
  });
}

function halftimeDecisionSummary(halftimeDecision?: AdvanceFranchiseWeekOptions['halftimeDecision']): string | null {
  if (!halftimeDecision) return null;
  if (halftimeDecision.choice === 'stick') {
    return 'Halftime hell: stayed with the original script after the break.';
  }
  if (halftimeDecision.choice === 'switch') {
    return `Halftime hell: flipped the second-half plan to ${halftimeDecision.suggestion.responseLabel.toLowerCase()}.`;
  }
  return `Halftime hell: rolled the dice on ${halftimeDecision.suggestion.responseLabel.toLowerCase()}.`;
}

function deadlineAlreadyResolved(game: GameState): boolean {
  return game.eventLog.some((event) =>
    event.type === 'trade_deadline_resolved'
    && event.data.year === game.year
    && event.data.week === game.week);
}

function hashString(value: string): number {
  return [...value].reduce((hash, char) => ((hash * 33) ^ char.charCodeAt(0)) >>> 0, 5381);
}

function buildBroadcastRng(game: GameState, result: GameResult) {
  const seed = (
    game.seed
    ^ (result.year * 131)
    ^ (result.week * 977)
    ^ hashString(result.id)
    ^ hashString(`${result.homeTeamId}:${result.awayTeamId}`)
  ) >>> 0;
  return mulberry32(seed);
}

function getTradeDeadlineWeek(game: GameState): number {
  if (!game.leagueRules) return 9;
  return Number(getActiveRule(game.leagueRules, 'trade_deadline_week', game.year));
}

function isCBAInterruptStatus(status: GameState['cbaState']['status']): boolean {
  return status === 'negotiating' || status === 'awaiting_owner_vote' || status === 'lockout';
}

function clampRating(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function getTaggedPlayers(game: GameState) {
  return Object.values(game.players).filter((player) => {
    if (player.contract?.franchiseTag) return true;
    const team = player.teamId ? game.teams[player.teamId] : null;
    const tags = team ? (team.franchiseTags ?? (team.franchiseTag973 ? [team.franchiseTag973] : [])) : [];
    return tags.some((tag) => tag.playerId === player.id);
  });
}

function activateWorkStoppage(game: GameState, check: ReturnType<typeof checkWorkStoppage>): void {
  if (!check.stoppage) return;
  if (game.laborState.activeStoppage?.type === check.stoppage.type) return;

  let affectedTeams = [...check.stoppage.affectedTeams];
  if (check.stoppage.type === 'holdout_wave') {
    const taggedPlayers = getTaggedPlayers(game).sort((a, b) => a.id.localeCompare(b.id));
    const share = 0.05 + RNG.event() * 0.1;
    const holdoutCount = Math.max(1, Math.min(taggedPlayers.length, Math.round(taggedPlayers.length * share)));
    for (const player of taggedPlayers.slice(0, holdoutCount)) {
      player.holdout = true;
      player.morale = clampRating(player.morale + check.stoppage.moralePenalty);
    }
    affectedTeams = [...new Set(taggedPlayers.slice(0, holdoutCount).map((player) => player.teamId).filter((teamId): teamId is string => Boolean(teamId)))];
  } else {
    const targetTeams = check.stoppage.affectedTeams.length > 0 ? check.stoppage.affectedTeams : Object.keys(game.teams);
    for (const player of Object.values(game.players)) {
      if (player.teamId && targetTeams.includes(player.teamId)) {
        player.morale = clampRating(player.morale + check.stoppage.moralePenalty);
      }
    }
    affectedTeams = targetTeams;
  }

  game.laborState.activeStoppage = {
    ...check.stoppage,
    affectedTeams,
    startWeek: game.week,
  };
  recordLaborNews(game, 'League labor unrest intensifies', check.summary, {
    idSuffix: `${check.stoppage.type}-${game.year}-${game.week}`,
    importance: check.stoppage.type === 'lockout' ? 'breaking' : 'major',
    teamIds: affectedTeams,
  });
  game.socialFeed = appendToSocialFeed(game.socialFeed, [
    createLaborPost(check.summary, game.week, RNG.ai, {
      sentiment: check.stoppage.type === 'lockout' ? 'negative' : 'neutral',
    }),
  ]);
}

function recordLaborEventNarrative(game: GameState): void {
  const laborEvent = generateLaborEvent(game.laborState, game);
  if (!laborEvent) return;
  game.laborState = {
    ...game.laborState,
    unionSatisfaction: clampRating(game.laborState.unionSatisfaction + (laborEvent.impact.satisfaction ?? 0)),
    laborEvents: [...game.laborState.laborEvents, laborEvent].slice(-20),
  };
  if (laborEvent.impact.morale) {
    for (const player of Object.values(game.players)) {
      player.morale = clampRating(player.morale + laborEvent.impact.morale);
    }
  }
  recordLaborNews(game, 'Labor talks dominate the league conversation', laborEvent.description, {
    idSuffix: `${laborEvent.type}-${game.year}-${game.week}`,
  });
  game.socialFeed = appendToSocialFeed(game.socialFeed, [
    createLaborPost(laborEvent.description, game.week, RNG.ai, {
      sentiment: laborEvent.impact.satisfaction && laborEvent.impact.satisfaction > 0 ? 'positive' : 'negative',
    }),
  ]);
}

function buildLaborPenaltyMap(team: Team, penalty: number, game: GameState): Record<string, number> | undefined {
  if (penalty === 0) return undefined;
  const stoppage = game.laborState.activeStoppage;
  if (!stoppage || stoppage.type !== 'practice_boycott') return undefined;
  if (stoppage.affectedTeams.length > 0 && !stoppage.affectedTeams.includes(team.id)) return undefined;
  return team.roster.reduce<Record<string, number>>((map, player) => {
    map[player.id] = penalty;
    return map;
  }, {});
}

function ensureGovernanceState(game: GameState): void {
  game.leagueRules = game.leagueRules ?? initLeagueRules(game.year);
  game.cbaState = game.cbaState ?? initCBA(game.year);
  game.commissionerState = game.commissionerState ?? initCommissioner(game.year);
  game.laborState = game.laborState ?? initLaborState();
}

function buildPlayerRivalryContext(game: GameState, home: Team, away: Team) {
  const rivalries = (game.playerRivalries ?? []).filter((rivalry) => {
    const teamIds = [rivalry.teamAId, rivalry.teamBId];
    return teamIds.includes(home.id) && teamIds.includes(away.id);
  });
  const homeBonuses: Record<string, number> = {};
  const awayBonuses: Record<string, number> = {};

  for (const rivalry of rivalries) {
    if (rivalry.teamAId === home.id) {
      homeBonuses[rivalry.playerAId] = (homeBonuses[rivalry.playerAId] ?? 0) + getRivalryGameBonus(rivalry, rivalry.playerAId);
      awayBonuses[rivalry.playerBId] = (awayBonuses[rivalry.playerBId] ?? 0) + getRivalryGameBonus(rivalry, rivalry.playerBId);
    } else {
      homeBonuses[rivalry.playerBId] = (homeBonuses[rivalry.playerBId] ?? 0) + getRivalryGameBonus(rivalry, rivalry.playerBId);
      awayBonuses[rivalry.playerAId] = (awayBonuses[rivalry.playerAId] ?? 0) + getRivalryGameBonus(rivalry, rivalry.playerAId);
    }
  }

  return { rivalries, homeBonuses, awayBonuses };
}

function createFarewellPost(game: GameState, content: string): GameState['socialFeed'][number] {
  return {
    id: `farewell-${game.year}-${game.week}-${game.socialFeed.length}`,
    source: 'team',
    authorName: 'MFSN Legacy Desk',
    content,
    trigger: 'milestone',
    sentiment: 'positive',
    likes: 220,
    timestamp: game.week,
  };
}

function appendContingencyGhostLines(result: GameResult): void {
  if (!result.broadcast || !result.contingencyActivations?.length) return;

  const contingencyLines = result.contingencyActivations
    .filter((activation) => activation.callout)
    .map((activation) => ({
      commentatorName: 'Booth Alert',
      commentary: activation.callout!,
      trigger: 'quarter_break',
      source: 'callout' as const,
    }));

  if (contingencyLines.length === 0) return;
  result.broadcast.ghostLines = [...(result.broadcast.ghostLines ?? []), ...contingencyLines];
}

function appendHallOfFamerGhostLine(result: GameResult, hallOfFame: GameState['hallOfFame'], year: number): void {
  if (!result.broadcast) return;
  if (!shouldIncludeGhostBroadcast(RNG.ai, year - 2026, hallOfFame.length > 0)) return;

  const hofer = hallOfFame[Math.floor(RNG.ai() * hallOfFame.length)];
  if (!hofer) return;

  const commentator = buildHallOfFamerCommentator(hofer);
  const trigger = triggerFromGameContext({
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    overtime: result.overtime,
    hasMvp: result.mvpPlayerId !== null,
  });
  const line = { ...generateGhostLine(RNG.ai, commentator, trigger), source: 'hof' as const };
  result.broadcast.ghostLines = [...(result.broadcast.ghostLines ?? []), line];
}

function rankingForTeam(game: GameState, teamId: string): number | null {
  return game.powerRankings.find((entry) => entry.teamId === teamId)?.rank ?? null;
}

function buildNamedGameContext(
  game: GameState,
  result: GameResult,
  home: Team,
  away: Team,
  injuries: Record<string, WeeklyInjurySummary[]>,
  isRivalry: boolean,
  primetime: boolean,
): Parameters<typeof detectNamedGame>[1] {
  const homeStats = result.stats[home.id];
  const awayStats = result.stats[away.id];
  const homeLeadStartQ4 = (
    (homeStats?.quarterScores[0] ?? 0)
    + (homeStats?.quarterScores[1] ?? 0)
    + (homeStats?.quarterScores[2] ?? 0)
  ) - (
    (awayStats?.quarterScores[0] ?? 0)
    + (awayStats?.quarterScores[1] ?? 0)
    + (awayStats?.quarterScores[2] ?? 0)
  );
  const analysisBroadcast = generateBroadcast(result, home, away, buildBroadcastRng(game, result));
  const winnerId = result.homeScore > result.awayScore
    ? result.homeTeamId
    : result.awayScore > result.homeScore
      ? result.awayTeamId
      : null;
  const winningDrive = winnerId
    ? [...(analysisBroadcast.quarters[3] ?? [])].reverse().find((drive) =>
      drive.teamId === winnerId
      && (drive.endResult === 'touchdown' || drive.endResult === 'fieldGoal'))
    : null;
  const winningPlay = winningDrive?.plays.at(-1) ?? null;
  const clutchTurnover = analysisBroadcast.highlights.some((play) => play.type === 'turnover' && play.isClutch);

  return {
    weather: result.weather ?? null,
    isPlayoff: game.phase === 'playoffs',
    isRivalry,
    primetime,
    homeRank: rankingForTeam(game, home.id),
    awayRank: rankingForTeam(game, away.id),
    homeLeadStartQ4,
    homeLargestLeadQ4: homeLeadStartQ4,
    winningPlayYards: winningPlay?.yardsGained ?? null,
    winningPlayClutch: winningPlay?.isClutch ?? false,
    winningPlayType: clutchTurnover && Math.abs(result.homeScore - result.awayScore) >= 7
      ? 'defense'
      : winningPlay?.type === 'fieldGoal'
        ? 'field_goal'
        : winningPlay
          ? 'offense'
          : null,
    homeInjuries: injuries[home.id]?.length ?? 0,
    awayInjuries: injuries[away.id]?.length ?? 0,
  };
}

export function advanceFranchiseWeek(game: GameState, options: AdvanceFranchiseWeekOptions = {}): EngineOutput {
  const nextState = options.mutateInPlace ? game : cloneGame(game);
  ensureGovernanceState(nextState);
  const events: GameEvent[] = [];
  const playedWeek = nextState.week;
  const startingUser = findUserTeam(nextState);
  const previousRecord = startingUser ? `${startingUser.wins}-${startingUser.losses}${startingUser.ties ? `-${startingUser.ties}` : ''}` : '0-0';
  let ownerDelta = 0;
  let userResult: GameResult | null = null;
  let callYourShotResult: CallYourShotResult | undefined;
  let nearMissReceipts: GameState['seasonNearMissReceipts'] | undefined;
  let showSaveReminder: boolean | undefined;
  let userOpponent: Team | null = null;
  let userInjuries: WeeklyInjurySummary[] = [];
  let userRivalry: RivalryGameContext | null = null;
  let userActiveEffectSummaries: string[] = [];
  let userPrepOutcome: ReturnType<typeof evaluateWeeklyPrep> | null = null;
  let userPrepIntel: ReturnType<typeof buildOpponentIntel> | null = null;
  let userRecordMoments: GameState['recentBrokenRecords'] = [];
  let userMilestoneMoments: GameState['recentMilestones'] = [];
  const weeklyBrokenRecords: GameState['recentBrokenRecords'] = [];
  const weeklyMilestones: GameState['recentMilestones'] = [];
  const ambientSocialPosts: NonNullable<GameState['socialFeed']> = [];
  let label: string | undefined;
  let completedRegularSeasonWeek = false;

  setSeed(game.seed);
  reseedSeason(game.year);
  reseedWeek(game.year, game.week);
  ensureLivingWorldState(nextState);
  nextState.activeRecordChases ??= [];
  nextState.recentBrokenRecords ??= [];
  nextState.recentMilestones ??= [];
  nextState.mediaCycle ??= {
    weeklyDigests: [],
    powerRankingHistory: [],
  };
  nextState.storylineThreads ??= [];
  nextState.postGameUi = nextState.postGameUi ?? {
    pressConferenceQueue: [],
    audioCueQueue: [],
    pendingHalftimeDecision: null,
  };
  nextState.postGameUi.pendingHalftimeDecision = null;
  syncPlayers(nextState);
  nextState.cbaState.status = checkCBAStatus(nextState.cbaState, nextState.year);
  if (nextState.leagueRivalries.length === 0) {
    seedLeagueRivalries(nextState);
  }
  if ((nextState.phase === 'preseason' || nextState.phase === 'training_camp' || nextState.phase === 'offseason') && isCBAInterruptStatus(nextState.cbaState.status)) {
    recordLaborEventNarrative(nextState);
    return { nextState, events, consequences: [] };
  }

  if (nextState.phase === 'training_camp') {
    const campResults = runAllTrainingCamps(nextState);
    nextState.trainingCampResults = campResults;
    nextState.phase = 'preseason';
    return { nextState, events, consequences: [] };
  }

  if (nextState.phase === 'preseason') {
    for (const team of Object.values(nextState.teams)) {
      team.lockerRoom = initializeLockerRoom(team, RNG.ai);
    }
    nextState.phase = 'regular_season';
    const defendingChampion = nextState.franchiseHistory.find((entry) => entry.year === nextState.year - 1 && entry.playoffFinish === 'champion');
    if (defendingChampion && !nextState.ceremonies.some((ceremony) => ceremony.type === 'ring_ceremony' && ceremony.year === nextState.year)) {
      const ringCeremony = generateRingCeremony(nextState, defendingChampion.teamId);
      if (ringCeremony) {
        recordCeremony(nextState, ringCeremony);
        recordDynastyEvent(nextState, {
          id: `${ringCeremony.id}-dynasty`,
          year: nextState.year,
          week: nextState.week,
          type: 'milestone',
          headline: ringCeremony.headline,
          importance: 'major',
          playerIds: [],
          teamIds: [defendingChampion.teamId],
        });
      }
    }
    for (const team of Object.values(nextState.teams)) {
      if (!nextState.handshakes.some((handshake) =>
        handshake.type === 'owner' &&
        handshake.teamId === team.id &&
        handshake.madeYear === nextState.year,
      )) {
        generateOwnerDemands(nextState, team.id);
      }
    }
    ensureWeeklyWeather(nextState, nextState.week);
    return { nextState, events, consequences: [] };
  }
  if (nextState.phase === 'offseason' && nextState.expansionDraftState) {
    return { nextState, events, consequences: [] };
  }
  if (nextState.phase === 'offseason' && !options.skipExpansionDraft && shouldTriggerExpansion(nextState, RNG.ai)) {
    nextState.expansionDraftState = initializeExpansionDraft(nextState, RNG.ai);
    return { nextState, events, consequences: [] };
  }
  if (['offseason', 'free_agency', 'draft', 'post_draft'].includes(nextState.phase)) {
    applyNonGamePhase(nextState, options.playtestBias);
    return { nextState, events, consequences: [] };
  }
  expireTimedEffects(nextState);
  const adaptiveModifier = getAdaptiveModifier(nextState);

  if (nextState.phase === 'regular_season' && nextState.week === getTradeDeadlineWeek(nextState) && !deadlineAlreadyResolved(nextState)) {
    if (!nextState.tradeDeadlineState) {
      nextState.tradeDeadlineState = initializeDeadline(nextState, RNG.trade, options.playtestBias);
    }
    return { nextState, events, consequences: [] };
  }

  if (nextState.phase === 'regular_season' || nextState.phase === 'playoffs') {
    for (const team of Object.values(nextState.teams)) {
      if (team.isUser) {
        processCarryoverHoldouts(nextState, team.id, RNG.ai);
      }
      processWeeklyTraining(nextState, team.id, RNG.dev);
    }
  }

  let laborPenalty = 0;
  if (nextState.phase === 'regular_season') {
    nextState.laborState = updateUnionSatisfaction(nextState.laborState, nextState);
    const stoppageCheck = checkWorkStoppage(nextState.laborState, nextState.cbaState);
    if (stoppageCheck.triggered) {
      activateWorkStoppage(nextState, stoppageCheck);
      laborPenalty = stoppageCheck.playerOvrPenalty;
    }
    if (['expiring', 'expired', 'negotiating', 'awaiting_owner_vote', 'lockout'].includes(nextState.cbaState.status)) {
      recordLaborEventNarrative(nextState);
    }
  }

  if (nextState.phase === 'regular_season') {
    completedRegularSeasonWeek = true;
    for (const team of Object.values(nextState.teams)) {
      if (!team.isUser) {
        autoAssignSpecialTeams(nextState, team.id);
      }
    }
    if (nextState.week >= 14) {
      flexSchedule(nextState, RNG.ai);
    }
    assignBroadcasts(nextState, nextState.week);
    ensureWeeklyWeather(nextState, nextState.week);
    const currentWeek = nextState.schedule.find((entry) => entry.week === nextState.week);
    for (const matchup of currentWeek?.games ?? []) {
      const home = nextState.teams[matchup.homeTeamId]!;
      const away = nextState.teams[matchup.awayTeamId]!;
      home.lockerRoom = home.lockerRoom?.cliques?.length ? home.lockerRoom : initializeLockerRoom(home, RNG.ai);
      away.lockerRoom = away.lockerRoom?.cliques?.length ? away.lockerRoom : initializeLockerRoom(away, RNG.ai);
      home.franchiseIdentity = home.franchiseIdentity ?? createDefaultFranchiseIdentity(home);
      home.franchiseIdentity = {
        ...home.franchiseIdentity,
        attendance: updateAttendance(home.franchiseIdentity, home),
      };
      const rivalry = getRivalryGameContext(nextState, home.id, away.id);
      const playerRivalryContext = buildPlayerRivalryContext(nextState, home, away);
      const homeEffects = getGameEffectBonuses(nextState, home.id);
      const awayEffects = getGameEffectBonuses(nextState, away.id);
      const homeLockerBonus = getLockerRoomGameBonus(home.lockerRoom);
      const awayLockerBonus = getLockerRoomGameBonus(away.lockerRoom);
      processInjuryRecovery(nextState, home.id, RNG.injury);
      processInjuryRecovery(nextState, away.id, RNG.injury);
      const homeFatigueBonuses = shouldIgnorePlaytestFatigue(home, options.playtestBias)
        ? undefined
        : buildFatiguePlayerBonuses(nextState, home.id);
      const awayFatigueBonuses = shouldIgnorePlaytestFatigue(away, options.playtestBias)
        ? undefined
        : buildFatiguePlayerBonuses(nextState, away.id);
      const homePlanContext = buildSimPlanContext(nextState, home, away);
      const awayPlanContext = buildSimPlanContext(nextState, away, home);
      const atmosphere = calculateAtmosphere(nextState, home, away, nextState.week, false);
      const atmosphereBonus = getAtmosphereBonus(atmosphere);

      const simContext = applyUserHalftimeChoice({
        home: {
          teamOvrBonus: buildTeamOvrBonus(
            home,
            homeEffects.teamOvrBonus + homeLockerBonus.teamOvrBonus + (homePlanContext.prepContext.teamOvrBonus ?? 0) + (rivalry?.ovrBoost ?? 0) + atmosphereBonus.homeOvrBonus,
            adaptiveModifier,
          ),
          playerOvrBonuses: buildPlayerBonuses(
            home,
            mergePlayerBonuses(
              homeEffects.playerOvrBonuses,
              homeFatigueBonuses,
              homePlanContext.prepContext.playerOvrBonuses,
              homeLockerBonus.captainBonuses,
              buildLaborPenaltyMap(home, laborPenalty, nextState),
              playerRivalryContext.homeBonuses,
            ),
          ),
          clutchPlayerBonuses: getLockerRoomClutchBonuses(home.lockerRoom, home),
          gamePlan: homePlanContext.gamePlan,
          opponentReport: homePlanContext.opponentReport,
        },
        away: {
          teamOvrBonus: buildTeamOvrBonus(
            away,
            awayEffects.teamOvrBonus + awayLockerBonus.teamOvrBonus + (awayPlanContext.prepContext.teamOvrBonus ?? 0) + (rivalry?.ovrBoost ?? 0) + atmosphereBonus.awayOvrPenalty,
            adaptiveModifier,
          ),
          playerOvrBonuses: buildPlayerBonuses(
            away,
            mergePlayerBonuses(
              awayEffects.playerOvrBonuses,
              awayFatigueBonuses,
              awayPlanContext.prepContext.playerOvrBonuses,
              awayLockerBonus.captainBonuses,
              buildLaborPenaltyMap(away, laborPenalty, nextState),
              playerRivalryContext.awayBonuses,
            ),
          ),
          clutchPlayerBonuses: getLockerRoomClutchBonuses(away.lockerRoom, away),
          gamePlan: awayPlanContext.gamePlan,
          opponentReport: awayPlanContext.opponentReport,
        },
        weather: matchup.weather ?? generateRegionalWeather(home, nextState.week, RNG.play),
        rivalryIntensity: rivalry?.intensity ?? 0,
        homeFieldBonus: (matchup.primetime ? 2 : 0) + getStadiumHomeFieldBonus(home.franchiseIdentity),
      }, {
        startingUser,
        home,
        away,
        halftimeDecision: options.halftimeDecision,
      });
      const outcome = simulateGame(
        nextState,
        home,
        away,
        nextState.year,
        nextState.week,
        nextState.difficulty,
        simContext,
        { fatigueIgnoreTeamIds: playtestFatigueIgnoreIds([home, away], options.playtestBias) },
      );
      outcome.result.broadcastNetwork = matchup.broadcastNetwork;
      outcome.result.primetime = matchup.primetime;
      outcome.result.flexed = matchup.flexed;
      callYourShotResult ??= resolveActiveCallYourShot(nextState, outcome.result, startingUser?.id ?? null);
      if (home.isUser || away.isUser) {
        outcome.result.broadcast = generateBroadcast(outcome.result, home, away, buildBroadcastRng(nextState, outcome.result));
        appendContingencyGhostLines(outcome.result);
        appendHallOfFamerGhostLine(outcome.result, nextState.hallOfFame ?? [], nextState.year);
      }
      // Snap count allocation
      const homePrep = nextState.weeklyPrepPlans?.[home.id];
      const homeSnapMgmt = resolvePlaytestSnapManagement(home, homePrep?.snapManagement ?? 'normal', options.playtestBias);
      const homeSnaps = allocateGameSnaps(home, homeSnapMgmt, outcome.result.stats?.[home.id]?.playerLines ?? [], RNG.play);
      applySnapCounts(home, homeSnaps);
      const awaySnapMgmt = resolvePlaytestSnapManagement(away, 'normal', options.playtestBias);
      const awaySnaps = allocateGameSnaps(away, awaySnapMgmt, outcome.result.stats?.[away.id]?.playerLines ?? [], RNG.play);
      applySnapCounts(away, awaySnaps);
      matchup.result = outcome.result;
      matchup.weather = outcome.result.weather ?? matchup.weather ?? null;
      home.lockerRoom = updateLockerRoomWeekly(home, home.lockerRoom, outcome.result, RNG.ai).lockerRoom;
      away.lockerRoom = updateLockerRoomWeekly(away, away.lockerRoom, outcome.result, RNG.ai).lockerRoom;
      nextState.playerRivalries = (nextState.playerRivalries ?? []).map((entry) =>
        playerRivalryContext.rivalries.some((rivalryEntry) => rivalryEntry.id === entry.id)
          ? updateRivalryFromGame(entry, outcome.result)
          : entry,
      );
      nextState.playerRivalries = detectNewRivalries(outcome.result, home, away, nextState.playerRivalries, RNG.ai);
      updateRecordsFromGameResult(nextState, outcome.result);
      const brokenRecords = detectBrokenRecords(nextState, [outcome.result]);
      const reachedMilestones = checkMilestones(nextState);
      weeklyBrokenRecords.push(...brokenRecords);
      weeklyMilestones.push(...reachedMilestones);

      const isRivalry = (nextState.leagueRivalries ?? []).some((r) =>
        (r.teamA === home.id && r.teamB === away.id) || (r.teamA === away.id && r.teamB === home.id),
      );
      const namedGame = detectNamedGame(
        outcome.result,
        buildNamedGameContext(nextState, outcome.result, home, away, outcome.injuries, isRivalry, Boolean(matchup.primetime)),
      );
      if (namedGame) {
        outcome.result.namedGame = namedGame;
        recordDynastyEvent(nextState, {
          id: `named-game-${nextState.year}-${nextState.week}-${home.id}`,
          year: nextState.year,
          week: nextState.week,
          type: 'named_game',
          headline: `${namedGame.name}: ${home.name} vs ${away.name}`,
          importance: 'major',
          playerIds: [],
          teamIds: [home.id, away.id],
          namedGame,
        });
      }

      const leagueRivalryId = [home.id, away.id].sort().join('::');
      const previousLeagueRivalryIntensity =
        nextState.leagueRivalries.find((entry) => entry.id === leagueRivalryId)?.intensity ?? 0;
      updateLeagueRivalriesFromGame(nextState, outcome.result);
      const updatedLeagueRivalry = nextState.leagueRivalries.find((entry) => entry.id === leagueRivalryId);
      if (updatedLeagueRivalry) {
        const ascendedTier = detectRivalryTierAscension(
          previousLeagueRivalryIntensity,
          updatedLeagueRivalry.intensity,
        );
        if (ascendedTier) {
          const teamNameMap: Record<string, string> = {};
          for (const team of Object.values(nextState.teams)) {
            teamNameMap[team.id] = team.name;
          }
          const heatSpikePost = createRivalryHeatSpikePost(
            updatedLeagueRivalry,
            ascendedTier,
            teamNameMap,
            nextState.week,
            RNG.ai,
          );
          if (heatSpikePost) ambientSocialPosts.push(heatSpikePost);
        }
      }
      for (const rivalryEntry of nextState.playerRivalries.filter((entry) => {
        const ids = [entry.teamAId, entry.teamBId];
        return ids.includes(home.id) && ids.includes(away.id);
      })) {
        const trashTalkPost = createRivalryTrashTalkPost(rivalryEntry, nextState.week, RNG.ai);
        if (trashTalkPost) ambientSocialPosts.push(trashTalkPost);
      }
      for (const tour of nextState.farewellTours ?? []) {
        if (tour.teamId !== home.id && tour.teamId !== away.id) continue;
        const opponent = tour.teamId === home.id ? away : home;
        const moment = generateFarewellMoment(tour, nextState.week, opponent, RNG.ai);
        if (moment) {
          ambientSocialPosts.push(createFarewellPost(nextState, moment.narrative));
        }
      }
      ownerDelta += updateOwner(home, nextState);
      ownerDelta += updateOwner(away, nextState);
      const event = makeEvent(nextState, 'weekly_result', `${home.name} ${outcome.result.homeScore}, ${away.name} ${outcome.result.awayScore}`, { gameId: outcome.result.id });
      events.push(event);
      nextState.eventLog.push(event);
      if (matchup.primetime) {
        recordBeat(nextState, {
          week: nextState.week,
          type: 'positive',
          intensity: 55,
          source: 'primetime_spotlight',
        });
      }

      if (startingUser && (home.id === startingUser.id || away.id === startingUser.id)) {
        userResult = outcome.result;
        userOpponent = home.id === startingUser.id ? away : home;
        userInjuries = outcome.injuries[startingUser.id] ?? [];
        userRivalry = rivalry;
        userRecordMoments = brokenRecords.filter((record) => record.teamId === startingUser.id);
        userMilestoneMoments = reachedMilestones.filter((milestone) =>
          nextState.players[milestone.playerId]?.teamId === startingUser.id);
        const userEffects = home.id === startingUser.id ? homeEffects : awayEffects;
        userPrepOutcome = home.id === startingUser.id ? homePlanContext.prepOutcome ?? null : awayPlanContext.prepOutcome ?? null;
        userPrepIntel = home.id === startingUser.id ? homePlanContext.prepIntel ?? null : awayPlanContext.prepIntel ?? null;
        userActiveEffectSummaries = [
          ...userEffects.summaries,
          ...(home.id === startingUser.id ? homePlanContext.prepOutcome?.reasoning ?? [] : awayPlanContext.prepOutcome?.reasoning ?? []),
          ...(rivalry ? [rivalry.headline] : []),
          ...(options.halftimeDecision ? [halftimeDecisionSummary(options.halftimeDecision)!] : []),
          ...(matchup.primetime ? ['Primetime spotlight puts the game under a brighter microscope.'] : []),
        ].slice(0, 4);
      }
    }

    const regularSeasonWeekCount = getRegularSeasonWeekCount(nextState);
    if (nextState.week >= regularSeasonWeekCount) {
      nextState.phase = 'playoffs';
      nextState.week = regularSeasonWeekCount + 1;
      nextState.playoffBracket = seedPlayoffBracket(nextState);
    } else {
      updatePowerRankings(nextState);
      nextState.week += 1;
      ensureWeeklyWeather(nextState, nextState.week);
    }
  } else if (nextState.phase === 'playoffs') {
    nextState.playoffBracket = nextState.playoffBracket ?? seedPlayoffBracket(nextState);
    nextState.playoffBracket = advancePlayoffBracket(nextState.playoffBracket, nextState.week, (homeTeamId, awayTeamId) => {
      const home = nextState.teams[homeTeamId]!;
      const away = nextState.teams[awayTeamId]!;
      home.lockerRoom = home.lockerRoom?.cliques?.length ? home.lockerRoom : initializeLockerRoom(home, RNG.ai);
      away.lockerRoom = away.lockerRoom?.cliques?.length ? away.lockerRoom : initializeLockerRoom(away, RNG.ai);
      home.franchiseIdentity = home.franchiseIdentity ?? createDefaultFranchiseIdentity(home);
      home.franchiseIdentity = {
        ...home.franchiseIdentity,
        attendance: updateAttendance(home.franchiseIdentity, home),
      };
      const rivalry = getRivalryGameContext(nextState, home.id, away.id);
      const playerRivalryContext = buildPlayerRivalryContext(nextState, home, away);
      const homeEffects = getGameEffectBonuses(nextState, home.id);
      const awayEffects = getGameEffectBonuses(nextState, away.id);
      const homeLockerBonus = getLockerRoomGameBonus(home.lockerRoom);
      const awayLockerBonus = getLockerRoomGameBonus(away.lockerRoom);
      processInjuryRecovery(nextState, home.id, RNG.injury);
      processInjuryRecovery(nextState, away.id, RNG.injury);
      const homeFatigueBonuses = shouldIgnorePlaytestFatigue(home, options.playtestBias)
        ? undefined
        : buildFatiguePlayerBonuses(nextState, home.id);
      const awayFatigueBonuses = shouldIgnorePlaytestFatigue(away, options.playtestBias)
        ? undefined
        : buildFatiguePlayerBonuses(nextState, away.id);
      const homePlanContext = buildSimPlanContext(nextState, home, away);
      const awayPlanContext = buildSimPlanContext(nextState, away, home);
      nextState.playoffMomentum[home.id] = nextState.playoffMomentum[home.id] ?? calculatePlayoffMomentum(nextState, home.id);
      nextState.playoffMomentum[away.id] = nextState.playoffMomentum[away.id] ?? calculatePlayoffMomentum(nextState, away.id);
      const homeMomentum = getPlayoffMomentumBonus(nextState.playoffMomentum[home.id]);
      const awayMomentum = getPlayoffMomentumBonus(nextState.playoffMomentum[away.id]);
      const playoffRound = playoffRoundForWeek(nextState, nextState.week);
      const playoffAtmosphere = calculateAtmosphere(nextState, home, away, nextState.week, true, playoffRound);
      const playoffAtmosphereBonus = getAtmosphereBonus(playoffAtmosphere);

      const simContext = applyUserHalftimeChoice({
        home: {
          teamOvrBonus: buildTeamOvrBonus(
            home,
            homeEffects.teamOvrBonus + homeLockerBonus.teamOvrBonus + (homePlanContext.prepContext.teamOvrBonus ?? 0) + (rivalry?.ovrBoost ?? 0) + homeMomentum + playoffAtmosphereBonus.homeOvrBonus,
            adaptiveModifier,
          ),
          playerOvrBonuses: buildPlayerBonuses(
            home,
            mergePlayerBonuses(
              homeEffects.playerOvrBonuses,
              homeFatigueBonuses,
              homePlanContext.prepContext.playerOvrBonuses,
              homeLockerBonus.captainBonuses,
              playerRivalryContext.homeBonuses,
            ),
          ),
          clutchPlayerBonuses: getLockerRoomClutchBonuses(home.lockerRoom, home),
          gamePlan: homePlanContext.gamePlan,
          opponentReport: homePlanContext.opponentReport,
        },
        away: {
          teamOvrBonus: buildTeamOvrBonus(
            away,
            awayEffects.teamOvrBonus + awayLockerBonus.teamOvrBonus + (awayPlanContext.prepContext.teamOvrBonus ?? 0) + (rivalry?.ovrBoost ?? 0) + awayMomentum + playoffAtmosphereBonus.awayOvrPenalty,
            adaptiveModifier,
          ),
          playerOvrBonuses: buildPlayerBonuses(
            away,
            mergePlayerBonuses(
              awayEffects.playerOvrBonuses,
              awayFatigueBonuses,
              awayPlanContext.prepContext.playerOvrBonuses,
              awayLockerBonus.captainBonuses,
              playerRivalryContext.awayBonuses,
            ),
          ),
          clutchPlayerBonuses: getLockerRoomClutchBonuses(away.lockerRoom, away),
          gamePlan: awayPlanContext.gamePlan,
          opponentReport: awayPlanContext.opponentReport,
        },
        weather: generateRegionalWeather(home, nextState.week, RNG.play),
        rivalryIntensity: rivalry?.intensity ?? 0,
        homeFieldBonus: getStadiumHomeFieldBonus(home.franchiseIdentity),
      }, {
        startingUser,
        home,
        away,
        halftimeDecision: options.halftimeDecision,
      });
      const outcome = simulateGame(
        nextState,
        home,
        away,
        nextState.year,
        nextState.week,
        nextState.difficulty,
        simContext,
        { fatigueIgnoreTeamIds: playtestFatigueIgnoreIds([home, away], options.playtestBias) },
      );
      callYourShotResult ??= resolveActiveCallYourShot(nextState, outcome.result, startingUser?.id ?? null);
      if (home.isUser || away.isUser) {
        outcome.result.broadcast = generateBroadcast(outcome.result, home, away, buildBroadcastRng(nextState, outcome.result));
        appendContingencyGhostLines(outcome.result);
        appendHallOfFamerGhostLine(outcome.result, nextState.hallOfFame ?? [], nextState.year);
      }
      // Playoff snap counts — ride_stars in playoffs
      const playoffHomePrep = nextState.weeklyPrepPlans?.[home.id];
      const playoffHomeSnapMgmt = resolvePlaytestSnapManagement(home, playoffHomePrep?.snapManagement ?? 'ride_stars', options.playtestBias);
      const playoffHomeSnaps = allocateGameSnaps(home, playoffHomeSnapMgmt, outcome.result.stats?.[home.id]?.playerLines ?? [], RNG.play);
      applySnapCounts(home, playoffHomeSnaps);
      const playoffAwaySnapMgmt = resolvePlaytestSnapManagement(away, 'ride_stars', options.playtestBias);
      const playoffAwaySnaps = allocateGameSnaps(away, playoffAwaySnapMgmt, outcome.result.stats?.[away.id]?.playerLines ?? [], RNG.play);
      applySnapCounts(away, playoffAwaySnaps);
      const winnerTeamId = outcome.result.homeScore >= outcome.result.awayScore ? outcome.result.homeTeamId : outcome.result.awayTeamId;
      const loserTeamId = winnerTeamId === outcome.result.homeTeamId ? outcome.result.awayTeamId : outcome.result.homeTeamId;
      nextState.playoffMomentum[winnerTeamId] = calculatePlayoffMomentum(nextState, winnerTeamId, true);
      nextState.playoffMomentum[loserTeamId] = calculatePlayoffMomentum(nextState, loserTeamId, false);
      recordNewsItem(nextState, generatePlayoffNews(nextState, {
        id: outcome.result.id,
        round: playoffRound,
        conference: playoffRound === 'super_bowl' ? 'NFL' : home.conference,
        week: nextState.week,
        homeTeamId: home.id,
        awayTeamId: away.id,
        winnerTeamId,
        result: outcome.result,
      }, {
        winnerTeamId,
        loserTeamId,
        homeScore: outcome.result.homeScore,
        awayScore: outcome.result.awayScore,
        narrativeTag: nextState.playoffMomentum[winnerTeamId]?.narrativeTag ?? null,
      }));
      home.lockerRoom = updateLockerRoomWeekly(home, home.lockerRoom, outcome.result, RNG.ai).lockerRoom;
      away.lockerRoom = updateLockerRoomWeekly(away, away.lockerRoom, outcome.result, RNG.ai).lockerRoom;
      nextState.playerRivalries = (nextState.playerRivalries ?? []).map((entry) =>
        playerRivalryContext.rivalries.some((rivalryEntry) => rivalryEntry.id === entry.id)
          ? updateRivalryFromGame(entry, outcome.result)
          : entry,
      );
      nextState.playerRivalries = detectNewRivalries(outcome.result, home, away, nextState.playerRivalries, RNG.ai);
      updateRecordsFromGameResult(nextState, outcome.result);
      const brokenRecords = detectBrokenRecords(nextState, [outcome.result]);
      const reachedMilestones = checkMilestones(nextState);
      weeklyBrokenRecords.push(...brokenRecords);
      weeklyMilestones.push(...reachedMilestones);
      const isRivalry = (nextState.leagueRivalries ?? []).some((r) =>
        (r.teamA === home.id && r.teamB === away.id) || (r.teamA === away.id && r.teamB === home.id),
      );
      const namedGame = detectNamedGame(
        outcome.result,
        buildNamedGameContext(nextState, outcome.result, home, away, outcome.injuries, isRivalry, false),
      );
      if (namedGame) {
        outcome.result.namedGame = namedGame;
        recordDynastyEvent(nextState, {
          id: `named-game-${nextState.year}-${nextState.week}-${home.id}`,
          year: nextState.year,
          week: nextState.week,
          type: 'named_game',
          headline: `${namedGame.name}: ${home.name} vs ${away.name}`,
          importance: 'major',
          playerIds: [],
          teamIds: [home.id, away.id],
          namedGame,
        });
      }
      const playoffLeagueRivalryId = [home.id, away.id].sort().join('::');
      const previousPlayoffLeagueIntensity =
        nextState.leagueRivalries.find((entry) => entry.id === playoffLeagueRivalryId)?.intensity ?? 0;
      updateLeagueRivalriesFromGame(nextState, outcome.result, { playoffElimination: true });
      const updatedPlayoffLeagueRivalry = nextState.leagueRivalries.find(
        (entry) => entry.id === playoffLeagueRivalryId,
      );
      if (updatedPlayoffLeagueRivalry) {
        const ascendedPlayoffTier = detectRivalryTierAscension(
          previousPlayoffLeagueIntensity,
          updatedPlayoffLeagueRivalry.intensity,
        );
        if (ascendedPlayoffTier) {
          const playoffTeamNameMap: Record<string, string> = {};
          for (const team of Object.values(nextState.teams)) {
            playoffTeamNameMap[team.id] = team.name;
          }
          const playoffHeatSpikePost = createRivalryHeatSpikePost(
            updatedPlayoffLeagueRivalry,
            ascendedPlayoffTier,
            playoffTeamNameMap,
            nextState.week,
            RNG.ai,
          );
          if (playoffHeatSpikePost) ambientSocialPosts.push(playoffHeatSpikePost);
        }
      }
      ownerDelta += updateOwner(home, nextState);
      ownerDelta += updateOwner(away, nextState);
      const event = makeEvent(nextState, 'playoff_result', `${home.name} ${outcome.result.homeScore}, ${away.name} ${outcome.result.awayScore}`, { gameId: outcome.result.id });
      events.push(event);
      nextState.eventLog.push(event);

      if (startingUser && (home.id === startingUser.id || away.id === startingUser.id)) {
        userResult = outcome.result;
        userOpponent = home.id === startingUser.id ? away : home;
        userInjuries = outcome.injuries[startingUser.id] ?? [];
        userRivalry = rivalry;
        userRecordMoments = brokenRecords.filter((record) => record.teamId === startingUser.id);
        userMilestoneMoments = reachedMilestones.filter((milestone) =>
          nextState.players[milestone.playerId]?.teamId === startingUser.id);
        const userEffects = home.id === startingUser.id ? homeEffects : awayEffects;
        userPrepOutcome = home.id === startingUser.id ? homePlanContext.prepOutcome ?? null : awayPlanContext.prepOutcome ?? null;
        userPrepIntel = home.id === startingUser.id ? homePlanContext.prepIntel ?? null : awayPlanContext.prepIntel ?? null;
        userActiveEffectSummaries = [
          ...userEffects.summaries,
          ...(home.id === startingUser.id ? homePlanContext.prepOutcome?.reasoning ?? [] : awayPlanContext.prepOutcome?.reasoning ?? []),
          ...(rivalry ? [rivalry.headline] : []),
          ...(options.halftimeDecision ? [halftimeDecisionSummary(options.halftimeDecision)!] : []),
        ].slice(0, 4);
        label = `Playoffs: ${playoffRoundLabel(playoffRound)}`;
      }

      return outcome.result;
    });

    if (nextState.playoffBracket.championTeamId) {
      archiveSeasonHistory(nextState);
      fireFranchiseBookChapterAlerts(nextState);
      evaluateOwnerMandates(nextState);
      archivePlayerSeasonHistory(nextState, nextState.year);
      const storyArcAdvance = advanceStoryArcs(nextState, nextState.year);
      nextState.storyArcs = storyArcAdvance.arcs;
      for (const item of storyArcAdvance.inboxEntries) {
        recordNewsItem(nextState, item);
      }
      advanceSeasonEndCoaching(nextState);

      // Doctrine detection at season end
      if (!nextState.earnedDoctrines) nextState.earnedDoctrines = [];
      const userTeamId = Object.values(nextState.teams).find((t) => t.isUser)?.id;
      if (userTeamId) {
        const userTeam = nextState.teams[userTeamId]!;
        const championships = nextState.franchiseHistory.filter((h) => h.teamId === userTeamId && h.playoffFinish === 'champion').length;

        // Championship DNA: 2+ Super Bowls
        if (championships >= 2 && checkDoctrineEligibility('championship_dna', nextState.earnedDoctrines)) {
          nextState.earnedDoctrines.push(awardDoctrine('championship_dna', nextState.year, nextState.week));
        }

        // Trust the Process: Won SB as champion this year + had a losing record in the past 3 years
        if (nextState.playoffBracket.championTeamId === userTeamId) {
          const recentHistory = nextState.franchiseHistory.filter((h) => h.teamId === userTeamId && h.year >= nextState.year - 3);
          const hadLosingRecord = recentHistory.some((h) => (h.losses ?? 0) > (h.wins ?? 0));
          if (hadLosingRecord && checkDoctrineEligibility('trust_the_process', nextState.earnedDoctrines)) {
            nextState.earnedDoctrines.push(awardDoctrine('trust_the_process', nextState.year, nextState.week));
          }
        }

        // Loyalty First: Any player with 10+ years on the team
        const loyalVeteran = userTeam.roster.some((p) => p.yearsExp >= 10 && p.teamId === userTeamId);
        if (loyalVeteran && checkDoctrineEligibility('loyalty_first', nextState.earnedDoctrines)) {
          nextState.earnedDoctrines.push(awardDoctrine('loyalty_first', nextState.year, nextState.week));
        }

        // Cap Wizardry: 15%+ cap space for current season
        const capPct = userTeam.capSpace / (userTeam.capSpace + userTeam.capUsed + (userTeam.deadCap ?? 0)) * 100;
        if (capPct >= 15 && checkDoctrineEligibility('cap_wizardry', nextState.earnedDoctrines)) {
          nextState.earnedDoctrines.push(awardDoctrine('cap_wizardry', nextState.year, nextState.week));
        }
      }

      nextState.phase = 'offseason';
      delete nextState.seasonNearMissReceipts;
      if (nextState.nearMissTracker) {
        if (hasNotableNearMisses(nextState.nearMissTracker)) {
          nearMissReceipts = generateNearMissReceipts(RNG.event, nextState.nearMissTracker);
          nextState.seasonNearMissReceipts = nearMissReceipts;
        }
        delete nextState.nearMissTracker;
      }
      nextState.year += 1;
      showSaveReminder = shouldShowSaveReminder(nextState.year, nextState.lastPortableExportYear ?? null);
      nextState.week = 1;
      ensureDraftClass(nextState);
      nextState.offseasonState = initializeOffseasonState(nextState);
      nextState.offseasonState.tradeOffers = generateTradeOffers(nextState);
      if (nextState.scenarioState?.activeScenario) {
        checkScenarioProgress(nextState);
        advanceScenarioSeason(nextState);
      }
    } else {
      nextState.week += 1;
    }
  }

  aiWaiverLogic(nextState);
  processWaiverClaims(nextState);
  refreshOwnerMandates(nextState);
  evaluateHandshakes(nextState);

  syncPlayers(nextState);
  if (weeklyBrokenRecords.length > 0) {
    nextState.recentBrokenRecords = [...nextState.recentBrokenRecords, ...weeklyBrokenRecords].slice(-25);
    for (const record of weeklyBrokenRecords) {
      createRecordBreakingNews(nextState, record);
    }
  }
  if (weeklyMilestones.length > 0) {
    nextState.recentMilestones = [...nextState.recentMilestones, ...weeklyMilestones].slice(-25);
    for (const milestone of weeklyMilestones) {
      createMilestoneNews(nextState, milestone);
    }
  }
  nextState.activeRecordChases = nextState.phase === 'regular_season'
    ? checkRecordChases(nextState)
    : [];
  if (completedRegularSeasonWeek) {
    const digest = generateWeeklyMediaCycle(nextState, playedWeek);
    nextState.mediaCycle.weeklyDigests = [...nextState.mediaCycle.weeklyDigests, digest];
    nextState.mediaCycle.powerRankingHistory = [
      ...nextState.mediaCycle.powerRankingHistory,
      {
        weekNumber: playedWeek,
        rankings: digest.powerRankings,
      },
    ];
    nextState.storylineThreads = advanceStorylineThreads(nextState, playedWeek);
    nextState.storylineThreads = closeCompletedThreads(nextState);
    nextState.storylineThreads = seedThreadsForWeek(nextState, playedWeek);
  }
  const currentUser = findUserTeam(nextState);
  if (currentUser && userResult) {
    const userOutcome = userResult.homeTeamId === currentUser.id
      ? userResult.homeScore > userResult.awayScore
        ? 'win'
        : userResult.homeScore < userResult.awayScore
          ? 'loss'
          : null
      : userResult.awayScore > userResult.homeScore
        ? 'win'
        : userResult.awayScore < userResult.homeScore
          ? 'loss'
          : null;
    if (userOutcome) {
      updateAdaptiveDifficulty(nextState, userOutcome, playedWeek);
    }
    const summary = buildWeeklySummary({
      team: currentUser,
      opponent: userOpponent,
      result: userResult,
      year: userResult.year,
      week: userResult.week,
      phase: label ? 'playoffs' : 'regular_season',
      ownerDelta,
      injuries: userInjuries,
      notes: userInjuries.length > 0
        ? [`${userInjuries.length} ${label ? 'playoff ' : ''}injury${userInjuries.length > 1 ? 'ies' : ''}`]
        : [label ? 'Playoff week complete' : 'No major injuries'],
      label,
    });
    nextState.weekSummaries.push(summary);
    const postGameConference = createPostGamePressConference({
      game: nextState,
      team: currentUser,
      opponent: userOpponent,
      result: summary.result,
      topic: userRivalry ? 'rivalry showdown' : summary.result === 'win' ? 'statement win' : 'hard reset',
      rivalryIntensity: userRivalry?.intensity ?? 0,
      ownerDelta,
    });
    const filmRoomReport = userPrepOutcome && userPrepIntel
      ? buildFilmRoomReport(nextState, currentUser.id, userResult, userPrepOutcome, userPrepIntel)
      : null;
    if (userPrepOutcome) {
      nextState.weeklyPrepHistory = [...(nextState.weeklyPrepHistory ?? []), userPrepOutcome].slice(-24);
    }
    if (filmRoomReport) {
      nextState.filmRoomHistory = [...(nextState.filmRoomHistory ?? []), filmRoomReport].slice(-24);
    }
    syncApologyTourThreads(nextState, {
      teamId: currentUser.id,
      opponentTeamId: userOpponent?.id ?? (userResult.homeTeamId === currentUser.id ? userResult.awayTeamId : userResult.homeTeamId),
      result: userResult,
      currentYear: nextState.year,
      currentWeek: nextState.week,
    });
    appendGameDayPackage(nextState, currentUser, userOpponent, userResult, summary, {
      pressConference: postGameConference,
      rivalry: userRivalry,
      activeEffectSummaries: userActiveEffectSummaries,
      filmRoomReport,
      recordsMoments: userRecordMoments,
      milestoneMoments: userMilestoneMoments,
      callYourShotResult,
    });
    for (const activation of userResult.contingencyActivations?.filter((entry) => entry.teamId === currentUser.id) ?? []) {
      const scoreDelta = userResult.homeTeamId === currentUser.id
        ? userResult.homeScore - userResult.awayScore
        : userResult.awayScore - userResult.homeScore;
      recordNewsItem(nextState, {
        id: `contingency-${nextState.year}-${playedWeek}-${activation.ruleId}`,
        year: nextState.year,
        week: playedWeek,
        type: 'milestone',
        headline: `Contingency fired: ${activation.responseLabel ?? activation.label}`,
        body: `${activation.label} triggered in Q${activation.quarter}. Result: ${summary.result.toUpperCase()} with a ${scoreDelta >= 0 ? '+' : ''}${scoreDelta} point swing on the final scoreboard.`,
        teamIds: [currentUser.id, ...(userOpponent ? [userOpponent.id] : [])],
        playerIds: [],
        importance: 'minor',
      });
    }
    recordPressConference(nextState, postGameConference);
    recordBeat(nextState, {
      week: playedWeek,
      type: summary.result === 'win' ? 'positive' : summary.result === 'loss' ? 'negative' : 'neutral',
      intensity: summary.result === 'win' ? 72 : summary.result === 'loss' ? 68 : 50,
      source: 'game_result',
    });
    if (userInjuries.length > 0) {
      recordBeat(nextState, {
        week: playedWeek,
        type: 'negative',
        intensity: Math.min(90, 35 + userInjuries.length * 12),
        source: 'injuries',
      });
    }
    if (nextState.phase === 'regular_season') {
      if (shouldGenerateEvent(nextState, 'off_field_event', 40, RNG.ai, {
        polarity: summary.result === 'loss' ? 'negative' : 'positive',
      })) {
        generateWeeklyOffFieldEvents(nextState, currentUser);
      }
      const midweekConference = shouldGenerateEvent(nextState, 'midweek_press', 30, RNG.ai, {
        polarity: userRivalry ? 'positive' : 'neutral',
      }) ? maybeCreateMidweekPressConference(nextState, currentUser) : null;
      if (midweekConference) {
        recordPressConference(nextState, midweekConference);
      }
    }
  } else {
    refreshNarrative(nextState);
    if (currentUser) {
      nextState.narrativeState.activeArcs = advanceWeeklyStoryArcs(nextState, { team: currentUser, opponent: null, summary: null });
    }
  }

  if (currentUser && (game.phase === 'regular_season' || game.phase === 'playoffs')) {
    const newPosts = [
      ...ambientSocialPosts,
      ...weeklyBrokenRecords.map((record) => createRecordBreakingPost(record, playedWeek, RNG.ai)),
      ...weeklyMilestones.map((milestone) => createMilestonePost(milestone, playedWeek, RNG.ai)),
      ...(userResult?.broadcast
        ? generateGameDayPosts(
          userResult.broadcast,
          userResult,
          nextState.teams,
          Object.values(nextState.players),
          playedWeek,
          RNG.ai,
        )
        : []),
      ...nextState.activeRecordChases.slice(0, 3).map((chase) => createRecordChasePost(chase, playedWeek, RNG.ai)),
      ...generateWeeklyBuzz(nextState, playedWeek, RNG.ai),
    ];
    nextState.socialFeed = appendToSocialFeed(nextState.socialFeed, newPosts);
  }

  if (completedRegularSeasonWeek) {
    generateWeeklyLeagueNews(nextState, RNG.ai);
    for (const stat of ['passYds', 'rushYds', 'sacks'] as const) {
      const leader = getLeagueLeaders(nextState, stat, undefined, 1)[0];
      if (leader) {
        createStatWatchNews(nextState, stat, leader);
      }
    }
  }

  checkAchievements(nextState);
  resetGamePlan(nextState);
  if (currentUser?.id && nextState.weeklyPrepPlans?.[currentUser.id]) {
    delete nextState.weeklyPrepPlans[currentUser.id];
  }
  if (currentUser && (nextState.phase === 'regular_season' || nextState.phase === 'playoffs')) {
    nextState.tradeSuggestions = findTradeTargets(nextState, currentUser.id);
  } else {
    nextState.tradeSuggestions = [];
  }

  return {
    nextState,
    events,
    consequences: [
      {
        label: 'Record',
        before: previousRecord,
        after: currentUser ? `${currentUser.wins}-${currentUser.losses}${currentUser.ties ? `-${currentUser.ties}` : ''}` : previousRecord,
        delta: 0,
        severity: 'neutral',
      },
      {
        label: 'Owner Approval',
        before: 0,
        after: ownerDelta,
        delta: ownerDelta,
        severity: ownerDelta >= 0 ? 'positive' : 'negative',
      },
    ] satisfies Consequence[],
    milestones: userMilestoneMoments,
    callYourShotResult,
    nearMissReceipts,
    showSaveReminder,
  };
}
