/**
 * Sprint 48 "The Reunion" — Revenge-game flavor system.
 *
 * Pure, deterministic scan over the schedule that tags matchups where a
 * marquee player (and, when data is available, a coach) is squaring off
 * against a team they recently departed. Flavor only — zero gameplay
 * impact. Outcomes remain fully sim-driven, per the design rule that
 * "revenge does NOT buff stats."
 *
 * The scanner draws from `game.playerArchive.teamHistory`, which is
 * populated for both active and retired players by `syncPlayerArchiveEntry`
 * (see `history.ts`). A player counts as a revenge protagonist when:
 *
 *   1. They are currently on one team in the matchup, AND
 *   2. They had a prior stint on the *opposing* team that ended within
 *      the lookback window (default 3 years), AND
 *   3. Their peak OVR is at or above the marquee threshold (default 82).
 *
 * Coach revenge is staged behind the same structure but requires a
 * staff-team history log that does not yet exist; this module exposes
 * the shape so callers can extend the scan once that log lands.
 */

import type {
  GameState,
  Player,
  PlayerArchiveEntry,
  PlayerArchiveTeamStint,
  ScheduleWeek,
} from '../types';

// ── Types ───────────────────────────────────────────────

export type RevengeSubjectKind = 'player' | 'coach';

/**
 * Why the subject left their former team. We default to `'unknown'`
 * when no transaction metadata is available (active-player archive
 * stints do not persist cause-of-move data).
 */
export type RevengeDeparture =
  | 'trade'
  | 'free_agency'
  | 'release'
  | 'staff_move'
  | 'unknown';

export interface RevengeProtagonist {
  subjectId: string;
  subjectName: string;
  subjectKind: RevengeSubjectKind;
  /** Player position (e.g. `'QB'`) or staff role (e.g. `'HC'`). */
  subjectRole: string;
  /** The team they are returning to face — the one they departed. */
  formerTeamId: string;
  /** The team they currently represent. */
  currentTeamId: string;
  /** Year the former stint ended. */
  departureYear: number;
  departureReason: RevengeDeparture;
  /** `currentYear - departureYear`, always >= 0. */
  yearsSinceDeparture: number;
  /** Peak OVR attained (on any team) — used for priority ordering. */
  peakOvrOnFormerTeam: number;
}

export interface RevengeFlavor {
  week: number;
  homeTeamId: string;
  awayTeamId: string;
  /** Stable matchup key: `"{week}:{home}:{away}"`. */
  matchupKey: string;
  protagonists: RevengeProtagonist[];
  /** Highest-priority protagonist, reused for ticker copy. */
  headline: RevengeProtagonist;
}

export interface RevengeScanOptions {
  /** Minimum peak OVR to qualify as a marquee player. Default 82. */
  marqueeOvr?: number;
  /** How many years back a departure still counts. Default 3. */
  lookbackYears?: number;
}

// ── Constants ───────────────────────────────────────────

const DEFAULT_MARQUEE_OVR = 82;
const DEFAULT_LOOKBACK = 3;

// ── Scan helpers ────────────────────────────────────────

interface ScanContext {
  currentYear: number;
  marqueeOvr: number;
  lookbackYears: number;
  archiveByPlayerId: Map<string, PlayerArchiveEntry>;
  playersById: Record<string, Player>;
}

function buildArchiveIndex(
  archive: readonly PlayerArchiveEntry[],
): Map<string, PlayerArchiveEntry> {
  const index = new Map<string, PlayerArchiveEntry>();
  for (const entry of archive) {
    index.set(entry.playerId, entry);
  }
  return index;
}

function findMostRecentStintAgainst(
  history: readonly PlayerArchiveTeamStint[],
  opponentTeamId: string,
  currentTeamId: string,
): PlayerArchiveTeamStint | null {
  let best: PlayerArchiveTeamStint | null = null;
  for (const stint of history) {
    if (stint.teamId !== opponentTeamId) continue;
    if (stint.teamId === currentTeamId) continue;
    if (!best || stint.lastYear > best.lastYear) {
      best = stint;
    }
  }
  return best;
}

function buildPlayerProtagonist(
  player: Player,
  stint: PlayerArchiveTeamStint,
  archive: PlayerArchiveEntry | undefined,
  currentTeamId: string,
  ctx: ScanContext,
): RevengeProtagonist | null {
  const yearsSinceDeparture = ctx.currentYear - stint.lastYear;
  if (yearsSinceDeparture < 0) return null;
  if (yearsSinceDeparture > ctx.lookbackYears) return null;

  // Marquee filter on peak OVR (use archive peak if available — covers
  // players in decline whose current OVR has fallen below threshold).
  const peakOvr = Math.max(archive?.peakOvr ?? 0, player.ovr);
  if (peakOvr < ctx.marqueeOvr) return null;

  return {
    subjectId: player.id,
    subjectName: player.name,
    subjectKind: 'player',
    subjectRole: player.pos,
    formerTeamId: stint.teamId,
    currentTeamId,
    departureYear: stint.lastYear,
    departureReason: 'unknown',
    yearsSinceDeparture,
    peakOvrOnFormerTeam: peakOvr,
  };
}

