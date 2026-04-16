import { DIFF_SETTINGS } from '../config/difficulty';
import { RNG } from '../rng';
import { simGame, applyPlayerLines } from './game-sim';
import { buildFatiguePlayerBonuses, processWeeklyFatigue } from './fatigue';
import { generateHooks } from './hooks-engine';
import { getInjuryPenalty, isPlayerUnavailable, maybeGenerateTeamInjury, processInjuryRecovery } from './injury-system';
import { updateOwnerApproval } from './owner';
import { tickPatience } from './owner-extended';
import { applyGameToSeasonStats, ensureSeasonStats, tickInjuries } from './season-stats';
import { generateRegionalWeather } from './regional-weather';
import type {
  GameEvent,
  GameResult,
  GameState,
  Team,
  WeatherCondition,
  TeamGameStats,
  WeeklyInjurySummary,
} from '../types';
import type { SimGameContext } from './game-sim-types';

function applyResult(home: Team, away: Team, homeStats: TeamGameStats, awayStats: TeamGameStats, homeScore: number, awayScore: number): void {
  applyGameToSeasonStats(home, homeStats, awayStats, homeScore, awayScore);
  applyGameToSeasonStats(away, awayStats, homeStats, awayScore, homeScore);

  if (homeScore > awayScore) {
    home.wins += 1;
    away.losses += 1;
    home.streak = home.streak >= 0 ? home.streak + 1 : 1;
    away.streak = away.streak <= 0 ? away.streak - 1 : -1;
    return;
  }

  away.wins += 1;
  home.losses += 1;
  away.streak = away.streak >= 0 ? away.streak + 1 : 1;
  home.streak = home.streak <= 0 ? home.streak - 1 : -1;
}

function maybeInjure(game: GameState, team: Team, injMod: number): WeeklyInjurySummary[] {
  const injuries: WeeklyInjurySummary[] = [];
  const eligible = team.roster.filter((player) =>
    player.isStarter &&
    !player.injury &&
    player.pos !== 'K' &&
    player.pos !== 'P',
  );

  for (const player of eligible) {
    const fatigueLevel = team.fatigueState[player.id]?.fatigue ?? 0;
    const injury = maybeGenerateTeamInjury(game, team.id, player, fatigueLevel, injMod, RNG.injury);
    if (!injury) continue;

    injuries.push({
      playerId: player.id,
      playerName: player.name,
      severity: injury.severity,
      gamesOut: injury.gamesOut,
      type: injury.type,
    });
  }

  return injuries;
}

function buildPlayerBonuses(team: Team, extraBonuses: Record<string, number> = {}): Record<string, number> {
  const fatigueBonuses = Object.fromEntries(team.roster.map((player) => [player.id, getInjuryPenalty(player)]));
  return team.roster.reduce<Record<string, number>>((bonuses, player) => {
    const total = (extraBonuses[player.id] ?? 0) + (fatigueBonuses[player.id] ?? 0);
    if (total !== 0) bonuses[player.id] = total;
    return bonuses;
  }, {});
}

export function simulateGame(
  game: GameState,
  home: Team,
  away: Team,
  year: number,
  week: number,
  difficulty: GameState['difficulty'],
  context?: SimGameContext,
): {
  result: GameResult;
  injuries: Record<string, WeeklyInjurySummary[]>;
} {
  const sim = simGame(home, away, context);
  const {
    homeScore,
    awayScore,
    overtime,
    homeStats,
    awayStats,
    homeMvpId,
    awayMvpId,
    weather,
    matchupHighlight,
    contingencyActivations,
  } = sim;

  // Apply player box score lines to season stats
  applyPlayerLines(home, homeStats.playerLines);
  applyPlayerLines(away, awayStats.playerLines);

  // Apply team-level results
  applyResult(home, away, homeStats, awayStats, homeScore, awayScore);
  const diff = DIFF_SETTINGS[difficulty];
  processWeeklyFatigue(game, home.id, homeStats);
  processWeeklyFatigue(game, away.id, awayStats);

  return {
    result: {
      id: `game-${year}-${week}-${home.id}-${away.id}`,
      homeTeamId: home.id,
      awayTeamId: away.id,
      homeScore,
      awayScore,
      week,
      year,
      overtime,
      mvpPlayerId: homeScore > awayScore ? homeMvpId : awayMvpId,
      stats: { [home.id]: homeStats, [away.id]: awayStats },
      weather,
      matchupHighlight,
      specialTeams: sim.specialTeams,
      playerMatchupEvents: sim.playerMatchupEvents,
      contingencyActivations,
    },
    injuries: {
      [home.id]: maybeInjure(game, home, diff.injMod),
      [away.id]: maybeInjure(game, away, diff.injMod),
    },
  };
}

