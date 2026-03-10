/**
 * MFD Live Bridge Tests
 *
 * Verifies embedded emit, standalone safety, monotonic seq,
 * ordered event sequences, and documented shape parity.
 *
 * Note: createEventLog already handles postMessage via parent-bridge.js.
 * createLiveBridge adds diagnostics (emitCount, lastSeq, onEmit callback).
 */

import { describe, expect, it, vi } from 'vitest';
import { createLiveBridge, MESSAGE_TYPE } from '../src/systems/events/live-bridge.js';
import { EVENT_NAMES, SCHEMA_VERSION } from '../src/systems/events/event-types.js';
import { resetSeq } from '../src/systems/events/envelope.js';

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function makeGameState(overrides = {}) {
  return {
    gameId: 'test-001',
    timestamp: 1700000000000,
    quarter: 1,
    clock: 900,
    possession: 'home',
    fieldPos: 25,
    down: 1,
    yardsToGo: 10,
    hScore: 0,
    aScore: 0,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════
// Standalone safety
// ═══════════════════════════════════════════════

describe('live-bridge: standalone safety', () => {
  it('creates a bridge without errors in Node/test environment', () => {
    resetSeq();
    const bridge = createLiveBridge();
    expect(bridge).toBeDefined();
    expect(bridge.liveBridge.embedded).toBe(false);
  });

  it('emits events to in-memory log when standalone', () => {
    resetSeq();
    const bridge = createLiveBridge();
    bridge.bindGameState(makeGameState());
    bridge.emitGameStart({
      homeTeam: 'Hawks', awayTeam: 'Titans',
      weather: { temp: 72, precip: 'DOME', wind: 0 },
      seed: 1, week: 1, year: 2026,
    });
    const events = bridge.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventName).toBe('game_start');
  });

  it('does not throw when standalone and emitting many events', () => {
    resetSeq();
    const bridge = createLiveBridge();
    bridge.bindGameState(makeGameState());
    expect(() => {
      for (let i = 0; i < 50; i++) {
        bridge.emit('play_result', { type: 'run', yards: 5 });
      }
    }).not.toThrow();
    expect(bridge.liveBridge.emitCount).toBe(50);
  });

  it('parent-bridge reports not enabled in test environment', () => {
    resetSeq();
    const bridge = createLiveBridge();
    expect(bridge.bridge.enabled).toBe(false);
  });
});

// ═══════════════════════════════════════════════
// Forced-enabled mode (simulating embedded)
// ═══════════════════════════════════════════════

describe('live-bridge: forced-enabled mode', () => {
  it('reports embedded when forceEnabled is true', () => {
    resetSeq();
    const bridge = createLiveBridge({ forceEnabled: true });
    expect(bridge.liveBridge.embedded).toBe(true);
    expect(bridge.bridge.enabled).toBe(true);
  });

  it('fires onEmit callback with each envelope', () => {
    resetSeq();
    const emitted = [];
    const bridge = createLiveBridge({
      onEmit: (env) => emitted.push(env),
    });
    bridge.bindGameState(makeGameState());
    bridge.emit('game_start', { homeTeam: 'A', awayTeam: 'B' });
    bridge.emit('drive_start', { driveNum: 1, startFieldPos: 25, team: 'home' });

    expect(emitted).toHaveLength(2);
    expect(emitted[0].eventName).toBe('game_start');
    expect(emitted[1].eventName).toBe('drive_start');
  });
});

// ═══════════════════════════════════════════════
// Monotonic seq
// ═══════════════════════════════════════════════

describe('live-bridge: monotonic seq', () => {
  it('seq is strictly increasing across all emits', () => {
    resetSeq();
    const bridge = createLiveBridge();
    bridge.bindGameState(makeGameState());

    const envelopes = [];
    envelopes.push(bridge.emitGameStart({ homeTeam: 'A', awayTeam: 'B', seed: 1, week: 1, year: 2026 }));
    envelopes.push(bridge.emitDriveStart({ driveNum: 1, startFieldPos: 25, team: 'home' }));
    envelopes.push(bridge.emitPlayCall({ playId: 'hb_dive', playLabel: 'HB Dive', playType: 'run' }));
    envelopes.push(bridge.emitPlayResult({ type: 'run', yards: 5, player: 'Bell' }));
    envelopes.push(bridge.emitGameEnd({ homeScore: 7, awayScore: 0, winner: 'A', loser: 'B' }));

    for (let i = 1; i < envelopes.length; i++) {
      expect(envelopes[i].seq).toBeGreaterThan(envelopes[i - 1].seq);
    }
  });

  it('liveBridge.lastSeq tracks the most recent seq', () => {
    resetSeq();
    const bridge = createLiveBridge();
    bridge.bindGameState(makeGameState());

    expect(bridge.liveBridge.lastSeq).toBe(0);
    bridge.emit('game_start', {});
    expect(bridge.liveBridge.lastSeq).toBe(1);
    bridge.emit('drive_start', {});
    expect(bridge.liveBridge.lastSeq).toBe(2);
  });

  it('reset clears seq counters and bridge diagnostics', () => {
    resetSeq();
    const bridge = createLiveBridge();
    bridge.bindGameState(makeGameState());
    bridge.emit('game_start', {});
    bridge.emit('drive_start', {});
    expect(bridge.liveBridge.emitCount).toBe(2);
    expect(bridge.liveBridge.lastSeq).toBe(2);

    bridge.reset();
    expect(bridge.liveBridge.emitCount).toBe(0);
    expect(bridge.liveBridge.lastSeq).toBe(0);
    expect(bridge.getEvents()).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════
// Ordered representative event sequence
// ═══════════════════════════════════════════════

describe('live-bridge: ordered event sequence', () => {
  it('emits a representative 7-event scoring drive in correct order', () => {
    resetSeq();
    const bridge = createLiveBridge();
    const gs = makeGameState();
    bridge.bindGameState(gs);

    // 1. game_start
    bridge.emitGameStart({
      homeTeam: 'Hawks', awayTeam: 'Titans',
      weather: { temp: 72, precip: 'DOME', wind: 0 },
      seed: 12345, week: 5, year: 2026,
    });

    // 2. drive_start
    bridge.emitDriveStart({ driveNum: 1, startFieldPos: 25, team: 'home', startClock: 900, startQuarter: 1 });

    // 3. play_call
    bridge.emitPlayCall({ playId: 'go_route', playLabel: 'Go Route', playType: 'pass', isUserCall: true });

    // 4. pressure_resolution
    bridge.emitPressureResolution({ pressured: true, sacked: false, rusher: 'DE Storm', timeInPocket: 2.1 });

    // 5. play_result — TD
    bridge.emitPlayResult({
      type: 'complete', yards: 75, player: 'Swift', passer: 'Cannon',
      desc: 'Touchdown!', big: true, touchdown: true,
    });

    // 6. score
    bridge.emitScore({ type: 'touchdown', points: 7, team: 'home', player: 'Swift', desc: 'TD', homeScore: 7, awayScore: 0 });

    // 7. drive_end
    bridge.emitDriveEnd({ driveNum: 1, result: 'touchdown', plays: 1, yards: 75, timeUsed: 30, startFieldPos: 25, endFieldPos: 100 });

    // Verify order
    const events = bridge.getEvents();
    expect(events).toHaveLength(7);
    const names = events.map(e => e.eventName);
    expect(names).toEqual([
      'game_start', 'drive_start', 'play_call',
      'pressure_resolution', 'play_result', 'score', 'drive_end',
    ]);

    // Verify monotonic seq
    for (let i = 1; i < events.length; i++) {
      expect(events[i].seq).toBe(events[i - 1].seq + 1);
    }

    // Verify stable gameId
    const gameId = events[0].gameId;
    for (const e of events) {
      expect(e.gameId).toBe(gameId);
    }

    // Verify liveBridge diagnostics
    expect(bridge.liveBridge.emitCount).toBe(7);
    expect(bridge.liveBridge.lastSeq).toBe(7);
  });
});

// ═══════════════════════════════════════════════
// Documented shape parity
// ═══════════════════════════════════════════════

describe('live-bridge: shape parity with 0.1.0 contract', () => {
  const ENVELOPE_KEYS = [
    'schemaVersion', 'eventName', 'seq', 'gameId', 'timestamp',
    'quarter', 'clock', 'possession', 'fieldPos', 'down',
    'yardsToGo', 'homeScore', 'awayScore', 'payload',
  ];

  it('every bridged envelope has exactly 14 documented keys', () => {
    resetSeq();
    const bridge = createLiveBridge();
    bridge.bindGameState(makeGameState());

    bridge.emitGameStart({ homeTeam: 'A', awayTeam: 'B', seed: 1, week: 1, year: 2026 });
    bridge.emitDriveStart({ driveNum: 1, startFieldPos: 25, team: 'home' });
    bridge.emitPlayResult({ type: 'run', yards: 5 });

    for (const evt of bridge.getEvents()) {
      expect(Object.keys(evt)).toEqual(ENVELOPE_KEYS);
    }
  });

  it('bridged envelopes use frozen schemaVersion 0.1.0', () => {
    resetSeq();
    const bridge = createLiveBridge();
    bridge.bindGameState(makeGameState());
    const env = bridge.emit('game_start', {});
    expect(env.schemaVersion).toBe('0.1.0');
  });

  it('MESSAGE_TYPE constant is mfd:game-event', () => {
    expect(MESSAGE_TYPE).toBe('mfd:game-event');
  });

  it('liveBridge diagnostics expose correct initial state', () => {
    resetSeq();
    const bridge = createLiveBridge();
    expect(bridge.liveBridge.embedded).toBe(false);
    expect(bridge.liveBridge.emitCount).toBe(0);
    expect(bridge.liveBridge.lastSeq).toBe(0);
    expect(bridge.liveBridge.messageType).toBe('mfd:game-event');
  });
});