function scanTeamForProtagonists(
  teamId: string,
  opponentTeamId: string,
  rosterIds: readonly string[],
  ctx: ScanContext,
): RevengeProtagonist[] {
  const out: RevengeProtagonist[] = [];
  for (const playerId of rosterIds) {
    const player = ctx.playersById[playerId];
    if (!player) continue;
    const archive = ctx.archiveByPlayerId.get(playerId);
    if (!archive) continue;
    const stint = findMostRecentStintAgainst(archive.teamHistory, opponentTeamId, teamId);
    if (!stint) continue;
    const protagonist = buildPlayerProtagonist(player, stint, archive, teamId, ctx);
    if (protagonist) out.push(protagonist);
  }
  return out;
}

/**
 * Deterministic priority order for a matchup's protagonists.
 * 1. Highest peak OVR first (the bigger name leads).
 * 2. Fewer years since departure (fresher stories lead).
 * 3. Subject id ascending (fully stable tiebreak across saves).
 */
function compareProtagonists(
  a: RevengeProtagonist,
  b: RevengeProtagonist,
): number {
  if (a.peakOvrOnFormerTeam !== b.peakOvrOnFormerTeam) {
    return b.peakOvrOnFormerTeam - a.peakOvrOnFormerTeam;
  }
  if (a.yearsSinceDeparture !== b.yearsSinceDeparture) {
    return a.yearsSinceDeparture - b.yearsSinceDeparture;
  }
  return a.subjectId.localeCompare(b.subjectId);
}

// ── Public API ──────────────────────────────────────────

/**
 * Build a revenge-flavor tag for a single matchup. Returns null when
 * no protagonists qualify. Pure — safe to call at render time.
 */
export function getRevengeFlavorForMatchup(
  game: Pick<GameState, 'year' | 'players' | 'teams' | 'playerArchive'>,
  matchup: { homeTeamId: string; awayTeamId: string },
  week: number,
  options: RevengeScanOptions = {},
): RevengeFlavor | null {
  const homeTeam = game.teams[matchup.homeTeamId];
  const awayTeam = game.teams[matchup.awayTeamId];
  if (!homeTeam || !awayTeam) return null;

  const ctx: ScanContext = {
    currentYear: game.year,
    marqueeOvr: options.marqueeOvr ?? DEFAULT_MARQUEE_OVR,
    lookbackYears: options.lookbackYears ?? DEFAULT_LOOKBACK,
    archiveByPlayerId: buildArchiveIndex(game.playerArchive),
    playersById: game.players,
  };

  const homeRoster = homeTeam.roster.map((p) => p.id);
  const awayRoster = awayTeam.roster.map((p) => p.id);

  const homeProts = scanTeamForProtagonists(homeTeam.id, awayTeam.id, homeRoster, ctx);
  const awayProts = scanTeamForProtagonists(awayTeam.id, homeTeam.id, awayRoster, ctx);

  const combined = [...homeProts, ...awayProts].sort(compareProtagonists);
  if (combined.length === 0) return null;

  const headline = combined[0]!;
  return {
    week,
    homeTeamId: matchup.homeTeamId,
    awayTeamId: matchup.awayTeamId,
    matchupKey: `${week}:${matchup.homeTeamId}:${matchup.awayTeamId}`,
    protagonists: combined,
    headline,
  };
}

/**
 * Walk the full schedule and return every matchup that carries a revenge
 * thread. Output is ordered by week ascending, then by home team id.
 */
export function scanRevengeMatchups(
  game: Pick<GameState, 'year' | 'players' | 'teams' | 'playerArchive' | 'schedule'>,
  options: RevengeScanOptions = {},
): RevengeFlavor[] {
  const out: RevengeFlavor[] = [];
  const schedule: readonly ScheduleWeek[] = game.schedule ?? [];
  for (const week of schedule) {
    const weekGames = [...week.games].sort((a, b) =>
      a.homeTeamId.localeCompare(b.homeTeamId),
    );
    for (const matchup of weekGames) {
      const flavor = getRevengeFlavorForMatchup(game, matchup, week.week, options);
      if (flavor) out.push(flavor);
    }
  }
  return out;
}

/**
 * djb2 string hash. Used by UI layers to pick a deterministic quote
 * line for a given protagonist+context without pulling in RNG state.
 */
export function hashMatchupSeed(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Pick a deterministic line from a list keyed off a matchup seed and
 * a line-category. Returns null when the pool is empty.
 */
export function pickRevengeLine<T>(
  pool: readonly T[],
  matchupKey: string,
  category: string,
): T | null {
  if (pool.length === 0) return null;
  const seed = hashMatchupSeed(`${matchupKey}::${category}`);
  return pool[seed % pool.length] ?? null;
}
