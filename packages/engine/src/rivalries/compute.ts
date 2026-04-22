import type { GameResult, GameState, LeagueRivalry, Rivalry } from '../types';
import { tagMatchup } from './drama-tags';
import { intensityScore } from './scoring';
import {
  RIVALRIES_SCHEMA_VERSION,
  type RivalryPayload,
  type RivalryRecord,
  type RivalryRelationship,
} from './types';

type DetailedMatchup = {
  source: 'actual' | 'legacy';
  pairKey: string;
  key: string;
  teamAId: string;
  teamBId: string;
  teamAScore: number;
  teamBScore: number;
  season: number;
  week: number;
  overtime: boolean;
  namedGameArchetype: string | null;
  isPlayoff: boolean;
  isRegularSeason: boolean;
  isDivisional: boolean;
};

type PairHint = {
  lastMeetingSeason: number | null;
  lastMeetingWeek: number | null;
  hasPlayoffHistory: boolean;
};

function defaultPayload(): RivalryPayload {
  return {
    schemaVersion: RIVALRIES_SCHEMA_VERSION,
    generatedAt: 0,
    teams: {},
  };
}

function pairKey(teamAId: string, teamBId: string): string {
  return [teamAId, teamBId].sort((left, right) => left.localeCompare(right)).join('::');
}

function sortTeamIds(teamAId: string, teamBId: string): [string, string] {
  return teamAId.localeCompare(teamBId) <= 0 ? [teamAId, teamBId] : [teamBId, teamAId];
}

function resolveRelationship(game: GameState, teamAId: string, teamBId: string): RivalryRelationship {
  const teamA = game.teams[teamAId];
  const teamB = game.teams[teamBId];
  if (!teamA || !teamB) return 'interconference';
  if (teamA.conference === teamB.conference && teamA.division === teamB.division) return 'division';
  if (teamA.conference === teamB.conference) return 'conference';
  return 'interconference';
}

function matchupKey(teamAId: string, teamBId: string, season: number, week: number, teamAScore: number, teamBScore: number): string {
  return `${pairKey(teamAId, teamBId)}:${season}:${week}:${teamAScore}:${teamBScore}`;
}

function compareNewestFirst(left: DetailedMatchup, right: DetailedMatchup): number {
  const sourceRank = left.source === right.source ? 0 : left.source === 'actual' ? -1 : 1;
  return right.season - left.season
    || right.week - left.week
    || sourceRank
    || left.key.localeCompare(right.key);
}

function scoreForTeam(matchup: DetailedMatchup, teamId: string): number {
  return matchup.teamAId === teamId ? matchup.teamAScore : matchup.teamBScore;
}

function winnerTeamId(matchup: DetailedMatchup): string | null {
  if (matchup.teamAScore === matchup.teamBScore) return null;
  return matchup.teamAScore > matchup.teamBScore ? matchup.teamAId : matchup.teamBId;
}

function isRealTeam(game: GameState, teamId: string): boolean {
  return teamId in game.teams;
}

function parseWinnerFirstScore(score: string): { winnerScore: number; loserScore: number } | null {
  const match = /^(\d+)-(\d+)$/.exec(score.trim());
  if (!match) return null;

  const winnerScore = Number(match[1]);
  const loserScore = Number(match[2]);
  if (!Number.isFinite(winnerScore) || !Number.isFinite(loserScore)) return null;
  return { winnerScore, loserScore };
}

function toActualMatchup(game: GameState, result: GameResult, isPlayoff: boolean): DetailedMatchup | null {
  if (!isRealTeam(game, result.homeTeamId) || !isRealTeam(game, result.awayTeamId)) return null;

  const [teamAId, teamBId] = sortTeamIds(result.homeTeamId, result.awayTeamId);
  const teamAScore = result.homeTeamId === teamAId ? result.homeScore : result.awayScore;
  const teamBScore = result.homeTeamId === teamBId ? result.homeScore : result.awayScore;
  const relationship = resolveRelationship(game, teamAId, teamBId);

  return {
    source: 'actual',
    pairKey: pairKey(teamAId, teamBId),
    key: matchupKey(teamAId, teamBId, result.year, result.week, teamAScore, teamBScore),
    teamAId,
    teamBId,
    teamAScore,
    teamBScore,
    season: result.year,
    week: result.week,
    overtime: result.overtime,
    namedGameArchetype: result.namedGame?.archetype ?? null,
    isPlayoff,
    isRegularSeason: !isPlayoff,
    isDivisional: relationship === 'division',
  };
}

