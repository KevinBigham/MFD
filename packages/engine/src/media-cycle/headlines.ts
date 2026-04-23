import type { GameResult, GameState, Player, PlayerGameLine } from '../types';
import type { Headline, HeadlineCategory } from './types';

const CATEGORY_PRIORITY: Record<HeadlineCategory, number> = {
  MILESTONE: 1,
  COMEBACK: 2,
  UPSET: 3,
  RIVALRY_WIN: 4,
  BLOWOUT: 5,
  INDIVIDUAL_PERFORMANCE: 6,
  ROOKIE_BREAKOUT: 7,
};

const ROOKIE_BREAKOUT_THRESHOLD: Record<Player['pos'], number> = {
  QB: 22,
  RB: 18,
  WR: 18,
  TE: 17,
  OL: 10,
  DL: 12,
  LB: 12,
  CB: 12,
  S: 11,
  K: 9,
  P: 7,
};

function hashId(parts: Array<string | number | null | undefined>): string {
  return parts.filter((part) => part !== null && part !== undefined).join('|');
}

function pickWinner(result: GameResult) {
  if (result.homeScore === result.awayScore) return null;
  return result.homeScore > result.awayScore
    ? { winnerId: result.homeTeamId, loserId: result.awayTeamId, margin: result.homeScore - result.awayScore }
    : { winnerId: result.awayTeamId, loserId: result.homeTeamId, margin: result.awayScore - result.homeScore };
}

function averageStarterOvr(state: GameState, teamId: string): number {
  const team = state.teams[teamId];
  if (!team) return 0;
  const starters = team.roster
    .filter((player) => player.isStarter || player.role === 'Starter')
    .sort((left, right) => right.ovr - left.ovr || left.id.localeCompare(right.id));
  const pool = starters.length > 0 ? starters : [...team.roster].sort((left, right) => right.ovr - left.ovr || left.id.localeCompare(right.id)).slice(0, 12);
  if (pool.length === 0) return 0;
  return pool.reduce((sum, player) => sum + player.ovr, 0) / pool.length;
}

function quarterSum(values: number[], count: number): number {
  return values.slice(0, count).reduce((sum, value) => sum + value, 0);
}

function isComeback(result: GameResult, winnerId: string): boolean {
  const winnerStats = result.stats[winnerId];
  const loserId = winnerId === result.homeTeamId ? result.awayTeamId : result.homeTeamId;
  const loserStats = result.stats[loserId];
  if (!winnerStats || !loserStats) return false;

  const winnerAfterThree = quarterSum(winnerStats.quarterScores, 3);
  const loserAfterThree = quarterSum(loserStats.quarterScores, 3);
  return loserAfterThree - winnerAfterThree >= 10;
}

function isDeclaredRivalry(state: GameState, teamA: string, teamB: string): boolean {
  return (state.leagueRivalries ?? []).some((entry) =>
    (entry.teamA === teamA && entry.teamB === teamB) || (entry.teamA === teamB && entry.teamB === teamA))
    || Boolean(state.teams[teamA]?.rivalries.some((entry) => entry.teamId === teamB))
    || Boolean(state.teams[teamB]?.rivalries.some((entry) => entry.teamId === teamA));
}

function teamName(state: GameState, teamId: string): string {
  const team = state.teams[teamId];
  return team ? `${team.city} ${team.name}` : teamId;
}

function totalTouchdowns(line: PlayerGameLine): number {
  return (line.passTD ?? 0) + (line.rushTD ?? 0) + (line.recTD ?? 0);
}

function playerGameScore(line: PlayerGameLine): number {
  return (
    (line.passYds ?? 0) / 25
    + (line.passTD ?? 0) * 4
    - (line.passINT ?? 0) * 3
    + (line.rushYds ?? 0) / 10
    + (line.rushTD ?? 0) * 6
    + (line.recYds ?? 0) / 10
    + (line.recTD ?? 0) * 6
    + (line.tackles ?? 0) * 0.4
    + (line.sacks ?? 0) * 4
    + (line.defINT ?? 0) * 5
    + (line.fgMade ?? 0) * 3
  );
}

function maybeHeadline(headline: Omit<Headline, 'importance'>): Headline {
  return {
    ...headline,
    importance: CATEGORY_PRIORITY[headline.category],
  };
}

function individualPerformanceHeadlines(state: GameState, weekNumber: number, result: GameResult): Headline[] {
  const lines = Object.values(result.stats)
    .flatMap((teamStats) => teamStats.playerLines)
    .sort((left, right) =>
      right.name.localeCompare(left.name) * -1
      || left.playerId.localeCompare(right.playerId));

  return lines.flatMap((line) => {
    const player = state.players[line.playerId];
    if (!player) return [];
    if (
      (line.passYds ?? 0) < 400
      && (line.rushYds ?? 0) < 150
      && (line.recYds ?? 0) < 200
      && totalTouchdowns(line) < 3
    ) {
      return [];
    }

    const statLine = (line.passYds ?? 0) >= 400
      ? `${line.passYds} pass yards`
      : (line.rushYds ?? 0) >= 150
        ? `${line.rushYds} rush yards`
        : (line.recYds ?? 0) >= 200
          ? `${line.recYds} receiving yards`
          : `${totalTouchdowns(line)} total touchdowns`;

    return [maybeHeadline({
      id: hashId(['headline', 'individual', result.id, line.playerId]),
      category: 'INDIVIDUAL_PERFORMANCE',
      weekNumber,
      title: `${line.name} lit up the box score`,
      summary: `${line.name} posted ${statLine} for ${teamName(state, player.teamId ?? '')}.`,
      teamIds: player.teamId ? [player.teamId] : [],
      playerId: line.playerId,
      gameId: result.id,
    })];
  });
}

