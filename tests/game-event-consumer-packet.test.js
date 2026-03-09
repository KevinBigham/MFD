import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT } from './fixtures/game-events/golden-game.js';
import { buildWeeklyHook } from '../src/systems/events/weekly-hook.js';
import { buildPostgameAutopsy } from '../src/systems/events/postgame-autopsy.js';
import { SCHEMA_VERSION, EVENT_NAME_LIST } from '../src/systems/events/event-types.js';

const packetPath = path.resolve(import.meta.dirname, 'fixtures/game-events/golden-consumer-packet.json');
const packet = JSON.parse(fs.readFileSync(packetPath, 'utf8'));

describe('consumer packet golden fixture', () => {
  // ── Envelope shape ──

  it('packet schemaVersion matches code', () => {
    expect(packet.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('envelope in packet has all 14 required fields', () => {
    const required = [
      'schemaVersion', 'eventName', 'seq', 'gameId', 'timestamp',
      'quarter', 'clock', 'possession', 'fieldPos', 'down',
      'yardsToGo', 'homeScore', 'awayScore', 'payload',
    ];
    for (const field of required) {
      expect(packet.envelope).toHaveProperty(field);
    }
  });

  it('envelope eventName is from the canonical list', () => {
    expect(EVENT_NAME_LIST).toContain(packet.envelope.eventName);
  });

  // ── Weekly hook shape matches builder ──

  it('packet weeklyHook matches live builder output', () => {
    const liveHook = buildWeeklyHook(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);
    expect(packet.weeklyHook).toEqual(liveHook);
  });

  it('weeklyHook has all required top-level keys', () => {
    const requiredKeys = [
      'week', 'year', 'opponent', 'result', 'homeScore', 'awayScore',
      'headlines', 'keyPlays', 'injuries', 'turnovers', 'mvp',
      'driveEfficiency', 'pressureRate', 'rzEff', 'coverageWin', 'runLaneAdv',
    ];
    for (const key of requiredKeys) {
      expect(packet.weeklyHook).toHaveProperty(key);
    }
  });

  // ── Postgame autopsy shape matches builder ──

  it('packet postgameAutopsy matches live builder output', () => {
    const liveAutopsy = buildPostgameAutopsy(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);
    expect(packet.postgameAutopsy).toEqual(liveAutopsy);
  });

  it('postgameAutopsy has all required top-level keys', () => {
    const requiredKeys = [
      'summary', 'phases', 'trenchReport', 'pressureReport',
      'turnoverBattle', 'bigPlays', 'missedOpportunities',
      'adjustmentImpact', 'playerGrades', 'coachingGrade',
    ];
    for (const key of requiredKeys) {
      expect(packet.postgameAutopsy).toHaveProperty(key);
    }
  });

  // ── Context ──

  it('packet context matches golden game context', () => {
    expect(packet.context).toEqual(GOLDEN_GAME_CONTEXT);
  });

  // ── Structural invariants ──

  it('packet is valid JSON (round-trip safe)', () => {
    const raw = fs.readFileSync(packetPath, 'utf8');
    const reparsed = JSON.parse(raw);
    expect(reparsed).toEqual(packet);
  });

  it('keyPlays impact values are from allowed set', () => {
    const allowed = ['big_play', 'turnover', 'score'];
    for (const kp of packet.weeklyHook.keyPlays) {
      expect(allowed).toContain(kp.impact);
    }
  });

  it('player grades use letter grades from allowed set', () => {
    const allowed = ['A', 'B', 'C', 'D', 'N/A'];
    for (const pg of packet.postgameAutopsy.playerGrades) {
      expect(allowed).toContain(pg.grade);
    }
  });

  it('coaching grade uses letter grade from allowed set', () => {
    const allowed = ['A', 'B', 'C', 'D', 'N/A'];
    expect(allowed).toContain(packet.postgameAutopsy.coachingGrade.grade);
  });

  it('trench report grade uses letter grade from allowed set', () => {
    const allowed = ['A', 'B', 'C', 'D', 'N/A'];
    expect(allowed).toContain(packet.postgameAutopsy.trenchReport.grade);
  });
});