function toLegacyMatchup(game: GameState, teamId: string, rivalry: Rivalry, result: Rivalry['history'][number]): DetailedMatchup | null {
  const opponentId = rivalry.teamId;
  if (!isRealTeam(game, teamId) || !isRealTeam(game, opponentId)) return null;
  if (result.winner !== teamId && result.winner !== opponentId) return null;

  const parsedScore = parseWinnerFirstScore(result.score);
  if (!parsedScore) return null;

  const [teamAId, teamBId] = sortTeamIds(teamId, opponentId);
  const teamAScore = result.winner === teamAId ? parsedScore.winnerScore : parsedScore.loserScore;
  const teamBScore = result.winner === teamBId ? parsedScore.winnerScore : parsedScore.loserScore;
  const relationship = resolveRelationship(game, teamAId, teamBId);
  const isPlayoff = result.week >= 19;

  return {
    source: 'legacy',
    pairKey: pairKey(teamAId, teamBId),
    key: matchupKey(teamAId, teamBId, result.year, result.week, teamAScore, teamBScore),
    teamAId,
    teamBId,
    teamAScore,
    teamBScore,
    season: result.year,
    week: result.week,
    overtime: false,
    namedGameArchetype: null,
    isPlayoff,
    isRegularSeason: !isPlayoff,
    isDivisional: relationship === 'division',
  };
}

function isHintNewer(
  current: Pick<PairHint, 'lastMeetingSeason' | 'lastMeetingWeek'>,
  nextSeason: number | null,
  nextWeek: number | null,
): boolean {
  if (nextSeason === null) return false;
  if (current.lastMeetingSeason === null) return true;
  if (nextSeason !== current.lastMeetingSeason) return nextSeason > current.lastMeetingSeason;
  return (nextWeek ?? -1) > (current.lastMeetingWeek ?? -1);
}

function collectDetailedMatchups(game: GameState): Map<string, DetailedMatchup[]> {
  const deduped = new Map<string, DetailedMatchup>();

  const pushMatchup = (matchup: DetailedMatchup | null): void => {
    if (!matchup) return;
    const existing = deduped.get(matchup.key);
    if (!existing || (existing.source === 'legacy' && matchup.source === 'actual')) {
      deduped.set(matchup.key, matchup);
    }
  };

  for (const scheduleWeek of [...game.schedule].sort((left, right) => left.week - right.week)) {
    for (const scheduledGame of scheduleWeek.games) {
      pushMatchup(scheduledGame.result ? toActualMatchup(game, scheduledGame.result, false) : null);
    }
  }

  for (const matchup of [...(game.playoffBracket?.matchups ?? [])].sort((left, right) => left.week - right.week || left.id.localeCompare(right.id))) {
    pushMatchup(matchup.result ? toActualMatchup(game, matchup.result, true) : null);
  }

  for (const teamId of Object.keys(game.teams).sort((left, right) => left.localeCompare(right))) {
    for (const rivalry of [...game.teams[teamId]!.rivalries].sort((left, right) => left.teamId.localeCompare(right.teamId))) {
      for (const entry of rivalry.history) {
        pushMatchup(toLegacyMatchup(game, teamId, rivalry, entry));
      }
    }
  }

  const grouped = new Map<string, DetailedMatchup[]>();
  for (const matchup of deduped.values()) {
    const existing = grouped.get(matchup.pairKey) ?? [];
    existing.push(matchup);
    grouped.set(matchup.pairKey, existing);
  }

  for (const [key, matchups] of grouped) {
    grouped.set(key, [...matchups].sort(compareNewestFirst));
  }

  return grouped;
}

function collectHints(game: GameState): Map<string, PairHint> {
  const hints = new Map<string, PairHint>();

  for (const entry of [...game.leagueRivalries].sort((left, right) => left.id.localeCompare(right.id))) {
    if (!isRealTeam(game, entry.teamA) || !isRealTeam(game, entry.teamB)) continue;

    const key = pairKey(entry.teamA, entry.teamB);
    const current = hints.get(key) ?? {
      lastMeetingSeason: null,
      lastMeetingWeek: null,
      hasPlayoffHistory: false,
    };

    if (isHintNewer(current, entry.lastMetYear, entry.lastMetWeek)) {
      current.lastMeetingSeason = entry.lastMetYear;
      current.lastMeetingWeek = entry.lastMetWeek;
    }
    if (entry.history.some((historyEntry) => /playoff/i.test(historyEntry))) {
      current.hasPlayoffHistory = true;
    }

    hints.set(key, current);
  }

  return hints;
}

function headToHeadRecent(teamId: string, matchups: DetailedMatchup[]): RivalryRecord['headToHeadRecent'] {
  const recent = matchups.slice(0, 5);
  const totals = {
    wins: 0,
    losses: 0,
    ties: 0,
  };

  for (const matchup of recent) {
    const teamScore = scoreForTeam(matchup, teamId);
    const opponentId = matchup.teamAId === teamId ? matchup.teamBId : matchup.teamAId;
    const opponentScore = scoreForTeam(matchup, opponentId);

    if (teamScore === opponentScore) totals.ties += 1;
    else if (teamScore > opponentScore) totals.wins += 1;
    else totals.losses += 1;
  }

  return totals;
}

function lastMatchupForTeam(teamId: string, matchup: DetailedMatchup | null): RivalryRecord['lastMatchup'] {
  if (!matchup) return null;

  const teamScore = scoreForTeam(matchup, teamId);
  const opponentId = matchup.teamAId === teamId ? matchup.teamBId : matchup.teamAId;
  const opponentScore = scoreForTeam(matchup, opponentId);

  return {
    season: matchup.season,
    week: matchup.week,
    result: teamScore === opponentScore ? 'tie' : teamScore > opponentScore ? 'win' : 'loss',
    margin: teamScore - opponentScore,
  };
}

