/**
 * MFD Archetype Progression System
 *
 * Archetype-specific development rates for player ratings.
 * Key archetype ratings develop 40-60% faster; off-archetype ratings develop slower.
 * Young pre-prime players can "evolve" archetype if development skews away.
 */

import type { Player, PlayerArchetype, Position } from '../types';
import { cl } from '../utils';

// ── Types ──────────────────────────────────────────────

export interface ArchetypeProgressionMultipliers {
  /** Per-rating multiplier: >1 = boosted, <1 = suppressed, 1 = neutral */
  multipliers: Record<string, number>;
  /** Archetype key ratings that get boosted */
  keyRatings: string[];
}

export interface ArchetypeEvolution {
  previousArchetype: string;
  previousLabel: string;
  newArchetype: string;
  newLabel: string;
  narrative: string;
}

export interface ArchetypeDevelopmentReport {
  archetypeId: string;
  archetypeLabel: string;
  alignment: number; // 0-100
  topGrowthRatings: { rating: string; delta: number }[];
  evolutionRisk: 'none' | 'possible' | 'likely';
  keyRatingAvg: number;
  offKeyRatingAvg: number;
}

// ── Archetype Key Ratings Map ─────────────────────────

/** Maps archetype ID → key rating names (from player-archetypes.ts definitions) */
const ARCHETYPE_KEYS: Record<string, string[]> = {
  // QB
  pocket_passer: ['pocketPresence', 'accuracy', 'fieldVision', 'decisionSpeed'],
  dual_threat: ['speed', 'scramble', 'acceleration', 'agility'],
  game_manager: ['awareness', 'shortAccuracy', 'decisionSpeed', 'leadership'],
  gunslinger: ['arm', 'deepAccuracy', 'throwOnRun', 'release'],
  // RB
  power_back: ['power', 'truckPower', 'breakTackle', 'strength'],
  speed_back: ['speed', 'acceleration', 'changeOfDirection', 'elusiveness'],
  receiving_back: ['catching', 'routeRunning', 'ballCarrierVision', 'passProtection'],
  all_purpose: ['ballCarrierVision', 'elusiveness', 'catching', 'speed'],
  // WR
  deep_threat: ['speed', 'deepRoute', 'separation', 'spectacularCatch'],
  possession: ['catching', 'catchInTraffic', 'shortRoute', 'awareness'],
  slot: ['agility', 'shortRoute', 'release', 'yacAbility'],
  red_zone: ['jumping', 'catchInTraffic', 'spectacularCatch', 'strength'],
  // TE
  blocking_te: ['blocking', 'runBlocking', 'impactBlocking', 'passProtection'],
  receiving_te: ['catching', 'routeRunning', 'speed', 'catchInTraffic'],
  hybrid_te: ['catching', 'blocking', 'routeRunning', 'impactBlocking'],
  // OL
  pass_protector: ['passBlock', 'passBlockFinesse', 'anchorStrength', 'footwork'],
  road_grader: ['runBlock', 'impactBlocking', 'strength', 'pullBlock'],
  technician: ['handTechnique', 'footwork', 'assignmentIQ', 'awareness'],
  // DL
  power_rusher: ['strength', 'powerMoves', 'bullRush', 'blockShedding'],
  speed_rusher: ['speed', 'acceleration', 'finesseMoves', 'pursuit'],
  run_stuffer: ['runStop', 'blockShedding', 'strength', 'toughness'],
  // LB
  coverage_lb: ['coverage', 'zoneCoverage', 'speed', 'awareness'],
  pass_rush_lb: ['passRush', 'acceleration', 'blockShedding', 'pursuit'],
  thumper: ['tackle', 'hitPower', 'strength', 'toughness'],
  // CB
  lockdown: ['manCoverage', 'coverage', 'speed', 'agility'],
  ball_hawk: ['ballSkills', 'zoneCoverage', 'awareness', 'jumping'],
  physical_cb: ['pressAbility', 'hitPower', 'tackling', 'strength'],
  // S
  free_safety: ['zoneCoverage', 'ballSkills', 'speed', 'awareness'],
  strong_safety: ['hitPower', 'tackling', 'strength', 'toughness'],
  hybrid_s: ['coverage', 'zoneCoverage', 'tackling', 'speed'],
};

