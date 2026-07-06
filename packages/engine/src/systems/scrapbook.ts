import type {
  AwardResult,
  DynastyEvent,
  FranchiseHistoryEntry,
  GameState,
  HallOfFameEntry,
  LeagueRivalry,
  LeagueStoryArc,
  NewsItem,
  SeasonReport,
  StoryArcBeat,
} from '../types';
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

const INDIVIDUAL_AWARD_IDS = new Set([
  'mvp',
  'opoy',
  'dpoy',
  'oroy',
  'droy',
  'comeback_player',
  'coach_of_year',
]);

interface ScrapbookMomentCandidate extends ScrapbookMoment {
  sortId: string;
}

function findEraTag(game: GameState, teamId: string, year: number): string {
  const book = buildFranchiseBook(game, teamId);
  const era = book?.eras.find((entry) => year >= entry.startYear && year <= entry.endYear);
  return era?.title ?? REGULAR_ERA_TAG;
}

function compareMoments(left: ScrapbookMomentCandidate, right: ScrapbookMomentCandidate): number {
  return IMPORTANCE_WEIGHT[right.importance] - IMPORTANCE_WEIGHT[left.importance]
    || (left.week ?? 99) - (right.week ?? 99)
    || left.sortId.localeCompare(right.sortId);
}

function newsMomentCandidate(item: NewsItem): ScrapbookMomentCandidate {
  return {
    headline: item.headline,
    detail: item.body,
    week: item.week ?? null,
    importance: item.importance,
    sortId: `news:${item.id}`,
  };
}

function dynastyEventImportance(event: DynastyEvent): ScrapbookMoment['importance'] {
  return event.importance === 'landmark' ? 'breaking' : event.importance;
}

function namedGameMomentCandidate(event: DynastyEvent): ScrapbookMomentCandidate | null {
  if (event.type !== 'named_game' || !event.namedGame) return null;

  const namedGame = event.namedGame;
  return {
    headline: namedGame.name,
    detail: `${namedGame.reason} Final: ${namedGame.homeScore}-${namedGame.awayScore}.`,
    week: event.week ?? namedGame.week ?? null,
    importance: dynastyEventImportance(event),
    sortId: `named-game:${event.id}`,
  };
}

function legacyTagLabel(tag: NonNullable<GameState['players'][string]['bloodline']>['legacyTag']): string {
  switch (tag) {
    case 'franchise_royalty':
      return 'franchise royalty';
    case 'famous_name':
      return 'famous name';
    case 'chip_on_shoulder':
      return 'chip-on-shoulder';
    case 'late_bloomer_family':
      return 'late-bloomer family';
  }
}

function bloodlineDraftMomentCandidate(game: GameState, event: DynastyEvent): ScrapbookMomentCandidate | null {
  if (event.type !== 'draft_pick') return null;

  const bloodlinePlayer = event.playerIds
    .map((playerId) => game.players[playerId])
    .find((player) => player?.bloodline && event.playerIds.includes(player.bloodline.parentPlayerId));
  if (!bloodlinePlayer?.bloodline) return null;

  const destination = bloodlinePlayer.teamId ? teamLabel(game, bloodlinePlayer.teamId) : 'the league';

  return {
    headline: event.headline,
    detail: `Dynasty timeline connected ${bloodlinePlayer.name} to ${bloodlinePlayer.bloodline.parentName}'s ${legacyTagLabel(bloodlinePlayer.bloodline.legacyTag)} legacy in ${destination}.`,
    week: event.week ?? null,
    importance: dynastyEventImportance(event),
    sortId: `bloodline-draft:${event.id}`,
  };
}

function awardMomentCandidate(award: AwardResult): ScrapbookMomentCandidate | null {
  if (!INDIVIDUAL_AWARD_IDS.has(award.awardId)) return null;

  const position = award.winnerPosition ? ` (${award.winnerPosition})` : '';
  const narrative = award.narrative.trim();
  const narrativeLine = narrative.length > 0 ? ` ${narrative}` : '';

  return {
    headline: `${award.winnerName} wins ${award.label}`,
    detail: `Awards night recognized ${award.winnerName}${position} with ${formatScore(award.score)} award score.${narrativeLine}`,
    week: null,
    importance: 'major',
    sortId: `award:${award.awardId}:${award.winnerId}`,
  };
}