function activeStreakLength(matchups: DetailedMatchup[]): number {
  const latestWinner = matchups[0] ? winnerTeamId(matchups[0]) : null;
  if (!latestWinner) return 0;

  let streak = 0;
  for (const matchup of matchups) {
    if (winnerTeamId(matchup) !== latestWinner) break;
    streak += 1;
  }

  return streak;
}

function endedOpponentStreakLength(matchups: DetailedMatchup[]): number {
  if (matchups.length < 2) return 0;

  const latestWinner = winnerTeamId(matchups[0]!);
  const priorWinner = winnerTeamId(matchups[1]!);
  if (!latestWinner || !priorWinner || latestWinner === priorWinner) return 0;

  let streak = 0;
  for (const matchup of matchups.slice(1)) {
    if (winnerTeamId(matchup) !== priorWinner) break;
    streak += 1;
  }

  return streak >= 3 ? streak : 0;
}

function compareRecords(left: RivalryRecord, right: RivalryRecord): number {
  const leftSeason = left.lastMatchup?.season ?? -1;
  const rightSeason = right.lastMatchup?.season ?? -1;
  const leftWeek = left.lastMatchup?.week ?? -1;
  const rightWeek = right.lastMatchup?.week ?? -1;

  return right.intensity - left.intensity
    || rightSeason - leftSeason
    || rightWeek - leftWeek
    || left.opponentId.localeCompare(right.opponentId);
}

function pairTeams(key: string): [string, string] {
  const [teamAId, teamBId] = key.split('::');
  return [teamAId!, teamBId!];
}

function latestMeetingSeason(matchups: DetailedMatchup[], hint: PairHint | undefined): number | null {
  const detailedSeason = matchups[0]?.season ?? null;
  if (!hint?.lastMeetingSeason) return detailedSeason;
  if (detailedSeason === null) return hint.lastMeetingSeason;
  return hint.lastMeetingSeason > detailedSeason ? hint.lastMeetingSeason : detailedSeason;
}

export function deriveRivalries(game: GameState): RivalryPayload {
  const detailedMatchups = collectDetailedMatchups(game);
  const hints = collectHints(game);
  const pairIds = new Set<string>([
    ...detailedMatchups.keys(),
    ...hints.keys(),
  ]);

  if (pairIds.size === 0) return defaultPayload();

  const teams = new Map<string, RivalryRecord[]>();

  for (const key of [...pairIds].sort((left, right) => left.localeCompare(right))) {
    const [teamAId, teamBId] = pairTeams(key);
    if (!game.teams[teamAId] || !game.teams[teamBId]) continue;

    const matchups = detailedMatchups.get(key) ?? [];
    const hint = hints.get(key);
    if (matchups.length === 0 && !hint) continue;

    const latestMatchup = matchups[0] ?? null;
    const relationship = resolveRelationship(game, teamAId, teamBId);
    const recordIntensity = intensityScore({
      relationship,
      currentSeason: game.year,
      lastMeetingSeason: latestMeetingSeason(matchups, hint),
      closeGamesInLastFive: matchups.slice(0, 5).filter((matchup) =>
        Math.abs(matchup.teamAScore - matchup.teamBScore) <= 7).length,
      hasPlayoffHistory: matchups.some((matchup) => matchup.isPlayoff) || Boolean(hint?.hasPlayoffHistory),
      activeStreakLength: activeStreakLength(matchups),
    });
    const tags = latestMatchup
      ? tagMatchup({
        season: latestMatchup.season,
        week: latestMatchup.week,
        margin: Math.abs(latestMatchup.teamAScore - latestMatchup.teamBScore),
        overtime: latestMatchup.overtime,
        namedGameArchetype: latestMatchup.namedGameArchetype,
        isDivisional: latestMatchup.isDivisional,
        isRegularSeason: latestMatchup.isRegularSeason,
        endedOpponentStreakLength: endedOpponentStreakLength(matchups),
      })
      : [];

    const teamARecord: RivalryRecord = {
      opponentId: teamBId,
      intensity: recordIntensity,
      dramaTags: tags,
      lastMatchup: lastMatchupForTeam(teamAId, latestMatchup),
      headToHeadRecent: headToHeadRecent(teamAId, matchups),
    };
    const teamBRecord: RivalryRecord = {
      opponentId: teamAId,
      intensity: recordIntensity,
      dramaTags: tags,
      lastMatchup: lastMatchupForTeam(teamBId, latestMatchup),
      headToHeadRecent: headToHeadRecent(teamBId, matchups),
    };

    teams.set(teamAId, [...(teams.get(teamAId) ?? []), teamARecord]);
    teams.set(teamBId, [...(teams.get(teamBId) ?? []), teamBRecord]);
  }

  if (teams.size === 0) return defaultPayload();

  return {
    schemaVersion: RIVALRIES_SCHEMA_VERSION,
    generatedAt: 0,
    teams: Object.fromEntries(
      [...teams.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([teamId, records]) => [teamId, [...records].sort(compareRecords)]),
    ),
  };
}
