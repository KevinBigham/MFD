/**
 * MFD Game Event Contract — Canonical Event Types
 *
 * All event names used by the game event spine.
 */

export const EVENT_NAMES = {
  GAME_START: 'game_start',
  DRIVE_START: 'drive_start',
  PLAY_CALL: 'play_call',
  TRENCH_RESOLUTION: 'trench_resolution',
  PRESSURE_RESOLUTION: 'pressure_resolution',
  PLAY_RESULT: 'play_result',
  TURNOVER: 'turnover',
  PENALTY: 'penalty',
  INJURY: 'injury',
  SCORE: 'score',
  HALFTIME_ADJUSTMENT: 'halftime_adjustment',
  DRIVE_END: 'drive_end',
  GAME_END: 'game_end',
} as const;

export type EventName = typeof EVENT_NAMES[keyof typeof EVENT_NAMES];
export const EVENT_NAME_LIST: EventName[] = Object.values(EVENT_NAMES);
export const SCHEMA_VERSION = '0.1.0';
