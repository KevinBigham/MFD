import {
  DIFF_SETTINGS,
  CAP_MATH,
  getSalaryCap,
  ALL_POSITIONS,
  OFF_SCHEMES,
  DEF_SCHEMES,
} from '../../config/index.js';

export function runConfigChecks(check) {
  check(DIFF_SETTINGS.rookie.tradeMod !== 1.15, 'DIFF_SETTINGS.rookie.tradeMod mismatch');
  check(DIFF_SETTINGS.legend.injMod !== 1.5, 'DIFF_SETTINGS.legend.injMod mismatch');
  check(CAP_MATH.BASE_CAP !== 255.0, 'CAP_MATH.BASE_CAP mismatch');
  check(getSalaryCap(2026) !== 255, 'getSalaryCap(2026) should be 255');
  check(ALL_POSITIONS.length !== 11, 'ALL_POSITIONS count mismatch');
  check(OFF_SCHEMES.length !== 8, 'OFF_SCHEMES count mismatch');
  check(DEF_SCHEMES.length !== 5, 'DEF_SCHEMES count mismatch');
}

export function runConfigChecksBatchA(check) {
  runConfigChecks(check);
}

export function runConfigChecksBatchB(check) {
  check(typeof getSalaryCap !== 'function', 'getSalaryCap not a function');
}
