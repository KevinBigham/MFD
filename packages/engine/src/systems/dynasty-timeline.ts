/**
 * Dynasty Timeline — event feed + Franchise Book builder.
 *
 * Split into two concerns:
 *   1. DynastyEvent feed — primitive event log (record/query helpers).
 *   2. Franchise Book builder — crown-jewel reader-view aggregation that
 *      partitions franchise history into era chapters, collects defining
 *      moments + signature players, and classifies each era's arc.
 *
 * The Franchise Book is pure and deterministic. It derives from existing
 * state (franchiseHistory, dynastyTimeline, userDynastyEras, playerArchive,
 * relationships) and returns structured data — narrative prose composition
 * is left to the UI layer (reads content/narrative/era-templates.json).
 */

import type {
  DynastyEvent,
  FranchiseHistoryEntry,
  GameState,
  PlayerArchiveEntry,
} from '../types';

// ─── DynastyEvent feed (existing API, unchanged) ────────────────────

const IMPORTANCE_WEIGHT: Record<DynastyEvent['importance'], number> = {
  landmark: 3,
  major: 2,
  minor: 1,
};

function compareEvents(a: DynastyEvent, b: DynastyEvent): number {
  return (
    IMPORTANCE_WEIGHT[b.importance] - IMPORTANCE_WEIGHT[a.importance] ||
    b.year - a.year ||
    (b.week ?? 99) - (a.week ?? 99) ||
    a.id.localeCompare(b.id)
  );
}

export function recordDynastyEvent(game: GameState, event: DynastyEvent): DynastyEvent {
  game.dynastyTimeline ??= [];
  game.dynastyTimeline.push(event);
  return event;
}

export function getDynastyHighlights(game: GameState, count: number): DynastyEvent[] {
  game.dynastyTimeline ??= [];
  return [...game.dynastyTimeline].sort(compareEvents).slice(0, count);
}

export function getDynastyByYear(game: GameState, year: number): DynastyEvent[] {
  game.dynastyTimeline ??= [];
  return game.dynastyTimeline
    .filter((event) => event.year === year)
    .sort((a, b) => (a.week ?? 99) - (b.week ?? 99) || a.id.localeCompare(b.id));
}

// ─── Franchise Book types ──────────────────────────────────────────

export type EraArcType =
  | 'ascent'       // Rising from mediocrity toward contention
  | 'peak'         // Contender window with deep runs
  | 'golden'       // Dynasty — multiple championships in a tight window
  | 'valley'       // Long stretch of losing
  | 'rebuild'      // Purposeful teardown into youth phase
  | 'turbulent'    // High variance — wild swings year to year
  | 'steady';      // Consistent mid-pack — neither contender nor rebuilder

export type DefiningMomentKind =
  | 'championship'
  | 'playoff_run'
  | 'collapse'
  | 'draft_steal'
  | 'draft_reach'
  | 'blockbuster_trade'
  | 'franchise_signing'
  | 'record_broken'
  | 'farewell'
  | 'hof_induction'
  | 'firing'
  | 'named_game';

export interface DefiningMoment {
  year: number;
  week: number | null;
  kind: DefiningMomentKind;
  headline: string;
  importance: 'landmark' | 'major' | 'minor';
  playerIds: string[];
  sourceEventId: string | null;
}

export type SignatureRole =
  | 'franchise_qb'
  | 'cornerstone'
  | 'star'
  | 'legend'
  | 'heart_and_soul';

export interface SignaturePlayer {
  playerId: string;
  name: string;
  peakOvr: number;
  peakYear: number;
  yearsInEra: number;
  role: SignatureRole;
}

export interface EraRecord {
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  seasons: number;
  pointDifferential: number;
}

export interface EraChapter {
  id: string;
  chapterNumber: number;
  title: string;
  subtitle: string;
  startYear: number;
  endYear: number;
  trigger: 'user_named' | 'championship' | 'collapse' | 'rebuild' | 'era_gap' | 'origin';
  arcType: EraArcType;
  record: EraRecord;
  championships: number;
  playoffAppearances: number;
  definingMoments: DefiningMoment[];
  signaturePlayers: SignaturePlayer[];
  headCoachName: string | null;
  milestoneFlags: string[];
}

export interface FranchiseBook {
  teamId: string;
  teamName: string;
  teamCity: string;
  motto: string | null;
  eras: EraChapter[];
  totals: {
    seasons: number;
    wins: number;
    losses: number;
    ties: number;
    championships: number;
    playoffAppearances: number;
  };
  firstYear: number;
  lastYear: number;
  generatedAt: number;
}

