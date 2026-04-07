import {
  TD,
  LEAGUE_TEAM_COUNT97,
  CALENDAR,
  TEAM_FLAVOR_991,
  LOCKER_ROOM_994,
  PRESS_CONFERENCE_993,
  FA_NARRATIVE_993,
  FA_PHASES,
  FA_TIERS,
} from '../../data/index.js';

export function runDataChecksBatchA(check) {
  check(TD.length !== 30, 'TD team count mismatch');
  check(LEAGUE_TEAM_COUNT97 !== 30, 'LEAGUE_TEAM_COUNT97 mismatch');
  check(CALENDAR.length !== 16, 'CALENDAR length mismatch');
  check(Object.keys(TEAM_FLAVOR_991).length < 28, 'TEAM_FLAVOR_991 count too low');
}

export function runDataChecksBatchB(check) {
  check(!LOCKER_ROOM_994.newArrival, 'LOCKER_ROOM_994 missing newArrival');
  check(Object.keys(PRESS_CONFERENCE_993.questions).length !== 13, 'PRESS_CONFERENCE_993.questions count mismatch');
  check(Object.keys(FA_NARRATIVE_993).length !== 7, 'FA_NARRATIVE_993 count mismatch');
  check(Object.keys(FA_PHASES).length !== 3, 'FA_PHASES count mismatch');
  check(Object.keys(FA_TIERS).length !== 4, 'FA_TIERS count mismatch');
}
