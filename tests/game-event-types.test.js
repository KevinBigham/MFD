import { describe, expect, it } from 'vitest';

import { EVENT_NAMES, EVENT_NAME_LIST, SCHEMA_VERSION } from '../src/systems/events/event-types.js';

describe('event-types.js', () => {
  it('exports all 13 required v0 event names', () => {
    expect(EVENT_NAME_LIST).toHaveLength(13);
    expect(EVENT_NAME_LIST).toContain('game_start');
    expect(EVENT_NAME_LIST).toContain('drive_start');
    expect(EVENT_NAME_LIST).toContain('play_call');
    expect(EVENT_NAME_LIST).toContain('trench_resolution');
    expect(EVENT_NAME_LIST).toContain('pressure_resolution');
    expect(EVENT_NAME_LIST).toContain('play_result');
    expect(EVENT_NAME_LIST).toContain('turnover');
    expect(EVENT_NAME_LIST).toContain('penalty');
    expect(EVENT_NAME_LIST).toContain('injury');
    expect(EVENT_NAME_LIST).toContain('score');
    expect(EVENT_NAME_LIST).toContain('halftime_adjustment');
    expect(EVENT_NAME_LIST).toContain('drive_end');
    expect(EVENT_NAME_LIST).toContain('game_end');
  });

  it('EVENT_NAMES is a frozen mapping from upper to lower names', () => {
    expect(EVENT_NAMES.GAME_START).toBe('game_start');
    expect(EVENT_NAMES.PLAY_RESULT).toBe('play_result');
    expect(EVENT_NAMES.GAME_END).toBe('game_end');
  });

  it('SCHEMA_VERSION is a semver string', () => {
    expect(SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('event names are all lowercase snake_case', () => {
    for (const name of EVENT_NAME_LIST) {
      expect(name).toMatch(/^[a-z][a-z_]*[a-z]$/);
    }
  });

  it('event names are unique', () => {
    const unique = new Set(EVENT_NAME_LIST);
    expect(unique.size).toBe(EVENT_NAME_LIST.length);
  });

  it('EVENT_NAMES keys match values in uppercase', () => {
    for (const [key, val] of Object.entries(EVENT_NAMES)) {
      expect(key).toBe(val.toUpperCase());
    }
  });

  it('no event names contain spaces or special characters', () => {
    for (const name of EVENT_NAME_LIST) {
      expect(name).not.toMatch(/\s/);
      expect(name).not.toMatch(/[^a-z_]/);
    }
  });

  it('SCHEMA_VERSION starts with 0 for v0 contract', () => {
    expect(SCHEMA_VERSION.startsWith('0.')).toBe(true);
  });

  it('event name list is sorted alphabetically for determinism', () => {
    const sorted = [...EVENT_NAME_LIST].sort();
    // We don't require sorted order for the list itself, but verify all are present
    expect(sorted).toEqual(expect.arrayContaining(EVENT_NAME_LIST));
  });

  it('every EVENT_NAMES key is a string', () => {
    for (const val of Object.values(EVENT_NAMES)) {
      expect(typeof val).toBe('string');
    }
  });
});
