/**
 * MFD Seeded RNG System
 *
 * Mulberry32 PRNG with isolated channels for deterministic simulation.
 * Channels: play, injury, draft, ai, dev, trade, ui, event
 *
 * Rule 7: No ambient global random calls — ALL randomness flows through this module.
 */

/** Channel identifiers for the RNG streams. */
export type RngChannel = 'play' | 'injury' | 'draft' | 'ai' | 'dev' | 'trade' | 'ui' | 'event';

/** A seeded PRNG function that returns a float in [0, 1). */
export type PrngFn = () => number;

/** The full set of RNG channel generators. */
export interface RngState {
  play: PrngFn;
  injury: PrngFn;
  draft: PrngFn;
  ai: PrngFn;
  dev: PrngFn;
  trade: PrngFn;
  ui: PrngFn;
  event: PrngFn;
}

/** Channel offset constants — each channel uses seed + offset. */
const CHANNEL_OFFSETS: Record<RngChannel, number> = {
  play: 0,
  injury: 1,
  draft: 2,
  ai: 3,
  dev: 4,
  trade: 5,
  ui: 6,
  event: 7,
} as const;

/**
 * Mulberry32 PRNG — fast, high-quality 32-bit generator.
 * Produces a function that returns floats in [0, 1) with full period.
 */
export function mulberry32(seed: number): PrngFn {
  let s = seed | 0;
  return (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t = (t + (Math.imul(t ^ (t >>> 7), t | 61) ^ t)) | 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Default seed — Date.now() only at league creation, never in sim chain. */
const DEFAULT_SEED = 12345;

let _globalSeed = DEFAULT_SEED;

/** The global RNG state with all 8 channels. */
export const RNG: RngState = createRngState(DEFAULT_SEED);

/** Build an isolated deterministic channel set without mutating global state. */
export function createRngState(seed: number): RngState {
  return {
    play: mulberry32(seed + CHANNEL_OFFSETS.play),
    injury: mulberry32(seed + CHANNEL_OFFSETS.injury),
    draft: mulberry32(seed + CHANNEL_OFFSETS.draft),
    ai: mulberry32(seed + CHANNEL_OFFSETS.ai),
    dev: mulberry32(seed + CHANNEL_OFFSETS.dev),
    trade: mulberry32(seed + CHANNEL_OFFSETS.trade),
    ui: mulberry32(seed + CHANNEL_OFFSETS.ui),
    event: mulberry32(seed + CHANNEL_OFFSETS.event),
  };
}

/**
 * Build the exact channel state used at a franchise-week boundary without
 * mutating the legacy global convenience state.
 */
export function createWeekRngState(seed: number, year: number, week: number): RngState {
  const weekChain = (seed ^ (year * 1000) ^ week) >>> 0;
  const seasonChain = (seed ^ (year * 7919)) >>> 0;
  return {
    play: mulberry32(weekChain + CHANNEL_OFFSETS.play),
    injury: mulberry32(weekChain + CHANNEL_OFFSETS.injury),
    draft: mulberry32(seasonChain + CHANNEL_OFFSETS.draft),
    ai: mulberry32(weekChain + CHANNEL_OFFSETS.ai),
    dev: mulberry32(weekChain + CHANNEL_OFFSETS.dev),
    trade: mulberry32(weekChain + CHANNEL_OFFSETS.trade),
    ui: mulberry32(seed + CHANNEL_OFFSETS.ui),
    event: mulberry32(weekChain + CHANNEL_OFFSETS.event),
  };
}

/** Set the global seed and reinitialize all channels. */
export function setSeed(s: number): void {
  _globalSeed = s;
  const channels = Object.keys(CHANNEL_OFFSETS) as RngChannel[];
  for (const ch of channels) {
    RNG[ch] = mulberry32(s + CHANNEL_OFFSETS[ch]);
  }
}

/** Get the current global seed. */
export function getSeed(): number {
  return _globalSeed;
}

/** Reseed play-time channels for a new week (preserves draft channel). */
export function reseedWeek(yr: number, wk: number): void {
  const chain = (_globalSeed ^ (yr * 1000) ^ wk) >>> 0;
  RNG.play = mulberry32(chain);
  RNG.injury = mulberry32(chain + 1);
  RNG.ai = mulberry32(chain + 3);
  RNG.dev = mulberry32(chain + 4);
  RNG.trade = mulberry32(chain + 5);
  RNG.event = mulberry32(chain + 7);
}

/** Reseed draft channel for a new season. */
export function reseedSeason(yr: number): void {
  const chain = (_globalSeed ^ (yr * 7919)) >>> 0;
  RNG.draft = mulberry32(chain + 2);
}

// ── Convenience Wrappers ────────────────────────────────
// Random integer in [a, b] from each channel.

export function rng(a: number, b: number): number {
  return Math.floor(RNG.play() * (b - a + 1)) + a;
}

export function rngI(a: number, b: number): number {
  return Math.floor(RNG.injury() * (b - a + 1)) + a;
}

export function rngD(a: number, b: number): number {
  return Math.floor(RNG.draft() * (b - a + 1)) + a;
}

export function rngAI(a: number, b: number): number {
  return Math.floor(RNG.ai() * (b - a + 1)) + a;
}

export function rngT(a: number, b: number): number {
  return Math.floor(RNG.trade() * (b - a + 1)) + a;
}

export function rngDev(a: number, b: number): number {
  return Math.floor(RNG.dev() * (b - a + 1)) + a;
}

export function rngEvent(a: number, b: number): number {
  return Math.floor(RNG.event() * (b - a + 1)) + a;
}

/** Pick a random element from an array using the play channel. */
export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(RNG.play() * arr.length)]!;
}

/** Pick a random element from an array using the draft channel. */
export function pickD<T>(arr: readonly T[]): T {
  return arr[Math.floor(RNG.draft() * arr.length)]!;
}

/** Generate a deterministic unique ID via the UI channel. */
export function uid(): string {
  return RNG.ui().toString(36).slice(2, 8) + RNG.ui().toString(36).slice(2, 5);
}
