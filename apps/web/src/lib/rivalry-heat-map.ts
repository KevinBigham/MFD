import type { GameResult, GameState, Team } from '@mfd/engine';
import { resolveTeamContent } from './team-content-resolver';

export type RivalryHeatLevel = 'cold' | 'warm' | 'hot' | 'scalding';
export type RivalryMeetingResult = 'win' | 'loss' | 'tie';

export interface RivalryLatestMeeting {
  year: number;
  week: number;
  result: RivalryMeetingResult;
  score: string;
}

export interface RivalryHeatMapEntry {
  rivalTeamId: string;
  rivalAbbr: string;
  rivalCityName: string;
  wins: number;
  losses: number;
  ties: number;
  totalGames: number;
  winPct: number;
  heatLevel: RivalryHeatLevel;
  latestMeeting: RivalryLatestMeeting | null;
}

function heatLevel(totalGames: number): RivalryHeatLevel {
  if (totalGames >= 20) return 'scalding';
  if (totalGames >= 10) return 'hot';
  if (totalGames >= 5) return 'warm';
  return 'cold';
}

function heatRank(level: RivalryHeatLevel): number {
  if (level === 'scalding') return 4;
  if (level === 'hot') return 3;
  if (level === 'warm') return 2;
  return 1;
}

function findTeamByIdOrAbbr(game: GameState, teamIdOrAbbr: string): Team | null {
  const directTeam = game.teams[teamIdOrAbbr];
  if (directTeam) return directTeam;

  const normalized = teamIdOrAbbr.toUpperCase();
  return Object.values(game.teams).find((team) => team.abbr.toUpperCase() === normalized) ?? null;
}

function addAlias(aliases: Set<string>, value: string | null | undefined): void {
  const trimmed = value?.trim();
  if (!trimmed) return;
  aliases.add(trimmed);
  aliases.add(trimmed.toUpperCase());
}

function teamAliases(seedId: string, team: Team | null, contentId: string | null | undefined): Set<string> {
  const aliases = new Set<string>();
  addAlias(aliases, seedId);
  addAlias(aliases, team?.id);
  addAlias(aliases, team?.abbr);
  addAlias(aliases, contentId);
  return aliases;
}

function hasAlias(aliases: Set<string>, teamId: string): boolean {
  return aliases.has(teamId) || aliases.has(teamId.toUpperCase());
}

function resultDedupeKey(result: GameResult): string {
  return result.id || `${result.year}:${result.week}:${result.homeTeamId}:${result.awayTeamId}:${result.homeScore}:${result.awayScore}`;
}

function isLaterResult(left: GameResult, right: RivalryLatestMeeting | null): boolean {
  if (!right) return true;
  return left.year > right.year || (left.year === right.year && left.week > right.week);
}

function collectHeadToHeadRecord(
  game: GameState,
  userAliases: Set<string>,
  rivalAliases: Set<string>,
): Pick<RivalryHeatMapEntry, 'wins' | 'losses' | 'ties' | 'latestMeeting'> {
  const record = {
    wins: 0,
    losses: 0,
    ties: 0,
    latestMeeting: null as RivalryLatestMeeting | null,
  };
  const seenResults = new Set<string>();

  const applyResult = (result: GameResult | null | undefined): void => {
    if (!result || seenResults.has(resultDedupeKey(result))) return;

    const homeIsUser = hasAlias(userAliases, result.homeTeamId);
    const awayIsUser = hasAlias(userAliases, result.awayTeamId);
    const homeIsRival = hasAlias(rivalAliases, result.homeTeamId);
    const awayIsRival = hasAlias(rivalAliases, result.awayTeamId);
    const userIsHome = homeIsUser && awayIsRival;
    const userIsAway = awayIsUser && homeIsRival;
    if (!userIsHome && !userIsAway) return;

    seenResults.add(resultDedupeKey(result));
    const userScore = userIsHome ? result.homeScore : result.awayScore;
    const rivalScore = userIsHome ? result.awayScore : result.homeScore;
    let meetingResult: RivalryMeetingResult = 'tie';
    if (userScore === rivalScore) {
      record.ties += 1;
    } else if (userScore > rivalScore) {
      record.wins += 1;
      meetingResult = 'win';
    } else {
      record.losses += 1;
      meetingResult = 'loss';
    }

    if (isLaterResult(result, record.latestMeeting)) {
      record.latestMeeting = {
        year: result.year,
        week: result.week,
        result: meetingResult,
        score: `${userScore}-${rivalScore}`,
      };
    }
  };

  for (const scheduleWeek of game.schedule ?? []) {
    for (const scheduledGame of scheduleWeek.games) {
      applyResult(scheduledGame.result);
    }
  }

  for (const matchup of game.playoffBracket?.matchups ?? []) {
    applyResult(matchup.result);
  }

  return record;
}

export function computeRivalryHeatMap(game: GameState | null, userTeamId: string | null): RivalryHeatMapEntry[] {
  if (!game || !userTeamId) return [];

  const userTeam = findTeamByIdOrAbbr(game, userTeamId);
  const userContent = resolveTeamContent(game, userTeamId);
  const declaredRivalries = userContent?.rivalries ?? [];
  if (declaredRivalries.length === 0) return [];
  const userAliases = teamAliases(userTeamId, userTeam, userContent?.id);

  return declaredRivalries
    .map((rivalry) => {
      const rivalTeam = findTeamByIdOrAbbr(game, rivalry.opponentId);
      const rivalContent = resolveTeamContent(game, rivalry.opponentId);
      const rivalAliases = teamAliases(rivalry.opponentId, rivalTeam, rivalContent?.id);
      const { wins, losses, ties, latestMeeting } = collectHeadToHeadRecord(game, userAliases, rivalAliases);
      const totalGames = wins + losses + ties;

      return {
        rivalTeamId: rivalry.opponentId,
        rivalAbbr: rivalTeam?.abbr ?? rivalContent?.id ?? rivalry.opponentId,
        rivalCityName: rivalTeam?.city ?? rivalContent?.city ?? rivalry.opponentId,
        wins,
        losses,
        ties,
        totalGames,
        winPct: totalGames > 0 ? wins / totalGames : 0,
        heatLevel: heatLevel(totalGames),
        latestMeeting,
      };
    })
    .sort((left, right) =>
      heatRank(right.heatLevel) - heatRank(left.heatLevel)
      || right.totalGames - left.totalGames
      || left.rivalAbbr.localeCompare(right.rivalAbbr));
}