// ─── Era partitioning ──────────────────────────────────────────────

const MIN_ERA_YEARS = 3;
const MAX_ERA_YEARS = 10;
const CHAMPIONSHIP_FINISH = 'champion';
const DYNASTY_CHAMPIONSHIPS_THRESHOLD = 2;
const VALLEY_WIN_PCT = 0.35;
const ASCENT_WIN_PCT = 0.500;
const PEAK_WIN_PCT = 0.625;

function historyFor(game: GameState, teamId: string): FranchiseHistoryEntry[] {
  return game.franchiseHistory
    .filter((entry) => entry.teamId === teamId)
    .sort((a, b) => a.year - b.year);
}

function isChampion(entry: FranchiseHistoryEntry): boolean {
  return entry.playoffFinish === CHAMPIONSHIP_FINISH;
}

function hasPlayoffFinish(entry: FranchiseHistoryEntry): boolean {
  const finish = (entry.playoffFinish ?? '').toLowerCase();
  if (!finish) return false;
  // Canonical no-playoff values written by the engine:
  //   'regular_season' — set by stat-central when a team's season ends in regular play
  //   'missed_playoffs' / 'missed playoffs' / 'missed' — legacy and helper-test variants
  // Sibling systems use the same predicate (franchise-dashboard.ts:20, ai-philosophy.ts:18).
  if (finish === 'regular_season') return false;
  if (finish.includes('missed')) return false;
  return true;
}

function seasonWinPct(entry: FranchiseHistoryEntry): number {
  const total = entry.wins + entry.losses + entry.ties;
  if (total === 0) return 0;
  return (entry.wins + entry.ties * 0.5) / total;
}

/**
 * Partition franchise history into era chapters.
 *
 * Priority order:
 *   1. If game.userDynastyEras has entries, honor them as the authoritative
 *      chapter boundaries.
 *   2. Otherwise, auto-partition by natural seams:
 *      - Championship that caps a ≥ MIN_ERA_YEARS run → close chapter
 *      - Collapse (≥ 3-win drop into a sub-.400 season) → close chapter
 *      - Hard ceiling at MAX_ERA_YEARS even without a natural seam
 *      - Gap years (missing seasons in history) → close chapter
 */
export function partitionEras(
  history: FranchiseHistoryEntry[],
  userEras: GameState['userDynastyEras'] | undefined,
): Array<{ startYear: number; endYear: number; trigger: EraChapter['trigger']; userTitle: string | null }> {
  if (history.length === 0) return [];

  const sorted = [...history].sort((a, b) => a.year - b.year);

  // User-named eras take priority — map them to the history window
  if (userEras && userEras.length > 0) {
    const bounds = [...userEras].sort((a, b) => a.startYear - b.startYear);
    const out: ReturnType<typeof partitionEras> = [];
    for (let i = 0; i < bounds.length; i++) {
      const era = bounds[i]!;
      const nextEraStart = bounds[i + 1]?.startYear ?? Number.POSITIVE_INFINITY;
      const endYearCap = Math.min(era.endYear ?? nextEraStart - 1, sorted[sorted.length - 1]!.year);
      if (endYearCap < era.startYear) continue;
      out.push({
        startYear: era.startYear,
        endYear: endYearCap,
        trigger: 'user_named',
        userTitle: era.name,
      });
    }
    if (out.length > 0) return out;
  }

  // Auto-partition
  const out: ReturnType<typeof partitionEras> = [];
  let currentStart = sorted[0]!.year;
  let currentStartIdx = 0;
  let previousWins: number | null = null;

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i]!;
    const yearsInEra = entry.year - currentStart + 1;
    const isLast = i === sorted.length - 1;
    const nextEntry = sorted[i + 1];
    const hasGap = nextEntry && nextEntry.year - entry.year > 1;

    const winPct = seasonWinPct(entry);
    const collapsed = previousWins !== null
      && entry.wins <= previousWins - 3
      && winPct < 0.400
      && yearsInEra >= MIN_ERA_YEARS;

    const triggerChampionship = isChampion(entry) && yearsInEra >= MIN_ERA_YEARS;
    const ceilingHit = yearsInEra >= MAX_ERA_YEARS;

    const shouldClose = isLast || hasGap || triggerChampionship || collapsed || ceilingHit;

    if (shouldClose) {
      const trigger: EraChapter['trigger'] =
        i === currentStartIdx ? 'origin' :
        triggerChampionship ? 'championship' :
        collapsed ? 'collapse' :
        hasGap ? 'era_gap' :
        ceilingHit ? 'rebuild' :
        'origin';

      out.push({
        startYear: currentStart,
        endYear: entry.year,
        trigger,
        userTitle: null,
      });

      if (!isLast) {
        currentStart = sorted[i + 1]!.year;
        currentStartIdx = i + 1;
        previousWins = null;
      }
    } else {
      previousWins = entry.wins;
    }
  }

  return out;
}

