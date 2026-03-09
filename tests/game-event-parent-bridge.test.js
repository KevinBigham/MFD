import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { createParentBridge, isEmbeddedContext } from '../src/systems/events/parent-bridge.js';
import { createEventLog } from '../src/systems/events/emitter.js';
import { resetSeq } from '../src/systems/events/envelope.js';

describe('parent-bridge.js', () => {
  beforeEach(() => {
    resetSeq();
  });

  // ── isEmbeddedContext ──

  it('returns false in Node/test (no window.parent iframe)', () => {
    expect(isEmbeddedContext()).toBe(false);
  });

  // ── Standalone safety ──

  it('standalone bridge is disabled and emitToParent returns false', () => {
    const bridge = createParentBridge();
    expect(bridge.enabled).toBe(false);
    expect(bridge.emitToParent({ seq: 1, eventName: 'game_start' })).toBe(false);
    expect(bridge.emittedCount).toBe(0);
  });

  it('standalone bridge does not throw on any envelope input', () => {
    const bridge = createParentBridge();
    expect(() => bridge.emitToParent(null)).not.toThrow();
    expect(() => bridge.emitToParent(undefined)).not.toThrow();
    expect(() => bridge.emitToParent(42)).not.toThrow();
    expect(() => bridge.emitToParent('bad')).not.toThrow();
    expect(() => bridge.emitToParent({})).not.toThrow();
  });

  // ── Forced-enabled bridge (simulates embedded) ──

  describe('forceEnabled bridge (embedded simulation)', () => {
    let postMessageSpy;

    beforeEach(() => {
      postMessageSpy = vi.fn();
      // Simulate embedded context
      globalThis.window = {
        parent: {
          postMessage: postMessageSpy,
        },
      };
    });

    it('emits envelope to parent when enabled', () => {
      const bridge = createParentBridge({ forceEnabled: true });
      const envelope = { seq: 1, eventName: 'game_start', schemaVersion: '0.1.0' };
      const result = bridge.emitToParent(envelope);

      expect(result).toBe(true);
      expect(bridge.enabled).toBe(true);
      expect(bridge.emittedCount).toBe(1);
      expect(postMessageSpy).toHaveBeenCalledWith(
        { type: 'mfd:game-event', envelope },
        '*',
      );
    });

    it('respects custom targetOrigin', () => {
      const bridge = createParentBridge({
        forceEnabled: true,
        targetOrigin: 'https://mfd.example.com',
      });
      bridge.emitToParent({ seq: 1, eventName: 'test' });
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.anything(),
        'https://mfd.example.com',
      );
    });

    it('deduplicates by seq — same seq emitted only once', () => {
      const bridge = createParentBridge({ forceEnabled: true });
      const envelope = { seq: 1, eventName: 'game_start' };

      expect(bridge.emitToParent(envelope)).toBe(true);
      expect(bridge.emitToParent(envelope)).toBe(false);
      expect(bridge.emittedCount).toBe(1);
      expect(postMessageSpy).toHaveBeenCalledTimes(1);
    });

    it('allows different seqs', () => {
      const bridge = createParentBridge({ forceEnabled: true });
      expect(bridge.emitToParent({ seq: 1, eventName: 'a' })).toBe(true);
      expect(bridge.emitToParent({ seq: 2, eventName: 'b' })).toBe(true);
      expect(bridge.emittedCount).toBe(2);
      expect(postMessageSpy).toHaveBeenCalledTimes(2);
    });

    it('reset clears dedup state so seq can be reused', () => {
      const bridge = createParentBridge({ forceEnabled: true });
      bridge.emitToParent({ seq: 1, eventName: 'a' });
      expect(bridge.emittedCount).toBe(1);

      bridge.reset();
      expect(bridge.emittedCount).toBe(0);

      expect(bridge.emitToParent({ seq: 1, eventName: 'a' })).toBe(true);
      expect(bridge.emittedCount).toBe(1);
    });

    it('rejects null/non-object envelopes even when enabled', () => {
      const bridge = createParentBridge({ forceEnabled: true });
      expect(bridge.emitToParent(null)).toBe(false);
      expect(bridge.emitToParent(undefined)).toBe(false);
      expect(bridge.emitToParent('string')).toBe(false);
      expect(bridge.emittedCount).toBe(0);
    });

    afterEach(() => {
      delete globalThis.window;
    });
  });

  // ── Integration: emitter → bridge ──

  it('emitter emits live to bridge when forceEnabled', () => {
    const postMessageSpy = vi.fn();
    globalThis.window = {
      parent: { postMessage: postMessageSpy },
    };

    try {
      const log = createEventLog({ forceEnabled: true });
      log.bindGameState({
        gameId: 'bridge-test-001',
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

      log.emitGameStart({ homeTeam: 'Hawks', awayTeam: 'Titans' });

      expect(log.bridge.enabled).toBe(true);
      expect(log.bridge.emittedCount).toBe(1);
      expect(postMessageSpy).toHaveBeenCalledTimes(1);

      const msg = postMessageSpy.mock.calls[0][0];
      expect(msg.type).toBe('mfd:game-event');
      expect(msg.envelope.eventName).toBe('game_start');
      expect(msg.envelope.gameId).toBe('bridge-test-001');
      expect(msg.envelope.schemaVersion).toBe('0.1.0');
    } finally {
      delete globalThis.window;
    }
  });

  it('emitter works silently when bridge is disabled (standalone)', () => {
    const log = createEventLog();
    log.bindGameState({
      gameId: 'standalone-test-001',
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

    // Should not throw in standalone
    log.emitGameStart({ homeTeam: 'Hawks', awayTeam: 'Titans' });
    log.emitPlayResult({ type: 'run', yards: 5, player: 'Bell', isRush: true });
    log.emitGameEnd({ homeScore: 7, awayScore: 0, winner: 'Hawks', loser: 'Titans' });

    expect(log.getEvents()).toHaveLength(3);
    expect(log.bridge.enabled).toBe(false);
    expect(log.bridge.emittedCount).toBe(0);
  });
});
