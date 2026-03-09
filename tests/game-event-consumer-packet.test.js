/**
 * MFD Consumer Packet Shape Parity Tests
 *
 * These tests verify that the documented consumer packet shapes
 * match actual producer output. If any test here fails, the contract
 * doc (docs/mfd-event-consumer-packet-v1.md) has drifted from
 * producer truth and must be re-aligned before consumer work proceeds.
 */

import { describe, expect, it } from 'vitest';
import { GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT } from './fixtures/game-events/golden-game.js';
import goldenPacket from './fixtures/game-events/golden-consumer-packet.json';
import { buildWeeklyHook } from '../src/systems/events/weekly-hook.js';
import { buildPostgameAutopsy } from '../src/systems/events/postgame-autopsy.js';
import { EVENT_NAME_LIST, SCHEMA_VERSION } from '../src/systems/events/event-types.js';

// ═══════════════════════════════════════════════
// Envelope shape parity
// ═══════════════════════════════════════════════

describe('consumer-packet: envelope shape', () => {
  const REQUIRED_ENVELOPE_KEYS = [
    'schemaVersion', 'eventName', 'seq', 'gameId', 'timestamp',
    'quarter', 'clock', 'possession', 'fieldPos', 'down',
    'yardsToGo', 'homeScore', 'awayScore', 'payload',
  ];

  it('golden fixture envelope has exactly 14 required keys', () => {
    const sample = GOLDEN_GAME_EVENTS[0];
    const keys = Object.keys(sample);
    expect(keys).toEqual(REQUIRED_ENVELOPE_KEYS);
    expect(keys).toHaveLength(14);
  });

  it('every event in golden fixture has all 14 keys', () => {
    for (const evt of GOLDEN_GAME_EVENTS) {
      for (const key of REQUIRED_ENVELOPE_KEYS) {
        expect(evt).toHaveProperty(key);
        expect(evt[key]).not.toBeUndefined();
      }
    }
  });

  it('schemaVersion is 0.1.0 on every event', () => {
    for (const evt of GOLDEN_GAME_EVENTS) {
      expect(evt.schemaVersion).toBe('0.1.0');
    }
  });

  it('all eventNames are from the canonical set', () => {
    for (const evt of GOLDEN_GAME_EVENTS) {
      expect(EVENT_NAME_LIST).toContain(evt.eventName);
    }
  });

  it('seq is monotonically increasing', () => {
    for (let i = 1; i < GOLDEN_GAME_EVENTS.length; i++) {
      expect(GOLDEN_GAME_EVENTS[i].seq).toBeGreaterThan(GOLDEN_GAME_EVENTS[i - 1].seq);
    }
  });

  it('gameId is stable across all events', () => {
    const id = GOLDEN_GAME_EVENTS[0].gameId;
    for (const evt of GOLDEN_GAME_EVENTS) {
      expect(evt.gameId).toBe(id);
    }
  });

  it('first event is game_start, last is game_end', () => {
    expect(GOLDEN_GAME_EVENTS[0].eventName).toBe('game_start');
    expect(GOLDEN_GAME_EVENTS[GOLDEN_GAME_EVENTS.length - 1].eventName).toBe('game_end');
  });

  it('possession is always a string (never null/undefined)', () => {
    for (const evt of GOLDEN_GAME_EVENTS) {
      expect(typeof evt.possession).toBe('string');
    }
  });

  it('golden packet JSON sampleEnvelope matches first fixture event', () => {
    expect(goldenPacket.sampleEnvelope).toEqual(GOLDEN_GAME_EVENTS[0]);
  });

  it('canonical event name count is 13', () => {
    expect(EVENT_NAME_LIST).toHaveLength(13);
  });

  it('SCHEMA_VERSION export matches envelope schemaVersion', () => {
    expect(SCHEMA_VERSION).toBe('0.1.0');
    expect(GOLDEN_GAME_EVENTS[0].schemaVersion).toBe(SCHEMA_VERSION);
  });
});

// ═══════════════════════════════════════════════
// Weekly hook shape parity
// ═══════════════════════════════════════════════

