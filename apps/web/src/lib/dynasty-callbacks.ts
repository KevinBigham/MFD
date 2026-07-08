import type {
  DraftRecap,
  FranchiseHistoryEntry,
  GameDayPackage,
  HallOfFameEntry,
  NewsItem,
  Player,
  RecordBook,
  RecordEntry,
  Team,
} from '@mfd/engine';
import type { StoredScrapbookEntry } from './scrapbook-store';

export type CallbackKind = 'ANNIVERSARY' | 'FOLLOW_THROUGH' | 'MILESTONE_ECHO';

export interface CallbackCard {
  id: string;
  kind: CallbackKind;
  headline: string;
  body: string;
  seasonsAgo: number;
  ctaRoute: string;
  ctaLabel: string;
  sourceRefs: string[];
}

export interface DynastyCallbacksInput {
  year: number;
  week: number;
  userTeamId?: string | null;
  players?: Record<string, Player>;
  teams?: Record<string, Team>;
  leagueNews?: readonly NewsItem[];
  gameDayPackages?: readonly GameDayPackage[];
  draftRecaps?: readonly DraftRecap[];
  scrapbookEntries?: readonly StoredScrapbookEntry[];
  hallOfFame?: readonly HallOfFameEntry[];
  records?: RecordBook | null;
  franchiseHistory?: readonly FranchiseHistoryEntry[];
}

type RankedCallbackCard = CallbackCard & {
  priority: number;
};

const MAX_CALLBACK_CARDS = 3;
const ANNIVERSARY_NEWS_TYPES = new Set<NewsItem['type']>(['trade', 'signing', 'draft']);
const MILESTONE_NEWS_TYPES = new Set<NewsItem['type']>(['record', 'milestone']);

function seasonsAgo(currentYear: number, sourceYear: number | null | undefined): number | null {
  if (typeof sourceYear !== 'number') return null;
  if (!Number.isInteger(currentYear) || !Number.isInteger(sourceYear)) return null;
  const delta = currentYear - sourceYear;
  return delta >= 1 ? delta : null;
}

function isSamePastWeek(
  currentYear: number,
  currentWeek: number,
  sourceYear: number | null | undefined,
  sourceWeek: number | null | undefined,
): sourceYear is number {
  if (typeof sourceWeek !== 'number') return false;
  if (!Number.isInteger(currentWeek) || !Number.isInteger(sourceWeek)) return false;
  return sourceWeek === currentWeek && seasonsAgo(currentYear, sourceYear) !== null;
}

function pluralSeason(count: number): string {
  return count === 1 ? 'season' : 'seasons';
}

function teamLabel(teams: DynastyCallbacksInput['teams'], teamId: string | null | undefined): string | null {
  if (!teamId) return null;
  const team = teams?.[teamId];
  if (!team) return null;
  return `${team.city} ${team.name}`;
}

function resolvePlayerTeamId(
  playerId: string,
  player: Player,
  teams: DynastyCallbacksInput['teams'],
): string | null {
  if (player.teamId) return player.teamId;

  for (const team of Object.values(teams ?? {})) {
    const found = team.roster?.some((rosterPlayer) => rosterPlayer.id === playerId);
    if (found) return team.id;
  }

  return null;
}

