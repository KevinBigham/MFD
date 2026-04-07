import { describe, expect, it } from 'vitest';

import { LZW, RNG, assign, cl, pick, pickD, setSeed } from '../src/utils/index.js';

describe('utils index.js', () => {
  it('re-exports core utility modules and helpers', () => {
    expect(typeof setSeed).toBe('function');
    expect(typeof RNG.play).toBe('function');
    expect(typeof pick).toBe('function');
    expect(typeof pickD).toBe('function');
    expect(typeof assign).toBe('function');
    expect(typeof cl).toBe('function');
    expect(typeof LZW.compress).toBe('function');
  });

  it('re-exported helpers are callable', () => {
    setSeed(42);
    expect(typeof RNG.play()).toBe('number');
    expect(cl(150, 0, 99)).toBe(99);
    expect(assign({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
  });
});
