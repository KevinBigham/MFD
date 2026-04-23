import { simGame } from './game-sim';
import type { SimGameContext } from './game-sim-types';
import { generateAiGamePlan } from './game-plan';
import { reseedSeason, reseedWeek, setSeed } from '../rng';
import type { PlaytestAIBias } from '../playtesting/types';
import type {
  GameState,
  HalftimeDecisionChoice,
  HalftimeDecisionModifier,
  PendingHalftimeDecision,
  ScheduledGame,
  SwitchSuggestion,
  Team,
  WeatherCondition,
} from '../types';

interface HalftimeSwitchInput {
  scoreMargin: number;
  teamYardsPerPlay: number;
  opponentYardsPerPlay: number;
  turnoverDelta: number;
}

export interface AdvanceFranchiseWeekOptions {
  halftimeDecision?: {
    choice: HalftimeDecisionChoice;
    suggestion: SwitchSuggestion;
  } | null;
  playtestBias?: PlaytestAIBias;
}

function approximateYardsPerPlay(totalYards: number, plays: number): number {
  return totalYards / Math.max(1, plays);
}

function buildHalftimeModifier(
  choice: HalftimeDecisionChoice,
  suggestion: SwitchSuggestion,
): HalftimeDecisionModifier | null {
  if (choice === 'stick') return null;

  if (choice === 'switch') {
    return {
      choice,
      direction: suggestion.direction,
      responseLabel: suggestion.responseLabel,
      summary: suggestion.summary,
      sustainedBonus: 1,
      firstDriveDelta: -1,
      gambleDriveDelta: 0,
      gambleOtherDriveDelta: 0,
    };
  }

  return {
    choice,
    direction: suggestion.direction,
    responseLabel: suggestion.responseLabel,
    summary: suggestion.summary,
    sustainedBonus: 0,
    firstDriveDelta: 0,
    gambleDriveDelta: 3,
    gambleOtherDriveDelta: -2,
  };
}

function currentUserMatchup(game: GameState, userTeamId: string): Pick<ScheduledGame, 'homeTeamId' | 'awayTeamId' | 'weather' | 'primetime' | 'broadcastNetwork'> | null {
  if (game.phase === 'regular_season') {
    const week = game.schedule.find((entry) => entry.week === game.week);
    return week?.games.find((matchup) =>
      !matchup.result
      && (matchup.homeTeamId === userTeamId || matchup.awayTeamId === userTeamId),
    ) ?? null;
  }

  if (game.phase === 'playoffs') {
    const matchup = game.playoffBracket?.matchups.find((entry) =>
      entry.week === game.week
      && !entry.result
      && (entry.homeTeamId === userTeamId || entry.awayTeamId === userTeamId),
    );
    return matchup
      ? {
        homeTeamId: matchup.homeTeamId,
        awayTeamId: matchup.awayTeamId,
        weather: null,
        primetime: game.week >= 21,
        broadcastNetwork: game.week >= 21 ? 'MFN' : null,
      }
      : null;
  }

  return null;
}

function defaultWeather(home: Team): WeatherCondition {
  return home.stadiumType === 'dome' ? 'dome' : 'clear';
}

function buildPreviewContext(game: GameState, home: Team, away: Team): SimGameContext {
  const userTeamId = Object.values(game.teams).find((team) => team.isUser)?.id ?? null;

  return {
    weather: defaultWeather(home),
    home: {
      gamePlan: userTeamId === home.id
        ? (game.gamePlan ?? generateAiGamePlan(game, home.id, away.id))
        : generateAiGamePlan(game, home.id, away.id),
    },
    away: {
      gamePlan: userTeamId === away.id
        ? (game.gamePlan ?? generateAiGamePlan(game, away.id, home.id))
        : generateAiGamePlan(game, away.id, home.id),
    },
  };
}

