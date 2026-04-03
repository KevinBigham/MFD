import { calcSchemeFit } from './scheme-fit';
import { buildLeagueAverageByGroup, analyzeTeamNeeds } from './team-needs';
import type {
  FATarget,
  FATargetBoard,
  FATargetBoardState,
  GameState,
  Player,
  Position,
  PositionGroup,
  Team,
} from '../types';

const POSITION_VALUE_MULTIPLIER: Record<Position, number> = {
  QB: 1.35,
  RB: 0.9,
  WR: 1.05,
  TE: 0.95,
  OL: 1.1,
  DL: 1.05,
  LB: 1,
  CB: 1.05,
  S: 0.95,
  K: 0.5,
  P: 0.45,
};

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function groupForPosition(position: Position): PositionGroup {
  return position;
}

function projectedSalary(player: Player): number {
  const positionMultiplier = POSITION_VALUE_MULTIPLIER[player.pos] ?? 1;
  const ageMultiplier = player.age <= 25 ? 1.1 : player.age <= 29 ? 1 : player.age <= 32 ? 0.88 : 0.75;
  return round(Math.max(1.2, (player.ovr - 55) * 0.32 * positionMultiplier * ageMultiplier));
}

function schemeCompatibility(team: Team, player: Player): number {
  if (player.pos === 'QB' || player.pos === 'RB' || player.pos === 'WR' || player.pos === 'TE' || player.pos === 'OL') {
    return calcSchemeFit(player, team.offScheme).score;
  }
  if (player.pos === 'DL' || player.pos === 'LB' || player.pos === 'CB' || player.pos === 'S') {
    return calcSchemeFit(player, team.defScheme).score;
  }
  return player.ovr;
}

function demandForPosition(position: PositionGroup, teams: Team[]): number {
  const leagueAverage = buildLeagueAverageByGroup(teams);
  return teams
    .map((team) => analyzeTeamNeeds(team, leagueAverage))
    .filter((report) => report.criticalNeeds.includes(position)).length;
}

function marketDemand(needCount: number): FATarget['marketDemand'] {
  if (needCount >= 5) return 'high';
  if (needCount >= 2) return 'medium';
  return 'low';
}

function fitScore(team: Team, player: Player, teams: Team[]): number {
  const group = groupForPosition(player.pos);
  const leagueAverage = buildLeagueAverageByGroup(teams);
  const report = analyzeTeamNeeds(team, leagueAverage);
  const needRank = report.criticalNeeds.indexOf(group);
  const needBoost = needRank === 0 ? 35 : needRank === 1 ? 28 : needRank === 2 ? 22 : report.faTargets.includes(group) ? 16 : 8;
  const schemeBoost = schemeCompatibility(team, player) * 0.45;
  const ageBoost = player.age <= 25 ? 18 : player.age <= 28 ? 12 : player.age <= 31 ? 6 : 0;
  return clamp(Math.round(needBoost + schemeBoost + ageBoost), 0, 100);
}

function competingTeams(team: Team, player: Player, teams: Team[]): string[] {
  const position = groupForPosition(player.pos);
  const leagueAverage = buildLeagueAverageByGroup(teams);
  return teams
    .filter((candidate) => candidate.id !== team.id)
    .map((candidate) => ({ team: candidate, report: analyzeTeamNeeds(candidate, leagueAverage) }))
    .filter(({ report }) => report.criticalNeeds.includes(position))
    .map(({ team: candidate }) => candidate.id);
}

function signProbability(team: Team, player: Player, competition: string[]): number {
  const salary = projectedSalary(player);
  const capFactor = clamp(team.capSpace / Math.max(1, salary), 0.25, 1.5);
  const competitionPenalty = clamp(1 - competition.length * 0.08, 0.2, 1);
  return clamp(Math.round(capFactor * competitionPenalty * 100), 0, 100);
}

function bargainScore(target: FATarget): number {
  return round((target.fitScore + target.player.ovr) - target.projectedSalary * 6);
}

function tieBreak(rng: () => number): number {
  return rng() * 0.001;
}

export function addToWatchlist(state: FATargetBoardState, playerId: string): FATargetBoardState {
  if (state.watchlist.includes(playerId)) return state;
  return {
    ...state,
    watchlist: [...state.watchlist, playerId],
  };
}

export function removeFromWatchlist(state: FATargetBoardState, playerId: string): FATargetBoardState {
  return {
    ...state,
    watchlist: state.watchlist.filter((id) => id !== playerId),
  };
}

export function buildFATargetBoard(
  team: Team,
  freeAgents: Player[],
  allTeams: Team[],
  rng: () => number,
  currentState?: FATargetBoardState | null,
): FATargetBoard {
  const targets = [...freeAgents]
    .map<FATarget>((player) => {
      const competing = competingTeams(team, player, allTeams);
      const needCount = demandForPosition(groupForPosition(player.pos), allTeams);
      return {
        player,
        projectedSalary: projectedSalary(player),
        marketDemand: marketDemand(needCount),
        fitScore: fitScore(team, player, allTeams),
        signProbability: signProbability(team, player, competing),
        competingTeams: competing,
      };
    })
    .sort((a, b) =>
      b.player.ovr - a.player.ovr ||
      b.fitScore - a.fitScore ||
      a.player.id.localeCompare(b.player.id) ||
      tieBreak(rng));

  const watchlist = currentState?.watchlist ?? [];

  return {
    watchlist,
    targets,
    topAvailable: [...targets].sort((a, b) => b.player.ovr - a.player.ovr || a.projectedSalary - b.projectedSalary).slice(0, 10),
    bestFits: [...targets].sort((a, b) => b.fitScore - a.fitScore || b.player.ovr - a.player.ovr).slice(0, 5),
    bargains: [...targets].sort((a, b) => bargainScore(b) - bargainScore(a) || a.projectedSalary - b.projectedSalary).slice(0, 5),
  };
}

export function buildFATargetBoardState(teamId: string | null, board: FATargetBoard): FATargetBoardState {
  return {
    teamId,
    watchlist: [...board.watchlist],
    targets: [...board.targets],
  };
}

export function refreshStoredFATargetBoard(
  game: GameState,
  team: Team,
  freeAgents: Player[],
  rng: () => number,
): FATargetBoard {
  const board = buildFATargetBoard(team, freeAgents, Object.values(game.teams), rng, game.faTargetBoard);
  game.faTargetBoard = buildFATargetBoardState(team.id, board);
  return board;
}
