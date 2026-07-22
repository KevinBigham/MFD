import type { GameState, PlayoffRound } from '../types';

export type DraftOrderPlayoffFinish =
  | 'missed_playoffs'
  | 'wild_card'
  | 'divisional'
  | 'conference'
  | 'super_bowl'
  | 'champion';

export interface DraftOrderStanding {
  teamId: string;
  wins: number;
  losses: number;
  ties: number;
  strengthOfSchedule: number;
}

export interface DraftOrderPlayoffResult {
  teamId: string;
  finish: DraftOrderPlayoffFinish;
}

export interface DraftOrderSlot extends DraftOrderStanding {
  slot: number;
  playoffFinish: DraftOrderPlayoffFinish;
}

const PLAYOFF_FINISH_RANK: Record<DraftOrderPlayoffFinish, number> = {
  missed_playoffs: 0,
  wild_card: 1,
  divisional: 2,
  conference: 3,
  super_bowl: 4,
  champion: 5,
};

function recordValue(standing: DraftOrderStanding): number {
  const games = standing.wins + standing.losses + standing.ties;
  return games === 0 ? 0 : (standing.wins + standing.ties * 0.5) / games;
}

/**
 * NFL-style draft priority: non-playoff teams first, then postseason exit round;
 * within a group, worse record and then lower opponent win percentage pick first.
 */
export function computeDraftOrder(
  finalStandings: readonly DraftOrderStanding[],
  playoffResults: readonly DraftOrderPlayoffResult[],
): DraftOrderSlot[] {
  const finishByTeam = new Map(playoffResults.map((result) => [result.teamId, result.finish]));

  return [...finalStandings]
    .sort((left, right) => {
      const leftFinish = finishByTeam.get(left.teamId) ?? 'missed_playoffs';
      const rightFinish = finishByTeam.get(right.teamId) ?? 'missed_playoffs';
      return PLAYOFF_FINISH_RANK[leftFinish] - PLAYOFF_FINISH_RANK[rightFinish]
        || recordValue(left) - recordValue(right)
        || left.strengthOfSchedule - right.strengthOfSchedule
        || left.teamId.localeCompare(right.teamId);
    })
    .map((standing, index) => ({
      ...standing,
      slot: index + 1,
      playoffFinish: finishByTeam.get(standing.teamId) ?? 'missed_playoffs',
    }));
}

function opponentIds(game: GameState, teamId: string): string[] {
  return game.schedule.flatMap((week) => week.games.flatMap((scheduled) => {
    if (scheduled.homeTeamId === teamId) return [scheduled.awayTeamId];
    if (scheduled.awayTeamId === teamId) return [scheduled.homeTeamId];
    return [];
  }));
}

function strengthOfSchedule(game: GameState, teamId: string): number {
  const opponents = opponentIds(game, teamId)
    .map((opponentId) => game.teams[opponentId])
    .filter((team) => team !== undefined);
  const games = opponents.reduce((sum, team) => sum + team.wins + team.losses + team.ties, 0);
  if (games === 0) return 0;
  const wins = opponents.reduce((sum, team) => sum + team.wins + team.ties * 0.5, 0);
  return wins / games;
}

function lossRound(game: GameState, teamId: string): PlayoffRound | null {
  return game.playoffBracket?.matchups.find((matchup) => (
    matchup.winnerTeamId !== null
    && matchup.winnerTeamId !== teamId
    && (matchup.homeTeamId === teamId || matchup.awayTeamId === teamId)
  ))?.round ?? null;
}

function playoffResults(game: GameState): DraftOrderPlayoffResult[] {
  const bracket = game.playoffBracket;
  if (!bracket) return [];
  const playoffTeams = new Set([...bracket.afc, ...bracket.nfc].map((seed) => seed.teamId));

  return [...playoffTeams].map((teamId) => {
    if (bracket.championTeamId === teamId) return { teamId, finish: 'champion' as const };
    const round = lossRound(game, teamId);
    return {
      teamId,
      finish: round ?? 'wild_card',
    };
  });
}

export function computeDraftOrderForGame(game: GameState): DraftOrderSlot[] {
  const standings = Object.values(game.teams).map((team) => ({
    teamId: team.id,
    wins: team.wins,
    losses: team.losses,
    ties: team.ties,
    strengthOfSchedule: strengthOfSchedule(game, team.id),
  }));
  return computeDraftOrder(standings, playoffResults(game));
}
