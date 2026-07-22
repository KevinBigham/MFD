import { buildCartridge, parseCartridge } from './dynasty-cartridge';
import { SAVE_VERSION } from '../config/difficulty';
import { migrate } from '../save/migrations';
import { SaveStateSchema } from '../save/schema';
import type { GameState } from '../types';

export interface StatePerformanceMeasurement {
  stateBytes: number;
  largestRegions: Array<{ key: string; bytes: number }>;
  cloneMedianMs: number;
  autosaveEncodeMedianMs: number;
  cartridgeLoadMedianMs: number;
  loadTargetPassed: boolean;
  iterations: number;
  workerRecommended: boolean;
}

export interface StatePerformanceOptions {
  iterations?: number;
  /** Host-owned monotonic clock. The pure engine never reads wall time. */
  now: () => number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : sorted[middle] ?? 0;
}

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length) {
      bytes += 4;
      index += 1;
    } else bytes += 3;
  }
  return bytes;
}

function measureLargestRegions(game: GameState): Array<{ key: string; bytes: number }> {
  return Object.entries(game)
    .map(([key, value]) => ({ key, bytes: utf8ByteLength(JSON.stringify(value) ?? 'null') }))
    .sort((left, right) => right.bytes - left.bytes || left.key.localeCompare(right.key))
    .slice(0, 8);
}

/** Measures the two observed hot operations before any worker/normalization
 * decision. The caller owns persistence I/O; this measures the exact payload
 * construction used before IndexedDB writes. */
export function measureStatePerformance(
  game: GameState,
  options: StatePerformanceOptions,
): StatePerformanceMeasurement {
  const iterations = Math.max(1, Math.min(50, Math.round(options.iterations ?? 5)));
  const now = options.now;
  const cloneDurations: number[] = [];
  const encodeDurations: number[] = [];
  const loadDurations: number[] = [];
  let stateBytes = 0;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let startedAt = now();
    structuredClone(game);
    cloneDurations.push(Math.max(0, now() - startedAt));

    startedAt = now();
    const cartridge = buildCartridge(game, { teamName: 'Performance Probe', season: game.year, week: game.week });
    encodeDurations.push(Math.max(0, now() - startedAt));
    if (!cartridge.ok) throw new Error(cartridge.error);
    stateBytes = utf8ByteLength(cartridge.json);

    startedAt = now();
    const parsed = parseCartridge(cartridge.json);
    if (!parsed.ok) throw new Error(parsed.error);
    const migrated = migrate(parsed.save as Record<string, unknown>, SAVE_VERSION);
    const validated = SaveStateSchema.safeParse(migrated);
    if (!validated.success) throw new Error(`Performance probe save failed validation: ${validated.error.message}`);
    loadDurations.push(Math.max(0, now() - startedAt));
  }
  const cloneMedianMs = median(cloneDurations);
  const autosaveEncodeMedianMs = median(encodeDurations);
  const cartridgeLoadMedianMs = median(loadDurations);
  return {
    stateBytes,
    largestRegions: measureLargestRegions(game),
    cloneMedianMs,
    autosaveEncodeMedianMs,
    cartridgeLoadMedianMs,
    loadTargetPassed: cartridgeLoadMedianMs < 3_000,
    iterations,
    workerRecommended: cloneMedianMs + autosaveEncodeMedianMs > 250,
  };
}
