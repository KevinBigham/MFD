import { describe, expect, it, beforeEach } from 'vitest';

import { createEventLog } from '../src/systems/events/emitter.js';
import { EVENT_NAMES } from '../src/systems/events/event-types.js';

describe('emitter.js', () => {
  let log;
  const gs = {
    gameId: 'emu-001',
    timestamp: 1700000000000,
    quarter: 1,
    clock: 900,
    possession: 'home',
    fieldPos: 25,
    down: 1,
    yardsToGo: 10,
    hScore: 0,
    aScore: 0,
  };

  beforeEach(() => {
    log = createEventLog();
    log.bindGameState(gs);
  });

  it('emits and collects events in order', () => {
    log.emit('game_start', { homeTeam: 'Hawks' });
    log.emit('drive_start', { driveNum: 1 });
    const events = log.getEvents();
    expect(events).toHaveLength(2);
    expect(events[0].eventName).toBe('game_start');
    expect(events[1].eventName).toBe('drive_start');
    expect(events[0].seq).toBeLessThan(events[1].seq);
  });

  it('getByName filters correctly', () => {
    log.emit('play_call', {});
    log.emit('play_result', { yards: 5 });
    log.emit('play_call', {});
    expect(log.getByName('play_call')).toHaveLength(2);
    expect(log.getByName('play_result')).toHaveLength(1);
  });

  it('reset clears all events', () => {
    log.emit('game_start', {});
    log.emit('drive_start', {});
    log.reset();
    expect(log.getEvents()).toHaveLength(0);
  });

  it('getEvents returns an immutable copy', () => {
    log.emit('game_start', {});
    const copy = log.getEvents();
    copy.push({ fake: true });
    expect(log.getEvents()).toHaveLength(1);
  });

  it('emitGameStart creates correct payload', () => {
    const evt = log.emitGameStart({
      homeTeam: 'Hawks',
      awayTeam: 'Titans',
      weather: { temp: 72 },
      seed: 12345,
      week: 5,
      year: 2026,
    });
    expect(evt.eventName).toBe(EVENT_NAMES.GAME_START);
    expect(evt.payload.homeTeam).toBe('Hawks');
    expect(evt.payload.awayTeam).toBe('Titans');
    expect(evt.payload.seed).toBe(12345);
    expect(evt.payload.week).toBe(5);
  });

  it('emitPlayResult creates correct payload shape', () => {
    const evt = log.emitPlayResult({
      type: 'complete',
      yards: 12,
      player: 'Swift',
      passer: 'Cannon',
      desc: 'Complete for 12',
      big: false,
      isRush: false,
      firstDown: true,
      touchdown: false,
    });
    expect(evt.payload.type).toBe('complete');
    expect(evt.payload.yards).toBe(12);
    expect(evt.payload.player).toBe('Swift');
    expect(evt.payload.passer).toBe('Cannon');
    expect(evt.payload.firstDown).toBe(true);
  });

  it('emitTurnover creates correct payload', () => {
    const evt = log.emitTurnover({
      type: 'fumble',
      player: 'Bell',
      forcedBy: 'Watts',
      fieldPos: 48,
      desc: 'Fumble by Bell',
    });
    expect(evt.payload.type).toBe('fumble');
    expect(evt.payload.forcedBy).toBe('Watts');
  });

  it('emitScore creates correct payload', () => {
    const evt = log.emitScore({
      type: 'touchdown',
      points: 7,
      team: 'home',
      player: 'Bell',
      homeScore: 7,
      awayScore: 0,
    });
    expect(evt.payload.points).toBe(7);
    expect(evt.payload.team).toBe('home');
  });

  it('emitHalftimeAdjustment creates correct payload', () => {
    const evt = log.emitHalftimeAdjustment({
      adjustmentId: 'blitz_heavy',
      adjustmentLabel: 'Blitz Heavy',
      offEdge: -2,
      defEdge: 6,
      rationale: 'Need pressure',
      scoreDiff: -7,
    });
    expect(evt.payload.adjustmentId).toBe('blitz_heavy');
    expect(evt.payload.defEdge).toBe(6);
  });

  it('emitGameEnd creates correct payload', () => {
    const evt = log.emitGameEnd({
      homeScore: 17,
      awayScore: 7,
      winner: 'Hawks',
      loser: 'Titans',
      overtime: false,
      totalPlays: 50,
      mvp: 'Cannon',
    });
    expect(evt.payload.winner).toBe('Hawks');
    expect(evt.payload.totalPlays).toBe(50);
  });

  it('all typed emitters produce serializable output', () => {
    log.emitGameStart({ homeTeam: 'A', awayTeam: 'B' });
    log.emitDriveStart({ driveNum: 1, startFieldPos: 25, team: 'home' });
    log.emitPlayCall({ playId: 'hb_dive', playLabel: 'HB Dive', playType: 'run' });
    log.emitTrenchResolution({ olGrade: 70, dlGrade: 65, runLaneOpen: true, pocketIntact: true });
    log.emitPressureResolution({ pressured: false, sacked: false });
    log.emitPlayResult({ type: 'run', yards: 5, player: 'Bell', isRush: true });
    log.emitPenalty({ type: 'holding', team: 'home', yards: 10 });
    log.emitInjury({ player: 'Smith', team: 'home', type: 'knee' });
    log.emitTurnover({ type: 'fumble', player: 'Bell' });
    log.emitScore({ type: 'touchdown', points: 7, team: 'home', homeScore: 7, awayScore: 0 });
    log.emitHalftimeAdjustment({ adjustmentId: 'run_heavy', adjustmentLabel: 'Run Heavy' });
    log.emitDriveEnd({ driveNum: 1, result: 'touchdown', plays: 5, yards: 75 });
    log.emitGameEnd({ homeScore: 7, awayScore: 0, winner: 'A', loser: 'B' });

    const events = log.getEvents();
    expect(events).toHaveLength(13);
    const json = JSON.stringify(events);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(events);
  });
});
