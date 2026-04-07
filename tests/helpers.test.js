import { describe, expect, it } from 'vitest';

import { assign, avg, cl, mS, sum } from '../src/utils/helpers.js';

describe('helpers.js', () => {
  describe('assign', () => {
    it('merges source objects into target', () => {
      const result = assign({}, { a: 1 }, { b: 2, c: 3 });
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('returns and mutates the original target object', () => {
      const target = { x: 1 };
      const result = assign(target, { y: 2 });
      expect(result).toBe(target);
      expect(target).toEqual({ x: 1, y: 2 });
    });

    it('ignores null and undefined source objects', () => {
      const result = assign({ a: 1 }, null, undefined, { b: 2 });
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('uses the last value when keys conflict', () => {
      const result = assign({}, { v: 1 }, { v: 2 }, { v: 3 });
      expect(result.v).toBe(3);
    });

    it('copies only own enumerable properties', () => {
      const proto = { hidden: 'nope' };
      const source = Object.create(proto);
      source.visible = 'yes';

      const result = assign({}, source);
      expect(result).toEqual({ visible: 'yes' });
      expect(result.hidden).toBeUndefined();
    });
  });

  describe('mS', () => {
    it('merges style objects left-to-right', () => {
      const result = mS({ color: 'red', gap: 4 }, { gap: 8 }, { display: 'flex' });
      expect(result).toEqual({ color: 'red', gap: 8, display: 'flex' });
    });

    it('skips falsy arguments', () => {
      const result = mS({ a: 1 }, null, undefined, false, { b: 2 });
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('does not mutate source objects', () => {
      const base = { a: 1 };
      const extra = { b: 2 };
      const merged = mS(base, extra);

      expect(base).toEqual({ a: 1 });
      expect(extra).toEqual({ b: 2 });
      expect(merged).toEqual({ a: 1, b: 2 });
    });
  });

  describe('cl', () => {
    it('returns min when value is below range', () => {
      expect(cl(-10, 0, 100)).toBe(0);
    });

    it('returns max when value is above range', () => {
      expect(cl(150, 0, 100)).toBe(100);
    });

    it('returns value unchanged when already in range', () => {
      expect(cl(42, 0, 100)).toBe(42);
    });

    it('handles negative ranges', () => {
      expect(cl(-8, -5, 5)).toBe(-5);
      expect(cl(3, -5, 5)).toBe(3);
    });
  });

  describe('sum', () => {
    it('sums numeric arrays', () => {
      expect(sum([1, 2, 3, 4])).toBe(10);
    });

    it('supports mapper function', () => {
      const players = [{ ovr: 80 }, { ovr: 75 }, { ovr: 90 }];
      expect(sum(players, (p) => p.ovr)).toBe(245);
    });

    it('returns 0 for empty arrays', () => {
      expect(sum([])).toBe(0);
    });
  });

  describe('avg', () => {
    it('averages numeric arrays', () => {
      expect(avg([2, 4, 6, 8])).toBe(5);
    });

    it('supports mapper function', () => {
      const contracts = [{ capHit: 10 }, { capHit: 20 }, { capHit: 30 }];
      expect(avg(contracts, (c) => c.capHit)).toBe(20);
    });

    it('returns 0 for empty arrays', () => {
      expect(avg([])).toBe(0);
    });

    it('handles negative values correctly', () => {
      expect(avg([-2, -4, -6])).toBe(-4);
    });
  });
});
