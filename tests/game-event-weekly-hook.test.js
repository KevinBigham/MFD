import { describe, expect, it } from 'vitest';

import { GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT } from './fixtures/game-events/golden-game.js';
import { buildWeeklyHook } from '../src/systems/events/weekly-hook.js';

describe('weekly-hook.js', () => {
  const hook = buildWeeklyHook(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);

  it('returns week and year from context', () => {
    expect(hook.week).toBe(5);
    expect(hook.year).toBe(2026);
  });

  it('returns opponent name', () => {
    expect(hook.opponent).toBe('Titans');
  });

  it('returns result string with W/L prefix', () => {
    expect(hook.result).toMatch(/^[WL] \d+-\d+$/);
    expect(hook.result).toBe('W 17-7');
  });

  it('returns correct scores', () => {
    expect(hook.homeScore).toBe(17);
    expect(hook.awayScore).toBe(7);
  });

  it('produces 1-5 plain-English headlines', () => {
    expect(hook.headlines.length).toBeGreaterThanOrEqual(1);
    expect(hook.headlines.length).toBeLessThanOrEqual(5);
    for (const h of hook.headlines) {
      expect(typeof h).toBe('string');
      expect(h.length).toBeGreaterThan(5);
    }
  });

  it('headlines mention the actual result', () => {
    expect(hook.headlines[0]).toMatch(/17.*7|Victory|Fell/);
  });

  it('returns key plays array', () => {
    expect(Array.isArray(hook.keyPlays)).toBe(true);
    expect(hook.keyPlays.length).toBeGreaterThan(0);
    for (const kp of hook.keyPlays) {
      expect(kp).toHaveProperty('quarter');
      expect(kp).toHaveProperty('desc');
      expect(kp).toHaveProperty('impact');
    }
  });

  it('returns injuries array', () => {
    expect(Array.isArray(hook.injuries)).toBe(true);
    expect(hook.injuries.length).toBe(1);
  });

  it('returns turnovers array', () => {
    expect(Array.isArray(hook.turnovers)).toBe(true);
    expect(hook.turnovers.length).toBe(2);
  });

  it('returns mvp object with name and stat', () => {
    expect(hook.mvp).toHaveProperty('name');
    expect(hook.mvp).toHaveProperty('stat');
    expect(hook.mvp.name).not.toBe('N/A');
  });

  it('returns drive efficiency', () => {
    expect(hook.driveEfficiency).toHaveProperty('drives');
    expect(hook.driveEfficiency).toHaveProperty('scoringDrives');
    expect(hook.driveEfficiency).toHaveProperty('pct');
    expect(hook.driveEfficiency.pct).toBeGreaterThanOrEqual(0);
    expect(hook.driveEfficiency.pct).toBeLessThanOrEqual(100);
  });

  it('returns numeric game grades', () => {
    expect(typeof hook.pressureRate).toBe('number');
    expect(typeof hook.rzEff).toBe('number');
    expect(typeof hook.coverageWin).toBe('number');
    expect(typeof hook.runLaneAdv).toBe('number');
  });

  it('game grades are bounded 0-100', () => {
    expect(hook.pressureRate).toBeGreaterThanOrEqual(0);
    expect(hook.pressureRate).toBeLessThanOrEqual(100);
    expect(hook.coverageWin).toBeGreaterThanOrEqual(0);
    expect(hook.coverageWin).toBeLessThanOrEqual(100);
    expect(hook.runLaneAdv).toBeGreaterThanOrEqual(0);
    expect(hook.runLaneAdv).toBeLessThanOrEqual(100);
  });

  it('output is fully serializable', () => {
    const json = JSON.stringify(hook);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(hook);
  });
});
