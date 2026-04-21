import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../rng';
import {
  buildHallOfFamerCommentator,
  determineCommentaryStyle,
  generateGhostLine,
  shouldIncludeGhostBroadcast,
  styleFromHallOfFamerProfile,
  triggerFromGameContext,
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

  describe('styleFromHallOfFamerProfile', () => {
    it('multi-time champion is a storyteller', () => {
      expect(
        styleFromHallOfFamerProfile({ championships: 2, mvps: 0, allPros: 0, careerYears: 8 }),
      ).toBe('storyteller');
    });

    it('MVP without rings is hype', () => {
      expect(
        styleFromHallOfFamerProfile({ championships: 0, mvps: 1, allPros: 1, careerYears: 9 }),
      ).toBe('hype');
    });

    it('long career or 5+ All-Pros is analyst', () => {
      expect(
        styleFromHallOfFamerProfile({ championships: 0, mvps: 0, allPros: 5, careerYears: 10 }),
      ).toBe('analyst');
      expect(
        styleFromHallOfFamerProfile({ championships: 0, mvps: 0, allPros: 2, careerYears: 14 }),
      ).toBe('analyst');
    });

    it('plain HOFer defaults to technical', () => {
      expect(
        styleFromHallOfFamerProfile({ championships: 0, mvps: 0, allPros: 2, careerYears: 9 }),
      ).toBe('technical');
    });

    it('rings outrank an MVP', () => {
      expect(
        styleFromHallOfFamerProfile({ championships: 3, mvps: 2, allPros: 6, careerYears: 14 }),
      ).toBe('storyteller');
    });
  });

  describe('triggerFromGameContext', () => {
    it('overtime returns game_end', () => {
      expect(
        triggerFromGameContext({ homeScore: 24, awayScore: 24, overtime: true, hasMvp: true }),
      ).toBe('game_end');
    });

    it('close game returns big_play', () => {
      expect(
        triggerFromGameContext({ homeScore: 21, awayScore: 20, overtime: false, hasMvp: false }),
      ).toBe('big_play');
    });

    it('blowout returns quarter_break', () => {
      expect(
        triggerFromGameContext({ homeScore: 45, awayScore: 10, overtime: false, hasMvp: true }),
      ).toBe('quarter_break');
    });

    it('mid-margin with mvp returns touchdown', () => {
      expect(
        triggerFromGameContext({ homeScore: 31, awayScore: 24, overtime: false, hasMvp: true }),
      ).toBe('touchdown');
    });

    it('mid-margin without mvp returns turnover', () => {
      expect(
        triggerFromGameContext({ homeScore: 27, awayScore: 17, overtime: false, hasMvp: false }),
      ).toBe('turnover');
    });
  });

  describe('buildHallOfFamerCommentator', () => {
    const baseHofer = {
      playerId: 'p-1',
      name: 'Jet Stream',
      position: 'QB' as const,
      peakOvr: 96,
      inductionYear: 2050,
      careerYears: 14,
      awards: { championships: 3, mvps: 2, allPros: 6, proBowls: 9 },
    };

    it('estimates retiredYear as inductionYear minus 5 (HOF eligibility gap)', () => {
      const c = buildHallOfFamerCommentator(baseHofer);
      expect(c.retiredYear).toBe(2045);
    });

    it('derives style from awards rather than picking randomly', () => {
      const c = buildHallOfFamerCommentator(baseHofer);
      expect(c.style).toBe('storyteller');
    });

    it('passes through identity fields', () => {
      const c = buildHallOfFamerCommentator(baseHofer);
      expect(c.id).toBe('p-1');
      expect(c.name).toBe('Jet Stream');
      expect(c.position).toBe('QB');
      expect(c.peakOvr).toBe(96);
    });
  });
});