const KEY_BOOST = 1.5;    // 50% faster development for key ratings
const OFF_KEY_MULT = 0.8; // 20% slower for off-archetype ratings

// ── Archetype Label Lookup ────────────────────────────

const ARCHETYPE_LABELS: Record<string, string> = {
  pocket_passer: 'Pocket Passer', dual_threat: 'Dual Threat',
  game_manager: 'Game Manager', gunslinger: 'Gunslinger',
  power_back: 'Power Back', speed_back: 'Speed Back',
  receiving_back: 'Receiving Back', all_purpose: 'All-Purpose',
  deep_threat: 'Deep Threat', possession: 'Possession',
  slot: 'Slot', red_zone: 'Red Zone Target',
  blocking_te: 'Blocking TE', receiving_te: 'Receiving TE', hybrid_te: 'Hybrid',
  pass_protector: 'Pass Protector', road_grader: 'Road Grader', technician: 'Technician',
  power_rusher: 'Power Rusher', speed_rusher: 'Speed Rusher', run_stuffer: 'Run Stuffer',
  coverage_lb: 'Coverage LB', pass_rush_lb: 'Pass Rush LB', thumper: 'Thumper',
  lockdown: 'Lockdown', ball_hawk: 'Ball Hawk', physical_cb: 'Physical',
  free_safety: 'Free Safety', strong_safety: 'Strong Safety', hybrid_s: 'Hybrid',
};

// ── Archetype Progression Multipliers ─────────────────

export function getArchetypeProgressionMultipliers(player: Player): ArchetypeProgressionMultipliers {
  const archetypeId = player.archetype?.archetype;
  if (!archetypeId) {
    return { multipliers: {}, keyRatings: [] };
  }

  const keys = ARCHETYPE_KEYS[archetypeId];
  if (!keys) {
    return { multipliers: {}, keyRatings: [] };
  }

  const keySet = new Set(keys);
  const multipliers: Record<string, number> = {};

  for (const ratingName of Object.keys(player.ratings)) {
    if (keySet.has(ratingName)) {
      multipliers[ratingName] = KEY_BOOST;
    } else {
      multipliers[ratingName] = OFF_KEY_MULT;
    }
  }

  return { multipliers, keyRatings: keys };
}

// ── Archetype Alignment ───────────────────────────────

/** How aligned a player's rating profile is with their archetype (0-100) */
export function getArchetypeAlignment(player: Player): number {
  const archetypeId = player.archetype?.archetype;
  if (!archetypeId) return 50;

  const keys = ARCHETYPE_KEYS[archetypeId];
  if (!keys) return 50;

  const keyAvg = keys.reduce((sum, k) => sum + (player.ratings[k] ?? 50), 0) / keys.length;
  const allRatings = Object.values(player.ratings);
  const overallAvg = allRatings.length > 0
    ? allRatings.reduce((sum, v) => sum + v, 0) / allRatings.length
    : 50;

  // Alignment = how far above average the key ratings are
  const diff = keyAvg - overallAvg;
  return cl(Math.round(50 + diff * 3), 0, 100);
}

// ── Archetype Evolution ───────────────────────────────

/** Pre-prime age thresholds by position */
const PRE_PRIME_AGE: Record<Position, number> = {
  QB: 26, RB: 23, WR: 24, TE: 25, OL: 25,
  DL: 24, LB: 24, CB: 23, S: 24, K: 24, P: 24,
};

