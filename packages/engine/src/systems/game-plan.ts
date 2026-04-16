import type { GamePlan, GameState, OpponentReport, Player, Position, Team } from '../types';
import type { SimTeamContext } from './game-sim-types';

const OFFENSE_POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE', 'OL'];
const DEFENSE_POSITIONS: Position[] = ['DL', 'LB', 'CB', 'S'];

function positionAverage(team: Team, positions: Position[]): number {
  const group = team.roster.filter((player) => positions.includes(player.pos));
  if (group.length === 0) return 60;
  return group.reduce((sum, player) => sum + player.ovr, 0) / group.length;
}

function positionGroupAverage(team: Team, positions: Position[]): number {
  const group = team.roster.filter((player) => positions.includes(player.pos) && player.isStarter);
  if (group.length === 0) return positionAverage(team, positions);
  return group.reduce((sum, player) => sum + player.ovr, 0) / group.length;
}

function offenseRank(game: GameState, teamId: string): number {
  const rows = Object.values(game.teams)
    .map((team) => ({
      teamId: team.id,
      score: team.seasonStats.gamesPlayed > 0
        ? team.seasonStats.pointsFor / Math.max(1, team.seasonStats.gamesPlayed)
        : positionAverage(team, OFFENSE_POSITIONS),
    }))
    .sort((a, b) => b.score - a.score || a.teamId.localeCompare(b.teamId));
  return rows.findIndex((entry) => entry.teamId === teamId) + 1 || rows.length;
}

function defenseRank(game: GameState, teamId: string): number {
  const rows = Object.values(game.teams)
    .map((team) => ({
      teamId: team.id,
      score: team.seasonStats.gamesPlayed > 0
        ? team.seasonStats.pointsAgainst / Math.max(1, team.seasonStats.gamesPlayed)
        : 120 - positionAverage(team, DEFENSE_POSITIONS),
    }))
    .sort((a, b) => a.score - b.score || a.teamId.localeCompare(b.teamId));
  return rows.findIndex((entry) => entry.teamId === teamId) + 1 || rows.length;
}

function topPlayers(team: Team, positions?: Position[]): Player[] {
  return [...team.roster]
    .filter((player) => !positions || positions.includes(player.pos))
    .sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id))
    .slice(0, 4);
}

function buildVulnerabilityRatings(team: Team) {
  const coverage = 100 - positionGroupAverage(team, ['CB', 'S']);
  const rushing = 100 - positionGroupAverage(team, ['DL', 'LB']);
  const passRush = 100 - positionGroupAverage(team, ['DL']);
  const passing = 100 - positionGroupAverage(team, ['CB', 'S']);
  return {
    passing: Math.round(passing),
    rushing: Math.round(rushing),
    pass_rush: Math.round(passRush),
    coverage: Math.round(coverage),
  } as OpponentReport['vulnerabilityRatings'];
}

function offensiveRecommendation(opponent: Team): GamePlan['offensiveScheme'] {
  const secondary = positionGroupAverage(opponent, ['CB', 'S']);
  const front = positionGroupAverage(opponent, ['DL', 'LB']);
  const defensiveLine = positionGroupAverage(opponent, ['DL']);

  if (secondary <= 68) return 'pass_heavy';
  if (front <= 68) return 'run_heavy';
  if (secondary <= 72 && defensiveLine >= 76) return 'spread';
  if (front <= 72 && defensiveLine <= 70) return 'power';
  return 'balanced';
}

function defensiveRecommendation(opponent: Team): GamePlan['defensiveScheme'] {
  const qb = topPlayers(opponent, ['QB'])[0]?.ovr ?? 60;
  const runGame = positionGroupAverage(opponent, ['RB', 'OL']);
  const passingThreat = positionGroupAverage(opponent, ['QB', 'WR', 'TE']);
  const offensiveLine = positionGroupAverage(opponent, ['OL']);

  if (passingThreat >= 80) return 'coverage';
  if (qb <= 68 || offensiveLine <= 68) return 'blitz_heavy';
  if (runGame >= 78) return 'contain';
  if (passingThreat <= 70 && runGame <= 70) return 'aggressive';
  return 'base';
}

function reportNarrative(opponent: Team, recommendation: OpponentReport['schemeRecommendation']): string {
  return `Attack ${opponent.city} ${opponent.name} with ${recommendation.offense.replaceAll('_', ' ')} and answer back with ${recommendation.defense.replaceAll('_', ' ')}.`;
}

export function getStoredOpponentReport(
  game: GameState,
  teamId: string,
  opponentTeamId: string,
  year = game.year,
  week = game.week,
): OpponentReport | null {
  return (game.opponentReports ?? []).find((report) =>
    report.teamId === opponentTeamId &&
    report.year === year &&
    report.week === week &&
    report.keyPlayers.length >= 0 &&
    teamId.length >= 0) ?? null;
}

