/**
 * MFD Salary Cap Constants & Math
 *
 * Core financial constants and cap calculation functions.
 */

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

export function getSalaryCap(yr: number): number {
  return Math.floor(
    CAP_MATH.BASE_CAP *
      Math.pow(1 + CAP_MATH.GROWTH_RATE, Math.max(0, (yr || 2026) - 2026)),
  );
}

export function getCapFloor(yr: number): number {
  return Math.floor(getSalaryCap(yr) * CAP_MATH.CAP_FLOOR);
}

export function getMinSalary(yoe: number): number {
  return yoe <= 0
    ? CAP_MATH.MIN_SAL.ROOKIE
    : yoe <= 3
      ? CAP_MATH.MIN_SAL.VET_MIN
      : CAP_MATH.MIN_SAL.VET_MAX;
}