export function suggestHalftimeSwitch(input: HalftimeSwitchInput): SwitchSuggestion {
  const yppDelta = input.teamYardsPerPlay - input.opponentYardsPerPlay;

  if (input.scoreMargin <= -10 || (input.scoreMargin <= -4 && input.turnoverDelta < 0)) {
    return {
      direction: 'more_aggressive',
      responseLabel: 'Heat them up',
      summary: 'Crank the pressure and attack downhill after the break.',
      reason: 'The scoreboard and turnover battle both say the passive script is dead.',
    };
  }

  if (input.scoreMargin <= -4 || yppDelta < -0.8) {
    return {
      direction: 'more_pass',
      responseLabel: 'Open the throttle',
      summary: 'Shift into a faster, pass-first second half.',
      reason: 'The offense needs chunk plays to erase the halftime deficit.',
    };
  }

  if (input.scoreMargin >= 10) {
    return {
      direction: 'slow_down',
      responseLabel: 'Bleed the clock',
      summary: 'Shorten the game and keep the ball away from the comeback path.',
      reason: 'The lead is real enough to start protecting possessions.',
    };
  }

  if (input.turnoverDelta < 0 && yppDelta >= 0) {
    return {
      direction: 'more_run',
      responseLabel: 'Settle the offense',
      summary: 'Lean on the ground game and stop feeding extra chances.',
      reason: 'The yardage profile is fine; the giveaways are what need cleaning up.',
    };
  }

  return {
    direction: yppDelta >= 0 ? 'more_run' : 'more_pass',
    responseLabel: yppDelta >= 0 ? 'Lean on the legs' : 'Let it rip',
    summary: yppDelta >= 0
      ? 'Use the efficient rushing profile to control the second half.'
      : 'Push the ball outside and chase a cleaner explosive script.',
    reason: yppDelta >= 0
      ? 'The run efficiency is the clearest edge from the first half.'
      : 'The offense needs a cleaner vertical answer after halftime.',
  };
}

export function applyHalftimeDecision(
  context: SimGameContext,
  params: {
    side: 'home' | 'away';
    choice: HalftimeDecisionChoice;
    suggestion: SwitchSuggestion;
  },
): SimGameContext {
  if (params.choice === 'stick') {
    return context;
  }

  const modifier = buildHalftimeModifier(params.choice, params.suggestion);
  if (!modifier) return context;

  return {
    ...context,
    [params.side]: {
      ...(context[params.side] ?? {}),
      halftimeModifier: modifier,
    },
  };
}

export function shouldOfferHalftimeDecision(game: GameState): boolean {
  if (game.difficulty === 'rookie') return false;
  if (game.settings?.halftimeDecisions !== 'on') return false;
  if (game.phase !== 'regular_season' && game.phase !== 'playoffs') return false;

  const userTeam = Object.values(game.teams).find((team) => team.isUser);
  if (!userTeam) return false;

  return Boolean(currentUserMatchup(game, userTeam.id));
}

export function previewHalftimeDecision(game: GameState): PendingHalftimeDecision | null {
  if (!shouldOfferHalftimeDecision(game)) return null;

  const userTeam = Object.values(game.teams).find((team) => team.isUser) ?? null;
  if (!userTeam) return null;

  const matchup = currentUserMatchup(game, userTeam.id);
  if (!matchup) return null;

  setSeed(game.seed);
  reseedSeason(game.year);
  reseedWeek(game.year, game.week);

  const home = structuredClone(game.teams[matchup.homeTeamId]!);
  const away = structuredClone(game.teams[matchup.awayTeamId]!);
  const preview = simGame(home, away, {
    ...buildPreviewContext(game, home, away),
    weather: matchup.weather ?? defaultWeather(home),
  });

  const homeHalftimeScore = (preview.homeStats.quarterScores[0] ?? 0) + (preview.homeStats.quarterScores[1] ?? 0);
  const awayHalftimeScore = (preview.awayStats.quarterScores[0] ?? 0) + (preview.awayStats.quarterScores[1] ?? 0);
  const userIsHome = userTeam.id === home.id;
  const userStats = userIsHome ? preview.homeStats : preview.awayStats;
  const opponentStats = userIsHome ? preview.awayStats : preview.homeStats;

  const suggestion = suggestHalftimeSwitch({
    scoreMargin: userIsHome ? homeHalftimeScore - awayHalftimeScore : awayHalftimeScore - homeHalftimeScore,
    teamYardsPerPlay: approximateYardsPerPlay(
      userStats.totalYards,
      userStats.passAttempts + userStats.rushAttempts + userStats.sacks,
    ),
    opponentYardsPerPlay: approximateYardsPerPlay(
      opponentStats.totalYards,
      opponentStats.passAttempts + opponentStats.rushAttempts + opponentStats.sacks,
    ),
    turnoverDelta: opponentStats.turnovers - userStats.turnovers,
  });

  return {
    teamId: userTeam.id,
    year: game.year,
    week: game.week,
    phase: game.phase,
    homeTeamId: home.id,
    awayTeamId: away.id,
    homeScore: homeHalftimeScore,
    awayScore: awayHalftimeScore,
    suggestion,
  };
}
