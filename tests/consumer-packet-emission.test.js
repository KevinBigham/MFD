/**
 * MFD Consumer Packet Emission Tests
 *
 * Verifies that emitGameEnd triggers a single mfd:consumer-packet
 * postMessage containing weeklyHook and postgameAutopsy built from
 * producer-side builders. Covers embedded emit, standalone no-op,
 * packet shape parity, game_end snapshot correctness, and dedup.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createEventLog } from '../src/systems/events/emitter.js';
import { createParentBridge } from '../src/systems/events/parent-bridge.js';
import { SCHEMA_VERSION, EVENT_NAMES } from '../src/systems/events/event-types.js';
import { buildWeeklyHook } from '../src/systems/events/weekly-hook.js';
import { buildPostgameAutopsy } from '../src/systems/events/postgame-autopsy.js';
import { GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT } from './fixtures/game-events/golden-game.js';

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function makeGameState(overrides = {}) {
  return {
    gameId: 'cptest-001',
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

function makeContext(overrides = {}) {
  return {
    userSide: 'home',
    homeTeam: 'Hawks',
    awayTeam: 'Titans',
    week: 5,
    year: 2026,
    opponent: 'Titans',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════
// parent-bridge: emitConsumerPacket unit tests
// ═══════════════════════════════════════════════

describe('consumer-packet: parent-bridge emitConsumerPacket', () => {
  let posted;
  let originalWindow;

  beforeEach(() => {
    posted = [];
    originalWindow = globalThis.window;
    globalThis.window = {
      parent: {
        postMessage: vi.fn((msg, origin) => { posted.push({ msg, origin }); }),
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

  it('emitConsumerPacket posts mfd:consumer-packet when enabled', () => {
    const bridge = createParentBridge({ forceEnabled: true });
    const packet = { schemaVersion: '0.1.0', context: {}, envelope: {}, weeklyHook: {}, postgameAutopsy: {} };
    const result = bridge.emitConsumerPacket(packet);

    expect(result).toBe(true);
    expect(posted).toHaveLength(1);
    expect(posted[0].msg.type).toBe('mfd:consumer-packet');
    expect(posted[0].msg.packet).toEqual(packet);
  });

  it('emitConsumerPacket returns false when disabled (standalone)', () => {
    const bridge = createParentBridge({ forceEnabled: false });
    const result = bridge.emitConsumerPacket({ schemaVersion: '0.1.0' });
    expect(result).toBe(false);
    expect(posted).toHaveLength(0);
  });

  it('emitConsumerPacket fires at most once per bridge lifecycle', () => {
    const bridge = createParentBridge({ forceEnabled: true });
    const packet = { schemaVersion: '0.1.0' };

    expect(bridge.emitConsumerPacket(packet)).toBe(true);
    expect(bridge.emitConsumerPacket(packet)).toBe(false); // deduped
    expect(posted).toHaveLength(1);
    expect(bridge.consumerPacketSent).toBe(true);
  });

  it('reset allows consumer packet to be re-sent', () => {
    const bridge = createParentBridge({ forceEnabled: true });
    bridge.emitConsumerPacket({ schemaVersion: '0.1.0' });
    expect(bridge.consumerPacketSent).toBe(true);

    bridge.reset();
    expect(bridge.consumerPacketSent).toBe(false);

    expect(bridge.emitConsumerPacket({ schemaVersion: '0.1.0' })).toBe(true);
    expect(posted).toHaveLength(2);
  });

  it('emitConsumerPacket rejects null/non-object', () => {
    const bridge = createParentBridge({ forceEnabled: true });
    expect(bridge.emitConsumerPacket(null)).toBe(false);
    expect(bridge.emitConsumerPacket(undefined)).toBe(false);
    expect(bridge.emitConsumerPacket('string')).toBe(false);
    expect(posted).toHaveLength(0);
  });

  it('uses custom targetOrigin', () => {
    const bridge = createParentBridge({ forceEnabled: true, targetOrigin: 'https://mfd.test' });
    bridge.emitConsumerPacket({ schemaVersion: '0.1.0' });
    expect(posted[0].origin).toBe('https://mfd.test');
  });

  it('survives postMessage throwing', () => {
    globalThis.window.parent.postMessage = () => { throw new Error('blocked'); };
    const bridge = createParentBridge({ forceEnabled: true });
    expect(bridge.emitConsumerPacket({ schemaVersion: '0.1.0' })).toBe(false);
  });
});

// ═══════════════════════════════════════════════
// emitter integration: game_end triggers consumer packet
// ═══════════════════════════════════════════════

describe('consumer-packet: emitter integration', () => {
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

  it('emitGameEnd posts consumer packet when context is bound', () => {
    const log = createEventLog({ forceEnabled: true });
    log.reset();
    log.bindGameState(makeGameState());
    log.bindContext(makeContext());

    log.emitGameStart({ homeTeam: 'Hawks', awayTeam: 'Titans', seed: 1, week: 5, year: 2026 });
    log.emitGameEnd({ homeScore: 17, awayScore: 7, winner: 'Hawks', loser: 'Titans' });

    // Should have: game_start event + game_end event + consumer packet = 3 messages
    const eventMessages = posted.filter(m => m.type === 'mfd:game-event');
    const packetMessages = posted.filter(m => m.type === 'mfd:consumer-packet');

    expect(eventMessages).toHaveLength(2);
    expect(packetMessages).toHaveLength(1);
  });

  it('consumer packet has correct shape', () => {
    const log = createEventLog({ forceEnabled: true });
    log.reset();
    log.bindGameState(makeGameState());
    log.bindContext(makeContext());

    log.emitGameStart({ homeTeam: 'Hawks', awayTeam: 'Titans', seed: 1, week: 5, year: 2026 });
    log.emitGameEnd({ homeScore: 17, awayScore: 7, winner: 'Hawks', loser: 'Titans' });

    const packetMsg = posted.find(m => m.type === 'mfd:consumer-packet');
    expect(packetMsg).toBeDefined();

    const packet = packetMsg.packet;
    expect(packet.schemaVersion).toBe('0.1.0');
    expect(packet.context).toEqual(makeContext());
    expect(packet.envelope.eventName).toBe('game_end');
    expect(packet).toHaveProperty('weeklyHook');
    expect(packet).toHaveProperty('postgameAutopsy');
  });

  it('consumer packet is NOT emitted when context is not bound', () => {
    const log = createEventLog({ forceEnabled: true });
    log.reset();
    log.bindGameState(makeGameState());
    // No bindContext call

    log.emitGameStart({ homeTeam: 'Hawks', awayTeam: 'Titans', seed: 1, week: 5, year: 2026 });
    log.emitGameEnd({ homeScore: 17, awayScore: 7, winner: 'Hawks', loser: 'Titans' });

    const packetMessages = posted.filter(m => m.type === 'mfd:consumer-packet');
    expect(packetMessages).toHaveLength(0);
  });

  it('consumer packet is NOT emitted in standalone mode', () => {
    const log = createEventLog({ forceEnabled: false });
    log.reset();
    log.bindGameState(makeGameState());
    log.bindContext(makeContext());

    log.emitGameStart({ homeTeam: 'Hawks', awayTeam: 'Titans', seed: 1 });
    log.emitGameEnd({ homeScore: 17, awayScore: 7, winner: 'Hawks', loser: 'Titans' });

    expect(posted).toHaveLength(0);
  });

  it('emitGameEnd still returns the game_end envelope', () => {
    const log = createEventLog({ forceEnabled: true });
    log.reset();
    log.bindGameState(makeGameState());
    log.bindContext(makeContext());

    log.emitGameStart({ homeTeam: 'Hawks', awayTeam: 'Titans', seed: 1, week: 5, year: 2026 });
    const envelope = log.emitGameEnd({ homeScore: 17, awayScore: 7, winner: 'Hawks', loser: 'Titans' });

    expect(envelope.eventName).toBe('game_end');
    expect(envelope.schemaVersion).toBe('0.1.0');
  });
});

// ═══════════════════════════════════════════════
// Shape parity: consumer packet matches builder output
// ═══════════════════════════════════════════════

describe('consumer-packet: shape parity with builders', () => {
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

  it('golden game replay produces consumer packet matching direct builder calls', () => {
    const log = createEventLog({ forceEnabled: true });
    log.reset();
    log.bindContext(GOLDEN_GAME_CONTEXT);

    // Replay golden game through emitter
    for (const evt of GOLDEN_GAME_EVENTS) {
      log.bindGameState({
        gameId: evt.gameId,
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

      if (evt.eventName === 'game_end') {
        log.emitGameEnd(evt.payload);
      } else {
        log.emit(evt.eventName, evt.payload);
      }
    }

    const packetMsg = posted.find(m => m.type === 'mfd:consumer-packet');
    expect(packetMsg).toBeDefined();

    const packet = packetMsg.packet;

    // Verify context
    expect(packet.context).toEqual(GOLDEN_GAME_CONTEXT);

    // Verify schemaVersion
    expect(packet.schemaVersion).toBe(SCHEMA_VERSION);

    // Verify envelope is game_end
    expect(packet.envelope.eventName).toBe('game_end');

    // Verify weeklyHook matches direct builder call
    const directHook = buildWeeklyHook(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);
    // Note: the emitter rebuilds events from its own emit() calls, so seq/timestamps differ.
    // We verify structural shape parity — same keys, same types, same scores.
    expect(Object.keys(packet.weeklyHook).sort()).toEqual(Object.keys(directHook).sort());
    expect(packet.weeklyHook.homeScore).toBe(directHook.homeScore);
    expect(packet.weeklyHook.awayScore).toBe(directHook.awayScore);
    expect(packet.weeklyHook.result).toBe(directHook.result);
    expect(packet.weeklyHook.opponent).toBe(directHook.opponent);
    expect(typeof packet.weeklyHook.mvp.name).toBe('string');
    expect(typeof packet.weeklyHook.mvp.stat).toBe('string');

    // Verify postgameAutopsy matches direct builder call — same keys
    const directAutopsy = buildPostgameAutopsy(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);
    expect(Object.keys(packet.postgameAutopsy).sort()).toEqual(Object.keys(directAutopsy).sort());
    expect(packet.postgameAutopsy.summary).toBe(directAutopsy.summary);
    expect(packet.postgameAutopsy.phases).toHaveLength(4);
    expect(packet.postgameAutopsy.coachingGrade.grade).toBe(directAutopsy.coachingGrade.grade);
  });

  it('consumer packet weeklyHook has all required keys', () => {
    const log = createEventLog({ forceEnabled: true });
    log.reset();
    log.bindGameState(makeGameState());
    log.bindContext(makeContext());

    log.emitGameStart({ homeTeam: 'Hawks', awayTeam: 'Titans', seed: 1, week: 5, year: 2026 });
    log.emitGameEnd({ homeScore: 0, awayScore: 0, winner: 'Hawks', loser: 'Titans' });

    const packet = posted.find(m => m.type === 'mfd:consumer-packet').packet;
    const requiredHookKeys = [
      'week', 'year', 'opponent', 'result', 'homeScore', 'awayScore',
      'headlines', 'keyPlays', 'injuries', 'turnovers', 'mvp',
      'driveEfficiency', 'pressureRate', 'rzEff', 'coverageWin', 'runLaneAdv',
    ];
    for (const key of requiredHookKeys) {
      expect(packet.weeklyHook).toHaveProperty(key);
    }
  });

  it('consumer packet postgameAutopsy has all required keys', () => {
    const log = createEventLog({ forceEnabled: true });
    log.reset();
    log.bindGameState(makeGameState());
    log.bindContext(makeContext());

    log.emitGameStart({ homeTeam: 'Hawks', awayTeam: 'Titans', seed: 1, week: 5, year: 2026 });
    log.emitGameEnd({ homeScore: 0, awayScore: 0, winner: 'Hawks', loser: 'Titans' });

    const packet = posted.find(m => m.type === 'mfd:consumer-packet').packet;
    const requiredAutopsyKeys = [
      'summary', 'phases', 'trenchReport', 'pressureReport',
      'turnoverBattle', 'bigPlays', 'missedOpportunities',
      'adjustmentImpact', 'playerGrades', 'coachingGrade',
    ];
    for (const key of requiredAutopsyKeys) {
      expect(packet.postgameAutopsy).toHaveProperty(key);
    }
  });

  it('mfd:consumer-packet message has exactly type and packet keys', () => {
    const log = createEventLog({ forceEnabled: true });
    log.reset();
    log.bindGameState(makeGameState());
    log.bindContext(makeContext());

    log.emitGameStart({ homeTeam: 'Hawks', awayTeam: 'Titans', seed: 1, week: 5, year: 2026 });
    log.emitGameEnd({ homeScore: 0, awayScore: 0, winner: 'Hawks', loser: 'Titans' });

    const packetMsg = posted.find(m => m.type === 'mfd:consumer-packet');
    expect(Object.keys(packetMsg).sort()).toEqual(['packet', 'type']);
  });
});
