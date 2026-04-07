import { beforeEach, describe, expect, it } from 'vitest';

import {
  RNG,
  U,
  mulberry32,
  pick,
  pickD,
  reseedSeason,
  reseedWeek,
  rng,
  rngAI,
  rngD,
  rngDev,
  rngI,
  rngT,
  setSeed,
} from '../src/utils/rng.js';

describe('rng.js', () => {
  beforeEach(() => {
    setSeed(12345);
  });

  it('mulberry32 outputs values in [0, 1)', () => {
    const r = mulberry32(42);

    for (let i = 0; i < 10000; i += 1) {
      const value = r();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('mulberry32 is deterministic for the same seed', () => {
    const r1 = mulberry32(999);
    const r2 = mulberry32(999);

    for (let i = 0; i < 250; i += 1) {
      expect(r1()).toBe(r2());
    }
  });

  it('mulberry32 average is near 0.5 over many samples', () => {
    const r = mulberry32(2026);
    let sum = 0;

    for (let i = 0; i < 10000; i += 1) {
      sum += r();
    }

    const mean = sum / 10000;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });

  it('different seeds produce different sequences', () => {
    const r1 = mulberry32(1);
    const r2 = mulberry32(2);
    let equalCount = 0;

    for (let i = 0; i < 50; i += 1) {
      if (r1() === r2()) equalCount += 1;
    }

    expect(equalCount).toBeLessThan(2);
  });

  it('setSeed resets all channels deterministically', () => {
    setSeed(777);
    const seq1 = [
      RNG.play(),
      RNG.injury(),
      RNG.draft(),
      RNG.ai(),
      RNG.dev(),
      RNG.trade(),
      RNG.ui(),
    ];

    setSeed(777);
    const seq2 = [
      RNG.play(),
      RNG.injury(),
      RNG.draft(),
      RNG.ai(),
      RNG.dev(),
      RNG.trade(),
      RNG.ui(),
    ];

    expect(seq2).toEqual(seq1);
  });

  it('RNG channels are isolated from each other', () => {
    setSeed(31415);
    const draftOnly = [RNG.draft(), RNG.draft(), RNG.draft(), RNG.draft()];

    setSeed(31415);
    RNG.play();
    RNG.play();
    RNG.play();
    const draftAfterPlayCalls = [RNG.draft(), RNG.draft(), RNG.draft(), RNG.draft()];

    expect(draftAfterPlayCalls).toEqual(draftOnly);
  });

  it('reseedWeek is deterministic for all week channels', () => {
    setSeed(2024);
    reseedWeek(2029, 7);
    const seq1 = [RNG.play(), RNG.injury(), RNG.ai(), RNG.dev(), RNG.trade()];

    setSeed(2024);
    reseedWeek(2029, 7);
    const seq2 = [RNG.play(), RNG.injury(), RNG.ai(), RNG.dev(), RNG.trade()];

    expect(seq2).toEqual(seq1);
  });

  it('different reseedWeek inputs produce different sequences', () => {
    setSeed(2024);
    reseedWeek(2029, 7);
    const week7 = RNG.play();

    setSeed(2024);
    reseedWeek(2029, 8);
    const week8 = RNG.play();

    expect(week8).not.toBe(week7);
  });

  it('reseedSeason is deterministic for draft channel', () => {
    setSeed(88);
    reseedSeason(2031);
    const seq1 = [RNG.draft(), RNG.draft(), RNG.draft()];

    setSeed(88);
    reseedSeason(2031);
    const seq2 = [RNG.draft(), RNG.draft(), RNG.draft()];

    expect(seq2).toEqual(seq1);
  });

  it('reseedSeason does not modify play channel sequence', () => {
    setSeed(88);
    const playBefore = RNG.play();
    reseedSeason(2031);
    const playAfter = RNG.play();

    setSeed(88);
    const control1 = RNG.play();
    const control2 = RNG.play();

    expect(playBefore).toBe(control1);
    expect(playAfter).toBe(control2);
  });

  const wrappers = [
    ['rng', rng],
    ['rngI', rngI],
    ['rngD', rngD],
    ['rngAI', rngAI],
    ['rngT', rngT],
    ['rngDev', rngDev],
  ];

  const ranges = [
    [1, 1],
    [0, 3],
    [-2, 2],
    [5, 9],
    [100, 110],
  ];

  wrappers.forEach(([name, fn]) => {
    describe(name, () => {
      ranges.forEach(([a, b]) => {
        it(`returns values in [${a}, ${b}]`, () => {
          for (let i = 0; i < 250; i += 1) {
            const value = fn(a, b);
            expect(value).toBeGreaterThanOrEqual(a);
            expect(value).toBeLessThanOrEqual(b);
          }
        });
      });
    });
  });

  it('pick returns only elements from the source array', () => {
    const arr = ['QB', 'RB', 'WR', 'TE'];
    for (let i = 0; i < 200; i += 1) {
      expect(arr).toContain(pick(arr));
    }
  });

  it('pickD returns only elements from the source array', () => {
    const arr = ['DL', 'LB', 'CB', 'S'];
    for (let i = 0; i < 200; i += 1) {
      expect(arr).toContain(pickD(arr));
    }
  });

  it('pick is deterministic after setSeed', () => {
    const arr = ['a', 'b', 'c', 'd'];
    setSeed(123);
    const seq1 = [pick(arr), pick(arr), pick(arr), pick(arr), pick(arr)];

    setSeed(123);
    const seq2 = [pick(arr), pick(arr), pick(arr), pick(arr), pick(arr)];

    expect(seq2).toEqual(seq1);
  });

  it('U generates 1000 unique IDs after reseed', () => {
    setSeed(404);
    const seen = new Set();

    for (let i = 0; i < 1000; i += 1) {
      const id = U();
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }

    expect(seen.size).toBe(1000);
  });

  it('U is deterministic for a fixed seed', () => {
    setSeed(555);
    const seq1 = [U(), U(), U(), U()];

    setSeed(555);
    const seq2 = [U(), U(), U(), U()];

    expect(seq2).toEqual(seq1);
  });
});
