import { cl } from '../utils';
import { RNG, mulberry32, reseedSeason, reseedWeek, setSeed } from '../rng';
import { getAdaptiveModifier, updateAdaptiveDifficulty } from './adaptive-difficulty';
import { checkAchievements } from './achievements';
import { advanceDraft, ensureDraftClass, finalizePostDraft } from './draft';
import { checkCBAStatus, initCBA } from './cba-engine';
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
import { advanceStoryArcs } from './story-arcs';
import { buildGameDayPackage } from './game-day-package';
import { buildFilmRoomReport } from './film-room';
import { evaluateHandshakes, generateOwnerDemands } from './handshake-ledger';
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
import {
  createRivalryTrashTalkPost,
  detectNewRivalries,
  getRivalryGameBonus,
  updateRivalryFromGame,
} from './player-rivalries';
import { updateRecordsFromGameResult } from './records';
import { getRivalryGameContext, seedLeagueRivalries, updateLeagueRivalriesFromGame } from './rivalries';
import { getActiveRule, initLeagueRules } from './league-rules';
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
import type {
  Consequence,
  EngineOutput,
  GameEvent,
  GameResult,
  GameState,
  PressConference,
  RivalryGameContext,
  Team,
  WeeklyInjurySummary,
} from '../types';

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
  const prepOutcome = storedPrep && prepIntel ? evaluateWeeklyPrep(team, prepIntel, storedPrep) : null;
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

