import { cl } from '../utils';
import { RNG, reseedSeason, reseedWeek, setSeed } from '../rng';
import { getAdaptiveModifier, updateAdaptiveDifficulty } from './adaptive-difficulty';
import { advanceDraft, ensureDraftClass, finalizePostDraft } from './draft';
import { generateWeeklyLeagueNews } from './league-news';
import { advanceFreeAgency, advanceOffseason, initializeOffseasonState } from './offseason';
import { advancePlayoffBracket, seedPlayoffBracket } from './playoff-bracket';
import { processWeeklyTraining } from './player-development';
import { archiveSeasonHistory } from './history';
import { advanceStoryArcs } from './story-arcs';
import { buildGameDayPackage } from './game-day-package';
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
import { updateRecordsFromGameResult } from './records';
import { getRivalryGameContext, seedLeagueRivalries, updateLeagueRivalriesFromGame } from './rivalries';
import { generateTradeOffers } from './trade-market';
import { buildWeeklySummary } from './weekly-summary';
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
  });

  nextState.gameDayState.recentPackages = [...nextState.gameDayState.recentPackages, packageData].slice(-8);
  nextState.gameDayState.latestPackageId = packageData.id;
  nextState.narrativeState.recentHeadlines = [summary.headline, ...nextState.narrativeState.recentHeadlines].slice(0, 8);
}

function buildTeamOvrBonus(team: Team, baseBonus: number, adaptiveModifier: number): number {
  return cl(baseBonus + (team.isUser ? 0 : adaptiveModifier), -5, 5);
}