function storyArcImportance(arc: LeagueStoryArc): ScrapbookMoment['importance'] {
  return arc.type === 'dynasty_run' || arc.type === 'collapse' ? 'breaking' : 'major';
}

function storyArcMomentCandidate(arc: LeagueStoryArc, beat: StoryArcBeat): ScrapbookMomentCandidate | null {
  const note = beat.note.trim();
  const narrative = beat.narrativeText.trim();
  if (!note && !narrative) return null;

  return {
    headline: note ? `Story arc: ${note}` : 'Story arc milestone',
    detail: narrative || note,
    week: null,
    importance: storyArcImportance(arc),
    sortId: `story-arc:${arc.id}:${beat.year}:${beat.stage}`,
  };
}

function seasonReportImportance(report: SeasonReport): ScrapbookMoment['importance'] {
  return report.overallGrade === 'A+' || report.overallGrade === 'A' || report.overallGrade === 'F'
    ? 'major'
    : 'minor';
}

function gradeArticle(grade: SeasonReport['overallGrade']): 'a' | 'an' {
  return grade.startsWith('A') || grade === 'F' ? 'an' : 'a';
}

function seasonReportMomentCandidate(report: SeasonReport): ScrapbookMomentCandidate | null {
  const overview = report.sections.find((section) => section.title === 'Season Overview') ?? report.sections[0] ?? null;
  const overviewSummary = overview?.summary.trim() ?? '';
  const detail = overviewSummary
    ? `Season report logged ${gradeArticle(report.overallGrade)} ${report.overallGrade} overall grade. ${overviewSummary}`
    : `Season report logged ${gradeArticle(report.overallGrade)} ${report.overallGrade} overall grade.`;

  return {
    headline: `Season report: ${report.overallGrade} overall grade`,
    detail,
    week: null,
    importance: seasonReportImportance(report),
    sortId: `season-report:${report.teamId}:${report.year}`,
  };
}

