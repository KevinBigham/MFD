import { describe, expect, it, beforeEach } from 'vitest';

import { createEventLog } from '../src/systems/events/emitter.js';
import { resetSeq } from '../src/systems/events/envelope.js';
import { SCHEMA_VERSION, EVENT_NAME_LIST } from '../src/systems/events/event-types.js';

/**
 * Ordered-sequence invariants for the MFD game event spine.
 *
 * These tests verify the producer-side guarantees that consumers depend on:
 * - stable gameId per session
 * - monotonic seq ordering
 * - game_start is always first, game_end is always last
 * - no duplicate seq values
 * - all eventNames are from the canonical list
 * - envelope shape parity (all 14 fields present)
 */
describe('game event sequence invariants', () => {
  let log;
  const gameId = 'inv-test-001';

  function makeGs(overrides) {
    return {
      gameId,
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

  beforeEach(() => {
    resetSeq();
    log = createEventLog();
    log.bindGameState(makeGs());
  });

  function emitRepresentativeGame() {
    log.emitGameStart({ homeTeam: 'Hawks', awayTeam: 'Titans', seed: 42, week: 1, year: 2026 });

    // Drive 1
    log.bindGameState(makeGs({ quarter: 1, clock: 900, possession: 'home', down: 1, yardsToGo: 10, fieldPos: 25 }));
    log.emitDriveStart({ driveNum: 1, startFieldPos: 25, team: 'home', startClock: 900, startQuarter: 1 });
    log.emitPlayCall({ playId: 'hb_dive', playLabel: 'HB Dive', playType: 'run' });
    log.emitTrenchResolution({ olGrade: 72, dlGrade: 65, runLaneOpen: true, pocketIntact: true });
    log.emitPlayResult({ type: 'run', yards: 8, player: 'Bell', isRush: true, firstDown: false });

    log.bindGameState(makeGs({ quarter: 1, clock: 860, possession: 'home', down: 2, yardsToGo: 2, fieldPos: 33 }));
    log.emitPlayCall({ playId: 'pa_post', playLabel: 'PA Post', playType: 'pass' });
    log.emitPressureResolution({ pressured: false, sacked: false });
    log.emitPlayResult({ type: 'complete', yards: 22, player: 'Swift', passer: 'Cannon', firstDown: true, big: true });

    log.bindGameState(makeGs({ quarter: 1, clock: 830, possession: 'home', down: 1, yardsToGo: 10, fieldPos: 55 }));
    log.emitPlayCall({ playId: 'hb_stretch', playLabel: 'HB Stretch', playType: 'run' });
    log.emitPlayResult({ type: 'run', yards: 45, player: 'Bell', isRush: true, touchdown: true, big: true });
    log.emitScore({ type: 'touchdown', points: 7, team: 'home', player: 'Bell', homeScore: 7, awayScore: 0 });
    log.emitDriveEnd({ driveNum: 1, result: 'touchdown', plays: 3, yards: 75, timeUsed: 90 });

    // Drive 2 — away turnover
    log.bindGameState(makeGs({ quarter: 1, clock: 740, possession: 'away', down: 1, yardsToGo: 10, fieldPos: 30, hScore: 7 }));
    log.emitDriveStart({ driveNum: 2, startFieldPos: 30, team: 'away', startClock: 740, startQuarter: 1 });
    log.emitPlayCall({ playId: 'mesh_cross', playLabel: 'Mesh Cross', playType: 'pass' });
    log.emitPressureResolution({ pressured: true, sacked: false, rusher: 'Watts' });
    log.emitPlayResult({ type: 'incomplete', yards: 0, passer: 'Rivers' });
    log.emitTurnover({ type: 'interception', player: 'Rivers', forcedBy: 'Thomas', fieldPos: 35 });
    log.emitDriveEnd({ driveNum: 2, result: 'turnover', plays: 1, yards: 0, timeUsed: 12 });

    // Halftime
    log.bindGameState(makeGs({ quarter: 2, clock: 0, possession: '', hScore: 7, aScore: 0 }));
    log.emitHalftimeAdjustment({ adjustmentId: 'blitz_heavy', adjustmentLabel: 'Blitz Heavy', defEdge: 4, scoreDiff: 7 });

    // Game end
    log.bindGameState(makeGs({ quarter: 4, clock: 0, possession: '', hScore: 17, aScore: 7 }));
    log.emitGameEnd({ homeScore: 17, awayScore: 7, winner: 'Hawks', loser: 'Titans', totalPlays: 50, mvp: 'Cannon' });

    return log.getEvents();
  }

  // ── Stable gameId ──

  it('every event in a session has the same gameId', () => {
    const events = emitRepresentativeGame();
    for (const evt of events) {
      expect(evt.gameId).toBe(gameId);
    }
  });

  // ── Monotonic seq ──

  it('seq values are strictly monotonically increasing', () => {
    const events = emitRepresentativeGame();
    for (let i = 1; i < events.length; i++) {
      expect(events[i].seq).toBeGreaterThan(events[i - 1].seq);
    }
  });

  it('seq starts at 1', () => {
    const events = emitRepresentativeGame();
    expect(events[0].seq).toBe(1);
  });

  // ── No duplicate seq ──

  it('no duplicate seq values', () => {
    const events = emitRepresentativeGame();
    const seqs = events.map(e => e.seq);
    expect(new Set(seqs).size).toBe(seqs.length);
  });

  // ── game_start first, game_end last ──

  it('game_start is the first event', () => {
    const events = emitRepresentativeGame();
    expect(events[0].eventName).toBe('game_start');
  });

  it('game_end is the last event', () => {
    const events = emitRepresentativeGame();
    expect(events[events.length - 1].eventName).toBe('game_end');
  });

  it('game_start appears exactly once', () => {
    const events = emitRepresentativeGame();
    const starts = events.filter(e => e.eventName === 'game_start');
    expect(starts).toHaveLength(1);
  });

  it('game_end appears exactly once', () => {
    const events = emitRepresentativeGame();
    const ends = events.filter(e => e.eventName === 'game_end');
    expect(ends).toHaveLength(1);
  });

  // ── All eventNames canonical ──

  it('all event names are from the canonical EVENT_NAME_LIST', () => {
    const events = emitRepresentativeGame();
    for (const evt of events) {
      expect(EVENT_NAME_LIST).toContain(evt.eventName);
    }
  });

  // ── Envelope shape parity (all 14 fields) ──

  it('every envelope has all 14 required fields', () => {
    const required = [
      'schemaVersion', 'eventName', 'seq', 'gameId', 'timestamp',
      'quarter', 'clock', 'possession', 'fieldPos', 'down',
      'yardsToGo', 'homeScore', 'awayScore', 'payload',
    ];
    const events = emitRepresentativeGame();
    for (const evt of events) {
      for (const field of required) {
        expect(evt).toHaveProperty(field);
      }
    }
  });

  it('all envelopes use schema version ' + SCHEMA_VERSION, () => {
    const events = emitRepresentativeGame();
    for (const evt of events) {
      expect(evt.schemaVersion).toBe(SCHEMA_VERSION);
    }
  });

  // ── Sequence length ──

  it('representative game produces 3+ events', () => {
    const events = emitRepresentativeGame();
    expect(events.length).toBeGreaterThanOrEqual(3);
  });

  // ── Serializable ──

  it('entire event sequence is JSON round-trip safe', () => {
    const events = emitRepresentativeGame();
    const json = JSON.stringify(events);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(events);
  });

  // ── Reset produces fresh seq ──

  it('reset allows a new game session with fresh seq starting at 1', () => {
    emitRepresentativeGame();
    log.reset();
    log.bindGameState(makeGs({ gameId: 'inv-test-002' }));
    log.emitGameStart({ homeTeam: 'A', awayTeam: 'B' });
    const events = log.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].seq).toBe(1);
  });
});