export function generateWeatherForGame(home: Team, week: number): WeatherCondition {
  if (home.stadiumType === 'dome') return 'dome';

  const roll = RNG.play();
  if (week >= 15) {
    if (roll < 0.16) return 'snow';
    if (roll < 0.34) return 'wind';
    if (roll < 0.52) return 'rain';
    return 'clear';
  }
  if (week >= 10) {
    if (roll < 0.08) return 'snow';
    if (roll < 0.22) return 'wind';
    if (roll < 0.38) return 'rain';
    return 'clear';
  }
  if (week >= 5) {
    if (roll < 0.10) return 'wind';
    if (roll < 0.22) return 'rain';
    return 'clear';
  }
  if (roll < 0.08) return 'rain';
  if (roll < 0.12) return 'wind';
  return 'clear';
}

export function ensureWeeklyWeather(game: GameState, week: number): void {
  const weekSchedule = game.schedule.find((entry) => entry.week === week);
  if (!weekSchedule) return;

  for (const matchup of weekSchedule.games) {
    if (matchup.weather) continue;
    const home = game.teams[matchup.homeTeamId];
    if (!home) continue;
    matchup.weather = generateRegionalWeather(home, week, RNG.play);
  }
}

export function updateOwner(team: Team, game: GameState): number {
  const before = team.owner.approval;
  const gamesPlayed = team.wins + team.losses + team.ties;
  const winPct = gamesPlayed > 0
    ? (team.wins + team.ties * 0.5) / gamesPlayed
    : 0.5;
  const firstSeason = !game.franchiseHistory.some((entry) => entry.teamId === team.id);
  updateOwnerApproval(team.owner, team, { year: game.year, week: game.week, phase: game.phase });
  team.ownerMood = team.owner.approval;
  team.ownerPatience80 = tickPatience(
    team.ownerPatience80,
    team.owner.archetypeId,
    team.streak > 0 ? 'win' : 'loss',
    {
      isPlayoff: game.phase === 'playoffs',
      streak: team.streak,
      week: game.week,
      winPct,
      firstSeason,
    },
  ).patience;
  return team.owner.approval - before;
}

export function makeEvent(game: GameState, type: string, description: string, data: Record<string, unknown>): GameEvent {
  return {
    id: `${type}-${game.year}-${game.week}-${game.eventLog.length}`,
    type,
    timestamp: game.year * 1000 + game.week * 10 + game.eventLog.length,
    description,
    data,
  };
}

export function syncPlayers(game: GameState): void {
  for (const team of Object.values(game.teams)) {
    ensureSeasonStats(team);
    for (const player of team.roster) game.players[player.id] = player;
  }
}

export function refreshNarrative(game: GameState): void {
  const userTeam = findUserTeam(game);
  if (!userTeam) return;

  const sched = game.schedule.flatMap((week) => week.games.map((entry) => ({
    home: entry.homeTeamId,
    away: entry.awayTeamId,
    week: week.week,
    played: entry.result !== null,
  })));
  const hooks = generateHooks({ my: userTeam, myId: userTeam.id, teams: Object.values(game.teams), season: { year: game.year, week: game.week, phase: game.phase }, sched });
  game.narrativeState.hooks = hooks.map((hook, index) => ({
    id: `hook-${game.year}-${game.week}-${index}`,
    type: hook.cat,
    description: hook.text,
    resolved: false,
    deadline: game.week + 2,
  }));
  if (game.narrativeState.hooks.length === 0) {
    game.narrativeState.hooks = [{
      id: `hook-${game.year}-${game.week}-fallback`,
      type: 'streak',
      description: `${userTeam.city} ${userTeam.name} sit at ${userTeam.wins}-${userTeam.losses}. Keep momentum into the next week.`,
      resolved: false,
      deadline: game.week + 2,
    }];
  }
}

export function cloneGame(game: GameState): GameState {
  return structuredClone(game);
}

export function findUserTeam(game: GameState): Team | null {
  return Object.values(game.teams).find((team: Team) => team.isUser) ?? null;
}

export { tickInjuries };
export { processInjuryRecovery, buildPlayerBonuses, buildFatiguePlayerBonuses, isPlayerUnavailable };
