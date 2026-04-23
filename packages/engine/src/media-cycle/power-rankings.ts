import { mulberry32 } from '../rng';
import type { GameState, ScheduledGame, Team } from '../types';
import type { MediaPowerRanking } from './types';

const BLURB_TEMPLATES = [
  '{team} keep stacking efficient wins and forcing the conversation.',
  '{team} are climbing because the roster quality finally matches the record.',
  '{team} keep cashing in on momentum and look built for a long run.',
  '{team} are turning weekly control into real staying power.',
  '{team} have the profile of a team nobody wants to see next.',
] as const;

function hashString(value: string): number {
  return [...value].reduce((hash, char) => ((hash * 33) ^ char.charCodeAt(0)) >>> 0, 5381);
}

function getPlayedGames(state: GameState, teamId: string): ScheduledGame[] {
  return state.schedule
    .flatMap((week) => week.games
      .filter((game) => game.result && (game.homeTeamId === teamId || game.awayTeamId === teamId))
      .map((game) => ({ week: week.week, game })))
    .sort((left, right) => left.week - right.week || left.game.homeTeamId.localeCompare(right.game.homeTeamId) || left.game.awayTeamId.localeCompare(right.game.awayTeamId))
    .map(({ game }) => game);
}

function pickStarters(team: Team) {
  const starters = team.roster
    .filter((player) => player.isStarter || player.role === 'Starter')
    .sort((left, right) => right.ovr - left.ovr || left.id.localeCompare(right.id));

  return starters.length > 0
    ? starters
    : [...team.roster].sort((left, right) => right.ovr - left.ovr || left.id.localeCompare(right.id)).slice(0, 12);
}

function averageStarterOvr(team: Team): number {
  const starters = pickStarters(team);
  if (starters.length === 0) return 0;
  return starters.reduce((sum, player) => sum + player.ovr, 0) / starters.length;
}

function winPct(team: Team): number {
  const gamesPlayed = team.wins + team.losses + team.ties;
  if (gamesPlayed <= 0) return 0;
  return (team.wins + team.ties * 0.5) / gamesPlayed;
}

function gameOutcome(teamId: string, game: ScheduledGame): number {
  const result = game.result;
  if (!result) return 0;
  const teamScore = result.homeTeamId === teamId ? result.homeScore : result.awayScore;
  const opponentScore = result.homeTeamId === teamId ? result.awayScore : result.homeScore;
  if (teamScore > opponentScore) return 1;
  if (teamScore < opponentScore) return -1;
  return 0;
}

function opponentId(teamId: string, game: ScheduledGame): string {
  return game.homeTeamId === teamId ? game.awayTeamId : game.homeTeamId;
}

function lastFiveMomentum(state: GameState, teamId: string): number {
  return getPlayedGames(state, teamId)
    .slice(-5)
    .reduce((sum, game) => sum + gameOutcome(teamId, game), 0);
}

function strengthOfVictory(state: GameState, teamId: string, strengthByTeamId: Map<string, number>): number {
  const wins = getPlayedGames(state, teamId).filter((game) => gameOutcome(teamId, game) > 0);
  if (wins.length === 0) return 0;
  return wins.reduce((sum, game) => sum + (strengthByTeamId.get(opponentId(teamId, game)) ?? 0), 0) / wins.length;
}

function normalize(value: number, values: number[]): number {
  if (values.length === 0) return 0;
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return 0.5;
  return (value - min) / (max - min);
}

function rankBlurb(state: GameState, team: Team, weekNumber: number): string {
  const rng = mulberry32((state.seed ^ hashString(`${team.id}|${weekNumber}`)) >>> 0);
  const template = BLURB_TEMPLATES[Math.floor(rng() * BLURB_TEMPLATES.length)] ?? BLURB_TEMPLATES[0];
  return template.replace('{team}', `${team.city} ${team.name}`);
}

function recordString(team: Team): string {
  return `${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ''}`;
}

/**
 * Formula:
 * rank_score = 0.40 * normalized_strength
 *            + 0.30 * win_pct
 *            + 0.20 * momentum_normalized
 *            + 0.10 * sov_normalized
 *
 * Tiebreaker:
 * - Higher score first
 * - Team id lexicographic ascending
 */
export function computePowerRankings(state: GameState, weekNumber: number): MediaPowerRanking[] {
  const teams = Object.values(state.teams).sort((left, right) => left.id.localeCompare(right.id));
  const strengthByTeamId = new Map(teams.map((team) => [team.id, averageStarterOvr(team)]));
  const strengthValues = [...strengthByTeamId.values()];
  const momentumByTeamId = new Map(teams.map((team) => [team.id, lastFiveMomentum(state, team.id)]));
  const momentumValues = [...momentumByTeamId.values()];
  const sovByTeamId = new Map(teams.map((team) => [team.id, strengthOfVictory(state, team.id, strengthByTeamId)]));
  const sovValues = [...sovByTeamId.values()];
  const previousRankByTeam = new Map(
    (state.mediaCycle?.powerRankingHistory ?? [])
      .slice(-1)[0]
      ?.rankings
      .map((entry) => [entry.teamId, entry.rank]) ?? [],
  );

  return teams
    .map((team) => {
      const normalizedStrength = normalize(strengthByTeamId.get(team.id) ?? 0, strengthValues);
      const normalizedMomentum = normalize(momentumByTeamId.get(team.id) ?? 0, momentumValues);
      const normalizedSov = normalize(sovByTeamId.get(team.id) ?? 0, sovValues);
      const score = Number((
        normalizedStrength * 0.4
        + winPct(team) * 0.3
        + normalizedMomentum * 0.2
        + normalizedSov * 0.1
      ).toFixed(6));

      return {
        teamId: team.id,
        teamName: `${team.city} ${team.name}`,
        rank: 0,
        rankDelta: 0,
        score,
        blurb: rankBlurb(state, team, weekNumber),
        record: recordString(team),
        weekNumber,
      } satisfies MediaPowerRanking;
    })
    .sort((left, right) => right.score - left.score || left.teamId.localeCompare(right.teamId))
    .map((entry, index) => {
      const rank = index + 1;
      const previousRank = previousRankByTeam.get(entry.teamId);
      return {
        ...entry,
        rank,
        rankDelta: previousRank ? previousRank - rank : 0,
      };
    });
}
