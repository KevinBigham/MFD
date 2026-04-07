import { describe, expect, it } from 'vitest';

import {
  MFSN_DRIVES_994,
  MFSN_FOURTH_DOWN_994,
  MFSN_OVERTIME_994,
  MFSN_SITUATIONAL_994,
  SOCIAL_FEED_994,
} from '../src/data/mfsn-game-day.js';

describe('mfsn-game-day.js', () => {
  it('defines situational, drama, milestone, and atmosphere pools', () => {
    expect(MFSN_SITUATIONAL_994).toHaveProperty('situational');
    expect(MFSN_SITUATIONAL_994).toHaveProperty('drama');
    expect(MFSN_SITUATIONAL_994).toHaveProperty('milestones');
    expect(MFSN_SITUATIONAL_994).toHaveProperty('atmosphere');

    expect(MFSN_SITUATIONAL_994.situational.blowoutOffense.length).toBeGreaterThan(5);
    expect(MFSN_SITUATIONAL_994.drama.fight.length).toBeGreaterThan(5);
    expect(MFSN_SITUATIONAL_994.milestones.recordBroken.length).toBeGreaterThan(5);
    expect(MFSN_SITUATIONAL_994.atmosphere.primeTime.length).toBeGreaterThan(5);
  });

  it('exposes fourth-down, drive, overtime, and social feed modules', () => {
    expect(typeof MFSN_FOURTH_DOWN_994).toBe('object');
    expect(typeof MFSN_DRIVES_994).toBe('object');
    expect(typeof MFSN_OVERTIME_994).toBe('object');
    expect(typeof SOCIAL_FEED_994).toBe('object');
  });
});
