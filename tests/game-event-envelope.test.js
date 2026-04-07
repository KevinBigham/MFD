import { describe, expect, it, beforeEach } from 'vitest';

import { buildEnvelope, resetSeq } from '../src/systems/events/envelope.js';
import { SCHEMA_VERSION } from '../src/systems/events/event-types.js';

describe('envelope.js', () => {
  beforeEach(() => {
    resetSeq();
  });

  const mockGameState = {
    gameId: 'test-001',
    timestamp: 1700000000000,
    quarter: 2,
    clock: 450,
    possession: 'home',
    fieldPos: 35,
    down: 2,
    yardsToGo: 7,
    hScore: 14,
    aScore: 10,
  };

  it('builds an envelope with all required top-level fields', () => {
    const env = buildEnvelope('play_result', mockGameState, { yards: 8 });
    expect(env).toHaveProperty('schemaVersion', SCHEMA_VERSION);
    expect(env).toHaveProperty('eventName', 'play_result');
    expect(env).toHaveProperty('seq', 1);
    expect(env).toHaveProperty('gameId', 'test-001');
    expect(env).toHaveProperty('timestamp', 1700000000000);
    expect(env).toHaveProperty('quarter', 2);
    expect(env).toHaveProperty('clock', 450);
    expect(env).toHaveProperty('possession', 'home');
    expect(env).toHaveProperty('fieldPos', 35);
    expect(env).toHaveProperty('down', 2);
    expect(env).toHaveProperty('yardsToGo', 7);
    expect(env).toHaveProperty('homeScore', 14);
    expect(env).toHaveProperty('awayScore', 10);
    expect(env).toHaveProperty('payload');
    expect(env.payload.yards).toBe(8);
  });

  it('increments seq monotonically', () => {
    const e1 = buildEnvelope('play_call', mockGameState, {});
    const e2 = buildEnvelope('play_result', mockGameState, {});
    const e3 = buildEnvelope('drive_end', mockGameState, {});
    expect(e1.seq).toBe(1);
    expect(e2.seq).toBe(2);
    expect(e3.seq).toBe(3);
  });

  it('resetSeq resets the sequence counter', () => {
    buildEnvelope('play_call', mockGameState, {});
    buildEnvelope('play_result', mockGameState, {});
    resetSeq();
    const e = buildEnvelope('drive_start', mockGameState, {});
    expect(e.seq).toBe(1);
  });

  it('handles missing game state fields gracefully', () => {
    const env = buildEnvelope('game_start', {}, { homeTeam: 'Hawks' });
    expect(env.gameId).toBe('unknown');
    expect(env.quarter).toBe(0);
    expect(env.clock).toBe(0);
    expect(env.possession).toBe('');
    expect(env.fieldPos).toBe(0);
    expect(env.down).toBe(0);
    expect(env.yardsToGo).toBe(0);
    expect(env.homeScore).toBe(0);
    expect(env.awayScore).toBe(0);
  });

  it('envelope payload is exactly what was passed in', () => {
    const payload = { type: 'touchdown', points: 7, team: 'home' };
    const env = buildEnvelope('score', mockGameState, payload);
    expect(env.payload).toEqual(payload);
  });

  it('envelope is a plain serializable object', () => {
    const env = buildEnvelope('play_result', mockGameState, { yards: 5, player: 'Bell' });
    const json = JSON.stringify(env);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(env);
  });

  it('handles null payload gracefully', () => {
    const env = buildEnvelope('game_start', mockGameState, null);
    expect(env.payload).toEqual({});
  });

  it('schemaVersion matches the contract', () => {
    const env = buildEnvelope('test', mockGameState, {});
    expect(env.schemaVersion).toBe('0.1.0');
  });

  it('timestamp comes from gameState, not Date.now()', () => {
    const gs = { ...mockGameState, timestamp: 9999999 };
    const env = buildEnvelope('test', gs, {});
    expect(env.timestamp).toBe(9999999);
  });

  it('produces deterministic output given same inputs and seq', () => {
    resetSeq();
    const e1 = buildEnvelope('play_result', mockGameState, { yards: 5 });
    resetSeq();
    const e2 = buildEnvelope('play_result', mockGameState, { yards: 5 });
    expect(e1).toEqual(e2);
  });
});
