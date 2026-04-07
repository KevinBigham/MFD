import {
  HALFTIME_V2,
  TRAINING_CAMP_986,
  FRANCHISE_TAG_986,
  INCENTIVES_986,
  GM_REP_986,
  checkUnlocks,
  SPECIAL_PLAYS_993,
  SPECIAL_COVERAGES_993,
  RIVALRY_TROPHIES977,
  DB_CLEANER,
  NEGOTIATION_SCENE,
  ARC_SPOTLIGHT,
} from '../../systems/index.js';

export function runSystemsChecksBatchA(check) {
  check(HALFTIME_V2.options.length !== 6, 'HALFTIME_V2 options count mismatch');
  check(TRAINING_CAMP_986.focuses.length !== 5, 'TRAINING_CAMP focuses count mismatch');
  check(FRANCHISE_TAG_986.types.length !== 3, 'FRANCHISE_TAG types count mismatch');
  check(INCENTIVES_986.types.length !== 7, 'INCENTIVES types count mismatch');
  check(typeof GM_REP_986.calculate !== 'function', 'GM_REP_986.calculate not a function');
  check(typeof checkUnlocks !== 'function', 'checkUnlocks not a function');
}

export function runSystemsChecksBatchB(check) {
  check(SPECIAL_PLAYS_993.trickPlays.length !== 4, 'SPECIAL_PLAYS_993 trickPlays count mismatch');
  check(SPECIAL_COVERAGES_993.length !== 4, 'SPECIAL_COVERAGES_993 count mismatch');
  check(!RIVALRY_TROPHIES977 || typeof RIVALRY_TROPHIES977.generateTrophy !== 'function', 'RIVALRY_TROPHIES977.generateTrophy missing');
  check(typeof DB_CLEANER.findStale !== 'function', 'DB_CLEANER.findStale not a function');
  check(typeof NEGOTIATION_SCENE.getOpeningLine !== 'function', 'NEGOTIATION_SCENE.getOpeningLine not a function');
  check(typeof ARC_SPOTLIGHT.generate !== 'function', 'ARC_SPOTLIGHT.generate not a function');
}