describe('consumer-packet: weekly hook shape', () => {
  const REQUIRED_HOOK_KEYS = [
    'week', 'year', 'opponent', 'result', 'homeScore', 'awayScore',
    'headlines', 'keyPlays', 'injuries', 'turnovers', 'mvp',
    'driveEfficiency', 'pressureRate', 'rzEff', 'coverageWin', 'runLaneAdv',
  ];

  it('buildWeeklyHook output has all documented keys', () => {
    const hook = buildWeeklyHook(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);
    for (const key of REQUIRED_HOOK_KEYS) {
      expect(hook).toHaveProperty(key);
    }
  });

  it('buildWeeklyHook output matches golden packet exactly', () => {
    const hook = buildWeeklyHook(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);
    expect(hook).toEqual(goldenPacket.weeklyHook);
  });

  it('headlines is a string array with 1-5 items', () => {
    const hook = buildWeeklyHook(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);
    expect(Array.isArray(hook.headlines)).toBe(true);
    expect(hook.headlines.length).toBeGreaterThanOrEqual(1);
    expect(hook.headlines.length).toBeLessThanOrEqual(5);
    for (const h of hook.headlines) {
      expect(typeof h).toBe('string');
    }
  });

  it('keyPlays entries have required shape', () => {
    const hook = buildWeeklyHook(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);
    for (const kp of hook.keyPlays) {
      expect(kp).toHaveProperty('quarter');
      expect(kp).toHaveProperty('clock');
      expect(kp).toHaveProperty('type');
      expect(kp).toHaveProperty('desc');
      expect(kp).toHaveProperty('impact');
      expect(['big_play', 'turnover', 'score']).toContain(kp.impact);
    }
  });

  it('mvp has name and stat', () => {
    const hook = buildWeeklyHook(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);
    expect(typeof hook.mvp.name).toBe('string');
    expect(typeof hook.mvp.stat).toBe('string');
  });

  it('driveEfficiency has drives, scoringDrives, pct', () => {
    const hook = buildWeeklyHook(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);
    expect(typeof hook.driveEfficiency.drives).toBe('number');
    expect(typeof hook.driveEfficiency.scoringDrives).toBe('number');
    expect(typeof hook.driveEfficiency.pct).toBe('number');
  });

  it('numeric grades are 0-100', () => {
    const hook = buildWeeklyHook(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);
    for (const field of ['pressureRate', 'rzEff', 'coverageWin', 'runLaneAdv']) {
      expect(hook[field]).toBeGreaterThanOrEqual(0);
      expect(hook[field]).toBeLessThanOrEqual(100);
    }
  });
});

// ═══════════════════════════════════════════════
// Postgame autopsy shape parity
// ═══════════════════════════════════════════════

