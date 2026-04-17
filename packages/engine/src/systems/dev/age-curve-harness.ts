/**
 * Sprint 48 "The Reunion" — Age-curve telemetry harness.
 *
 * Pure, offline Monte-Carlo simulator that walks `N` careers per position
 * through the engine's actual aging math (`getAgeCurve` + the same
 * `getBaseAgeDelta` shape used by `progression.ts`) and emits a report
 * quantifying how age curves land in practice.
 *
 * Purpose: quantitative evidence that age curves match design intent:
 *   - QB peaks 28-32, RB 24-27, OL 27-31, etc.
 *
 * This module NEVER touches the global RNG state. Every random draw
 * goes through a local `mulberry32` instance seeded from `(runSeed,
 * positionIndex, careerIndex)`. Re-running with the same seed produces
 * byte-identical output.
 *
 * Telemetry only — no gameplay change. Consumed by
 * `scripts/age-curve-report.ts`, which writes the result to
 * `.codex/MFD/age-curve-report.json` for design review.
 */

import type { Position } from '../../types';
import { mulberry32 } from '../../rng';
import { AGE_CURVES, getAgeCurve } from '../player-archetypes';

// ── Types ───────────────────────────────────────────────

export interface CareerSample {
  position: Position;
  archetypeId: string | null;
  entryAge: number;
  entryOvr: number;
  peakAge: number;
  peakOvr: number;
  retireAge: number;
  declineSlope: number; // average OVR lost per year between peak and retire
  primeYears: number;   // count of in-prime years the player spent on a roster
}

export interface PositionStats {
  n: number;
  peakAgeMedian: number;
  peakAgeP10: number;
  peakAgeP90: number;
  peakOvrMedian: number;
  retireAgeMedian: number;
  declineSlopeMedian: number;
  primeYearsMedian: number;
  /** The base `AGE_CURVES[pos]` prime window, for reference in the report. */
  designPrimeWindow: [number, number];
  designCliff: number;
}

export interface AgeCurveReport {
  generatedAt: string; // ISO, display-only (not fed back to sim)
  runSeed: number;
  careersPerPosition: number;
  positions: Record<Position, PositionStats>;
}

export interface AgeCurveHarnessOptions {
  /** Careers simulated per position. Default 1000. */
  careersPerPosition?: number;
  /** Master seed for the run. Default 42. */
  seed?: number;
  /** Subset of positions to simulate. Default: every entry in AGE_CURVES. */
  positions?: readonly Position[];
}

// ── Constants ───────────────────────────────────────────

/**
 * Canonical position → archetype list for the harness. Mirrors the
 * archetype rosters in `player-archetypes.ts` without re-importing the
 * private definitions. Archetypes drive cliff/decay shifts via
 * `getAgeCurve`, so surveying across them reveals the true behavioral
 * envelope of the curve system.
 */
const ARCHETYPES_BY_POSITION: Record<Position, readonly (string | null)[]> = {
  QB: ['pocket_passer', 'dual_threat', 'game_manager', 'gunslinger'],
  RB: ['power_back', 'speed_back', 'receiving_back', 'all_purpose'],
  WR: ['deep_threat', 'possession', 'slot', 'red_zone'],
  TE: ['blocking_te', 'receiving_te', 'hybrid_te'],
  OL: ['pass_protector', 'road_grader', 'technician'],
  DL: ['power_rusher', 'speed_rusher', 'run_stuffer'],
  LB: ['coverage_lb', 'pass_rush_lb', 'thumper'],
  CB: ['lockdown', 'ball_hawk', 'physical_cb'],
  S:  ['free_safety', 'strong_safety', 'hybrid_s'],
  K:  [null],
  P:  [null],
};

/** Rookie-entry age range — matches draft pipeline defaults. */
const ROOKIE_ENTRY_AGE_MIN = 21;
const ROOKIE_ENTRY_AGE_MAX = 23;

/** Rookie OVR ceiling band (1st-round average ~74, deep UDFA ~52). */
const ROOKIE_OVR_MIN = 55;
const ROOKIE_OVR_MAX = 78;

