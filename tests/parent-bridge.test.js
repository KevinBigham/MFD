import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { createParentBridge, isEmbeddedContext } from '../src/systems/events/parent-bridge.js';
import { createEventLog } from '../src/systems/events/emitter.js';
import { EVENT_NAMES, SCHEMA_VERSION } from '../src/systems/events/event-types.js';
import { GOLDEN_GAME_EVENTS } from './fixtures/game-events/golden-game.js';

describe('parent-bridge.js', () => {
  describe('isEmbeddedContext', () => {
    it('returns false in Node/test environment (no window.parent iframe)', () => {
      // In vitest/Node there is no real parent iframe
      expect(isEmbeddedContext()).toBe(false);
    });
  });

  describe('createParentBridge — standalone (disabled)', () => {
    it('creates a bridge that is disabled by default in test/Node', () => {
      const bridge = createParentBridge();
      expect(bridge.enabled).toBe(false);
    });

    it('emitToParent returns false and does not throw when disabled', () => {
      const bridge = createParentBridge();
      const result = bridge.emitToParent({ seq: 1, eventName: 'game_start', payload: {} });
      expect(result).toBe(false);
      expect(bridge.emittedCount).toBe(0);
    });

    it('handles null/undefined envelope gracefully', () => {
      const bridge = createParentBridge({ forceEnabled: true });
      expect(bridge.emitToParent(null)).toBe(false);
      expect(bridge.emitToParent(undefined)).toBe(false);
      expect(bridge.emitToParent('not-an-object')).toBe(false);
    });

    it('reset clears emitted seq tracking', () => {
      const bridge = createParentBridge({ forceEnabled: false });
      bridge.reset();
      expect(bridge.emittedCount).toBe(0);
    });
  });

  describe('createParentBridge — embedded (forceEnabled)', () => {
    let posted;
    let originalWindow;

    beforeEach(() => {
      posted = [];
      // Mock window.parent.postMessage for testing
      originalWindow = globalThis.window;
      globalThis.window = {
        parent: {
          postMessage: vi.fn((msg, origin) => {
            posted.push({ msg, origin });
          }),
        },
      };
    });

    afterEach(() => {
      if (originalWindow === undefined) {
        delete globalThis.window;
      } else {
        globalThis.window = originalWindow;
      }
    });

    it('emits to parent when forceEnabled is true', () => {
      const bridge = createParentBridge({ forceEnabled: true });
      expect(bridge.enabled).toBe(true);

      const envelope = {
        schemaVersion: SCHEMA_VERSION,
        eventName: 'game_start',
        seq: 1,
        gameId: 'test-001',
        timestamp: 1700000000000,
        quarter: 0,
        clock: 900,
        possession: '',
        fieldPos: 0,
        down: 0,
        yardsToGo: 0,
        homeScore: 0,
        awayScore: 0,
        payload: { homeTeam: 'Hawks', awayTeam: 'Titans' },
      };

      const result = bridge.emitToParent(envelope);
      expect(result).toBe(true);
      expect(posted).toHaveLength(1);
      expect(posted[0].msg.type).toBe('mfd:game-event');
      expect(posted[0].msg.envelope).toEqual(envelope);
      expect(posted[0].origin).toBe('*');
    });

    it('deduplicates by seq — same seq is not emitted twice', () => {
      const bridge = createParentBridge({ forceEnabled: true });
      const envelope = { seq: 42, eventName: 'play_result', payload: {} };

      expect(bridge.emitToParent(envelope)).toBe(true);
      expect(bridge.emitToParent(envelope)).toBe(false); // duplicate
      expect(posted).toHaveLength(1);
      expect(bridge.emittedCount).toBe(1);
    });

    it('allows different seqs', () => {
      const bridge = createParentBridge({ forceEnabled: true });
      expect(bridge.emitToParent({ seq: 1, eventName: 'a', payload: {} })).toBe(true);
      expect(bridge.emitToParent({ seq: 2, eventName: 'b', payload: {} })).toBe(true);
      expect(bridge.emitToParent({ seq: 3, eventName: 'c', payload: {} })).toBe(true);
      expect(bridge.emittedCount).toBe(3);
      expect(posted).toHaveLength(3);
    });

    it('reset allows re-emission of previously seen seqs', () => {
      const bridge = createParentBridge({ forceEnabled: true });
      bridge.emitToParent({ seq: 1, eventName: 'a', payload: {} });
      bridge.reset();
      expect(bridge.emittedCount).toBe(0);
      expect(bridge.emitToParent({ seq: 1, eventName: 'a', payload: {} })).toBe(true);
    });

    it('uses custom targetOrigin when provided', () => {
      const bridge = createParentBridge({ forceEnabled: true, targetOrigin: 'https://example.com' });
      bridge.emitToParent({ seq: 1, eventName: 'test', payload: {} });
      expect(posted[0].origin).toBe('https://example.com');
    });

    it('survives postMessage throwing an error', () => {
      globalThis.window.parent.postMessage = () => { throw new Error('blocked'); };
      const bridge = createParentBridge({ forceEnabled: true });
      const result = bridge.emitToParent({ seq: 1, eventName: 'test', payload: {} });
      expect(result).toBe(false);
    });
  });

  describe('emitter integration — live parent bridge emission', () => {
    let posted;
    let originalWindow;

    beforeEach(() => {
      posted = [];
      originalWindow = globalThis.window;
      globalThis.window = {
        parent: {
          postMessage: vi.fn((msg) => { posted.push(msg); }),
        },
      };
    });

    afterEach(() => {
      if (originalWindow === undefined) {
        delete globalThis.window;
      } else {
        globalThis.window = originalWindow;
      }
    });

    it('emitter with forceEnabled sends each event to parent as it is emitted', () => {
      const log = createEventLog({ forceEnabled: true });
      log.bindGameState({
        gameId: 'live-001',
        timestamp: 1700000000000,
        quarter: 1,
        clock: 900,
        possession: 'home',
        fieldPos: 25,
        down: 1,
        yardsToGo: 10,
        hScore: 0,
        aScore: 0,
      });

      log.emitGameStart({ homeTeam: 'Hawks', awayTeam: 'Titans', seed: 1 });
      log.emitDriveStart({ driveNum: 1, startFieldPos: 25, team: 'home' });
      log.emitGameEnd({ homeScore: 17, awayScore: 7, winner: 'Hawks', loser: 'Titans' });

      expect(posted).toHaveLength(3);
      expect(posted[0].type).toBe('mfd:game-event');
      expect(posted[0].envelope.eventName).toBe('game_start');
      expect(posted[1].envelope.eventName).toBe('drive_start');
      expect(posted[2].envelope.eventName).toBe('game_end');
    });

    it('emitter bridge is accessible and reports correct emittedCount', () => {
      const log = createEventLog({ forceEnabled: true });
      log.bindGameState({ gameId: 'bridge-test' });
      log.emitGameStart({ homeTeam: 'A', awayTeam: 'B' });
      expect(log.bridge.enabled).toBe(true);
      expect(log.bridge.emittedCount).toBe(1);
    });

    it('emitter reset clears bridge dedup state', () => {
      const log = createEventLog({ forceEnabled: true });
      log.bindGameState({ gameId: 'reset-test' });
      log.emitGameStart({ homeTeam: 'A', awayTeam: 'B' });
      expect(log.bridge.emittedCount).toBe(1);
      log.reset();
      expect(log.bridge.emittedCount).toBe(0);
    });

    it('emitter with forceEnabled false does not post even with mock window', () => {
      const log = createEventLog({ forceEnabled: false });
      log.bindGameState({ gameId: 'standalone-test' });
      log.emitGameStart({ homeTeam: 'A', awayTeam: 'B' });
      expect(posted).toHaveLength(0);
      expect(log.bridge.enabled).toBe(false);
    });
  });

  describe('seq monotonicity', () => {
    it('seq values are strictly monotonically increasing across all events', () => {
      const log = createEventLog();
      log.reset(); // ensure clean seq counter
      log.bindGameState({ gameId: 'mono-test', quarter: 1, clock: 900 });

      log.emitGameStart({ homeTeam: 'A', awayTeam: 'B' });
      log.emitDriveStart({ driveNum: 1, startFieldPos: 25, team: 'home' });
      log.emitPlayCall({ playId: 'x', playLabel: 'X', playType: 'run' });
      log.emitPlayResult({ type: 'run', yards: 5, isRush: true });
      log.emitDriveEnd({ driveNum: 1, result: 'punt' });
      log.emitGameEnd({ homeScore: 0, awayScore: 0, winner: 'A', loser: 'B' });

      const events = log.getEvents();
      for (let i = 1; i < events.length; i++) {
        expect(events[i].seq).toBeGreaterThan(events[i - 1].seq);
      }
    });
  });

  describe('golden game sequence — event name ordering', () => {
    it('golden game starts with game_start and ends with game_end', () => {
      expect(GOLDEN_GAME_EVENTS[0].eventName).toBe('game_start');
      expect(GOLDEN_GAME_EVENTS[GOLDEN_GAME_EVENTS.length - 1].eventName).toBe('game_end');
    });

    it('golden game has monotonically increasing seq', () => {
      for (let i = 1; i < GOLDEN_GAME_EVENTS.length; i++) {
        expect(GOLDEN_GAME_EVENTS[i].seq).toBeGreaterThan(GOLDEN_GAME_EVENTS[i - 1].seq);
      }
    });

    it('golden game exercises all required v0 event types', () => {
      const names = new Set(GOLDEN_GAME_EVENTS.map(e => e.eventName));
      for (const name of Object.values(EVENT_NAMES)) {
        expect(names.has(name)).toBe(true);
      }
    });

    it('golden game emitted live produces the expected ordered event names', () => {
      const posted = [];
      const originalWindow = globalThis.window;
      globalThis.window = {
        parent: {
          postMessage: vi.fn((msg) => { posted.push(msg); }),
        },
      };

      try {
        const log = createEventLog({ forceEnabled: true });
        log.reset();
        log.bindGameState({
          gameId: 'golden-001',
          timestamp: 1700000000000,
          quarter: 0,
          clock: 900,
          possession: '',
          fieldPos: 0,
          down: 0,
          yardsToGo: 0,
          hScore: 0,
          aScore: 0,
        });

        // Replay golden game through emitter
        for (const evt of GOLDEN_GAME_EVENTS) {
          // Update game state from golden event
          log.bindGameState({
            gameId: 'golden-001',
            timestamp: evt.timestamp,
            quarter: evt.quarter,
            clock: evt.clock,
            possession: evt.possession,
            fieldPos: evt.fieldPos,
            down: evt.down,
            yardsToGo: evt.yardsToGo,
            hScore: evt.homeScore,
            aScore: evt.awayScore,
          });
          log.emit(evt.eventName, evt.payload);
        }

        // Verify all posted
        expect(posted).toHaveLength(GOLDEN_GAME_EVENTS.length);

        // Verify order matches
        for (let i = 0; i < posted.length; i++) {
          expect(posted[i].type).toBe('mfd:game-event');
          expect(posted[i].envelope.eventName).toBe(GOLDEN_GAME_EVENTS[i].eventName);
        }

        // Verify seq is monotonic in posted envelopes
        for (let i = 1; i < posted.length; i++) {
          expect(posted[i].envelope.seq).toBeGreaterThan(posted[i - 1].envelope.seq);
        }
      } finally {
        if (originalWindow === undefined) {
          delete globalThis.window;
        } else {
          globalThis.window = originalWindow;
        }
      }
    });
  });

  describe('envelope shape contract', () => {
    it('emitted envelope has all required frozen fields', () => {
      const log = createEventLog();
      log.reset();
      log.bindGameState({
        gameId: 'shape-test',
        timestamp: 1700000000000,
        quarter: 1,
        clock: 900,
        possession: 'home',
        fieldPos: 25,
        down: 1,
        yardsToGo: 10,
        hScore: 0,
        aScore: 0,
      });

      const evt = log.emitGameStart({
        homeTeam: 'Hawks',
        awayTeam: 'Titans',
        seed: 12345,
        week: 5,
        year: 2026,
      });

      const requiredKeys = [
        'schemaVersion', 'eventName', 'seq', 'gameId', 'timestamp',
        'quarter', 'clock', 'possession', 'fieldPos', 'down',
        'yardsToGo', 'homeScore', 'awayScore', 'payload',
      ];

      for (const key of requiredKeys) {
        expect(evt).toHaveProperty(key);
      }

      expect(evt.schemaVersion).toBe('0.1.0');
      expect(evt.eventName).toBe('game_start');
      expect(typeof evt.seq).toBe('number');
      expect(evt.gameId).toBe('shape-test');
      expect(typeof evt.timestamp).toBe('number');
    });

    it('mfd:game-event message shape wraps envelope correctly', () => {
      const posted = [];
      const originalWindow = globalThis.window;
      globalThis.window = {
        parent: { postMessage: vi.fn((msg) => { posted.push(msg); }) },
      };

      try {
        const log = createEventLog({ forceEnabled: true });
        log.reset();
        log.bindGameState({ gameId: 'msg-shape-test' });
        log.emitGameStart({ homeTeam: 'A', awayTeam: 'B' });

        expect(posted).toHaveLength(1);
        const msg = posted[0];
        expect(msg.type).toBe('mfd:game-event');
        expect(msg.envelope).toBeDefined();
        expect(msg.envelope.schemaVersion).toBe(SCHEMA_VERSION);
        expect(msg.envelope.eventName).toBe('game_start');
        expect(msg.envelope.payload.homeTeam).toBe('A');
      } finally {
        if (originalWindow === undefined) {
          delete globalThis.window;
        } else {
          globalThis.window = originalWindow;
        }
      }
    });
  });
});