function applyNonGamePhase(nextState: GameState): void {
  if (nextState.phase === 'offseason') advanceOffseason(nextState);
  else if (nextState.phase === 'free_agency') advanceFreeAgency(nextState);
  else if (nextState.phase === 'draft') advanceDraft(nextState);
  else if (nextState.phase === 'post_draft') finalizePostDraft(nextState);

  syncPlayers(nextState);
  refreshNarrative(nextState);
  const userTeam = findUserTeam(nextState);
  if (userTeam) {
    nextState.narrativeState.activeArcs = advanceStoryArcs(nextState, { team: userTeam, opponent: null, summary: null });
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
  },
): void {
  refreshNarrative(nextState);
  nextState.narrativeState.activeArcs = advanceStoryArcs(nextState, { team, opponent, summary });

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

export function advanceFranchiseWeek(game: GameState): EngineOutput {
  const nextState = cloneGame(game);
  ensureGovernanceState(nextState);
  const events: GameEvent[] = [];
  const playedWeek = nextState.week;
  const startingUser = findUserTeam(nextState);
  const previousRecord = startingUser ? `${startingUser.wins}-${startingUser.losses}${startingUser.ties ? `-${startingUser.ties}` : ''}` : '0-0';
  let ownerDelta = 0;
  let userResult: GameResult | null = null;
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
  nextState.cbaState.status = checkCBAStatus(nextState.cbaState, nextState.year);
  if (nextState.leagueRivalries.length === 0) {
    seedLeagueRivalries(nextState);
  }
  if ((nextState.phase === 'preseason' || nextState.phase === 'offseason') && isCBAInterruptStatus(nextState.cbaState.status)) {
    recordLaborEventNarrative(nextState);
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
  if (nextState.phase === 'offseason' && shouldTriggerExpansion(nextState, RNG.ai)) {
    nextState.expansionDraftState = initializeExpansionDraft(nextState, RNG.ai);
    return { nextState, events, consequences: [] };
  }
  if (['offseason', 'free_agency', 'draft', 'post_draft'].includes(nextState.phase)) {
    applyNonGamePhase(nextState);
    return { nextState, events, consequences: [] };
  }
  expireTimedEffects(nextState);
  const adaptiveModifier = getAdaptiveModifier(nextState);

  if (nextState.phase === 'regular_season' && nextState.week === getTradeDeadlineWeek(nextState) && !deadlineAlreadyResolved(nextState)) {
    if (!nextState.tradeDeadlineState) {
      nextState.tradeDeadlineState = initializeDeadline(nextState, RNG.trade);
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
      const homeFatigueBonuses = buildFatiguePlayerBonuses(nextState, home.id);
      const awayFatigueBonuses = buildFatiguePlayerBonuses(nextState, away.id);
      const homePlanContext = buildSimPlanContext(nextState, home, away);
      const awayPlanContext = buildSimPlanContext(nextState, away, home);

      const outcome = simulateGame(nextState, home, away, nextState.year, nextState.week, nextState.difficulty, {
        home: {
          teamOvrBonus: buildTeamOvrBonus(
            home,
            homeEffects.teamOvrBonus + homeLockerBonus.teamOvrBonus + (homePlanContext.prepContext.teamOvrBonus ?? 0) + (rivalry?.ovrBoost ?? 0),
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
            awayEffects.teamOvrBonus + awayLockerBonus.teamOvrBonus + (awayPlanContext.prepContext.teamOvrBonus ?? 0) + (rivalry?.ovrBoost ?? 0),
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
        weather: matchup.weather ?? generateWeatherForGame(home, nextState.week),
        rivalryIntensity: rivalry?.intensity ?? 0,
        homeFieldBonus: (matchup.primetime ? 2 : 0) + getStadiumHomeFieldBonus(home.franchiseIdentity),
      });
      outcome.result.broadcastNetwork = matchup.broadcastNetwork;
      outcome.result.primetime = matchup.primetime;
      outcome.result.flexed = matchup.flexed;
      if (home.isUser || away.isUser) {
        outcome.result.broadcast = generateBroadcast(outcome.result, home, away, buildBroadcastRng(nextState, outcome.result));
      }
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
      updateLeagueRivalriesFromGame(nextState, outcome.result);
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
          ...(matchup.primetime ? ['Primetime spotlight puts the game under a brighter microscope.'] : []),
        ].slice(0, 4);
      }
    }

    if (nextState.week >= 18) {
      nextState.phase = 'playoffs';
      nextState.week = 19;
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
      const homeFatigueBonuses = buildFatiguePlayerBonuses(nextState, home.id);
      const awayFatigueBonuses = buildFatiguePlayerBonuses(nextState, away.id);
      const homePlanContext = buildSimPlanContext(nextState, home, away);
      const awayPlanContext = buildSimPlanContext(nextState, away, home);
      nextState.playoffMomentum[home.id] = nextState.playoffMomentum[home.id] ?? calculatePlayoffMomentum(nextState, home.id);
      nextState.playoffMomentum[away.id] = nextState.playoffMomentum[away.id] ?? calculatePlayoffMomentum(nextState, away.id);
      const homeMomentum = getPlayoffMomentumBonus(nextState.playoffMomentum[home.id]);
      const awayMomentum = getPlayoffMomentumBonus(nextState.playoffMomentum[away.id]);

      const outcome = simulateGame(nextState, home, away, nextState.year, nextState.week, nextState.difficulty, {
        home: {
          teamOvrBonus: buildTeamOvrBonus(
            home,
            homeEffects.teamOvrBonus + homeLockerBonus.teamOvrBonus + (homePlanContext.prepContext.teamOvrBonus ?? 0) + (rivalry?.ovrBoost ?? 0) + homeMomentum,
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
            awayEffects.teamOvrBonus + awayLockerBonus.teamOvrBonus + (awayPlanContext.prepContext.teamOvrBonus ?? 0) + (rivalry?.ovrBoost ?? 0) + awayMomentum,
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
        weather: generateWeatherForGame(home, nextState.week),
        rivalryIntensity: rivalry?.intensity ?? 0,
        homeFieldBonus: getStadiumHomeFieldBonus(home.franchiseIdentity),
      });
      if (home.isUser || away.isUser) {
        outcome.result.broadcast = generateBroadcast(outcome.result, home, away, buildBroadcastRng(nextState, outcome.result));
      }
      const winnerTeamId = outcome.result.homeScore >= outcome.result.awayScore ? outcome.result.homeTeamId : outcome.result.awayTeamId;
      const loserTeamId = winnerTeamId === outcome.result.homeTeamId ? outcome.result.awayTeamId : outcome.result.homeTeamId;
      nextState.playoffMomentum[winnerTeamId] = calculatePlayoffMomentum(nextState, winnerTeamId, true);
      nextState.playoffMomentum[loserTeamId] = calculatePlayoffMomentum(nextState, loserTeamId, false);
      recordNewsItem(nextState, generatePlayoffNews(nextState, {
        id: outcome.result.id,
        round: nextState.week === 19 ? 'wild_card' : nextState.week === 20 ? 'divisional' : nextState.week === 21 ? 'conference' : 'super_bowl',
        conference: nextState.week === 22 ? 'NFL' : home.conference,
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
      updateLeagueRivalriesFromGame(nextState, outcome.result, { playoffElimination: true });
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
        ].slice(0, 4);
        label = `Playoffs: ${nextState.week === 19 ? 'Wild Card' : nextState.week === 20 ? 'Divisional' : nextState.week === 21 ? 'Conference Final' : 'Championship'}`;
      }

      return outcome.result;
    });

    if (nextState.playoffBracket.championTeamId) {
      archiveSeasonHistory(nextState);
      archivePlayerSeasonHistory(nextState, nextState.year);
      nextState.phase = 'offseason';
      nextState.year += 1;
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
      phase: userResult.week >= 19 ? 'playoffs' : 'regular_season',
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
    appendGameDayPackage(nextState, currentUser, userOpponent, userResult, summary, {
      pressConference: postGameConference,
      rivalry: userRivalry,
      activeEffectSummaries: userActiveEffectSummaries,
      filmRoomReport,
      recordsMoments: userRecordMoments,
      milestoneMoments: userMilestoneMoments,
    });
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
      nextState.narrativeState.activeArcs = advanceStoryArcs(nextState, { team: currentUser, opponent: null, summary: null });
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
  };
}
