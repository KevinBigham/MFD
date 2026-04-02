import { DIFF_SETTINGS } from '../config/difficulty';
import { RNG } from '../rng';
import { simGame, applyPlayerLines } from './game-sim';
import { generateHooks } from './hooks-engine';
import { updateOwnerApproval } from './owner';
import { tickPatience } from './owner-extended';
import { applyGameToSeasonStats, ensureSeasonStats, tickInjuries } from './season-stats';
import type {
  GameEvent,
  GameResult,
  GameState,
  Team,
  TeamGameStats,
  WeeklyInjurySummary,
} from '../types';

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

function maybeInjure(team: Team, injMod: number): WeeklyInjurySummary[] {
  const injuries: WeeklyInjurySummary[] = [];
  const healthy = team.roster.filter((player) => player.isStarter && !player.injury && player.pos !== 'K' && player.pos !== 'P');
  if (healthy.length === 0 || RNG.injury() >= 0.08 * injMod) return injuries;

  const player = healthy[Math.floor(RNG.injury() * healthy.length)]!;
  const roll = [
    { severity: 'questionable', gamesOut: 1 },
    { severity: 'doubtful', gamesOut: 2 },
    { severity: 'out', gamesOut: 4 },
    { severity: 'ir', gamesOut: 8 },
  ][Math.floor(RNG.injury() * 4)]!;
  const type = ['hamstring', 'ankle', 'shoulder', 'knee'][Math.floor(RNG.injury() * 4)]!;

  player.injury = { type, severity: roll.severity as WeeklyInjurySummary['severity'], gamesOut: roll.gamesOut };
  injuries.push({
    playerId: player.id,
    playerName: player.name,
    severity: roll.severity as WeeklyInjurySummary['severity'],
    gamesOut: roll.gamesOut,
    type,
  });

  return injuries;
}

export function simulateGame(home: Team, away: Team, year: number, week: number, difficulty: GameState['difficulty']) {
  const sim = simGame(home, away);
  const { homeScore, awayScore, overtime, homeStats, awayStats, homeMvpId, awayMvpId } = sim;

  // Apply player box score lines to season stats
  applyPlayerLines(home, homeStats.playerLines);
  applyPlayerLines(away, awayStats.playerLines);

  // Apply team-level results
  applyResult(home, away, homeStats, awayStats, homeScore, awayScore);
  const diff = DIFF_SETTINGS[difficulty];

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
    } satisfies GameResult,
    injuries: {
      [home.id]: maybeInjure(home, diff.injMod),
      [away.id]: maybeInjure(away, diff.injMod),
    },
  };
}

export function updateOwner(team: Team, game: GameState): number {
  const before = team.owner.approval;
  updateOwnerApproval(team.owner, team, { year: game.year, week: game.week, phase: game.phase });
  team.ownerMood = team.owner.approval;
  team.ownerPatience80 = tickPatience(
    team.ownerPatience80,
    team.owner.archetypeId,
    team.streak > 0 ? 'win' : 'loss',
    { isPlayoff: game.phase === 'playoffs', streak: team.streak },
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
  return JSON.parse(JSON.stringify(game)) as GameState;
}

export function findUserTeam(game: GameState): Team | null {
  return Object.values(game.teams).find((team: Team) => team.isUser) ?? null;
}

export { tickInjuries };