/** Check if a player's development has skewed toward a different archetype */
export function checkArchetypeEvolution(
  player: Player,
  rng: () => number,
): ArchetypeEvolution | null {
  const currentArchetype = player.archetype?.archetype;
  if (!currentArchetype) return null;

  // Only pre-prime players can evolve
  const maxAge = PRE_PRIME_AGE[player.pos] ?? 25;
  if (player.age >= maxAge) return null;

  // Find which archetype best fits current ratings
  const posArchetypes = getPositionArchetypes(player.pos);
  if (posArchetypes.length === 0) return null;

  let bestId = currentArchetype;
  let bestScore = -Infinity;

  for (const arch of posArchetypes) {
    const keys = ARCHETYPE_KEYS[arch];
    if (!keys) continue;
    const score = keys.reduce((sum, k) => sum + (player.ratings[k] ?? 50), 0);
    if (score > bestScore) {
      bestScore = score;
      bestId = arch;
    }
  }

  // If best-fit archetype differs from current, maybe evolve
  if (bestId === currentArchetype) return null;

  // 25% chance per season to evolve when ratings skew
  if (rng() > 0.25) return null;

  const prevLabel = ARCHETYPE_LABELS[currentArchetype] ?? currentArchetype;
  const newLabel = ARCHETYPE_LABELS[bestId] ?? bestId;

  return {
    previousArchetype: currentArchetype,
    previousLabel: prevLabel,
    newArchetype: bestId,
    newLabel: newLabel,
    narrative: `${player.name}'s development has shifted — evolving from ${prevLabel} to ${newLabel}.`,
  };
}

/** Apply an archetype evolution to a player */
export function applyArchetypeEvolution(player: Player, evolution: ArchetypeEvolution): void {
  player.archetype = {
    archetype: evolution.newArchetype,
    label: evolution.newLabel,
    description: ARCHETYPE_LABELS[evolution.newArchetype] ?? '',
  };
}

// ── Development Report ────────────────────────────────

export function getArchetypeDevelopmentReport(player: Player): ArchetypeDevelopmentReport {
  const archetypeId = player.archetype?.archetype ?? 'unknown';
  const archetypeLabel = player.archetype?.label ?? 'Unknown';
  const alignment = getArchetypeAlignment(player);

  const keys = ARCHETYPE_KEYS[archetypeId] ?? [];
  const keySet = new Set(keys);

  const keyRatings = keys.map((k) => player.ratings[k] ?? 50);
  const offKeyRatings = Object.entries(player.ratings)
    .filter(([k]) => !keySet.has(k))
    .map(([, v]) => v);

  const keyRatingAvg = keyRatings.length > 0
    ? Math.round(keyRatings.reduce((s, v) => s + v, 0) / keyRatings.length)
    : 50;
  const offKeyRatingAvg = offKeyRatings.length > 0
    ? Math.round(offKeyRatings.reduce((s, v) => s + v, 0) / offKeyRatings.length)
    : 50;

  // Evolution risk
  let evolutionRisk: 'none' | 'possible' | 'likely' = 'none';
  const maxAge = PRE_PRIME_AGE[player.pos] ?? 25;
  if (player.age < maxAge) {
    if (alignment < 35) evolutionRisk = 'likely';
    else if (alignment < 50) evolutionRisk = 'possible';
  }

  // Top growth ratings (from dev snapshots if available)
  const topGrowthRatings: { rating: string; delta: number }[] = [];

  return {
    archetypeId,
    archetypeLabel,
    alignment,
    topGrowthRatings,
    evolutionRisk,
    keyRatingAvg,
    offKeyRatingAvg,
  };
}

// ── Helpers ───────────────────────────────────────────

function getPositionArchetypes(pos: Position): string[] {
  const map: Partial<Record<Position, string[]>> = {
    QB: ['pocket_passer', 'dual_threat', 'game_manager', 'gunslinger'],
    RB: ['power_back', 'speed_back', 'receiving_back', 'all_purpose'],
    WR: ['deep_threat', 'possession', 'slot', 'red_zone'],
    TE: ['blocking_te', 'receiving_te', 'hybrid_te'],
    OL: ['pass_protector', 'road_grader', 'technician'],
    DL: ['power_rusher', 'speed_rusher', 'run_stuffer'],
    LB: ['coverage_lb', 'pass_rush_lb', 'thumper'],
    CB: ['lockdown', 'ball_hawk', 'physical_cb'],
    S: ['free_safety', 'strong_safety', 'hybrid_s'],
  };
  return map[pos] ?? [];
}
