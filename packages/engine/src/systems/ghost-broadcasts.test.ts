import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../rng';
import {
  determineCommentaryStyle,
  generateGhostLine,
  shouldIncludeGhostBroadcast,
} from './ghost-broadcasts';
import type { GhostCommentator } from './ghost-broadcasts';

function seededRng(seed = 42) {
  return mulberry32(seed);
}

function makeCommentator(style: GhostCommentator['style'] = 'analyst'): GhostCommentator {
  return {
    id: 'ghost-1',
    name: 'John Legend',
    position: 'QB',
    peakOvr: 92,
    retiredYear: 2030,
    style,
  };
}

describe('Ghost Broadcasts', () => {
  describe('determineCommentaryStyle', () => {
    it('film_junkie gets analyst style', () => {
      expect(determineCommentaryStyle(['film_junkie'])).toBe('analyst');
    });

    it('showtime gets hype style', () => {
      expect(determineCommentaryStyle(['showtime'])).toBe('hype');
    });

    it('loyal gets storyteller style', () => {
      expect(determineCommentaryStyle(['loyal'])).toBe('storyteller');
    });

    it('defaults to technical', () => {
      expect(determineCommentaryStyle(['clutch'])).toBe('technical');
    });
  });

  describe('generateGhostLine', () => {
    it('generates commentary for touchdown', () => {
      const line = generateGhostLine(seededRng(), makeCommentator(), 'touchdown');
      expect(line.commentatorName).toBe('John Legend');
      expect(line.commentary).toContain('John Legend');
      expect(line.trigger).toBe('touchdown');
    });

    it('generates commentary for turnover', () => {
      const line = generateGhostLine(seededRng(), makeCommentator('hype'), 'turnover');
      expect(line.commentary.length).toBeGreaterThan(20);
    });

    it('generates commentary for big_play', () => {
      const line = generateGhostLine(seededRng(), makeCommentator('storyteller'), 'big_play');
      expect(line.commentary).toContain('John Legend');
    });

    it('is deterministic with same seed', () => {
      const c = makeCommentator();
      const l1 = generateGhostLine(seededRng(99), c, 'touchdown');
      const l2 = generateGhostLine(seededRng(99), c, 'touchdown');
      expect(l1.commentary).toBe(l2.commentary);
    });
  });

  describe('shouldIncludeGhostBroadcast', () => {
    it('returns false before year 10', () => {
      expect(shouldIncludeGhostBroadcast(seededRng(), 5, true)).toBe(false);
    });

    it('returns false when no HOFers exist', () => {
      expect(shouldIncludeGhostBroadcast(seededRng(), 15, false)).toBe(false);
    });

    it('has ~15% chance after year 10 with HOFers', () => {
      let count = 0;
      for (let seed = 0; seed < 200; seed++) {
        if (shouldIncludeGhostBroadcast(seededRng(seed), 15, true)) count++;
      }
      // Should be roughly 15% = ~30 out of 200
      expect(count).toBeGreaterThan(10);
      expect(count).toBeLessThan(60);
    });
  });
});
