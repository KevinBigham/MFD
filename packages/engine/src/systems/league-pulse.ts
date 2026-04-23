/**
 * League Pulse — pure aggregator that takes a snapshot of the
 * league's rivalry intensities + power-ranking movement and
 * returns a single view-model for the League Pulse screen.
 *
 * Sprint 68 — Track D. Complements RivalryHeatMap (which is
 * user-team-centric) with a league-wide, at-a-glance pulse.
 */
import type { PrngFn } from '../rng';
import type { LeagueRivalry, PowerRanking, SocialPost } from '../types';

// ── Types ──────────────────────────────────────────────

export type LeaguePulseTier = 'blood_feud' | 'heated' | 'budding' | 'quiet';

export interface LeaguePulseRivalryEntry {
  id: string;
  teamA: string;
  teamB: string;
  teamAName: string;
  teamBName: string;
  intensity: number;
  tier: LeaguePulseTier;
  isDivision: boolean;
  lastMetLabel: string;
  historyPreview: string;
}

export interface LeaguePulseRankMover {
  teamId: string;
  teamName: string;
  rank: number;
  previousRank: number | null;
  delta: number;
  blurb: string;
  record: string;
}

export interface LeaguePulseSummary {
  totalRivalries: number;
  bloodFeudCount: number;
  heatedCount: number;
  buddingCount: number;
  divisionalCount: number;
  averageIntensity: number;
  topIntensity: number;
}

export interface LeaguePulse {
  summary: LeaguePulseSummary;
  hottestRivalries: LeaguePulseRivalryEntry[];
  risers: LeaguePulseRankMover[];
  fallers: LeaguePulseRankMover[];
}

export interface LeaguePulseInputs {
  rivalries: LeagueRivalry[];
  teamNames: Record<string, string>;
  powerRankings?: PowerRanking[];
}

export interface BuildLeaguePulseOptions {
  /** Max rivalry entries in hottestRivalries (default 8). Clamped [1, 32]. */
  maxRivalries?: number;
  /** Max movers in each of risers/fallers (default 4). Clamped [1, 16]. */
  maxMovers?: number;
  /** Rivalries below this intensity are ignored for hottestRivalries (default 25). */
  minIntensityForHighlight?: number;
}

// ── Constants ──────────────────────────────────────────

const DEFAULT_MAX_RIVALRIES = 8;
const DEFAULT_MAX_MOVERS = 4;
const DEFAULT_MIN_INTENSITY = 25;
const INTENSITY_MIN = 0;
const INTENSITY_MAX = 100;
const TIER_BLOOD_FEUD = 76;
const TIER_HEATED = 51;
const TIER_BUDDING = 21;

// ── Helpers ────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function classifyTier(intensity: number): LeaguePulseTier {
  if (intensity >= TIER_BLOOD_FEUD) return 'blood_feud';
  if (intensity >= TIER_HEATED) return 'heated';
  if (intensity >= TIER_BUDDING) return 'budding';
  return 'quiet';
}

function teamDisplayName(teamId: string, teamNames: Record<string, string>): string {
  return teamNames[teamId] ?? teamId;
}

function formatLastMet(rivalry: LeagueRivalry): string {
  if (rivalry.lastMetYear === null || rivalry.lastMetWeek === null) return '—';
  return `Y${rivalry.lastMetYear} W${rivalry.lastMetWeek}`;
}

function historyPreview(history: string[]): string {
  return history[0] ?? '';
}

function mapRivalryEntry(
  rivalry: LeagueRivalry,
  teamNames: Record<string, string>,
): LeaguePulseRivalryEntry {
  const clamped = clamp(rivalry.intensity, INTENSITY_MIN, INTENSITY_MAX);
  return {
    id: rivalry.id,
    teamA: rivalry.teamA,
    teamB: rivalry.teamB,
    teamAName: teamDisplayName(rivalry.teamA, teamNames),
    teamBName: teamDisplayName(rivalry.teamB, teamNames),
    intensity: clamped,
    tier: classifyTier(clamped),
    isDivision: rivalry.isDivision,
    lastMetLabel: formatLastMet(rivalry),
    historyPreview: historyPreview(rivalry.history),
  };
}

function mapMover(entry: PowerRanking): LeaguePulseRankMover {
  return {
    teamId: entry.teamId,
    teamName: entry.teamName,
    rank: entry.rank,
    previousRank: entry.previousRank,
    delta: entry.delta,
    blurb: entry.blurb,
    record: entry.record,
  };
}

// ── Main ───────────────────────────────────────────────