export function advanceFranchiseWeek(game: GameState): EngineOutput {
  const nextState = cloneGame(game);
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
  let label: string | undefined;
  let completedRegularSeasonWeek = false;

  setSeed(game.seed);
  reseedSeason(game.year);
  reseedWeek(game.year, game.week);
  ensureLivingWorldState(nextState);
  if (nextState.leagueRivalries.length === 0) {
    seedLeagueRivalries(nextState);
  }

  if (nextState.phase === 'preseason') {
    nextState.phase = 'regular_season';
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
  if (['offseason', 'free_agency', 'draft', 'post_draft'].includes(nextState.phase)) {
    applyNonGamePhase(nextState);
    return { nextState, events, consequences: [] };
  }
  expireTimedEffects(nextState);
  const adaptiveModifier = getAdaptiveModifier(nextState);

  if (nextState.phase === 'regular_season' || nextState.phase === 'playoffs') {
    for (const team of Object.values(nextState.teams)) {
      processWeeklyTraining(nextState, team.id, RNG.dev);
    }
  }

  if (nextState.phase === 'regular_season') {
    completedRegularSeasonWeek = true;
    ensureWeeklyWeather(nextState, nextState.week);
    const currentWeek = nextState.schedule.find((entry) => entry.week === nextState.week);
    for (const matchup of currentWeek?.games ?? []) {
      const home = nextState.teams[matchup.homeTeamId]!;
      const away = nextState.teams[matchup.awayTeamId]!;
      const rivalry = getRivalryGameContext(nextState, home.id, away.id);
      const homeEffects = getGameEffectBonuses(nextState, home.id);
      const awayEffects = getGameEffectBonuses(nextState, away.id);
      tickInjuries(home);
      tickInjuries(away);

      const outcome = simulateGame(home, away, nextState.year, nextState.week, nextState.difficulty, {
        home: {
          teamOvrBonus: buildTeamOvrBonus(home, homeEffects.teamOvrBonus + (rivalry?.ovrBoost ?? 0), adaptiveModifier),
          playerOvrBonuses: homeEffects.playerOvrBonuses,
        },
        away: {
          teamOvrBonus: buildTeamOvrBonus(away, awayEffects.teamOvrBonus + (rivalry?.ovrBoost ?? 0), adaptiveModifier),
          playerOvrBonuses: awayEffects.playerOvrBonuses,
        },
        weather: matchup.weather ?? generateWeatherForGame(home, nextState.week),
        rivalryIntensity: rivalry?.intensity ?? 0,
      });
      matchup.result = outcome.result;
      matchup.weather = outcome.result.weather ?? matchup.weather ?? null;
      updateRecordsFromGameResult(nextState, outcome.result);
      updateLeagueRivalriesFromGame(nextState, outcome.result);
      ownerDelta += updateOwner(home, nextState);
      ownerDelta += updateOwner(away, nextState);
      const event = makeEvent(nextState, 'weekly_result', `${home.name} ${outcome.result.homeScore}, ${away.name} ${outcome.result.awayScore}`, { gameId: outcome.result.id });
      events.push(event);
      nextState.eventLog.push(event);

      if (startingUser && (home.id === startingUser.id || away.id === startingUser.id)) {
        userResult = outcome.result;
        userOpponent = home.id === startingUser.id ? away : home;
        userInjuries = outcome.injuries[startingUser.id] ?? [];
        userRivalry = rivalry;
        const userEffects = home.id === startingUser.id ? homeEffects : awayEffects;
        userActiveEffectSummaries = [...userEffects.summaries, ...(rivalry ? [rivalry.headline] : [])].slice(0, 4);
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
      const rivalry = getRivalryGameContext(nextState, home.id, away.id);
      const homeEffects = getGameEffectBonuses(nextState, home.id);
      const awayEffects = getGameEffectBonuses(nextState, away.id);
      tickInjuries(home);
      tickInjuries(away);

      const outcome = simulateGame(home, away, nextState.year, nextState.week, nextState.difficulty, {
        home: {
          teamOvrBonus: buildTeamOvrBonus(home, homeEffects.teamOvrBonus + (rivalry?.ovrBoost ?? 0), adaptiveModifier),
          playerOvrBonuses: homeEffects.playerOvrBonuses,
        },
        away: {
          teamOvrBonus: buildTeamOvrBonus(away, awayEffects.teamOvrBonus + (rivalry?.ovrBoost ?? 0), adaptiveModifier),
          playerOvrBonuses: awayEffects.playerOvrBonuses,
        },
        weather: generateWeatherForGame(home, nextState.week),
        rivalryIntensity: rivalry?.intensity ?? 0,
      });
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
        const userEffects = home.id === startingUser.id ? homeEffects : awayEffects;
        userActiveEffectSummaries = [...userEffects.summaries, ...(rivalry ? [rivalry.headline] : [])].slice(0, 4);
        label = `Playoffs: ${nextState.week === 19 ? 'Wild Card' : nextState.week === 20 ? 'Divisional' : nextState.week === 21 ? 'Conference Final' : 'Championship'}`;
      }

      return outcome.result;
    });

    if (nextState.playoffBracket.championTeamId) {
      archiveSeasonHistory(nextState);
      nextState.phase = 'offseason';
      nextState.year += 1;
      nextState.week = 1;
      ensureDraftClass(nextState);
      nextState.offseasonState = initializeOffseasonState(nextState);
      nextState.offseasonState.tradeOffers = generateTradeOffers(nextState);
    } else {
      nextState.week += 1;
    }
  }

  aiWaiverLogic(nextState);
  processWaiverClaims(nextState);
  evaluateHandshakes(nextState);

  syncPlayers(nextState);
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
    appendGameDayPackage(nextState, currentUser, userOpponent, userResult, summary, {
      pressConference: postGameConference,
      rivalry: userRivalry,
      activeEffectSummaries: userActiveEffectSummaries,
    });
    recordPressConference(nextState, postGameConference);
    if (nextState.phase === 'regular_season') {
      generateWeeklyOffFieldEvents(nextState, currentUser);
      const midweekConference = maybeCreateMidweekPressConference(nextState, currentUser);
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

  if (completedRegularSeasonWeek) {
    generateWeeklyLeagueNews(nextState, RNG.ai);
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