export function generateOpponentScouting(game: GameState, teamId: string, opponentTeamId: string): OpponentReport {
  const team = game.teams[teamId];
  const opponent = game.teams[opponentTeamId];
  if (!team || !opponent) {
    throw new Error(`Cannot scout missing matchup ${teamId} vs ${opponentTeamId}.`);
  }

  const offense = offensiveRecommendation(opponent);
  const defense = defensiveRecommendation(opponent);
  const vulnerabilities = buildVulnerabilityRatings(opponent);
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (positionGroupAverage(opponent, ['QB', 'WR', 'TE']) >= 78) strengths.push('Vertical passing game can stress the secondary.');
  if (positionGroupAverage(opponent, ['RB', 'OL']) >= 78) strengths.push('Run game can control tempo and shorten the night.');
  if (positionGroupAverage(opponent, ['CB', 'S']) >= 78) strengths.push('Secondary closes throwing windows quickly.');
  if (positionGroupAverage(opponent, ['DL', 'LB']) >= 78) strengths.push('Front seven can muddy the line of scrimmage.');

  if (vulnerabilities.passing >= 28) weaknesses.push('Secondary is vulnerable to sustained passing pressure.');
  if (vulnerabilities.rushing >= 28) weaknesses.push('Front can be moved in the run game.');
  if (vulnerabilities.pass_rush >= 28) weaknesses.push('Pass rush lacks finishing juice.');
  if (weaknesses.length === 0) {
    weaknesses.push('No glaring weakness. Execution will matter more than leverage.');
  }

  return {
    teamId: opponent.id,
    teamName: `${opponent.city} ${opponent.name}`,
    record: `${opponent.wins}-${opponent.losses}${opponent.ties ? `-${opponent.ties}` : ''}`,
    year: game.year,
    week: game.week,
    offenseRank: offenseRank(game, opponent.id),
    defenseRank: defenseRank(game, opponent.id),
    strengths,
    weaknesses,
    keyPlayers: topPlayers(opponent),
    vulnerabilityRatings: vulnerabilities,
    schemeRecommendation: {
      offense,
      defense,
      reasoning: reportNarrative(opponent, { offense, defense, reasoning: '' }),
    },
  };
}

export function upsertOpponentReport(game: GameState, report: OpponentReport): OpponentReport {
  const reports = game.opponentReports ?? [];
  const filtered = reports.filter((entry) => !(entry.teamId === report.teamId && entry.year === report.year && entry.week === report.week));
  game.opponentReports = [...filtered, report];
  return report;
}

function schemeDelta(selected: string, recommended: string): number {
  if (selected === recommended) return 2;
  return -1;
}

function ensurePlanBonus(plan: GamePlan, report?: OpponentReport | null): GamePlan {
  if (!report) return plan;
  return {
    ...plan,
    gamePlanBonus:
      schemeDelta(plan.offensiveScheme, report.schemeRecommendation.offense)
      + schemeDelta(plan.defensiveScheme, report.schemeRecommendation.defense),
  };
}

export function setGamePlan(game: GameState, plan: GamePlan, report?: OpponentReport | null): GamePlan {
  const nextPlan = ensurePlanBonus(plan, report ?? null);
  game.gamePlan = nextPlan;
  return nextPlan;
}

export function resetGamePlan(game: GameState): void {
  game.gamePlan = null;
}

export function generateAiGamePlan(game: GameState, teamId: string, opponentTeamId: string): GamePlan {
  const report = generateOpponentScouting(game, teamId, opponentTeamId);
  const team = game.teams[teamId];
  if (!team) {
    throw new Error(`Cannot generate AI game plan for missing team ${teamId}.`);
  }
  const playerA = topPlayers(team, report.schemeRecommendation.offense === 'run_heavy' || report.schemeRecommendation.offense === 'power'
    ? ['RB']
    : ['QB', 'WR', 'TE'])[0] ?? topPlayers(team)[0] ?? null;
  const playerB = report.keyPlayers[0] ?? null;

  return {
    offensiveScheme: report.schemeRecommendation.offense,
    defensiveScheme: report.schemeRecommendation.defense,
    keyMatchup: playerA && playerB ? { playerA: playerA.id, playerB: playerB.id } : null,
    gamePlanBonus: 4,
  };
}

export function applyGamePlan(plan: GamePlan, report: OpponentReport, team: Team): SimTeamContext {
  const playerOvrBonuses: Record<string, number> = {};
  const offenseDelta = schemeDelta(plan.offensiveScheme, report.schemeRecommendation.offense);
  const defenseDelta = schemeDelta(plan.defensiveScheme, report.schemeRecommendation.defense);

  for (const player of team.roster) {
    let delta = 0;
    if (OFFENSE_POSITIONS.includes(player.pos)) delta += offenseDelta;
    if (DEFENSE_POSITIONS.includes(player.pos)) delta += defenseDelta;
    if (plan.keyMatchup?.playerA === player.id) delta += 1;
    if (delta !== 0) playerOvrBonuses[player.id] = delta;
  }

  return { playerOvrBonuses };
}
