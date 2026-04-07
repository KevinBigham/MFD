import { describe, expect, it } from 'vitest';

import { HALFTIME_V2 } from '../src/systems/halftime.js';

describe('halftime.js', () => {
  it('has six adjustment options', () => {
    expect(HALFTIME_V2.options).toHaveLength(6);
  });

  it('option ids are unique', () => {
    const ids = HALFTIME_V2.options.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  HALFTIME_V2.options.forEach((option) => {
    it(`option ${option.id} has required fields`, () => {
      expect(typeof option.id).toBe('string');
      expect(typeof option.label).toBe('string');
      expect(typeof option.desc).toBe('string');
      expect(typeof option.offMod).toBe('number');
      expect(typeof option.defMod).toBe('number');
      expect(typeof option.intRisk).toBe('number');
    });
  });

  it('recommends no_huddle when trailing by 14+', () => {
    expect(HALFTIME_V2.recommend(-14, 70, 70)).toBe('no_huddle');
    expect(HALFTIME_V2.recommend(-21, 70, 70)).toBe('no_huddle');
  });

  it('recommends target_wr2 when trailing by 7-13', () => {
    expect(HALFTIME_V2.recommend(-7, 70, 70)).toBe('target_wr2');
    expect(HALFTIME_V2.recommend(-10, 70, 70)).toBe('target_wr2');
  });

  it('recommends ball_control when leading by 14+', () => {
    expect(HALFTIME_V2.recommend(14, 70, 70)).toBe('ball_control');
    expect(HALFTIME_V2.recommend(21, 70, 70)).toBe('ball_control');
  });

  it('recommends prevent when leading by 7-13', () => {
    expect(HALFTIME_V2.recommend(7, 70, 70)).toBe('prevent');
    expect(HALFTIME_V2.recommend(10, 70, 70)).toBe('prevent');
  });

  it('recommends blitz_heavy when defense is much stronger in close game', () => {
    expect(HALFTIME_V2.recommend(0, 70, 76)).toBe('blitz_heavy');
    expect(HALFTIME_V2.recommend(3, 65, 80)).toBe('blitz_heavy');
  });

  it('defaults to run_heavy for neutral situations', () => {
    expect(HALFTIME_V2.recommend(0, 75, 75)).toBe('run_heavy');
    expect(HALFTIME_V2.recommend(-1, 80, 82)).toBe('run_heavy');
  });
});
