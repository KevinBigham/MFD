import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createEventLog } from './emitter';
import { EVENT_NAMES, SCHEMA_VERSION } from './event-types';
import { resetSeq } from './envelope';

// Reset global seq counter before each test
beforeEach(() => resetSeq());

describe('EventLog', () => {
  let log: ReturnType<typeof createEventLog>;

  beforeEach(() => {
    log = createEventLog();
  });

  it('starts empty', () => {
    expect(log.getEvents()).toEqual([]);
  });

  it('emits and collects events', () => {
    log.emit(EVENT_NAMES.GAME_START, { test: true });
    expect(log.getEvents()).toHaveLength(1);
  });

  it('builds proper envelope shape', () => {
    log.bindGameState({
      gameId: 'game-1',
      quarter: 1,
      clock: 900,
      possession: 'home',
      fieldPos: 25,
      down: 1,
      yardsToGo: 10,
      hScore: 7,
      aScore: 3,
    });

    const env = log.emit(EVENT_NAMES.PLAY_RESULT, { yards: 15 });

    expect(env.schemaVersion).toBe(SCHEMA_VERSION);
    expect(env.eventName).toBe('play_result');
    expect(env.gameId).toBe('game-1');
    expect(env.quarter).toBe(1);
    expect(env.clock).toBe(900);
    expect(env.homeScore).toBe(7);
    expect(env.awayScore).toBe(3);
    expect(env.payload).toEqual({ yards: 15 });
  });

  it('sequences events incrementally', () => {
    log.emit(EVENT_NAMES.GAME_START, {});
    log.emit(EVENT_NAMES.DRIVE_START, {});
    log.emit(EVENT_NAMES.PLAY_CALL, {});
    const events = log.getEvents();
    expect(events[0]!.seq).toBe(1);
    expect(events[1]!.seq).toBe(2);
    expect(events[2]!.seq).toBe(3);
  });

  it('shares sequence state across separate event logs until reset', () => {
    const otherLog = createEventLog();

    expect(log.emit(EVENT_NAMES.GAME_START, {}).seq).toBe(1);
    expect(otherLog.emit(EVENT_NAMES.SCORE, {}).seq).toBe(2);
    expect(log.emit(EVENT_NAMES.GAME_END, {}).seq).toBe(3);
  });

  it('resets clears everything', () => {
    log.emit(EVENT_NAMES.GAME_START, {});
    log.emit(EVENT_NAMES.SCORE, {});
    expect(log.getEvents()).toHaveLength(2);
    log.reset();
    expect(log.getEvents()).toHaveLength(0);
  });

  it('reset clears the package-level sequence for future logs', () => {
    log.emit(EVENT_NAMES.GAME_START, {});
    expect(createEventLog().emit(EVENT_NAMES.SCORE, {}).seq).toBe(2);

    log.reset();

    expect(createEventLog().emit(EVENT_NAMES.GAME_START, {}).seq).toBe(1);
  });

  it('getByName filters correctly', () => {
    log.emit(EVENT_NAMES.PLAY_RESULT, { yards: 5 });
    log.emit(EVENT_NAMES.SCORE, { points: 7 });
    log.emit(EVENT_NAMES.PLAY_RESULT, { yards: 12 });
    expect(log.getByName(EVENT_NAMES.PLAY_RESULT)).toHaveLength(2);
    expect(log.getByName(EVENT_NAMES.SCORE)).toHaveLength(1);
  });

  it('typed emitters produce correct event names', () => {
    log.emitGameStart({ homeTeam: 'KC', awayTeam: 'SF' });
    log.emitDriveStart({ driveNum: 1, startFieldPos: 25, team: 'KC' });
    log.emitPlayCall({ playId: 'p1', playLabel: 'HB Dive', playType: 'run' });
    log.emitPlayResult({ type: 'rush', yards: 8 });
    log.emitScore({ type: 'touchdown', points: 6, team: 'KC', homeScore: 6, awayScore: 0 });
    log.emitGameEnd({ homeScore: 31, awayScore: 20, winner: 'KC', loser: 'SF' });

    const events = log.getEvents();
    expect(events.map(e => e.eventName)).toEqual([
      'game_start', 'drive_start', 'play_call', 'play_result', 'score', 'game_end',
    ]);
  });

  it('emitInjury includes all payload fields', () => {
    const env = log.emitInjury({
      player: 'p42',
      pos: 'QB',
      team: 'KC',
      type: 'knee',
      severity: 'out',
      gamesOut: 4,
      desc: 'Torn ACL',
    });
    expect(env.payload).toEqual({
      player: 'p42',
      pos: 'QB',
      team: 'KC',
      type: 'knee',
      severity: 'out',
      gamesOut: 4,
      desc: 'Torn ACL',
    });
  });
});
