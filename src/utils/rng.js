/**
 * MFD Seeded RNG System
 *
 * Uses mulberry32 algorithm for deterministic random number generation.
 * Six separate channels ensure different game systems don't interfere
 * with each other's sequences.
 *
 * Channels: play, injury, draft, ai, dev, trade, ui
 */

export function mulberry32(seed) {
  var s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    var t = Math.imul(s ^ (s >>> 15), s | 1);
    t = (t + (Math.imul(t ^ (t >>> 7), t | 61) ^ t)) | 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// v52: Safe constant default — Date.now() only at league creation, never in sim chain
export var SEED_GLOBAL = 12345;

export var RNG = {
  play: mulberry32(SEED_GLOBAL),
  injury: mulberry32(SEED_GLOBAL + 1),
  draft: mulberry32(SEED_GLOBAL + 2),
  ai: mulberry32(SEED_GLOBAL + 3),
  dev: mulberry32(SEED_GLOBAL + 4),
  trade: mulberry32(SEED_GLOBAL + 5),
  ui: mulberry32(SEED_GLOBAL + 6),
};

export function setSeed(s) {
  SEED_GLOBAL = s;
  RNG.play = mulberry32(s);
  RNG.injury = mulberry32(s + 1);
  RNG.draft = mulberry32(s + 2);
  RNG.ai = mulberry32(s + 3);
  RNG.dev = mulberry32(s + 4);
  RNG.trade = mulberry32(s + 5);
  RNG.ui = mulberry32(s + 6);
}

export function reseedWeek(yr, wk) {
  var chain = (SEED_GLOBAL ^ (yr * 1000) ^ wk) >>> 0;
  RNG.play = mulberry32(chain);
  RNG.injury = mulberry32(chain + 1);
  RNG.ai = mulberry32(chain + 3);
  RNG.dev = mulberry32(chain + 4);
  RNG.trade = mulberry32(chain + 5);
}

export function reseedSeason(yr) {
  var chain = (SEED_GLOBAL ^ (yr * 7919)) >>> 0;
  RNG.draft = mulberry32(chain + 2);
}

// Convenience wrappers — random int in [a, b] from each channel
export function rng(a, b) {
  return Math.floor(RNG.play() * (b - a + 1)) + a;
}
export function rngI(a, b) {
  return Math.floor(RNG.injury() * (b - a + 1)) + a;
}
export function rngD(a, b) {
  return Math.floor(RNG.draft() * (b - a + 1)) + a;
}
export function rngAI(a, b) {
  return Math.floor(RNG.ai() * (b - a + 1)) + a;
}
export function rngT(a, b) {
  return Math.floor(RNG.trade() * (b - a + 1)) + a;
}
export function rngDev(a, b) {
  return Math.floor(RNG.dev() * (b - a + 1)) + a;
}

// Pick a random element from an array
export function pick(a) {
  return a[Math.floor(RNG.play() * a.length)];
}
export function pickD(a) {
  return a[Math.floor(RNG.draft() * a.length)];
}

// v42: Fully deterministic IDs via RNG.ui
export function U() {
  return RNG.ui().toString(36).slice(2, 8) + RNG.ui().toString(36).slice(2, 5);
}
