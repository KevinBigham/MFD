/**
 * MFD Golden Game Fixture
 *
 * A deterministic, seed-safe sequence of game events that exercises
 * every required v0 event type. This fixture is the canonical reference
 * for contract verification and reducer testing.
 *
 * Every event in this fixture was hand-authored to represent a realistic
 * game flow: kickoff → drives → plays → halftime → second half → game end.
 */

import { EVENT_NAMES, SCHEMA_VERSION } from '../../../src/systems/events/event-types.js';

const V = SCHEMA_VERSION;

function env(seq, eventName, quarter, clock, possession, fieldPos, down, ytg, hScore, aScore, payload) {
  return {
    schemaVersion: V,
    eventName,
    seq,
    gameId: 'golden-001',
    timestamp: 1700000000000 + seq * 1000,
    quarter,
    clock,
    possession,
    fieldPos,
    down,
    yardsToGo: ytg,
    homeScore: hScore,
    awayScore: aScore,
    payload,
  };
}

export const GOLDEN_GAME_EVENTS = [
  // 1. game_start
  env(1, EVENT_NAMES.GAME_START, 0, 900, '', 0, 0, 0, 0, 0, {
    homeTeam: 'Hawks', awayTeam: 'Titans', weather: { temp: 72, precip: 'DOME', wind: 0 },
    seed: 12345, week: 5, year: 2026,
  }),

  // 2. drive_start — Hawks receive kickoff
  env(2, EVENT_NAMES.DRIVE_START, 1, 900, 'home', 25, 1, 10, 0, 0, {
    driveNum: 1, startFieldPos: 25, team: 'home', startClock: 900, startQuarter: 1,
  }),

  // 3. play_call — HB Dive
  env(3, EVENT_NAMES.PLAY_CALL, 1, 900, 'home', 25, 1, 10, 0, 0, {
    playId: 'hb_dive', playLabel: 'HB Dive', playType: 'run',
    formation: null, defenseCall: 'cover_3', defenseLabel: 'Cover 3', isUserCall: true,
  }),

  // 4. trench_resolution
  env(4, EVENT_NAMES.TRENCH_RESOLUTION, 1, 900, 'home', 25, 1, 10, 0, 0, {
    olGrade: 72, dlGrade: 65, runLaneOpen: true, pocketIntact: true,
    matchups: [{ off: 'OL (blk:72)', def: 'DL (shed:65)', winner: 'off', desc: 'O-line mauls the front' }],
  }),

  // 5. play_result — 5 yard gain
  env(5, EVENT_NAMES.PLAY_RESULT, 1, 872, 'home', 30, 2, 5, 0, 0, {
    type: 'run', yards: 5, player: 'Marcus Bell', passer: null, desc: 'Marcus Bell gains 5 yards',
    big: false, isRush: true, isScramble: false, firstDown: false, touchdown: false,
  }),

  // 6. play_call — Quick Slant
  env(6, EVENT_NAMES.PLAY_CALL, 1, 872, 'home', 30, 2, 5, 0, 0, {
    playId: 'slant', playLabel: 'Quick Slant', playType: 'pass',
    formation: null, defenseCall: 'man_press', defenseLabel: 'Man Press', isUserCall: true,
  }),

  // 7. pressure_resolution
  env(7, EVENT_NAMES.PRESSURE_RESOLUTION, 1, 872, 'home', 30, 2, 5, 0, 0, {
    pressured: false, sacked: false, rusher: null, blocker: null, timeInPocket: 2.8, qbEscaped: false,
  }),

  // 8. play_result — 12 yard completion
  env(8, EVENT_NAMES.PLAY_RESULT, 1, 848, 'home', 42, 1, 10, 0, 0, {
    type: 'complete', yards: 12, player: 'Jaylen Swift', passer: 'Drew Cannon',
    desc: 'Complete to Jaylen Swift for 12 yards!', big: false, isRush: false, isScramble: false,
    firstDown: true, touchdown: false,
  }),

  // 9. play_call — Go Route
  env(9, EVENT_NAMES.PLAY_CALL, 1, 848, 'home', 42, 1, 10, 0, 0, {
    playId: 'go_route', playLabel: 'Go Route', playType: 'pass',
    formation: null, defenseCall: 'cover_2', defenseLabel: 'Cover 2', isUserCall: true,
  }),

  // 10. pressure_resolution — pressured but not sacked
  env(10, EVENT_NAMES.PRESSURE_RESOLUTION, 1, 848, 'home', 42, 1, 10, 0, 0, {
    pressured: true, sacked: false, rusher: 'Deon Crush', blocker: 'LT Martinez',
    timeInPocket: 1.9, qbEscaped: false,
  }),

  // 11. play_result — BIG PLAY 45 yard TD pass
  env(11, EVENT_NAMES.PLAY_RESULT, 1, 825, 'home', 100, 0, 0, 0, 0, {
    type: 'complete', yards: 58, player: 'Jaylen Swift', passer: 'Drew Cannon',
    desc: 'BIG PLAY! Drew Cannon connects with Jaylen Swift for 58 yards! TOUCHDOWN!',
    big: true, isRush: false, isScramble: false, firstDown: false, touchdown: true,
  }),

  // 12. score — TD
  env(12, EVENT_NAMES.SCORE, 1, 825, 'home', 100, 0, 0, 7, 0, {
    type: 'touchdown', points: 7, team: 'home', player: 'Jaylen Swift',
    desc: 'Jaylen Swift 58-yd TD reception from Drew Cannon (PAT good)', homeScore: 7, awayScore: 0,
  }),

  // 13. drive_end
  env(13, EVENT_NAMES.DRIVE_END, 1, 825, 'home', 100, 0, 0, 7, 0, {
    driveNum: 1, result: 'touchdown', plays: 3, yards: 75, timeUsed: 75,
    startFieldPos: 25, endFieldPos: 100,
  }),

  // 14. drive_start — Titans
  env(14, EVENT_NAMES.DRIVE_START, 1, 820, 'away', 25, 1, 10, 7, 0, {
    driveNum: 2, startFieldPos: 25, team: 'away', startClock: 820, startQuarter: 1,
  }),

  // 15. play_call — HB Counter
  env(15, EVENT_NAMES.PLAY_CALL, 1, 820, 'away', 25, 1, 10, 7, 0, {
    playId: 'hb_counter', playLabel: 'Counter', playType: 'run',
    formation: null, defenseCall: 'cover_3', defenseLabel: 'Cover 3', isUserCall: false,
  }),

  // 16. trench_resolution
  env(16, EVENT_NAMES.TRENCH_RESOLUTION, 1, 820, 'away', 25, 1, 10, 7, 0, {
    olGrade: 60, dlGrade: 70, runLaneOpen: false, pocketIntact: false,
    matchups: [{ off: 'OL (blk:60)', def: 'DL (shed:70)', winner: 'def', desc: 'DL blows up the blocking' }],
  }),

  // 17. play_result — loss of 2
  env(17, EVENT_NAMES.PLAY_RESULT, 1, 793, 'away', 23, 2, 12, 7, 0, {
    type: 'run', yards: -2, player: 'Jalen Rivers', passer: null,
    desc: 'Jalen Rivers stuffed for a loss of 2', big: false, isRush: true, isScramble: false,
    firstDown: false, touchdown: false,
  }),

  // 18. penalty — false start
  env(18, EVENT_NAMES.PENALTY, 1, 793, 'away', 18, 2, 17, 7, 0, {
    type: 'false_start', team: 'away', player: 'RT Jenkins', yards: 5,
    accepted: true, desc: 'False start on RT Jenkins. 5-yard penalty.', offsetting: false,
  }),

  // 19. play_call — post route
  env(19, EVENT_NAMES.PLAY_CALL, 1, 793, 'away', 18, 2, 17, 7, 0, {
    playId: 'post', playLabel: 'Post Route', playType: 'pass',
    formation: null, defenseCall: 'cover_0', defenseLabel: 'Cover 0 Blitz', isUserCall: false,
  }),

  // 20. pressure_resolution — SACKED
  env(20, EVENT_NAMES.PRESSURE_RESOLUTION, 1, 793, 'away', 18, 2, 17, 7, 0, {
    pressured: true, sacked: true, rusher: 'Khalil Storm', blocker: 'LG Davis',
    timeInPocket: 1.2, qbEscaped: false,
  }),

  // 21. play_result — sack
  env(21, EVENT_NAMES.PLAY_RESULT, 1, 768, 'away', 11, 3, 24, 7, 0, {
    type: 'sack', yards: -7, player: 'Khalil Storm', passer: null,
    desc: 'Khalil Storm SACKS Trey Palmer for a loss of 7!', big: false, isRush: false, isScramble: false,
    firstDown: false, touchdown: false,
  }),

  // 22. drive_end — punt
  env(22, EVENT_NAMES.DRIVE_END, 1, 768, 'away', 11, 0, 0, 7, 0, {
    driveNum: 2, result: 'punt', plays: 2, yards: -9, timeUsed: 52,
    startFieldPos: 25, endFieldPos: 11,
  }),

  // 23. injury — mid-game
  env(23, EVENT_NAMES.INJURY, 1, 750, 'away', 0, 0, 0, 7, 0, {
    player: 'CB Revis Jr', pos: 'CB', team: 'away', type: 'hamstring',
    severity: 'questionable', gamesOut: 1, desc: 'CB Revis Jr leaves with a hamstring injury.',
  }),

  // 24. drive_start — Hawks 2nd drive
  env(24, EVENT_NAMES.DRIVE_START, 1, 745, 'home', 45, 1, 10, 7, 0, {
    driveNum: 3, startFieldPos: 45, team: 'home', startClock: 745, startQuarter: 1,
  }),

  // 25. play_call — screen
  env(25, EVENT_NAMES.PLAY_CALL, 1, 745, 'home', 45, 1, 10, 7, 0, {
    playId: 'screen', playLabel: 'WR Screen', playType: 'pass',
    formation: null, defenseCall: 'cover_2', defenseLabel: 'Cover 2', isUserCall: true,
  }),

  // 26. play_result — fumble
  env(26, EVENT_NAMES.PLAY_RESULT, 1, 720, 'home', 48, 0, 0, 7, 0, {
    type: 'fumble', yards: 3, player: 'Marcus Bell', passer: null,
    desc: 'Marcus Bell FUMBLES! Ball is loose — defense recovers!',
    big: false, isRush: false, isScramble: false, firstDown: false, touchdown: false,
  }),

  // 27. turnover
  env(27, EVENT_NAMES.TURNOVER, 1, 720, 'home', 48, 0, 0, 7, 0, {
    type: 'fumble', player: 'Marcus Bell', forcedBy: 'LB Watts', fieldPos: 48,
    desc: 'Fumble by Marcus Bell, forced by LB Watts. Titans recover.',
  }),

  // 28. drive_end
  env(28, EVENT_NAMES.DRIVE_END, 1, 720, 'home', 48, 0, 0, 7, 0, {
    driveNum: 3, result: 'fumble', plays: 1, yards: 3, timeUsed: 25,
    startFieldPos: 45, endFieldPos: 48,
  }),

  // ── Q2 scoring drive for Titans ──

  // 29. drive_start
  env(29, EVENT_NAMES.DRIVE_START, 2, 450, 'away', 30, 1, 10, 7, 0, {
    driveNum: 4, startFieldPos: 30, team: 'away', startClock: 450, startQuarter: 2,
  }),

  // 30. play_call
  env(30, EVENT_NAMES.PLAY_CALL, 2, 450, 'away', 30, 1, 10, 7, 0, {
    playId: 'hb_toss', playLabel: 'HB Toss', playType: 'run',
    formation: null, defenseCall: 'cover_3', defenseLabel: 'Cover 3', isUserCall: false,
  }),

  // 31. trench_resolution
  env(31, EVENT_NAMES.TRENCH_RESOLUTION, 2, 450, 'away', 30, 1, 10, 7, 0, {
    olGrade: 68, dlGrade: 62, runLaneOpen: true, pocketIntact: true,
    matchups: [],
  }),

  // 32. play_result — big run
  env(32, EVENT_NAMES.PLAY_RESULT, 2, 422, 'away', 55, 1, 10, 7, 0, {
    type: 'run', yards: 25, player: 'Jalen Rivers', passer: null,
    desc: 'BREAKAWAY! Jalen Rivers breaks free for 25 yards!',
    big: true, isRush: true, isScramble: false, firstDown: true, touchdown: false,
  }),

  // 33. play_call + result — TD
  env(33, EVENT_NAMES.PLAY_CALL, 2, 422, 'away', 55, 1, 10, 7, 0, {
    playId: 'slant', playLabel: 'Quick Slant', playType: 'pass',
    formation: null, defenseCall: 'man_press', defenseLabel: 'Man Press', isUserCall: false,
  }),

  // 34. play_result — TD
  env(34, EVENT_NAMES.PLAY_RESULT, 2, 400, 'away', 100, 0, 0, 7, 0, {
    type: 'complete', yards: 45, player: 'Rico Flash', passer: 'Trey Palmer',
    desc: 'BIG PLAY! Trey Palmer connects with Rico Flash for 45 yards! TOUCHDOWN!',
    big: true, isRush: false, isScramble: false, firstDown: false, touchdown: true,
  }),

  // 35. score
  env(35, EVENT_NAMES.SCORE, 2, 400, 'away', 100, 0, 0, 7, 7, {
    type: 'touchdown', points: 7, team: 'away', player: 'Rico Flash',
    desc: 'Rico Flash 45-yd TD reception from Trey Palmer (PAT good)', homeScore: 7, awayScore: 7,
  }),

  // 36. drive_end
  env(36, EVENT_NAMES.DRIVE_END, 2, 400, 'away', 100, 0, 0, 7, 7, {
    driveNum: 4, result: 'touchdown', plays: 2, yards: 70, timeUsed: 50,
    startFieldPos: 30, endFieldPos: 100,
  }),

  // ── HALFTIME ──

  // 37. halftime_adjustment
  env(37, EVENT_NAMES.HALFTIME_ADJUSTMENT, 2, 0, '', 0, 0, 0, 7, 7, {
    adjustmentId: 'blitz_heavy', adjustmentLabel: 'Blitz Heavy',
    offEdge: -2, defEdge: 6, rationale: 'Score is tied — increase defensive pressure.',
    scoreDiff: 0,
  }),

  // ── Q3 ──

  // 38. drive_start
  env(38, EVENT_NAMES.DRIVE_START, 3, 900, 'home', 25, 1, 10, 7, 7, {
    driveNum: 5, startFieldPos: 25, team: 'home', startClock: 900, startQuarter: 3,
  }),

  // 39-42: Short drive ending in FG
  env(39, EVENT_NAMES.PLAY_CALL, 3, 900, 'home', 25, 1, 10, 7, 7, {
    playId: 'hb_dive', playLabel: 'HB Dive', playType: 'run',
    formation: null, defenseCall: 'cover_3', defenseLabel: 'Cover 3', isUserCall: true,
  }),

  env(40, EVENT_NAMES.PLAY_RESULT, 3, 872, 'home', 32, 2, 3, 7, 7, {
    type: 'run', yards: 7, player: 'Marcus Bell', passer: null,
    desc: 'Marcus Bell gains 7 yards', big: false, isRush: true, isScramble: false,
    firstDown: true, touchdown: false,
  }),

  // 41. score — field goal
  env(41, EVENT_NAMES.SCORE, 3, 800, 'home', 68, 0, 0, 10, 7, {
    type: 'field_goal', points: 3, team: 'home', player: 'K Nolan',
    desc: 'K Nolan 42-yd FG is GOOD!', homeScore: 10, awayScore: 7,
  }),

  // 42. drive_end
  env(42, EVENT_NAMES.DRIVE_END, 3, 800, 'home', 68, 0, 0, 10, 7, {
    driveNum: 5, result: 'field_goal', plays: 5, yards: 43, timeUsed: 100,
    startFieldPos: 25, endFieldPos: 68,
  }),

  // ── Q4 — Turnover (INT) and score ──

  // 43. drive_start — Titans
  env(43, EVENT_NAMES.DRIVE_START, 4, 600, 'away', 30, 1, 10, 10, 7, {
    driveNum: 6, startFieldPos: 30, team: 'away', startClock: 600, startQuarter: 4,
  }),

  // 44. play_call
  env(44, EVENT_NAMES.PLAY_CALL, 4, 600, 'away', 30, 1, 10, 10, 7, {
    playId: 'go_route', playLabel: 'Go Route', playType: 'pass',
    formation: null, defenseCall: 'cover_0', defenseLabel: 'Cover 0 Blitz', isUserCall: false,
  }),

  // 45. pressure_resolution
  env(45, EVENT_NAMES.PRESSURE_RESOLUTION, 4, 600, 'away', 30, 1, 10, 10, 7, {
    pressured: true, sacked: false, rusher: 'Khalil Storm', blocker: 'LT Miller',
    timeInPocket: 1.5, qbEscaped: true,
  }),

  // 46. play_result — interception
  env(46, EVENT_NAMES.PLAY_RESULT, 4, 575, 'away', 30, 0, 0, 10, 7, {
    type: 'interception', yards: 0, player: 'S Williams', passer: 'Trey Palmer',
    desc: 'Trey Palmer INTERCEPTED by S Williams!', big: false, isRush: false, isScramble: false,
    firstDown: false, touchdown: false,
  }),

  // 47. turnover
  env(47, EVENT_NAMES.TURNOVER, 4, 575, 'away', 30, 0, 0, 10, 7, {
    type: 'interception', player: 'Trey Palmer', forcedBy: 'S Williams',
    fieldPos: 30, desc: 'Interception by S Williams at the 30.',
  }),

  // 48. drive_end
  env(48, EVENT_NAMES.DRIVE_END, 4, 575, 'away', 30, 0, 0, 10, 7, {
    driveNum: 6, result: 'interception', plays: 1, yards: 0, timeUsed: 25,
    startFieldPos: 30, endFieldPos: 30,
  }),

  // 49. drive_start — Hawks take over
  env(49, EVENT_NAMES.DRIVE_START, 4, 570, 'home', 70, 1, 10, 10, 7, {
    driveNum: 7, startFieldPos: 70, team: 'home', startClock: 570, startQuarter: 4,
  }),

  // 50. play_call — QB scramble
  env(50, EVENT_NAMES.PLAY_CALL, 4, 570, 'home', 70, 1, 10, 10, 7, {
    playId: 'curl', playLabel: 'Curl Route', playType: 'pass',
    formation: null, defenseCall: 'cover_3', defenseLabel: 'Cover 3', isUserCall: true,
  }),

  // 51. play_result — scramble
  env(51, EVENT_NAMES.PLAY_RESULT, 4, 545, 'home', 82, 1, 10, 10, 7, {
    type: 'run', yards: 12, player: 'Drew Cannon', passer: null,
    desc: 'Drew Cannon scrambles for 12 yards!', big: true, isRush: true, isScramble: true,
    firstDown: true, touchdown: false,
  }),

  // 52. play_result — rushing TD
  env(52, EVENT_NAMES.PLAY_RESULT, 4, 520, 'home', 100, 0, 0, 10, 7, {
    type: 'run', yards: 18, player: 'Marcus Bell', passer: null,
    desc: 'BREAKAWAY! Marcus Bell breaks free for 18 yards! TOUCHDOWN!',
    big: true, isRush: true, isScramble: false, firstDown: false, touchdown: true,
  }),

  // 53. score
  env(53, EVENT_NAMES.SCORE, 4, 520, 'home', 100, 0, 0, 17, 7, {
    type: 'touchdown', points: 7, team: 'home', player: 'Marcus Bell',
    desc: 'Marcus Bell 18-yd rushing TD (PAT good)', homeScore: 17, awayScore: 7,
  }),

  // 54. drive_end
  env(54, EVENT_NAMES.DRIVE_END, 4, 520, 'home', 100, 0, 0, 17, 7, {
    driveNum: 7, result: 'touchdown', plays: 2, yards: 30, timeUsed: 50,
    startFieldPos: 70, endFieldPos: 100,
  }),

  // 55. game_end
  env(55, EVENT_NAMES.GAME_END, 4, 0, '', 0, 0, 0, 17, 7, {
    homeScore: 17, awayScore: 7, winner: 'Hawks', loser: 'Titans',
    overtime: false, totalPlays: 12, mvp: 'Drew Cannon',
  }),
];

export const GOLDEN_GAME_CONTEXT = {
  userSide: 'home',
  homeTeam: 'Hawks',
  awayTeam: 'Titans',
  week: 5,
  year: 2026,
  opponent: 'Titans',
};
