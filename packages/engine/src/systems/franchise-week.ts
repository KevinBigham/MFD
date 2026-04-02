import { reseedSeason, reseedWeek, setSeed } from '../rng';
import { advanceDraft, ensureDraftClass, finalizePostDraft } from './draft';
import { advanceFreeAgency, advanceOffseason, initializeOffseasonState } from './offseason';
import { advancePlayoffBracket, seedPlayoffBracket } from './playoff-bracket';
import { archiveSeasonHistory } from './history';
import { advanceStoryArcs } from './story-arcs';
import { buildGameDayPackage } from './game-day-package';
import { updatePowerRankings } from './power-rankings';
import { updateRecordsFromGameResult } from './records';
import { generateTradeOffers } from './trade-market';
import { buildWeeklySummary } from './weekly-summary';
import {
  cloneGame,
  findUserTeam,
  makeEvent,
  refreshNarrative,
  simulateGame,
  syncPlayers,
  tickInjuries,
  updateOwner,
} from './franchise-week-helpers';
import type { Consequence, EngineOutput, GameEvent, GameResult, GameState, Team, WeeklyInjurySummary } from '../types';

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

function appendGameDayPackage(nextState: GameState, team: Team, opponent: Team | null, result: GameResult, summary: ReturnType<typeof buildWeeklySummary>): void {
  refreshNarrative(nextState);
  nextState.narrativeState.activeArcs = advanceStoryArcs(nextState, { team, opponent, summary });

  const packageData = buildGameDayPackage({
    team,
    opponent,
    result,
    summary,
    hooks: nextState.narrativeState.hooks,
    activeArcs: nextState.narrativeState.activeArcs,
  });

  nextState.gameDayState.recentPackages = [...nextState.gameDayState.recentPackages, packageData].slice(-8);
  nextState.gameDayState.latestPackageId = packageData.id;
  nextState.narrativeState.recentHeadlines = [summary.headline, ...nextState.narrativeState.recentHeadlines].slice(0, 8);
}

export function advanceFranchiseWeek(game: GameState): EngineOutput {
  const nextState = cloneGame(game);
  const events: GameEvent[] = [];
  const startingUser = findUserTeam(nextState);
  const previousRecord = startingUser ? `${startingUser.wins}-${startingUser.losses}${startingUser.ties ? `-${startingUser.ties}` : ''}` : '0-0';
  let ownerDelta = 0;
  let userResult: GameResult | null = null;
  let userOpponent: Team | null = null;
  let userInjuries: WeeklyInjurySummary[] = [];
  let label: string | undefined;

  setSeed(game.seed);
  reseedSeason(game.year);
  reseedWeek(game.year, game.week);

  if (nextState.phase === 'preseason') {
    nextState.phase = 'regular_season';
    return { nextState, events, consequences: [] };
  }
  if (['offseason', 'free_agency', 'draft', 'post_draft'].includes(nextState.phase)) {
    applyNonGamePhase(nextState);
    return { nextState, events, consequences: [] };
  }

  if (nextState.phase === 'regular_season') {
    const currentWeek = nextState.schedule.find((entry) => entry.week === nextState.week);
    for (const matchup of currentWeek?.games ?? []) {
      const home = nextState.teams[matchup.homeTeamId]!;
      const away = nextState.teams[matchup.awayTeamId]!;
      tickInjuries(home);
      tickInjuries(away);

      const outcome = simulateGame(home, away, nextState.year, nextState.week, nextState.difficulty);
      matchup.result = outcome.result;
      updateRecordsFromGameResult(nextState, outcome.result);
      ownerDelta += updateOwner(home, nextState);
      ownerDelta += updateOwner(away, nextState);
      const event = makeEvent(nextState, 'weekly_result', `${home.name} ${outcome.result.homeScore}, ${away.name} ${outcome.result.awayScore}`, { gameId: outcome.result.id });
      events.push(event);
      nextState.eventLog.push(event);

      if (startingUser && (home.id === startingUser.id || away.id === startingUser.id)) {
        userResult = outcome.result;
        userOpponent = home.id === startingUser.id ? away : home;
        userInjuries = outcome.injuries[startingUser.id] ?? [];
      }
    }

    if (nextState.week >= 18) {
      nextState.phase = 'playoffs';
      nextState.week = 19;
      nextState.playoffBracket = seedPlayoffBracket(nextState);
    } else {
      updatePowerRankings(nextState);
      nextState.week += 1;
    }
  } else if (nextState.phase === 'playoffs') {
    nextState.playoffBracket = nextState.playoffBracket ?? seedPlayoffBracket(nextState);
    nextState.playoffBracket = advancePlayoffBracket(nextState.playoffBracket, nextState.week, (homeTeamId, awayTeamId) => {
      const home = nextState.teams[homeTeamId]!;
      const away = nextState.teams[awayTeamId]!;
      tickInjuries(home);
      tickInjuries(away);

      const outcome = simulateGame(home, away, nextState.year, nextState.week, nextState.difficulty);
      ownerDelta += updateOwner(home, nextState);
      ownerDelta += updateOwner(away, nextState);
      const event = makeEvent(nextState, 'playoff_result', `${home.name} ${outcome.result.homeScore}, ${away.name} ${outcome.result.awayScore}`, { gameId: outcome.result.id });
      events.push(event);
      nextState.eventLog.push(event);

      if (startingUser && (home.id === startingUser.id || away.id === startingUser.id)) {
        userResult = outcome.result;
        userOpponent = home.id === startingUser.id ? away : home;
        userInjuries = outcome.injuries[startingUser.id] ?? [];
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

  syncPlayers(nextState);
  const currentUser = findUserTeam(nextState);
  if (currentUser && userResult) {
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
    appendGameDayPackage(nextState, currentUser, userOpponent, userResult, summary);
  } else {
    refreshNarrative(nextState);
    if (currentUser) {
      nextState.narrativeState.activeArcs = advanceStoryArcs(nextState, { team: currentUser, opponent: null, summary: null });
    }
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
