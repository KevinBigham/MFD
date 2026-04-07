import { describe, expect, it } from 'vitest';

import { GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT } from './fixtures/game-events/golden-game.js';
import { buildPostgameAutopsy } from '../src/systems/events/postgame-autopsy.js';

describe('postgame-autopsy.js', () => {
  const autopsy = buildPostgameAutopsy(GOLDEN_GAME_EVENTS, GOLDEN_GAME_CONTEXT);

  it('returns a summary string', () => {
    expect(typeof autopsy.summary).toBe('string');
    expect(autopsy.summary.length).toBeGreaterThan(10);
    expect(autopsy.summary).toMatch(/Hawks/);
  });

  it('summary reflects correct win/loss state', () => {
    // Hawks won 17-7
    expect(autopsy.summary).toMatch(/17.*7|dominated|handled|edged/i);
  });

  it('returns 4 quarter phases', () => {
    expect(autopsy.phases).toHaveLength(4);
    for (const p of autopsy.phases) {
      expect(p).toHaveProperty('quarter');
      expect(p).toHaveProperty('label');
      expect(p).toHaveProperty('narrative');
      expect(p).toHaveProperty('events');
    }
  });

  it('quarter narratives reference actual play counts', () => {
    // Q1 should have plays
    expect(autopsy.phases[0].narrative).toMatch(/\d+ plays/);
  });

  it('returns trench report', () => {
    expect(autopsy.trenchReport).toHaveProperty('grade');
    expect(autopsy.trenchReport).toHaveProperty('olWins');
    expect(autopsy.trenchReport).toHaveProperty('dlWins');
    expect(autopsy.trenchReport).toHaveProperty('narrative');
    expect(typeof autopsy.trenchReport.narrative).toBe('string');
  });

  it('trench grade is a letter grade', () => {
    expect(['A', 'B', 'C', 'D', 'N/A']).toContain(autopsy.trenchReport.grade);
  });

  it('returns pressure report', () => {
    expect(autopsy.pressureReport).toHaveProperty('sacks');
    expect(autopsy.pressureReport).toHaveProperty('pressures');
    expect(autopsy.pressureReport).toHaveProperty('rate');
    expect(autopsy.pressureReport).toHaveProperty('narrative');
    expect(typeof autopsy.pressureReport.rate).toBe('number');
  });

  it('returns turnover battle', () => {
    expect(autopsy.turnoverBattle).toHaveProperty('forced');
    expect(autopsy.turnoverBattle).toHaveProperty('lost');
    expect(autopsy.turnoverBattle).toHaveProperty('margin');
    expect(autopsy.turnoverBattle).toHaveProperty('narrative');
    expect(typeof autopsy.turnoverBattle.narrative).toBe('string');
  });

  it('turnover margin is correct', () => {
    // Away turnovers (1) - home turnovers (1) = 0
    expect(autopsy.turnoverBattle.margin).toBe(0);
  });

  it('returns big plays array', () => {
    expect(Array.isArray(autopsy.bigPlays)).toBe(true);
    expect(autopsy.bigPlays.length).toBeGreaterThan(0);
    for (const bp of autopsy.bigPlays) {
      expect(bp).toHaveProperty('quarter');
      expect(bp).toHaveProperty('yards');
      expect(bp).toHaveProperty('desc');
    }
  });

  it('returns missed opportunities array', () => {
    expect(Array.isArray(autopsy.missedOpportunities)).toBe(true);
    // Drive 3 stalled at the 48 (midfield) after fumble
    for (const mo of autopsy.missedOpportunities) {
      expect(mo).toHaveProperty('narrative');
      expect(typeof mo.narrative).toBe('string');
    }
  });

  it('returns adjustment impact', () => {
    expect(autopsy.adjustmentImpact).toHaveProperty('adjustment');
    expect(autopsy.adjustmentImpact).toHaveProperty('preStats');
    expect(autopsy.adjustmentImpact).toHaveProperty('postStats');
    expect(autopsy.adjustmentImpact).toHaveProperty('narrative');
    expect(autopsy.adjustmentImpact.adjustment).toBe('Blitz Heavy');
  });

  it('adjustment impact has pre/post stats', () => {
    expect(autopsy.adjustmentImpact.preStats).toHaveProperty('plays');
    expect(autopsy.adjustmentImpact.preStats).toHaveProperty('yards');
    expect(autopsy.adjustmentImpact.preStats).toHaveProperty('ypp');
    expect(autopsy.adjustmentImpact.postStats).toHaveProperty('plays');
  });

  it('returns player grades sorted by score', () => {
    expect(Array.isArray(autopsy.playerGrades)).toBe(true);
    expect(autopsy.playerGrades.length).toBeGreaterThan(0);
    for (const pg of autopsy.playerGrades) {
      expect(pg).toHaveProperty('name');
      expect(pg).toHaveProperty('grade');
      expect(pg).toHaveProperty('score');
      expect(['A', 'B', 'C', 'D']).toContain(pg.grade);
    }
    // Sorted descending
    for (let i = 1; i < autopsy.playerGrades.length; i++) {
      expect(autopsy.playerGrades[i].score).toBeLessThanOrEqual(autopsy.playerGrades[i - 1].score);
    }
  });

  it('returns coaching grade', () => {
    expect(autopsy.coachingGrade).toHaveProperty('grade');
    expect(autopsy.coachingGrade).toHaveProperty('narrative');
    expect(['A', 'B', 'C', 'D']).toContain(autopsy.coachingGrade.grade);
    expect(typeof autopsy.coachingGrade.narrative).toBe('string');
  });

  it('output is fully serializable', () => {
    const json = JSON.stringify(autopsy);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(autopsy);
  });

  it('all narrative strings are non-empty', () => {
    expect(autopsy.summary.length).toBeGreaterThan(0);
    expect(autopsy.trenchReport.narrative.length).toBeGreaterThan(0);
    expect(autopsy.pressureReport.narrative.length).toBeGreaterThan(0);
    expect(autopsy.turnoverBattle.narrative.length).toBeGreaterThan(0);
    expect(autopsy.adjustmentImpact.narrative.length).toBeGreaterThan(0);
    expect(autopsy.coachingGrade.narrative.length).toBeGreaterThan(0);
  });
});
