import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import type { GamePlan } from '../types';
import {
  CONTINGENCY_TRIGGERS,
  MAX_CONTINGENCIES,
  applyContingency,
  createContingencyRule,
  evaluateContingencies,
  getContingencyCallout,
  limitContingencyRules,
  shouldFireContingency,
} from './contingency-plans';

function makePlan(): GamePlan {
  return {
    offensiveScheme: 'balanced',
    defensiveScheme: 'base',
    keyMatchup: null,
    gamePlanBonus: 0,
    contingencyRules: [],
  };
}

describe('Contingency Plans', () => {
  it('exposes the five authored trigger types for the builder', () => {
    expect(Object.keys(CONTINGENCY_TRIGGERS)).toEqual([
      'down_by',
      'up_by',
      'end_of_q2_losing',
      'two_minute_warning_one_score',
      'opponent_td_lead_after_halftime',
    ]);
  });

  it('fires contingency when down by 14+ in Q3', () => {
    const rule = createContingencyRule('down_by', 'go_air_raid', { threshold: 14 });

    expect(shouldFireContingency(rule, {
      scoreDiff: -17,
      quarter: 3,
      turnovers: 0,
      opponentTurnovers: 0,
      opponentScoredOnOpening: false,
      windSpeed: 5,
    })).toBe(true);
  });

  it('fires contingency when up by 21+ after the break', () => {
    const rule = createContingencyRule('up_by', 'kill_clock', { threshold: 21 });

    expect(shouldFireContingency(rule, {
      scoreDiff: 24,
      quarter: 3,
      turnovers: 0,
      opponentTurnovers: 1,
      opponentScoredOnOpening: false,
      windSpeed: 5,
    })).toBe(true);
  });

  it('fires contingency at halftime when losing', () => {
    const rule = createContingencyRule('end_of_q2_losing', 'go_air_raid');

    expect(shouldFireContingency(rule, {
      scoreDiff: -3,
      quarter: 3,
      turnovers: 1,
      opponentTurnovers: 0,
      opponentScoredOnOpening: false,
      windSpeed: 5,
    })).toBe(true);
  });

  it('fires contingency in the two-minute warning window when within one score', () => {
    const rule = createContingencyRule('two_minute_warning_one_score', 'go_for_it_on_4th');

    expect(shouldFireContingency(rule, {
      scoreDiff: -6,
      quarter: 4,
      turnovers: 1,
      opponentTurnovers: 1,
      opponentScoredOnOpening: false,
      windSpeed: 5,
      lateGameWindow: true,
    })).toBe(true);
  });

  it('fires contingency when the opponent holds a touchdown lead after halftime', () => {
    const rule = createContingencyRule('opponent_td_lead_after_halftime', 'pressure_every_down');

    expect(shouldFireContingency(rule, {
      scoreDiff: -10,
      quarter: 4,
      turnovers: 0,
      opponentTurnovers: 0,
      opponentScoredOnOpening: false,
      windSpeed: 5,
    })).toBe(true);
  });

  it('does not fire contingency when the trigger condition is unmet', () => {
    const rule = createContingencyRule('down_by', 'go_air_raid', { threshold: 14 });

    expect(shouldFireContingency(rule, {
      scoreDiff: -10,
      quarter: 3,
      turnovers: 0,
      opponentTurnovers: 0,
      opponentScoredOnOpening: false,
      windSpeed: 5,
    })).toBe(false);
  });

  it('enforces the three-rule limit', () => {
    const rules = limitContingencyRules([
      createContingencyRule('down_by', 'go_air_raid', { id: '1', threshold: 14 }),
      createContingencyRule('up_by', 'kill_clock', { id: '2', threshold: 21 }),
      createContingencyRule('end_of_q2_losing', 'run_heavy', { id: '3' }),
      createContingencyRule('two_minute_warning_one_score', 'go_for_it_on_4th', { id: '4' }),
    ]);

    expect(MAX_CONTINGENCIES).toBe(3);
    expect(rules.map((rule) => rule.id)).toEqual(['1', '2', '3']);
  });

  it('maps response plans into play-calling adjustments', () => {
    const rule = createContingencyRule('down_by', 'pressure_every_down', { threshold: 14 });
    const adjustments = applyContingency(rule);

    expect(adjustments.defensiveScheme).toBe('blitz_heavy');
    expect(adjustments.responseLabel).toBe('Pressure every down');
  });

  it('emits a deterministic broadcast callout when a contingency fires', () => {
    const rule = createContingencyRule('down_by', 'go_air_raid', { threshold: 14 });
    const evaluation = evaluateContingencies(
      [rule],
      {
        scoreDiff: -21,
        quarter: 3,
        turnovers: 0,
        opponentTurnovers: 0,
        opponentScoredOnOpening: false,
        windSpeed: 5,
      },
      makePlan(),
      { teamName: 'Testers', rng: mulberry32(4) },
    );

    expect(evaluation.firedRule?.id).toBe(rule.id);
    expect(evaluation.callout).toContain('Testers');
    expect(evaluation.plan.offensiveScheme).toBe('pass_heavy');
  });

  it('formats direct callout text deterministically by seed', () => {
    const rule = createContingencyRule('up_by', 'kill_clock', { threshold: 21 });
    const first = getContingencyCallout(rule, 'Testers', mulberry32(9));
    const second = getContingencyCallout(rule, 'Testers', mulberry32(9));

    expect(first).toBe(second);
  });
});