/** Per-position retirement floor — mirrors `progression.ts` RETIREMENT_THRESHOLD. */
const RETIREMENT_THRESHOLD: Record<Position, number> = {
  QB: 55,
  RB: 58,
  WR: 56,
  TE: 55,
  OL: 54,
  DL: 56,
  LB: 57,
  CB: 58,
  S:  56,
  K:  50,
  P:  50,
};

/** Hard age ceiling — matches progression forced-retirement bands. */
const MAX_CAREER_AGE = 42;

/** Dev-trait multiplier pool; sampled uniformly per career. */
const DEV_TRAIT_MULTIPLIERS: readonly number[] = [1.0, 1.0, 1.1, 1.2, 1.4];

// ── Local helpers ───────────────────────────────────────

/**
 * Replica of `progression.ts#getBaseAgeDelta`. We duplicate (rather than
 * export) to avoid coupling the private helper to an outside caller and
 * to guarantee harness stability across future progression tweaks.
 * If the production curve formula changes, mirror the change here AND
 * regenerate the report — drift between the two is itself a signal.
 */
function getBaseAgeDelta(age: number, curve: ReturnType<typeof getAgeCurve>): number {
  const upcomingAge = age + 1;
  if (upcomingAge < curve.prime[0]) {
    return 1.2 + (curve.prime[0] - upcomingAge) * 0.35;
  }
  if (upcomingAge <= curve.prime[1]) {
    return 0.75;
  }
  if (upcomingAge <= curve.cliff) {
    return -(upcomingAge - curve.prime[1]) * curve.decayRate * 0.12;
  }
  return -1 - (upcomingAge - curve.cliff) * curve.decayRate * 0.22;
}

function sampleUniformInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function sampleArchetype(rng: () => number, position: Position): string | null {
  const pool = ARCHETYPES_BY_POSITION[position];
  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)] ?? null;
}

function median(sortedAsc: readonly number[]): number {
  if (sortedAsc.length === 0) return 0;
  const mid = sortedAsc.length >> 1;
  return sortedAsc.length % 2
    ? sortedAsc[mid]!
    : (sortedAsc[mid - 1]! + sortedAsc[mid]!) / 2;
}

function percentile(sortedAsc: readonly number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.max(0, Math.floor((p / 100) * sortedAsc.length)),
  );
  return sortedAsc[idx]!;
}

// ── Public API ──────────────────────────────────────────

/**
 * Simulate a single career from rookie entry through retirement. Uses
 * the engine's `getAgeCurve` to match the production aging envelope,
 * and a locally-seeded `mulberry32` instance so the simulation remains
 * pure and deterministic for a given seed.
 */
export function simulateCareer(
  position: Position,
  archetypeId: string | null,
  seed: number,
): CareerSample {
  const rng = mulberry32(seed);

  const entryAge = sampleUniformInt(rng, ROOKIE_ENTRY_AGE_MIN, ROOKIE_ENTRY_AGE_MAX);
  const entryOvr = sampleUniformInt(rng, ROOKIE_OVR_MIN, ROOKIE_OVR_MAX);
  const devMult = DEV_TRAIT_MULTIPLIERS[Math.floor(rng() * DEV_TRAIT_MULTIPLIERS.length)] ?? 1;

  const curve = getAgeCurve(position, archetypeId);
  const retireThreshold = RETIREMENT_THRESHOLD[position];

  let age = entryAge;
  let ovr = entryOvr;
  let peakAge = entryAge;
  let peakOvr = entryOvr;
  let primeYears = 0;

  while (age < MAX_CAREER_AGE) {
    if (age >= curve.prime[0] && age <= curve.prime[1]) primeYears += 1;

    // Small dev-trait-biased noise on top of the base delta (match
    // production: progression.ts layers dev multipliers on both up and
    // down deltas, with compounding variance across a career).
    const base = getBaseAgeDelta(age, curve);
    const jitter = (rng() - 0.5) * 0.6;
    const delta = base >= 0 ? base * devMult + jitter : base * (2 - devMult) + jitter;

    ovr = Math.max(0, Math.min(99, ovr + delta));
    age += 1;

    if (ovr > peakOvr) {
      peakOvr = ovr;
      peakAge = age;
    }

    if (age >= curve.prime[1] && ovr < retireThreshold) break;
  }

  const retireAge = age;
  const declineYears = Math.max(1, retireAge - peakAge);
  const declineSlope = (peakOvr - ovr) / declineYears;

  return {
    position,
    archetypeId,
    entryAge,
    entryOvr,
    peakAge,
    peakOvr,
    retireAge,
    declineSlope: Math.round(declineSlope * 100) / 100,
    primeYears,
  };
}

