import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../rng';
import type { GameResult } from '../types';
import {
  evaluateCallYourShotResult,
  isCallYourShotEligible,
  getDeclarations,
  resolveCallYourShot,
} from './call-your-shot';
import { makeLeagueState } from './test-helpers';

const STALE_CALL_YOUR_SHOT_COPY = /\b(?:Declare that your ground game will dominate|Declare aerial supremacy|defensive masterpiece|boldest call|High risk, huge reward|no matter how|Make a bold prediction|bonus morale)\b/i;

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

    it('each declaration has label and concrete fan-confidence consequence', () => {
      for (const decl of getDeclarations()) {
        expect(decl.label.length).toBeGreaterThan(3);
        expect(decl.description.length).toBeGreaterThan(10);
        expect(decl.description).toContain('Promise');
        expect(decl.description).toContain('fan-confidence');
        expect(decl.description).toContain('recap records');
        expect(decl.description).not.toMatch(STALE_CALL_YOUR_SHOT_COPY);
      }
    });
  });

  describe('resolveCallYourShot', () => {
    it('marks a hit when the declared target is clearly exceeded', () => {
      const result = evaluateCallYourShotResult(seededRng(), 'run_dominant', makeResult(28, 14), 'team-a');

      expect(result.outcome).toBe('hit');
      expect(result.success).toBe(true);
      expect(result.magnitude).toBeGreaterThan(0.2);
      expect(result.reaction.outcome).toBe('hit');
      expect(result.fanConfidenceDelta).toBeGreaterThanOrEqual(2);
    });

    it('marks a miss when the declared target falls well short', () => {
      const lowRush = makeResult(14, 21);
      (lowRush.stats['team-a'] as any).rushingYards = 44;

      const result = evaluateCallYourShotResult(seededRng(), 'run_dominant', lowRush, 'team-a');

      expect(result.outcome).toBe('miss');
      expect(result.success).toBe(false);
      expect(result.magnitude).toBeGreaterThan(0.5);
      expect(result.reaction.outcome).toBe('miss');
      expect(result.fanConfidenceDelta).toBeLessThanOrEqual(-3);
    });

    it('marks a partial when the team lands close enough to the promise', () => {
      const nearHit = makeResult(24, 17);
      (nearHit.stats['team-a'] as any).rushingYards = 110;

      const result = evaluateCallYourShotResult(seededRng(), 'run_dominant', nearHit, 'team-a');

      expect(result.outcome).toBe('partial');
      expect(result.success).toBe(false);
      expect(result.magnitude).toBeGreaterThan(0.8);
      expect(Math.abs(result.fanConfidenceDelta)).toBeLessThanOrEqual(1);
    });

    it('does nothing when there is no active prediction on the game state', () => {
      const game = makeLeagueState('regular_season', 1);
      const baselineConfidence = game.teams.afce1!.fanConfidence;

      const result = resolveCallYourShot(game, makeResult(21, 17, {
        homeTeamId: 'afce1',
        awayTeamId: 'afce2',
      }));

      expect(result).toBeUndefined();
      expect(game.teams.afce1!.fanConfidence).toBe(baselineConfidence);
    });

    it('selects the same reaction variant for the same seed and result', () => {
      const result = makeResult(31, 24);

      const first = evaluateCallYourShotResult(seededRng(9), 'air_attack', result, 'team-a');
      const second = evaluateCallYourShotResult(seededRng(9), 'air_attack', result, 'team-a');

      expect(first.reaction.id).toBe(second.reaction.id);
    });

    it('applies the fan confidence swing to the user team when the shot resolves', () => {
      const game = makeLeagueState('regular_season', 1);
      game.activeCallYourShot = 'underdog_special';
      game.teams.afce1!.fanConfidence = 50;

      const result = resolveCallYourShot(game, makeResult(24, 21, {
        homeTeamId: 'afce1',
        awayTeamId: 'afce2',
      }), seededRng(3));

      expect(result).toBeDefined();
      expect(game.teams.afce1!.fanConfidence).toBe(50 + (result?.fanConfidenceDelta ?? 0));
    });
  });
});
