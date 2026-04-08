import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../rng';
import type { GameResult } from '../types';
import {
  isCallYourShotEligible,
  getDeclarations,
  resolveCallYourShot,
} from './call-your-shot';

function seededRng(seed = 42) {
  return mulberry32(seed);
}

function makeResult(homeScore: number, awayScore: number, overrides: Partial<GameResult> = {}): GameResult {
  return {
    id: 'game-1',
    homeTeamId: 'team-a',
    awayTeamId: 'team-b',
    homeScore,
    awayScore,
    week: 5,
    year: 2026,
    overtime: false,
    mvpPlayerId: null,
    stats: {
      'team-a': { passingYards: 280, rushingYards: 140, points: homeScore } as any,
      'team-b': { passingYards: 200, rushingYards: 80, points: awayScore } as any,
    },
    playerMatchupEvents: [],
    ...overrides,
  } as GameResult;
}

describe('Call Your Shot', () => {
  describe('isCallYourShotEligible', () => {
    it('eligible in playoffs', () => {
      const result = isCallYourShotEligible(false, false, true, 1);
      expect(result.eligible).toBe(true);
    });

    it('eligible on rivalry week', () => {
      const result = isCallYourShotEligible(true, false, false, 8);
      expect(result.eligible).toBe(true);
    });

    it('eligible for division clinch', () => {
      const result = isCallYourShotEligible(false, true, false, 14);
      expect(result.eligible).toBe(true);
    });

    it('eligible in late season (week 15+)', () => {
      const result = isCallYourShotEligible(false, false, false, 16);
      expect(result.eligible).toBe(true);
    });

    it('not eligible in normal early-season week', () => {
      const result = isCallYourShotEligible(false, false, false, 4);
      expect(result.eligible).toBe(false);
    });
  });

  describe('getDeclarations', () => {
    it('returns 5 declarations', () => {
      expect(getDeclarations().length).toBe(5);
    });

    it('each declaration has label and description', () => {
      for (const decl of getDeclarations()) {
        expect(decl.label.length).toBeGreaterThan(3);
        expect(decl.description.length).toBeGreaterThan(10);
      }
    });
  });

  describe('resolveCallYourShot', () => {
    it('run_dominant succeeds with 120+ rush yards', () => {
      const result = resolveCallYourShot(seededRng(), 'run_dominant', makeResult(28, 14), 'team-a');
      expect(result.success).toBe(true);
      expect(result.moraleDelta).toBeGreaterThan(0);
      expect(result.chemistryDelta).toBeGreaterThan(0);
      expect(result.headline).toContain('BACKED IT UP');
    });

    it('run_dominant fails with low rush yards', () => {
      const lowRush = makeResult(14, 21);
      (lowRush.stats['team-a'] as any).rushingYards = 60;
      const result = resolveCallYourShot(seededRng(), 'run_dominant', lowRush, 'team-a');
      expect(result.success).toBe(false);
      expect(result.moraleDelta).toBeLessThan(0);
    });

    it('total_domination succeeds with 14+ point win', () => {
      const result = resolveCallYourShot(seededRng(), 'total_domination', makeResult(35, 10), 'team-a');
      expect(result.success).toBe(true);
    });

    it('total_domination fails in close game', () => {
      const result = resolveCallYourShot(seededRng(), 'total_domination', makeResult(21, 17), 'team-a');
      expect(result.success).toBe(false);
    });

    it('underdog_special succeeds with any win', () => {
      const result = resolveCallYourShot(seededRng(), 'underdog_special', makeResult(14, 13), 'team-a');
      expect(result.success).toBe(true);
    });

    it('success gives dev bonus > 1.0', () => {
      const result = resolveCallYourShot(seededRng(), 'underdog_special', makeResult(28, 7), 'team-a');
      expect(result.devBonusMultiplier).toBeGreaterThan(1.0);
    });

    it('failure gives dev penalty < 1.0', () => {
      const result = resolveCallYourShot(seededRng(), 'total_domination', makeResult(10, 21), 'team-a');
      expect(result.devBonusMultiplier).toBeLessThan(1.0);
    });
  });
});