function recordMomentCandidate(
  history: FranchiseHistoryEntry,
  record: string,
  index: number,
): ScrapbookMomentCandidate {
  return {
    headline: `Record book: ${record}`,
    detail: `Record book logged ${record}.`,
    week: null,
    importance: 'major',
    sortId: `record:${history.teamId}:${history.year}:${index}:${record}`,
  };
}

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function pluralize(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? '' : 's'}`;
}

function describeHallAwards(entry: HallOfFameEntry): string | null {
  const awards = [
    entry.awards.mvps > 0 ? pluralize(entry.awards.mvps, 'MVP') : null,
    entry.awards.allPros > 0 ? pluralize(entry.awards.allPros, 'All-Pro') : null,
    entry.awards.proBowls > 0 ? pluralize(entry.awards.proBowls, 'Pro Bowl') : null,
    entry.awards.championships > 0 ? pluralize(entry.awards.championships, 'championship') : null,
  ].filter((item): item is string => Boolean(item));

  return awards.length > 0 ? awards.join(', ') : null;
}

function hallOfFameMomentCandidate(entry: HallOfFameEntry): ScrapbookMomentCandidate {
  const awards = describeHallAwards(entry);
  const awardLine = awards ? `; ${awards}` : '';

  return {
    headline: `${entry.name} enters the Hall of Fame`,
    detail: `${entry.position} inducted after ${entry.careerYears} seasons with peak ${entry.peakOvr} OVR and ${formatScore(entry.score)} HOF score${awardLine}.`,
    week: null,
    importance: 'breaking',
    sortId: `hof:${entry.inductionYear}:${entry.playerId}`,
  };
}

function rivalryTierLabel(intensity: number): string {
  if (intensity >= 76) return 'blood-feud';
  return 'heated';
}

function teamLabel(game: GameState, teamId: string): string {
  const team = game.teams[teamId];
  if (!team) return teamId;
  return `${team.city} ${team.name}`;
}

function leagueRivalryMomentCandidate(
  game: GameState,
  rivalry: LeagueRivalry,
  teamId: string,
): ScrapbookMomentCandidate {
  const opponentId = rivalry.teamA === teamId ? rivalry.teamB : rivalry.teamA;
  const latestChapter = rivalry.history[0] ?? 'The rivalry carried new heat through the season.';

  return {
    headline: `${teamLabel(game, teamId)} vs ${teamLabel(game, opponentId)} reaches ${rivalryTierLabel(rivalry.intensity)} heat`,
    detail: `Latest chapter: ${latestChapter}.`,
    week: rivalry.lastMetWeek ?? null,
    importance: rivalry.intensity >= 76 ? 'breaking' : 'major',
    sortId: `rivalry:${rivalry.id}`,
  };
}

function collectNotableMoments(game: GameState, recap: SeasonRecap): ScrapbookMoment[] {
  const newsMoments = game.leagueNews
    .filter((item) => item.year === recap.seasonYear)
    .filter((item) => item.teamIds.includes(recap.teamId))
    .map(newsMomentCandidate);
  const existingStoryArcNewsIds = new Set(
    game.leagueNews
      .filter((item) => item.year === recap.seasonYear)
      .filter((item) => item.teamIds.includes(recap.teamId))
      .filter((item) => item.id.startsWith('story-arc-'))
      .map((item) => item.id),
  );
  const timelineEvents = (game.dynastyTimeline ?? [])
    .filter((event) => event.year === recap.seasonYear)
    .filter((event) => event.teamIds.includes(recap.teamId));
  const namedGameMoments = timelineEvents
    .map(namedGameMomentCandidate)
    .filter((moment): moment is ScrapbookMomentCandidate => Boolean(moment));
  const bloodlineDraftMoments = timelineEvents
    .map((event) => bloodlineDraftMomentCandidate(game, event))
    .filter((moment): moment is ScrapbookMomentCandidate => Boolean(moment));
  const history = game.franchiseHistory.find((entry) => entry.year === recap.seasonYear && entry.teamId === recap.teamId);
  const recordMoments = history
    ? history.recordsBroken
      .filter((record) => record.trim().length > 0)
      .map((record, index) => recordMomentCandidate(history, record, index))
    : [];
  const hallOfFameMoments = (game.hallOfFame ?? [])
    .filter((entry) => entry.inductionYear === recap.seasonYear)
    .filter((entry) => entry.teams.includes(recap.teamId))
    .map(hallOfFameMomentCandidate);
  const awardMoments = (game.awardsHistory ?? [])
    .filter((entry) => entry.year === recap.seasonYear)
    .flatMap((entry) =>
      entry.awards
        .filter((award) => award.winnerTeamId === recap.teamId)
        .map(awardMomentCandidate)
        .filter((moment): moment is ScrapbookMomentCandidate => Boolean(moment)));
  const storyArcMoments = (game.storyArcs ?? [])
    .filter((arc) => arc.teamId === recap.teamId)
    .filter((arc) => !existingStoryArcNewsIds.has(`story-arc-${arc.id}-${recap.seasonYear}`))
    .flatMap((arc) =>
      arc.stageHistory
        .filter((beat) => beat.year === recap.seasonYear)
        .map((beat) => storyArcMomentCandidate(arc, beat))
        .filter((moment): moment is ScrapbookMomentCandidate => Boolean(moment)));
  const seasonReportMoments = (game.seasonReports ?? [])
    .filter((report) => report.year === recap.seasonYear)
    .filter((report) => report.teamId === recap.teamId)
    .map(seasonReportMomentCandidate)
    .filter((moment): moment is ScrapbookMomentCandidate => Boolean(moment));
  const leagueRivalryMoments = (game.leagueRivalries ?? [])
    .filter((rivalry) => rivalry.lastMetYear === recap.seasonYear)
    .filter((rivalry) => rivalry.teamA === recap.teamId || rivalry.teamB === recap.teamId)
    .filter((rivalry) => rivalry.intensity >= 51)
    .filter((rivalry) => rivalry.history.length > 0)
    .map((rivalry) => leagueRivalryMomentCandidate(game, rivalry, recap.teamId));

  return [...newsMoments, ...namedGameMoments, ...bloodlineDraftMoments, ...recordMoments, ...hallOfFameMoments, ...awardMoments, ...storyArcMoments, ...seasonReportMoments, ...leagueRivalryMoments]
    .sort(compareMoments)
    .slice(0, 3)
    .map((moment) => ({
      headline: moment.headline,
      detail: moment.detail,
      week: moment.week,
      importance: moment.importance,
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
