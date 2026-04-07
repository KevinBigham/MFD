/**
 * MFD Game Event Contract v0 — Canonical Event Types
 *
 * All event names used by the game event spine.
 * Frozen per agent coordination handshake — do not modify
 * without both-agent agreement.
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
};

export const EVENT_NAME_LIST = Object.values(EVENT_NAMES);

export const SCHEMA_VERSION = '0.1.0';