// ─── Era record aggregation ────────────────────────────────────────

function aggregateRecord(entries: FranchiseHistoryEntry[]): EraRecord {
  const record: EraRecord = {
    wins: 0, losses: 0, ties: 0, winPct: 0,
    seasons: entries.length, pointDifferential: 0,
  };
  for (const entry of entries) {
    record.wins += entry.wins;
    record.losses += entry.losses;
    record.ties += entry.ties;
    record.pointDifferential += entry.pointDifferential ?? 0;
  }
  const totalGames = record.wins + record.losses + record.ties;
  record.winPct = totalGames === 0 ? 0 : (record.wins + record.ties * 0.5) / totalGames;
  return record;
}

function classifyEraArc(
  record: EraRecord,
  championships: number,
  playoffAppearances: number,
): EraArcType {
  if (championships >= DYNASTY_CHAMPIONSHIPS_THRESHOLD) return 'golden';
  if (record.winPct >= PEAK_WIN_PCT) return 'peak';
  if (record.winPct <= VALLEY_WIN_PCT) return 'valley';

  // Mid-tier classification: anything outside the narrow "steady band" around
  // .4375 (≈7-9 in a 16-game season) that doesn't already fit rebuild/ascent
  // gets labeled 'turbulent'. This is a band-distance check, not a true
  // season-by-season variance measure — see GOAT roadmap for the variance upgrade.
  const winsBySeason = record.seasons > 0 ? record.wins / record.seasons : 0;
  const STEADY_BAND_CENTER = 0.4375;
  const STEADY_BAND_HALFWIDTH = 0.06;
  const isBelowSteady = record.winPct < STEADY_BAND_CENTER - STEADY_BAND_HALFWIDTH;
  const isAboveSteady = record.winPct > STEADY_BAND_CENTER + STEADY_BAND_HALFWIDTH;
  if (winsBySeason < 3 && playoffAppearances === 0) return 'rebuild';
  if (record.winPct >= ASCENT_WIN_PCT && championships === 0) return 'ascent';
  if (isBelowSteady || isAboveSteady) return 'turbulent';
  return 'steady';
}

// ─── Defining moments ──────────────────────────────────────────────

const TIMELINE_TO_MOMENT_KIND: Record<DynastyEvent['type'], DefiningMomentKind> = {
  championship: 'championship',
  draft_pick: 'draft_steal',
  trade: 'blockbuster_trade',
  signing: 'franchise_signing',
  firing: 'firing',
  record: 'record_broken',
  award: 'record_broken',
  hof: 'hof_induction',
  milestone: 'record_broken',
  named_game: 'named_game',
};

function collectDefiningMoments(
  game: GameState,
  teamId: string,
  startYear: number,
  endYear: number,
  entries: FranchiseHistoryEntry[],
): DefiningMoment[] {
  const moments: DefiningMoment[] = [];

  // Pull from DynastyEvent feed within the era window
  const timeline = game.dynastyTimeline ?? [];
  for (const event of timeline) {
    if (event.year < startYear || event.year > endYear) continue;
    if (!event.teamIds.includes(teamId)) continue;
    const kind = TIMELINE_TO_MOMENT_KIND[event.type];
    if (!kind) continue;
    moments.push({
      year: event.year,
      week: event.week,
      kind,
      headline: event.headline,
      importance: event.importance,
      playerIds: [...event.playerIds],
      sourceEventId: event.id,
    });
  }

  // Synthesize collapse/breakthrough moments from franchiseHistory deltas
  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1]!;
    const cur = entries[i]!;
    const winDelta = cur.wins - prev.wins;
    if (winDelta >= 5 && cur.wins >= 10) {
      moments.push({
        year: cur.year,
        week: null,
        kind: 'playoff_run',
        headline: `The ${cur.wins}-win breakthrough (up ${winDelta} from ${prev.wins})`,
        importance: 'major',
        playerIds: [],
        sourceEventId: null,
      });
    } else if (winDelta <= -5 && cur.wins <= 5) {
      moments.push({
        year: cur.year,
        week: null,
        kind: 'collapse',
        headline: `The ${cur.wins}-win collapse (down ${Math.abs(winDelta)} from ${prev.wins})`,
        importance: 'major',
        playerIds: [],
        sourceEventId: null,
      });
    }
  }

  // Sort: year ascending, then importance descending, then kind name for stable ordering
  moments.sort((a, b) =>
    a.year - b.year ||
    IMPORTANCE_WEIGHT[b.importance] - IMPORTANCE_WEIGHT[a.importance] ||
    a.kind.localeCompare(b.kind) ||
    (a.sourceEventId ?? '').localeCompare(b.sourceEventId ?? ''),
  );

  return moments;
}

