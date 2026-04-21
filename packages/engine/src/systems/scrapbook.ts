import type { GameState, NewsItem } from '../types';
import { buildFranchiseBook } from './dynasty-timeline';
import type { SeasonRecap, SeasonRecapLeader, SeasonRecapPlayoffResult } from './season-recap';

export interface ScrapbookMoment {
  headline: string;
  detail: string;
  week: number | null;
  importance: NewsItem['importance'];
}

export interface ScrapbookEntry {
  year: number;
  eraTag: string;
  seasonHighlightLine: string;
  notableMoments: ScrapbookMoment[];
  recap: SeasonRecap;
}

export interface ScrapbookSummary {
  totalSeasons: number;
  totalChampionships: number;
  longestWinStreak: number;
  bestSingleSeasonRecord: {
    year: number;
    record: string;
    wins: number;
    losses: number;
    ties: number;
  } | null;
  totalBreakouts: number;
}

const REGULAR_ERA_TAG = 'regular-era';

const IMPORTANCE_WEIGHT: Record<ScrapbookMoment['importance'], number> = {
  breaking: 3,
  major: 2,
  minor: 1,
};

function findEraTag(game: GameState, teamId: string, year: number): string {
  const book = buildFranchiseBook(game, teamId);
  const era = book?.eras.find((entry) => year >= entry.startYear && year <= entry.endYear);
  return era?.title ?? REGULAR_ERA_TAG;
}

function compareMoments(left: NewsItem, right: NewsItem): number {
  return IMPORTANCE_WEIGHT[right.importance] - IMPORTANCE_WEIGHT[left.importance]
    || left.week - right.week
    || left.id.localeCompare(right.id);
}

function collectNotableMoments(game: GameState, recap: SeasonRecap): ScrapbookMoment[] {
  return game.leagueNews
    .filter((item) => item.year === recap.seasonYear)
    .filter((item) => item.teamIds.includes(recap.teamId))
    .sort(compareMoments)
    .slice(0, 3)
    .map((item) => ({
      headline: item.headline,
      detail: item.body,
      week: item.week ?? null,
      importance: item.importance,
    }));
}

function describeLeaderValue(leader: SeasonRecapLeader, category: 'passing' | 'rushing'): string {
  return category === 'passing'
    ? `${leader.value.toLocaleString()} pass yards`
    : `${leader.value.toLocaleString()} rush yards`;
}

function leaderLine(
  recap: SeasonRecap,
  leader: SeasonRecapLeader,
  category: 'passing' | 'rushing',
): string {
  const statLine = describeLeaderValue(leader, category);

  switch (recap.playoffResult) {
    case 'champion':
      return `${leader.playerName} powered the title season with ${statLine}.`;
    case 'championship-loss':
      return `${leader.playerName} carried the club within one win of a title with ${statLine}.`;
    case 'conf-loss':
      return `${leader.playerName} headlined a conference-final run with ${statLine}.`;
    case 'division-loss':
      return `${leader.playerName} fueled a divisional-round season with ${statLine}.`;
    case 'wild-card-loss':
      return `${leader.playerName} kept the playoff push alive with ${statLine}.`;
    case 'missed':
    default:
      return `${leader.playerName} still produced ${statLine} in a ${recap.record} season.`;
  }
}

function recordFallbackLine(recap: SeasonRecap): string {
  switch (recap.playoffResult) {
    case 'champion':
      return `The ${recap.record} finish ended with the franchise on top of the league.`;
    case 'championship-loss':
      return `The ${recap.record} finish ended one win short of the title.`;
    case 'conf-loss':
      return `The ${recap.record} finish carried the club to the conference final.`;
    case 'division-loss':
      return `The ${recap.record} finish reached the divisional round.`;
    case 'wild-card-loss':
      return `The ${recap.record} finish snapped the playoff drought before January ended.`;
    case 'missed':
    default:
      return `The ${recap.record} finish set the tone even without a playoff berth.`;
  }
}

function buildSeasonHighlightLine(recap: SeasonRecap): string {
  if (recap.topPerformers.passingLeader) {
    return leaderLine(recap, recap.topPerformers.passingLeader, 'passing');
  }
  if (recap.topPerformers.rushingLeader) {
    return leaderLine(recap, recap.topPerformers.rushingLeader, 'rushing');
  }
  return recordFallbackLine(recap);
}

function compareEntriesAscending(left: ScrapbookEntry, right: ScrapbookEntry): number {
  return left.year - right.year
    || left.recap.teamId.localeCompare(right.recap.teamId)
    || left.seasonHighlightLine.localeCompare(right.seasonHighlightLine);
}

function winPct(entry: ScrapbookEntry): number {
  const totalGames = entry.recap.wins + entry.recap.losses + entry.recap.ties;
  if (totalGames === 0) return 0;
  return (entry.recap.wins + entry.recap.ties * 0.5) / totalGames;
}

function compareBestRecord(left: ScrapbookEntry, right: ScrapbookEntry): number {
  return winPct(right) - winPct(left)
    || right.recap.wins - left.recap.wins
    || Number(right.recap.playoffResult === 'champion') - Number(left.recap.playoffResult === 'champion')
    || right.year - left.year
    || left.recap.teamId.localeCompare(right.recap.teamId);
}

export function buildScrapbookEntry(recap: SeasonRecap, game: GameState): ScrapbookEntry {
  return {
    year: recap.seasonYear,
    eraTag: findEraTag(game, recap.teamId, recap.seasonYear),
    seasonHighlightLine: buildSeasonHighlightLine(recap),
    notableMoments: collectNotableMoments(game, recap),
    recap,
  };
}

export function summarizeScrapbook(entries: ScrapbookEntry[]): ScrapbookSummary {
  if (entries.length === 0) {
    return {
      totalSeasons: 0,
      totalChampionships: 0,
      longestWinStreak: 0,
      bestSingleSeasonRecord: null,
      totalBreakouts: 0,
    };
  }

  const ordered = [...entries].sort(compareEntriesAscending);
  let currentWinStreak = 0;
  let longestWinStreak = 0;
  const breakoutIds = new Set<string>();

  for (const entry of ordered) {
    if (entry.recap.wins > entry.recap.losses) {
      currentWinStreak += 1;
      longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
    } else {
      currentWinStreak = 0;
    }

    for (const candidate of entry.recap.breakoutCandidates) {
      breakoutIds.add(candidate.playerId);
    }
  }

  const bestEntry = [...ordered].sort(compareBestRecord)[0]!;

  return {
    totalSeasons: ordered.length,
    totalChampionships: ordered.filter((entry) => entry.recap.playoffResult === 'champion').length,
    longestWinStreak,
    bestSingleSeasonRecord: {
      year: bestEntry.year,
      record: bestEntry.recap.record,
      wins: bestEntry.recap.wins,
      losses: bestEntry.recap.losses,
      ties: bestEntry.recap.ties,
    },
    totalBreakouts: breakoutIds.size,
  };
}
