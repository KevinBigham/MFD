/**
 * MFD Salary Cap Constants & Math
 *
 * Core financial constants and cap calculation functions.
 */

export var ROSTER_CAP = 53;
export var CAMP_CAP = 75;
export var PS_CAP = 8;
export var MIN_SALARY = 0.5;

export var CAP_MATH = {
  BASE_CAP: 255.0,
  GROWTH_RATE: 0.05,
  CAP_FLOOR: 0.9,
  MIN_SAL: { ROOKIE: 0.795, VET_MIN: 1.125, VET_MAX: 1.21 },
  DEAD_ACCEL: 'IMMEDIATE',
};

export function getSalaryCap(yr) {
  return Math.floor(
    CAP_MATH.BASE_CAP *
      Math.pow(1 + CAP_MATH.GROWTH_RATE, Math.max(0, (yr || 2026) - 2026))
  );
}

export function getCapFloor(yr) {
  return Math.floor(getSalaryCap(yr) * CAP_MATH.CAP_FLOOR);
}

export function getMinSalary(yoe) {
  return yoe <= 0
    ? CAP_MATH.MIN_SAL.ROOKIE
    : yoe <= 3
      ? CAP_MATH.MIN_SAL.VET_MIN
      : CAP_MATH.MIN_SAL.VET_MAX;
}