function textSnippet(text: string, fallback: string): string {
  const normalized = text.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function compareCallbacks(left: RankedCallbackCard, right: RankedCallbackCard): number {
  return left.priority - right.priority
    || right.seasonsAgo - left.seasonsAgo
    || left.id.localeCompare(right.id);
}

function newsCta(item: NewsItem): Pick<CallbackCard, 'ctaRoute' | 'ctaLabel'> {
  if (item.type === 'trade') return { ctaRoute: '/trades', ctaLabel: 'Open Trades' };
  if (item.type === 'signing') return { ctaRoute: '/free-agency', ctaLabel: 'Open Free Agency' };
  if (item.type === 'draft') return { ctaRoute: '/draft-recap', ctaLabel: 'Open Draft Recap' };
  if (item.type === 'milestone') return { ctaRoute: '/franchise/hall', ctaLabel: 'Open Hall of Fame' };
  return { ctaRoute: '/records', ctaLabel: 'Open Records' };
}

function buildNamedGameAnniversaries(input: DynastyCallbacksInput): RankedCallbackCard[] {
  const cards: RankedCallbackCard[] = [];

  for (const packageData of input.gameDayPackages ?? []) {
    const namedGame = packageData.namedGame;
    if (!namedGame) continue;
    if (!isSamePastWeek(input.year, input.week, namedGame.year, namedGame.week)) continue;

    const delta = seasonsAgo(input.year, namedGame.year);
    if (delta === null) continue;

    const winner = teamLabel(input.teams, namedGame.winnerTeamId);
    const finalLine = `Final: ${namedGame.homeScore}-${namedGame.awayScore}.`;
    const winnerLine = winner ? ` ${winner} won it.` : '';
    cards.push({
      id: `anniversary:named-game:${namedGame.gameId}`,
      kind: 'ANNIVERSARY',
      headline: `${delta} ${pluralSeason(delta)} ago: ${namedGame.name}`,
      body: `${textSnippet(namedGame.reason, packageData.headline)} ${finalLine}${winnerLine}`,
      seasonsAgo: delta,
      ctaRoute: '/legacy/named-games',
      ctaLabel: 'Open Named Games',
      sourceRefs: [
        `gameDayPackage:${packageData.id}`,
        `namedGame:${namedGame.gameId}`,
        `Week ${namedGame.week} ${namedGame.year}`,
      ],
      priority: 0,
    });
  }

  return cards;
}

function buildLeagueNewsAnniversaries(input: DynastyCallbacksInput): RankedCallbackCard[] {
  const cards: RankedCallbackCard[] = [];

  for (const item of input.leagueNews ?? []) {
    if (!ANNIVERSARY_NEWS_TYPES.has(item.type)) continue;
    if (!isSamePastWeek(input.year, input.week, item.year, item.week)) continue;

    const delta = seasonsAgo(input.year, item.year);
    if (delta === null) continue;
    const cta = newsCta(item);

    cards.push({
      id: `anniversary:league-news:${item.id}`,
      kind: 'ANNIVERSARY',
      headline: `${delta} ${pluralSeason(delta)} ago: ${item.headline}`,
      body: textSnippet(item.body, `Saved ${item.type} note from Week ${item.week} ${item.year}.`),
      seasonsAgo: delta,
      ctaRoute: cta.ctaRoute,
      ctaLabel: cta.ctaLabel,
      sourceRefs: [`leagueNews:${item.id}`, `Week ${item.week} ${item.year}`],
      priority: 1,
    });
  }

  return cards;
}

function buildScrapbookAnniversaries(input: DynastyCallbacksInput): RankedCallbackCard[] {
  const cards: RankedCallbackCard[] = [];

  for (const entry of input.scrapbookEntries ?? []) {
    for (const [index, moment] of entry.notableMoments.entries()) {
      if (!isSamePastWeek(input.year, input.week, entry.year, moment.week)) continue;

      const delta = seasonsAgo(input.year, entry.year);
      if (delta === null) continue;

      cards.push({
        id: `anniversary:scrapbook:${entry.year}:${index}:${moment.headline}`,
        kind: 'ANNIVERSARY',
        headline: `${delta} ${pluralSeason(delta)} ago: ${moment.headline}`,
        body: textSnippet(moment.detail, entry.seasonHighlightLine),
        seasonsAgo: delta,
        ctaRoute: '/franchise/scrapbook',
        ctaLabel: 'Open Scrapbook',
        sourceRefs: [`scrapbook:${entry.year}:${index}`, `Week ${moment.week} ${entry.year}`],
        priority: 1,
      });
    }
  }

  return cards;
}

function statusLine(
  input: DynastyCallbacksInput,
  playerId: string,
  player: Player,
  hallEntry: HallOfFameEntry | undefined,
): string {
  const teamId = resolvePlayerTeamId(playerId, player, input.teams);
  const currentTeam = teamLabel(input.teams, teamId);
  const onUserTeam = Boolean(input.userTeamId && teamId === input.userTeamId);
  const ovrLine = `${player.ovr} OVR`;

  if (hallEntry) {
    const ringLine = hallEntry.awards.championships > 0
      ? ` with ${hallEntry.awards.championships} title ${hallEntry.awards.championships === 1 ? 'ring' : 'rings'}`
      : '';
    return `is now a Hall of Famer${ringLine}`;
  }

  if (onUserTeam && player.isStarter) return `is still starting for you at ${ovrLine}`;
  if (onUserTeam) return `is still on your roster at ${ovrLine}`;
  if (player.isStarter && currentTeam) return `is now starting for ${currentTeam} at ${ovrLine}`;
  if (currentTeam) return `is now with ${currentTeam} at ${ovrLine}`;
  return `is still in the active player table at ${ovrLine}`;
}

function buildDraftFollowThroughs(input: DynastyCallbacksInput): RankedCallbackCard[] {
  const cards: RankedCallbackCard[] = [];
  const hallByPlayerId = new Map((input.hallOfFame ?? []).map((entry) => [entry.playerId, entry]));

  for (const recap of input.draftRecaps ?? []) {
    if (input.userTeamId && recap.teamId !== input.userTeamId) continue;

    const delta = seasonsAgo(input.year, recap.year);
    if (delta === null) continue;

    for (const pick of recap.picks) {
      const player = input.players?.[pick.playerId];
      if (!player) continue;
      const hallEntry = hallByPlayerId.get(pick.playerId);

      cards.push({
        id: `follow-through:draft:${recap.year}:${pick.playerId}`,
        kind: 'FOLLOW_THROUGH',
        headline: `${delta} ${pluralSeason(delta)} ago: you drafted ${pick.playerName}`,
        body: `${delta} ${pluralSeason(delta)} ago this week, your ${recap.year} draft recap saved ${pick.playerName} in Round ${pick.round}. Today he ${statusLine(input, pick.playerId, player, hallEntry)}.`,
        seasonsAgo: delta,
        ctaRoute: `/player/${pick.playerId}`,
        ctaLabel: 'Open Player',
        sourceRefs: [
          `draftRecap:${recap.year}:${pick.playerId}`,
          `players:${pick.playerId}`,
        ],
        priority: 2,
      });
    }
  }

  return cards;
}

function recordEntries(records: RecordBook | null | undefined): RecordEntry[] {
  if (!records) return [];

  const entries: RecordEntry[] = [];
  for (const bucket of [records.singleGame, records.singleSeason, records.career, records.franchise]) {
    for (const statEntries of Object.values(bucket)) {
      entries.push(...statEntries);
    }
  }
  return entries;
}

function buildRecordEchoes(input: DynastyCallbacksInput): RankedCallbackCard[] {
  const cards: RankedCallbackCard[] = [];

  for (const record of recordEntries(input.records)) {
    if (!isSamePastWeek(input.year, input.week, record.year, record.week ?? null)) continue;

    const delta = seasonsAgo(input.year, record.year);
    if (delta === null) continue;

    const holder = record.playerName ?? record.teamName;
    cards.push({
      id: `milestone-echo:record:${record.category}:${record.stat}:${record.year}:${record.week ?? 'season'}:${holder}`,
      kind: 'MILESTONE_ECHO',
      headline: `${delta} ${pluralSeason(delta)} ago: ${holder} entered the record book`,
      body: `${holder} saved a ${record.category} ${record.stat} mark of ${record.value} in Week ${record.week ?? input.week} ${record.year}${record.note ? `: ${record.note}` : '.'}`,
      seasonsAgo: delta,
      ctaRoute: '/records',
      ctaLabel: 'Open Records',
      sourceRefs: [
        `records:${record.category}:${record.stat}:${record.year}:${record.week ?? 'season'}`,
        `Week ${record.week ?? input.week} ${record.year}`,
      ],
      priority: 3,
    });
  }

  return cards;
}

function buildHallOfFameEchoes(input: DynastyCallbacksInput): RankedCallbackCard[] {
  const cards: RankedCallbackCard[] = [];
  const hallByPlayerId = new Map((input.hallOfFame ?? []).map((entry) => [entry.playerId, entry]));

  for (const item of input.leagueNews ?? []) {
    if (!MILESTONE_NEWS_TYPES.has(item.type)) continue;
    if (!isSamePastWeek(input.year, input.week, item.year, item.week)) continue;

    const hallEntry = item.playerIds
      .map((playerId) => hallByPlayerId.get(playerId))
      .find((entry): entry is HallOfFameEntry => entry !== undefined && entry.inductionYear === item.year);
    if (!hallEntry) continue;

    const delta = seasonsAgo(input.year, item.year);
    if (delta === null) continue;

    cards.push({
      id: `milestone-echo:hall-of-fame:${hallEntry.playerId}:${item.id}`,
      kind: 'MILESTONE_ECHO',
      headline: `${delta} ${pluralSeason(delta)} ago: ${hallEntry.name} joined the Hall`,
      body: textSnippet(item.body, `${hallEntry.name} entered the Hall of Fame after ${hallEntry.careerYears} seasons.`),
      seasonsAgo: delta,
      ctaRoute: '/franchise/hall',
      ctaLabel: 'Open Hall of Fame',
      sourceRefs: [
        `leagueNews:${item.id}`,
        `hallOfFame:${hallEntry.playerId}:${hallEntry.inductionYear}`,
        `Week ${item.week} ${item.year}`,
      ],
      priority: 3,
    });
  }

  return cards;
}

export function buildWeeklyCallbacks(input: DynastyCallbacksInput): CallbackCard[] {
  if (!Number.isInteger(input.year) || !Number.isInteger(input.week)) return [];

  return [
    ...buildNamedGameAnniversaries(input),
    ...buildLeagueNewsAnniversaries(input),
    ...buildScrapbookAnniversaries(input),
    ...buildDraftFollowThroughs(input),
    ...buildRecordEchoes(input),
    ...buildHallOfFameEchoes(input),
  ]
    .filter((card) => card.sourceRefs.length > 0)
    .sort(compareCallbacks)
    .slice(0, MAX_CALLBACK_CARDS)
    .map(({ priority: _priority, ...card }) => card);
}