export function buildLeaguePulse(
  inputs: LeaguePulseInputs,
  options: BuildLeaguePulseOptions = {},
): LeaguePulse {
  const {
    maxRivalries = DEFAULT_MAX_RIVALRIES,
    maxMovers = DEFAULT_MAX_MOVERS,
    minIntensityForHighlight = DEFAULT_MIN_INTENSITY,
  } = options;

  const rivalryCap = clamp(Math.floor(maxRivalries), 1, 32);
  const moversCap = clamp(Math.floor(maxMovers), 1, 16);
  const minIntensity = clamp(Math.floor(minIntensityForHighlight), 0, 100);

  const rivalries = inputs.rivalries ?? [];
  const teamNames = inputs.teamNames ?? {};
  const powerRankings = inputs.powerRankings ?? [];

  // Summary over the full rivalry list (not the filtered highlight list).
  let bloodFeudCount = 0;
  let heatedCount = 0;
  let buddingCount = 0;
  let divisionalCount = 0;
  let intensitySum = 0;
  let topIntensity = 0;
  for (const rivalry of rivalries) {
    const clamped = clamp(rivalry.intensity, INTENSITY_MIN, INTENSITY_MAX);
    intensitySum += clamped;
    if (clamped > topIntensity) topIntensity = clamped;
    const tier = classifyTier(clamped);
    if (tier === 'blood_feud') bloodFeudCount += 1;
    else if (tier === 'heated') heatedCount += 1;
    else if (tier === 'budding') buddingCount += 1;
    if (rivalry.isDivision) divisionalCount += 1;
  }
  const totalRivalries = rivalries.length;
  const averageIntensity = totalRivalries === 0 ? 0 : Math.round((intensitySum / totalRivalries) * 10) / 10;

  const summary: LeaguePulseSummary = {
    totalRivalries,
    bloodFeudCount,
    heatedCount,
    buddingCount,
    divisionalCount,
    averageIntensity,
    topIntensity,
  };

  // Hottest rivalries — filter by min intensity, sort desc by intensity (stable via id tiebreak).
  const hottestRivalries = rivalries
    .filter((r) => clamp(r.intensity, INTENSITY_MIN, INTENSITY_MAX) >= minIntensity)
    .slice()
    .sort((a, b) => {
      const diff = b.intensity - a.intensity;
      if (diff !== 0) return diff;
      return a.id.localeCompare(b.id);
    })
    .slice(0, rivalryCap)
    .map((r) => mapRivalryEntry(r, teamNames));

  // Risers (delta > 0 → moved up) sorted desc by delta. Fallers (delta < 0) sorted asc.
  const movers = powerRankings.filter((entry) => entry.delta !== 0);
  const risers = movers
    .filter((entry) => entry.delta > 0)
    .slice()
    .sort((a, b) => {
      const diff = b.delta - a.delta;
      if (diff !== 0) return diff;
      return a.rank - b.rank;
    })
    .slice(0, moversCap)
    .map(mapMover);

  const fallers = movers
    .filter((entry) => entry.delta < 0)
    .slice()
    .sort((a, b) => {
      const diff = a.delta - b.delta;
      if (diff !== 0) return diff;
      return a.rank - b.rank;
    })
    .slice(0, moversCap)
    .map(mapMover);

  return {
    summary,
    hottestRivalries,
    risers,
    fallers,
  };
}

// ── Lookups ────────────────────────────────────────────

export function getLeaguePulseRivalry(
  pulse: LeaguePulse,
  rivalryId: string,
): LeaguePulseRivalryEntry | null {
  return pulse.hottestRivalries.find((entry) => entry.id === rivalryId) ?? null;
}

// ── Heat-spike detection (rivalry tier ascension) ──────

const TIER_ORDER: LeaguePulseTier[] = ['quiet', 'budding', 'heated', 'blood_feud'];

function tierRank(tier: LeaguePulseTier): number {
  return TIER_ORDER.indexOf(tier);
}

/**
 * Detects when a rivalry's intensity crossed into a higher tier.
 * Returns the new tier if ascended (e.g., budding → heated or heated → blood_feud);
 * returns null if the tier stayed the same or dropped.
 */
export function detectRivalryTierAscension(
  previousIntensity: number,
  currentIntensity: number,
): LeaguePulseTier | null {
  const before = classifyTier(previousIntensity);
  const after = classifyTier(currentIntensity);
  if (tierRank(after) <= tierRank(before)) return null;
  return after;
}

// ── Heat-spike social post ─────────────────────────────

const HEATED_TEMPLATES = [
  (a: string, b: string) => `BREAKING: ${a} vs ${b} officially crosses into HEATED territory. This one has bite now.`,
  (a: string, b: string) => `The ${a}-${b} file keeps getting thicker. Officially a HEATED rivalry after this one.`,
  (a: string, b: string) => `Circle the calendar — ${a} and ${b} are no longer just a matchup. They're a rivalry.`,
];

const BLOOD_FEUD_TEMPLATES = [
  (a: string, b: string) => `BLOOD FEUD. ${a} and ${b} have crossed every line. This isn't a game anymore.`,
  (a: string, b: string) => `Call it what it is: ${a} vs ${b} is a BLOOD FEUD. Years of receipts, and they just added another.`,
  (a: string, b: string) => `${a} and ${b} just graduated to a full-blown BLOOD FEUD. Whoever drew this schedule next time better duck.`,
];

function pickTemplate<T>(templates: T[], rng: PrngFn): T {
  const index = Math.min(templates.length - 1, Math.max(0, Math.floor(rng() * templates.length)));
  return templates[index]!;
}

/**
 * Creates a social-feed post announcing a rivalry's ascension into a
 * higher tier. Determinstic given the same rng input.
 */
export function createRivalryHeatSpikePost(
  rivalry: LeagueRivalry,
  newTier: LeaguePulseTier,
  teamNames: Record<string, string>,
  week: number,
  rng: PrngFn,
): SocialPost | null {
  if (newTier !== 'heated' && newTier !== 'blood_feud') return null;
  const teamAName = teamNames[rivalry.teamA] ?? rivalry.teamA;
  const teamBName = teamNames[rivalry.teamB] ?? rivalry.teamB;
  const templates = newTier === 'blood_feud' ? BLOOD_FEUD_TEMPLATES : HEATED_TEMPLATES;
  const content = pickTemplate(templates, rng)(teamAName, teamBName);
  return {
    id: `social-rivalry-heat-${rivalry.id}-${week}-${newTier}`,
    source: 'reporter',
    authorName: 'MFSN League Desk',
    content,
    trigger: 'rivalry',
    sentiment: 'hype',
    likes: 220 + Math.floor(rng() * 240),
    timestamp: week,
  };
}
