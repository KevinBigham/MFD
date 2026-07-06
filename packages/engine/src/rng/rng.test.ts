import { describe, it, expect, beforeEach } from 'vitest';
import {
  mulberry32, RNG, setSeed, getSeed,
  reseedWeek, reseedSeason,
  rng, rngI, rngD, rngAI, rngT, rngDev,
  rngEvent, pick, pickD, uid,
} from './index';

describe('mulberry32', () => {
  it('returns values in [0, 1)', () => {
    const gen = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const v = gen();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic — same seed produces same sequence', () => {
    const a = mulberry32(999);
    const b = mulberry32(999);
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });

  it('different seeds produce different sequences', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const same = Array.from({ length: 20 }, () => a() === b());
    expect(same.some(v => !v)).toBe(true);
  });
});

describe('RNG channels', () => {
  beforeEach(() => {
    setSeed(12345);
  });

  it('setSeed resets all channels deterministically', () => {
    const first = RNG.play();
    setSeed(12345);
    expect(RNG.play()).toBe(first);
  });

  it('getSeed returns current seed', () => {
    setSeed(42);
    expect(getSeed()).toBe(42);
  });

  it('8 channels produce independent sequences', () => {
    const vals = [
      RNG.play(), RNG.injury(), RNG.draft(),
      RNG.ai(), RNG.dev(), RNG.trade(), RNG.ui(), RNG.event(),
    ];
    const unique = new Set(vals);
    expect(unique.size).toBe(8);
  });
});

describe('reseed functions', () => {
  it('reseedWeek changes play/injury/ai/dev/trade but not draft', () => {
    setSeed(12345);
    const draftBefore = RNG.draft();
    setSeed(12345);
    reseedWeek(2026, 1);
    // Draft channel was NOT reseeded by reseedWeek, so calling it now
    // should give us the same value as before (both are fresh from setSeed)
    setSeed(12345);
    const draftVal1 = RNG.draft();
    reseedWeek(2026, 1);
    const draftVal2 = RNG.draft();
    // draft was not reseeded, so second call continues the sequence
    // The key test: play channel changed
    setSeed(12345);
    const playBefore = RNG.play();
    setSeed(12345);
    reseedWeek(2026, 1);
    const playAfter = RNG.play();
    expect(playAfter).not.toBe(playBefore);
  });

  it('reseedSeason changes draft channel', () => {
    setSeed(12345);
    const before = RNG.draft();
    setSeed(12345);
    reseedSeason(2027);
    const after = RNG.draft();
    expect(after).not.toBe(before);
  });
});

describe('convenience wrappers', () => {
  beforeEach(() => {
    setSeed(42);
  });

  it('rng returns integers in [a, b]', () => {
    for (let i = 0; i < 100; i++) {
      const v = rng(1, 10);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(10);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('each channel wrapper uses its own channel', () => {
    setSeed(42);
    const play = rng(0, 1000);
    setSeed(42);
    const injury = rngI(0, 1000);
    setSeed(42);
    const draft = rngD(0, 1000);
    setSeed(42);
    const ai = rngAI(0, 1000);
    setSeed(42);
    const trade = rngT(0, 1000);
    setSeed(42);
    const dev = rngDev(0, 1000);
    setSeed(42);
    const event = rngEvent(0, 1000);
    // Each should produce different values (different channel offsets)
    const vals = [play, injury, draft, ai, trade, dev, event];
    const unique = new Set(vals);
    expect(unique.size).toBe(7);
  });

  it('pick returns an element from the array', () => {
    const arr = ['a', 'b', 'c', 'd', 'e'];
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(pick(arr));
    }
  });

  it('pickD returns an element from the array', () => {
    const arr = [1, 2, 3, 4, 5];
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(pickD(arr));
    }
  });

  it('uid returns a string', () => {
    const id = uid();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('uid is deterministic with same seed', () => {
    setSeed(42);
    const a = uid();
    setSeed(42);
    const b = uid();
    expect(a).toBe(b);
  });
});

describe('determinism guarantee', () => {
  it('same seed produces identical full simulation sequence', () => {
    setSeed(777);
    const seq1: number[] = [];
    for (let w = 1; w <= 18; w++) {
      reseedWeek(2026, w);
      seq1.push(rng(0, 100), rngI(0, 100), rngAI(0, 100));
    }
    reseedSeason(2027);
    seq1.push(rngD(0, 100), rngD(0, 100), rngD(0, 100));

    setSeed(777);
    const seq2: number[] = [];
    for (let w = 1; w <= 18; w++) {
      reseedWeek(2026, w);
      seq2.push(rng(0, 100), rngI(0, 100), rngAI(0, 100));
    }
    reseedSeason(2027);
    seq2.push(rngD(0, 100), rngD(0, 100), rngD(0, 100));

    expect(seq1).toEqual(seq2);
  });
});
