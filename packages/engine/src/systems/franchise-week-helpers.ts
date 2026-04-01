import { DIFF_SETTINGS } from '../config/difficulty';
import { RNG } from '../rng';
import { avg, cl } from '../utils';
import { generateHooks } from './hooks-engine';
import { updateOwnerApproval } from './owner';
import { tickPatience } from './owner-extended';
import { applyGameToSeasonStats, ensureSeasonStats, tickInjuries } from './season-stats';
import type {
  GameEvent,
  GameResult,
  GameState,
  Player,
  Team,
  TeamGameStats,
  WeeklyInjurySummary,
} from '../types';

function getPrimary(team: Team, positions: Player['pos'][]): Player | null {
  return [...team.roster]
    .filter((player) => positions.includes(player.pos) && !player.injury)
    .sort((a, b) => Number(b.isStarter) - Number(a.isStarter) || b.ovr - a.ovr)[0] ?? null;
}

function makeTeamGameStats(team: Team, opponent: Team, score: number): TeamGameStats {
  const qb = getPrimary(team, ['QB'])?.ovr ?? 70;
  const rush = avg(team.roster.filter((player) => player.pos === 'RB').map((player) => player.ovr)) || 68;
  const passRate = cl(0.48 + (qb - rush) / 200, 0.4, 0.66);
  const totalYards = cl(Math.round(235 + score * 12 + avg(team.roster.map((player) => player.ovr)) + (RNG.play() - 0.5) * 70), 180, 520);
  const awareness = avg(team.roster.map((player) => player.ratings.awareness ?? player.ovr));
  const frontSeven = avg(team.roster.filter((player) => player.pos === 'DL' || player.pos === 'LB').map((player) => player.ovr));
  const line = avg(opponent.roster.filter((player) => player.pos === 'OL').map((player) => player.ovr));
  const thirdDownAttempts = cl(Math.round(9 + score / 4 + RNG.play() * 4), 8, 18);

  return {
    totalYards,
    passingYards: Math.round(totalYards * passRate),
    rushingYards: totalYards - Math.round(totalYards * passRate),
    turnovers: cl(Math.round((100 - awareness) / 28 + RNG.play() * 2), 0, 4),
    sacks: cl(Math.round((frontSeven - line) / 18 + RNG.play() * 2), 0, 6),
    thirdDownConversions: cl(Math.round(thirdDownAttempts * (0.34 + score / 100)), 1, thirdDownAttempts),
    thirdDownAttempts,
    timeOfPossession: cl(Math.round(28 + (score - 21) / 2 + (RNG.play() - 0.5) * 8), 22, 38),
  };
}

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

function distributeStats(team: Team, opponentStats: TeamGameStats, ownStats: TeamGameStats): string | null {
  const qb = getPrimary(team, ['QB']);
  const rb = getPrimary(team, ['RB']);
  const receivers = [...team.roster]
    .filter((player) => (player.pos === 'WR' || player.pos === 'TE') && !player.injury)
    .sort((a, b) => b.ovr - a.ovr)
    .slice(0, 3);
  const defenders = [...team.roster]
    .filter((player) => player.pos === 'DL' || player.pos === 'LB' || player.pos === 'CB' || player.pos === 'S')
    .sort((a, b) => b.ovr - a.ovr);

  if (qb) qb.stats.passYds += ownStats.passingYards;
  if (rb) rb.stats.rushYds += Math.round(ownStats.rushingYards * 0.58);
  if (receivers[0]) receivers[0].stats.recYds += Math.round(ownStats.passingYards * 0.42);
  if (receivers[1]) receivers[1].stats.recYds += Math.round(ownStats.passingYards * 0.31);
  if (receivers[2]) receivers[2].stats.recYds += Math.round(ownStats.passingYards * 0.19);
  if (defenders[0]) defenders[0].stats.sacks += Math.round(ownStats.sacks * 0.5);
  if (defenders[1]) defenders[1].stats.sacks += Math.round(ownStats.sacks * 0.3);
  if (defenders[2]) defenders[2].stats.defINT += Math.max(0, opponentStats.turnovers - 1);

  return qb?.id ?? rb?.id ?? receivers[0]?.id ?? null;
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
  const homeStrength = avg(home.roster.filter((player) => player.isStarter).map((player) => player.ovr)) + 1.5;
  const awayStrength = avg(away.roster.filter((player) => player.isStarter).map((player) => player.ovr));
  const delta = homeStrength - awayStrength;
  let homeScore = cl(Math.round(22 + delta * 0.45 + (RNG.play() - 0.5) * 14), 9, 42);
  let awayScore = cl(Math.round(20 - delta * 0.35 + (RNG.play() - 0.5) * 14), 6, 38);
  let overtime = false;

  if (homeScore === awayScore) {
    overtime = true;
    if (RNG.play() >= 0.5) homeScore += 3 + Math.floor(RNG.play() * 4);
    else awayScore += 3 + Math.floor(RNG.play() * 4);
  }

  const homeStats = makeTeamGameStats(home, away, homeScore);
  const awayStats = makeTeamGameStats(away, home, awayScore);
  applyResult(home, away, homeStats, awayStats, homeScore, awayScore);
  const homeMvp = distributeStats(home, awayStats, homeStats);
  const awayMvp = distributeStats(away, homeStats, awayStats);
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
      mvpPlayerId: homeScore > awayScore ? homeMvp : awayMvp,
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
