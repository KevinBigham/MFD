import { describe, expect, it } from 'vitest';

import { GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT } from './fixtures/game-events/golden-game.js';
import { EVENT_NAMES, EVENT_NAME_LIST, SCHEMA_VERSION } from '../src/systems/events/event-types.js';

describe('golden-game fixture contract', () => {
  it('fixture is a non-empty array', () => {
    expect(Array.isArray(GOLDEN_GAME_EVENTS)).toBe(true);
    expect(GOLDEN_GAME_EVENTS.length).toBeGreaterThan(0);
  });

  it('every event has the correct schema version', () => {
    for (const evt of GOLDEN_GAME_EVENTS) {
      expect(evt.schemaVersion).toBe(SCHEMA_VERSION);
    }
  });

  it('every event has the required top-level fields', () => {
    const required = [
      'schemaVersion', 'eventName', 'seq', 'gameId', 'timestamp',
      'quarter', 'clock', 'possession', 'fieldPos', 'down',
      'yardsToGo', 'homeScore', 'awayScore', 'payload',
    ];
    for (const evt of GOLDEN_GAME_EVENTS) {
      for (const field of required) {
        expect(evt).toHaveProperty(field);
      }
    }
  });

  it('every event name is from the canonical list', () => {
    for (const evt of GOLDEN_GAME_EVENTS) {
      expect(EVENT_NAME_LIST).toContain(evt.eventName);
    }
  });

  it('seqs are monotonically increasing', () => {
    for (let i = 1; i < GOLDEN_GAME_EVENTS.length; i++) {
      expect(GOLDEN_GAME_EVENTS[i].seq).toBeGreaterThan(GOLDEN_GAME_EVENTS[i - 1].seq);
    }
  });

  it('covers all 13 required event types', () => {
    const seen = new Set(GOLDEN_GAME_EVENTS.map(e => e.eventName));
    for (const name of EVENT_NAME_LIST) {
      expect(seen.has(name)).toBe(true);
    }
  });

  it('starts with game_start and ends with game_end', () => {
    expect(GOLDEN_GAME_EVENTS[0].eventName).toBe(EVENT_NAMES.GAME_START);
    expect(GOLDEN_GAME_EVENTS[GOLDEN_GAME_EVENTS.length - 1].eventName).toBe(EVENT_NAMES.GAME_END);
  });

  it('all events have consistent gameId', () => {
    const id = GOLDEN_GAME_EVENTS[0].gameId;
    for (const evt of GOLDEN_GAME_EVENTS) {
      expect(evt.gameId).toBe(id);
    }
  });

  it('context has required fields', () => {
    expect(GOLDEN_GAME_CONTEXT).toHaveProperty('userSide');
    expect(GOLDEN_GAME_CONTEXT).toHaveProperty('homeTeam');
    expect(GOLDEN_GAME_CONTEXT).toHaveProperty('awayTeam');
    expect(GOLDEN_GAME_CONTEXT).toHaveProperty('week');
    expect(GOLDEN_GAME_CONTEXT).toHaveProperty('year');
    expect(GOLDEN_GAME_CONTEXT).toHaveProperty('opponent');
  });

  it('fixture is fully serializable (JSON round-trip)', () => {
    const json = JSON.stringify(GOLDEN_GAME_EVENTS);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(GOLDEN_GAME_EVENTS);
  });

  it('game_start payload has homeTeam and awayTeam', () => {
    const gs = GOLDEN_GAME_EVENTS.find(e => e.eventName === EVENT_NAMES.GAME_START);
    expect(gs.payload.homeTeam).toBe('Hawks');
    expect(gs.payload.awayTeam).toBe('Titans');
  });

  it('game_end payload has correct final scores', () => {
    const ge = GOLDEN_GAME_EVENTS.find(e => e.eventName === EVENT_NAMES.GAME_END);
    expect(ge.payload.homeScore).toBe(17);
    expect(ge.payload.awayScore).toBe(7);
  });
});