// ─── Signature players ─────────────────────────────────────────────

function classifySignatureRole(
  peakOvr: number,
  yearsInEra: number,
  isQb: boolean,
): SignatureRole {
  if (isQb && peakOvr >= 90 && yearsInEra >= 5) return 'franchise_qb';
  if (peakOvr >= 95) return 'legend';
  if (peakOvr >= 90 && yearsInEra >= 4) return 'cornerstone';
  if (yearsInEra >= 6) return 'heart_and_soul';
  return 'star';
}

function collectSignaturePlayers(
  game: GameState,
  teamId: string,
  startYear: number,
  endYear: number,
): SignaturePlayer[] {
  const archive = game.playerArchive ?? [];
  const history = game.playerSeasonHistory ?? {};
  const candidates: SignaturePlayer[] = [];

  for (const entry of archive as PlayerArchiveEntry[]) {
    const stints = entry.teamHistory.filter((stint) =>
      stint.teamId === teamId && stint.firstYear <= endYear && stint.lastYear >= startYear);
    if (stints.length === 0) continue;

    const eraStart = Math.max(entry.firstYear, startYear);
    const eraEnd = Math.min(entry.lastYear, endYear);
    if (eraEnd < eraStart) continue;
    const yearsInEra = eraEnd - eraStart + 1;

    // peak OVR within era — use playerSeasonHistory if present
    let peakOvr = entry.peakOvr;
    let peakYear = entry.peakYear;
    const seasons = history[entry.playerId] ?? [];
    for (const season of seasons) {
      if (season.teamId !== teamId) continue;
      if (season.season < startYear || season.season > endYear) continue;
      if (season.ovr > peakOvr) {
        peakOvr = season.ovr;
        peakYear = season.season;
      }
    }

    const isQb = entry.positions.includes('QB');
    candidates.push({
      playerId: entry.playerId,
      name: entry.name,
      peakOvr,
      peakYear,
      yearsInEra,
      role: classifySignatureRole(peakOvr, yearsInEra, isQb),
    });
  }

  // Sort: peakOvr desc, yearsInEra desc, name asc for stable ordering
  candidates.sort((a, b) =>
    b.peakOvr - a.peakOvr ||
    b.yearsInEra - a.yearsInEra ||
    a.name.localeCompare(b.name),
  );

  // Cap at 6 signature players per era — enough to fill a signature strip
  return candidates.slice(0, 6);
}

// ─── Head coach lookup ─────────────────────────────────────────────

function findHeadCoachForEra(
  game: GameState,
  teamId: string,
  _startYear: number,
  _endYear: number,
): string | null {
  // Current HC as a best-effort default. Future enhancement: coach history
  // tracker that records HC tenures per year. For now, return the current
  // HC name if era includes the current year, otherwise null.
  const team = game.teams[teamId];
  if (!team) return null;
  return team.staff?.hc?.name ?? null;
}

// ─── Era title auto-generation ─────────────────────────────────────

const ARC_TITLE_ADJECTIVES: Record<EraArcType, string> = {
  ascent: 'Ascent',
  peak: 'Peak',
  golden: 'Golden',
  valley: 'Valley',
  rebuild: 'Rebuild',
  turbulent: 'Turbulent',
  steady: 'Steady',
};

function autoTitle(
  chapterNumber: number,
  arcType: EraArcType,
  startYear: number,
  endYear: number,
  championships: number,
  userTitle: string | null,
): { title: string; subtitle: string } {
  if (userTitle) {
    return {
      title: userTitle,
      subtitle: `${startYear}–${endYear} · ${ARC_TITLE_ADJECTIVES[arcType]} years`,
    };
  }

  const adjective = ARC_TITLE_ADJECTIVES[arcType];
  const titleBase = chapterNumber === 1
    ? `Chapter ${chapterNumber} · The ${adjective} Years`
    : arcType === 'golden'
      ? `Chapter ${chapterNumber} · The Golden Run`
      : arcType === 'valley'
        ? `Chapter ${chapterNumber} · The Wilderness`
        : arcType === 'rebuild'
          ? `Chapter ${chapterNumber} · The Reset`
          : `Chapter ${chapterNumber} · The ${adjective} Era`;

  const titleCount = championships === 0
    ? ''
    : championships === 1
      ? ' · 1 title'
      : ` · ${championships} titles`;

  return {
    title: titleBase,
    subtitle: `${startYear}–${endYear}${titleCount}`,
  };
}

