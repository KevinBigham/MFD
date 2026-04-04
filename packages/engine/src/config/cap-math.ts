/**
 * MFD Salary Cap Constants & Math
 *
 * Core financial constants and cap calculation functions.
 */

import type { GameState, LeagueRuleKey, LeagueRuleValue } from '../types';

export const ROSTER_CAP = 53;
export const CAMP_CAP = 75;
export const PS_CAP = 8;
export const MIN_SALARY = 0.5;

export const CAP_MATH = {
  BASE_CAP: 255.0,
  GROWTH_RATE: 0.05,
  CAP_FLOOR: 0.9,
  MIN_SAL: { ROOKIE: 0.795, VET_MIN: 1.125, VET_MAX: 1.21 } as const,
  DEAD_ACCEL: 'IMMEDIATE' as const,
} as const;

function ruleValueForYear(
  gameState: GameState | null | undefined,
  key: LeagueRuleKey,
  year: number,
  fallback: LeagueRuleValue,
): LeagueRuleValue {
  if (!gameState?.leagueRules) return fallback;
  const history = gameState.leagueRules.history
    .filter((entry) => entry.key === key && entry.effectiveYear <= year)
    .sort((a, b) => a.effectiveYear - b.effectiveYear);
  if (history.length > 0) {
    return history[history.length - 1]!.newValue;
  }
  const entry = gameState.leagueRules.entries[key];
  if (entry && entry.effectiveYear <= year) {
    return entry.value;
  }
  return fallback;
}

export function getSalaryCap(yr: number, gameState?: GameState | null): number {
  const growthRate = Number(ruleValueForYear(gameState, 'salary_cap_growth', yr, CAP_MATH.GROWTH_RATE));
  return Math.floor(
    CAP_MATH.BASE_CAP *
      Math.pow(1 + growthRate, Math.max(0, (yr || 2026) - 2026)),
  );
}

export function getCapFloor(yr: number, gameState?: GameState | null): number {
  const capFloor = Number(ruleValueForYear(gameState, 'cap_floor_pct', yr, CAP_MATH.CAP_FLOOR));
  return Math.floor(getSalaryCap(yr, gameState) * capFloor);
}

export function getMinSalary(yoe: number): number {
  return yoe <= 0
    ? CAP_MATH.MIN_SAL.ROOKIE
    : yoe <= 3
      ? CAP_MATH.MIN_SAL.VET_MIN
      : CAP_MATH.MIN_SAL.VET_MAX;
}
