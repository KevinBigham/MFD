import { describe, it, expect } from 'vitest';
import type { GamePlan } from '../types';
import {
  CONTINGENCY_TRIGGERS,
  MAX_CONTINGENCIES,
  checkTrigger,
  applyContingencyAction,
  evaluateContingencies,
  createContingencyRule,
} from './contingency-plans';

function makePlan(): GamePlan {
  return {
    offensiveScheme: 'balanced',
    defensiveScheme: 'base',
    keyMatchup: null,
    gamePlanBonus: 0,
  };
}

describe('Contingency Plans', () => {
  it('has 6 trigger types defined', () => {
    expect(Object.keys(CONTINGENCY_TRIGGERS).length).toBe(6);
  });

  it('MAX_CONTINGENCIES is 6', () => {
    expect(MAX_CONTINGENCIES).toBe(6);
  });

  describe('checkTrigger', () => {
    it('trailing_14_at_half triggers in Q3 when down 14', () => {
      expect(checkTrigger('trailing_14_at_half', {
        scoreDiff: -14, quarter: 3, turnovers: 0, opponentTurnovers: 0,
        opponentScoredOnOpening: false, windSpeed: 5,
      })).toBe(true);
    });

    it('trailing_14_at_half does not trigger in Q1', () => {
      expect(checkTrigger('trailing_14_at_half', {
        scoreDiff: -14, quarter: 1, turnovers: 0, opponentTurnovers: 0,
        opponentScoredOnOpening: false, windSpeed: 5,
      })).toBe(false);
    });

    it('wind_over_15 triggers with high wind', () => {
      expect(checkTrigger('wind_over_15', {
        scoreDiff: 0, quarter: 1, turnovers: 0, opponentTurnovers: 0,
        opponentScoredOnOpening: false, windSpeed: 20,
      })).toBe(true);
    });

    it('turnover_deficit_2 triggers with 2+ more turnovers', () => {
      expect(checkTrigger('turnover_deficit_2', {
        scoreDiff: 0, quarter: 2, turnovers: 3, opponentTurnovers: 1,
        opponentScoredOnOpening: false, windSpeed: 5,
      })).toBe(true);
    });
  });

  describe('applyContingencyAction', () => {
    it('switches offense scheme', () => {
      const plan = applyContingencyAction(makePlan(), { type: 'switch_offense', scheme: 'pass_heavy' });
      expect(plan.offensiveScheme).toBe('pass_heavy');
      expect(plan.defensiveScheme).toBe('base');
    });

    it('go_aggressive switches both', () => {
      const plan = applyContingencyAction(makePlan(), { type: 'go_aggressive' });
      expect(plan.offensiveScheme).toBe('pass_heavy');
      expect(plan.defensiveScheme).toBe('blitz_heavy');
    });

    it('go_conservative switches both', () => {
      const plan = applyContingencyAction(makePlan(), { type: 'go_conservative' });
      expect(plan.offensiveScheme).toBe('run_heavy');
      expect(plan.defensiveScheme).toBe('coverage');
    });
  });

  describe('evaluateContingencies', () => {
    it('fires matching rule and returns updated plan', () => {
      const rule = createContingencyRule('trailing_14_at_half', { type: 'go_aggressive' });
      const { plan, firedRule } = evaluateContingencies(
        [rule],
        { scoreDiff: -21, quarter: 3, turnovers: 0, opponentTurnovers: 0, opponentScoredOnOpening: false, windSpeed: 5 },
        makePlan(),
      );
      expect(firedRule).toBeTruthy();
      expect(plan.offensiveScheme).toBe('pass_heavy');
    });

    it('returns original plan when no rules match', () => {
      const rule = createContingencyRule('trailing_14_at_half', { type: 'go_aggressive' });
      const { plan, firedRule } = evaluateContingencies(
        [rule],
        { scoreDiff: 7, quarter: 1, turnovers: 0, opponentTurnovers: 0, opponentScoredOnOpening: false, windSpeed: 5 },
        makePlan(),
      );
      expect(firedRule).toBeNull();
      expect(plan.offensiveScheme).toBe('balanced');
    });
  });

  describe('createContingencyRule', () => {
    it('creates a rule with auto-generated label', () => {
      const rule = createContingencyRule('wind_over_15', { type: 'switch_offense', scheme: 'run_heavy' });
      expect(rule.trigger).toBe('wind_over_15');
      expect(rule.label).toContain('High wind');
      expect(rule.label).toContain('run_heavy');
      expect(rule.id).toContain('contingency');
    });
  });
});