// ─── Milestone flags ────────────────────────────────────────────────

function computeMilestoneFlags(
  record: EraRecord,
  championships: number,
  arcType: EraArcType,
): string[] {
  const flags: string[] = [];
  if (championships >= 3) flags.push('three_peat_plus');
  else if (championships === 2) flags.push('multi_title');
  else if (championships === 1) flags.push('first_title');
  if (record.winPct >= 0.750) flags.push('sustained_dominance');
  if (record.winPct <= 0.250) flags.push('deep_valley');
  if (arcType === 'golden') flags.push('dynasty_run');
  if (arcType === 'turbulent') flags.push('rollercoaster');
  return flags;
}

// ─── Top-level builder ─────────────────────────────────────────────

/**
 * Build the Franchise Book for a team — the crown-jewel reader view.
 *
 * Pure and deterministic. Safe to call every frame if needed; the UI
 * typically memoizes on (teamId, game.year, franchiseHistory.length).
 */
export function buildFranchiseBook(game: GameState, teamId: string): FranchiseBook | null {
  const team = game.teams[teamId];
  if (!team) return null;

  const history = historyFor(game, teamId);

  if (history.length === 0) {
    return {
      teamId,
      teamName: team.name,
      teamCity: team.city,
      motto: null,
      eras: [],
      totals: { seasons: 0, wins: 0, losses: 0, ties: 0, championships: 0, playoffAppearances: 0 },
      firstYear: game.year,
      lastYear: game.year,
      generatedAt: game.year,
    };
  }

  const bounds = partitionEras(history, game.userDynastyEras);
  const eras: EraChapter[] = [];

  for (let i = 0; i < bounds.length; i++) {
    const { startYear, endYear, trigger, userTitle } = bounds[i]!;
    const entriesInEra = history.filter((e) => e.year >= startYear && e.year <= endYear);
    const record = aggregateRecord(entriesInEra);
    const championships = entriesInEra.filter(isChampion).length;
    const playoffAppearances = entriesInEra.filter(hasPlayoffFinish).length;
    const arcType = classifyEraArc(record, championships, playoffAppearances);
    const chapterNumber = i + 1;
    const { title, subtitle } = autoTitle(chapterNumber, arcType, startYear, endYear, championships, userTitle);

    eras.push({
      id: `${teamId}-era-${startYear}`,
      chapterNumber,
      title,
      subtitle,
      startYear,
      endYear,
      trigger,
      arcType,
      record,
      championships,
      playoffAppearances,
      definingMoments: collectDefiningMoments(game, teamId, startYear, endYear, entriesInEra),
      signaturePlayers: collectSignaturePlayers(game, teamId, startYear, endYear),
      headCoachName: findHeadCoachForEra(game, teamId, startYear, endYear),
      milestoneFlags: computeMilestoneFlags(record, championships, arcType),
    });
  }

  const totalRecord = aggregateRecord(history);
  const totalChampionships = history.filter(isChampion).length;
  const totalPlayoffAppearances = history.filter(hasPlayoffFinish).length;

  return {
    teamId,
    teamName: team.name,
    teamCity: team.city,
    motto: null, // UI fills from content/teams/*.json
    eras,
    totals: {
      seasons: history.length,
      wins: totalRecord.wins,
      losses: totalRecord.losses,
      ties: totalRecord.ties,
      championships: totalChampionships,
      playoffAppearances: totalPlayoffAppearances,
    },
    firstYear: history[0]!.year,
    lastYear: history[history.length - 1]!.year,
    generatedAt: game.year,
  };
}

/**
 * Detect whether a new era chapter has been added since a prior snapshot.
 * Used by the news-feed hook to fire a "new chapter begins" inbox entry
 * exactly once per era transition.
 */
export function detectNewEraChapter(
  book: FranchiseBook,
  priorChapterCount: number,
): EraChapter | null {
  if (book.eras.length <= priorChapterCount) return null;
  return book.eras[book.eras.length - 1] ?? null;
}