function rookieBreakoutHeadlines(state: GameState, weekNumber: number, result: GameResult): Headline[] {
  const lines = Object.values(result.stats)
    .flatMap((teamStats) => teamStats.playerLines)
    .sort((left, right) => left.playerId.localeCompare(right.playerId));

  return lines.flatMap((line) => {
    const player = state.players[line.playerId];
    if (!player) return [];
    const rookie = player.yearsExp === 0 || player.draftYear === state.year;
    if (!rookie) return [];

    const threshold = ROOKIE_BREAKOUT_THRESHOLD[player.pos];
    const score = playerGameScore(line);
    if (score < threshold) return [];

    return [maybeHeadline({
      id: hashId(['headline', 'rookie', result.id, line.playerId]),
      category: 'ROOKIE_BREAKOUT',
      weekNumber,
      title: `${line.name} crashed the rookie conversation`,
      summary: `${line.name} delivered a breakout ${player.pos} performance and forced the ROY discussion.`,
      teamIds: player.teamId ? [player.teamId] : [],
      playerId: line.playerId,
      gameId: result.id,
    })];
  });
}

export function generateHeadlines(state: GameState, weekNumber: number, gameResults: GameResult[]): Headline[] {
  const headlines: Headline[] = [];
  const brokenRecords = (state.recentBrokenRecords ?? [])
    .filter((record) => record.year === state.year && record.week === weekNumber)
    .sort((left, right) => left.playerId.localeCompare(right.playerId) || left.stat.localeCompare(right.stat));
  const milestones = (state.recentMilestones ?? [])
    .filter((milestone) => milestone.year === state.year && milestone.week === weekNumber)
    .sort((left, right) => left.playerId.localeCompare(right.playerId) || left.stat.localeCompare(right.stat));

  for (const record of brokenRecords) {
    headlines.push(maybeHeadline({
      id: hashId(['headline', 'record', record.playerId, record.stat, weekNumber]),
      category: 'MILESTONE',
      weekNumber,
      title: `${record.playerName} rewrote the record book`,
      summary: `${record.playerName} set a new ${record.stat} mark with ${record.newValue}.`,
      teamIds: [record.teamId],
      playerId: record.playerId,
      gameId: null,
    }));
  }

  for (const milestone of milestones) {
    headlines.push(maybeHeadline({
      id: hashId(['headline', 'milestone', milestone.playerId, milestone.stat, weekNumber]),
      category: 'MILESTONE',
      weekNumber,
      title: `${milestone.playerName} hit ${milestone.milestoneLabel}`,
      summary: milestone.narrative,
      teamIds: [],
      playerId: milestone.playerId,
      gameId: null,
    }));
  }

  for (const result of [...gameResults].sort((left, right) => left.id.localeCompare(right.id))) {
    const winner = pickWinner(result);
    if (!winner) continue;
    const winnerName = teamName(state, winner.winnerId);
    const loserName = teamName(state, winner.loserId);
    const winnerStrength = averageStarterOvr(state, winner.winnerId);
    const loserStrength = averageStarterOvr(state, winner.loserId);

    if (winnerStrength < loserStrength) {
      headlines.push(maybeHeadline({
        id: hashId(['headline', 'upset', result.id]),
        category: 'UPSET',
        weekNumber,
        title: `${winnerName} pulled the upset`,
        summary: `${winnerName} knocked off favored ${loserName} and flipped the week on its head.`,
        teamIds: [winner.winnerId, winner.loserId],
        playerId: null,
        gameId: result.id,
      }));
    }

    if (winner.margin >= 21) {
      headlines.push(maybeHeadline({
        id: hashId(['headline', 'blowout', result.id]),
        category: 'BLOWOUT',
        weekNumber,
        title: `${winnerName} ran away with it`,
        summary: `${winnerName} handled ${loserName} by ${winner.margin} and never looked back.`,
        teamIds: [winner.winnerId, winner.loserId],
        playerId: null,
        gameId: result.id,
      }));
    }

    if (isComeback(result, winner.winnerId)) {
      headlines.push(maybeHeadline({
        id: hashId(['headline', 'comeback', result.id]),
        category: 'COMEBACK',
        weekNumber,
        title: `${winnerName} stole one late`,
        summary: `${winnerName} erased a double-digit fourth-quarter deficit to stun ${loserName}.`,
        teamIds: [winner.winnerId, winner.loserId],
        playerId: null,
        gameId: result.id,
      }));
    }

    if (isDeclaredRivalry(state, winner.winnerId, winner.loserId)) {
      headlines.push(maybeHeadline({
        id: hashId(['headline', 'rivalry', result.id]),
        category: 'RIVALRY_WIN',
        weekNumber,
        title: `${winnerName} owned the rivalry stage`,
        summary: `${winnerName} banked another rivalry win over ${loserName}.`,
        teamIds: [winner.winnerId, winner.loserId],
        playerId: null,
        gameId: result.id,
      }));
    }

    headlines.push(...individualPerformanceHeadlines(state, weekNumber, result));
    headlines.push(...rookieBreakoutHeadlines(state, weekNumber, result));
  }

  return headlines
    .slice()
    .sort((left, right) =>
      left.importance - right.importance
      || right.teamIds.length - left.teamIds.length
      || left.id.localeCompare(right.id));
}