describe('consumer-packet: postgame autopsy shape', () => {
  const REQUIRED_AUTOPSY_KEYS = [
    'summary', 'phases', 'trenchReport', 'pressureReport',
    'turnoverBattle', 'bigPlays', 'missedOpportunities',
    'adjustmentImpact', 'playerGrades', 'coachingGrade',
  ];

  it('buildPostgameAutopsy output has all documented keys', () => {
    const autopsy = buildPostgameAutopsy(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);
    for (const key of REQUIRED_AUTOPSY_KEYS) {
      expect(autopsy).toHaveProperty(key);
    }
  });

  it('buildPostgameAutopsy output matches golden packet exactly', () => {
    const autopsy = buildPostgameAutopsy(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);
    expect(autopsy).toEqual(goldenPacket.postgameAutopsy);
  });

  it('phases has exactly 4 quarters', () => {
    const autopsy = buildPostgameAutopsy(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);
    expect(autopsy.phases).toHaveLength(4);
    for (let i = 0; i < 4; i++) {
      expect(autopsy.phases[i].quarter).toBe(i + 1);
      expect(autopsy.phases[i].label).toBe('Quarter ' + (i + 1));
      expect(typeof autopsy.phases[i].narrative).toBe('string');
      expect(Array.isArray(autopsy.phases[i].events)).toBe(true);
    }
  });

  it('trenchReport has grade, olWins, dlWins, narrative', () => {
    const autopsy = buildPostgameAutopsy(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);
    const tr = autopsy.trenchReport;
    expect(['A', 'B', 'C', 'D', 'N/A']).toContain(tr.grade);
    expect(typeof tr.olWins).toBe('number');
    expect(typeof tr.dlWins).toBe('number');
    expect(typeof tr.narrative).toBe('string');
  });

  it('pressureReport has sacks, pressures, rate, narrative', () => {
    const autopsy = buildPostgameAutopsy(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);
    const pr = autopsy.pressureReport;
    expect(typeof pr.sacks).toBe('number');
    expect(typeof pr.pressures).toBe('number');
    expect(typeof pr.rate).toBe('number');
    expect(typeof pr.narrative).toBe('string');
  });

  it('turnoverBattle has forced, lost, margin, narrative', () => {
    const autopsy = buildPostgameAutopsy(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);
    const tb = autopsy.turnoverBattle;
    expect(typeof tb.forced).toBe('number');
    expect(typeof tb.lost).toBe('number');
    expect(typeof tb.margin).toBe('number');
    expect(typeof tb.narrative).toBe('string');
  });

  it('playerGrades entries have name, grade, score, stats', () => {
    const autopsy = buildPostgameAutopsy(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);
    for (const pg of autopsy.playerGrades) {
      expect(typeof pg.name).toBe('string');
      expect(['A', 'B', 'C', 'D']).toContain(pg.grade);
      expect(typeof pg.score).toBe('number');
      expect(pg.stats).toHaveProperty('comp');
      expect(pg.stats).toHaveProperty('att');
      expect(pg.stats).toHaveProperty('passYds');
      expect(pg.stats).toHaveProperty('rushAtt');
      expect(pg.stats).toHaveProperty('rushYds');
      expect(pg.stats).toHaveProperty('rec');
      expect(pg.stats).toHaveProperty('recYds');
    }
  });

  it('playerGrades are sorted by score descending', () => {
    const autopsy = buildPostgameAutopsy(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);
    for (let i = 1; i < autopsy.playerGrades.length; i++) {
      expect(autopsy.playerGrades[i].score).toBeLessThanOrEqual(autopsy.playerGrades[i - 1].score);
    }
  });

  it('coachingGrade has grade and narrative', () => {
    const autopsy = buildPostgameAutopsy(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);
    expect(['A', 'B', 'C', 'D']).toContain(autopsy.coachingGrade.grade);
    expect(typeof autopsy.coachingGrade.narrative).toBe('string');
  });

  it('adjustmentImpact has adjustment, preStats, postStats, narrative', () => {
    const autopsy = buildPostgameAutopsy(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);
    const ai = autopsy.adjustmentImpact;
    expect(typeof ai.adjustment).toBe('string');
    expect(typeof ai.preStats.plays).toBe('number');
    expect(typeof ai.preStats.yards).toBe('number');
    expect(typeof ai.preStats.ypp).toBe('number');
    expect(typeof ai.postStats.plays).toBe('number');
    expect(typeof ai.postStats.yards).toBe('number');
    expect(typeof ai.postStats.ypp).toBe('number');
    expect(typeof ai.narrative).toBe('string');
  });

  it('bigPlays entries have quarter, clock, player, yards, desc, side', () => {
    const autopsy = buildPostgameAutopsy(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);
    for (const bp of autopsy.bigPlays) {
      expect(typeof bp.quarter).toBe('number');
      expect(typeof bp.clock).toBe('number');
      expect(typeof bp.player).toBe('string');
      expect(typeof bp.yards).toBe('number');
      expect(typeof bp.desc).toBe('string');
      expect(['home', 'away']).toContain(bp.side);
    }
  });
});

// ═══════════════════════════════════════════════
// Contract drift detection
// ═══════════════════════════════════════════════

describe('consumer-packet: drift detection', () => {
  it('golden packet schemaVersion matches SCHEMA_VERSION export', () => {
    expect(goldenPacket._meta.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('golden packet was generated from the golden-game fixture', () => {
    expect(goldenPacket._meta.description).toContain('golden-game.js');
  });

  it('weekly hook key count has not changed', () => {
    const hook = buildWeeklyHook(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);
    const packetKeys = Object.keys(goldenPacket.weeklyHook).sort();
    const liveKeys = Object.keys(hook).sort();
    expect(liveKeys).toEqual(packetKeys);
  });

  it('postgame autopsy key count has not changed', () => {
    const autopsy = buildPostgameAutopsy(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);
    const packetKeys = Object.keys(goldenPacket.postgameAutopsy).sort();
    const liveKeys = Object.keys(autopsy).sort();
    expect(liveKeys).toEqual(packetKeys);
  });
});