/**
 * Run the full harness: N careers per position, archetype sampled per
 * career. Output is fully deterministic for a given `seed`.
 */
export function runAgeCurveHarness(
  options: AgeCurveHarnessOptions = {},
): AgeCurveReport {
  const careersPerPosition = options.careersPerPosition ?? 1000;
  const runSeed = options.seed ?? 42;
  const positions: readonly Position[] =
    options.positions ?? (Object.keys(AGE_CURVES) as Position[]);

  const positionStats: Partial<Record<Position, PositionStats>> = {};

  for (let pIdx = 0; pIdx < positions.length; pIdx += 1) {
    const position = positions[pIdx]!;
    const samples: CareerSample[] = [];

    for (let i = 0; i < careersPerPosition; i += 1) {
      // Seed composition: bake position index + career index into the
      // seed so each (run, position, career) triple is isolated.
      const careerSeed = (runSeed * 1000003 + pIdx * 100003 + i * 101) >>> 0;
      const archetypeRng = mulberry32(careerSeed ^ 0xA5A5A5A5);
      const archetypeId = sampleArchetype(archetypeRng, position);
      samples.push(simulateCareer(position, archetypeId, careerSeed));
    }

    const peakAges = samples.map((s) => s.peakAge).sort((a, b) => a - b);
    const peakOvrs = samples.map((s) => s.peakOvr).sort((a, b) => a - b);
    const retireAges = samples.map((s) => s.retireAge).sort((a, b) => a - b);
    const declineSlopes = samples.map((s) => s.declineSlope).sort((a, b) => a - b);
    const primeYearsArr = samples.map((s) => s.primeYears).sort((a, b) => a - b);

    const basePrime = AGE_CURVES[position].prime;
    const baseCliff = AGE_CURVES[position].cliff;

    positionStats[position] = {
      n: samples.length,
      peakAgeMedian: median(peakAges),
      peakAgeP10: percentile(peakAges, 10),
      peakAgeP90: percentile(peakAges, 90),
      peakOvrMedian: Math.round(median(peakOvrs) * 10) / 10,
      retireAgeMedian: median(retireAges),
      declineSlopeMedian: Math.round(median(declineSlopes) * 100) / 100,
      primeYearsMedian: median(primeYearsArr),
      designPrimeWindow: [basePrime[0], basePrime[1]],
      designCliff: baseCliff,
    };
  }

  return {
    // ISO timestamp is display-only metadata for the report artifact.
    // Never consumed back into the sim.
    generatedAt: new Date().toISOString(),
    runSeed,
    careersPerPosition,
    positions: positionStats as Record<Position, PositionStats>,
  };
}

/**
 * CSV dump helper. One row per (position, metric). Useful for pasting
 * into spreadsheets without pulling in a CSV lib.
 */
export function reportToCsv(report: AgeCurveReport): string {
  const header = [
    'position',
    'n',
    'peakAgeMedian',
    'peakAgeP10',
    'peakAgeP90',
    'peakOvrMedian',
    'retireAgeMedian',
    'declineSlopeMedian',
    'primeYearsMedian',
    'designPrimeLo',
    'designPrimeHi',
    'designCliff',
  ].join(',');

  const rows: string[] = [header];
  const entries = Object.entries(report.positions) as [Position, PositionStats][];
  for (const [pos, s] of entries) {
    rows.push([
      pos,
      s.n,
      s.peakAgeMedian,
      s.peakAgeP10,
      s.peakAgeP90,
      s.peakOvrMedian,
      s.retireAgeMedian,
      s.declineSlopeMedian,
      s.primeYearsMedian,
      s.designPrimeWindow[0],
      s.designPrimeWindow[1],
      s.designCliff,
    ].join(','));
  }
  return rows.join('\n');
}
