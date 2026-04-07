import { beforeEach, describe, expect, it } from 'vitest';

import { setSeed } from '../src/utils/rng.js';
import { COL_FCS, COL_G5, COL_POWER, COL_WEIGHTED, pickCollege } from '../src/data/college-pipeline.js';

describe('college-pipeline.js', () => {
  beforeEach(() => {
    setSeed(2027);
  });

  it('defines power/g5/fcs pools and weighted list', () => {
    expect(COL_POWER.length).toBeGreaterThan(20);
    expect(COL_G5.length).toBeGreaterThan(10);
    expect(COL_FCS.length).toBeGreaterThan(5);
    expect(COL_WEIGHTED.length).toBeGreaterThan(COL_POWER.length);
  });

  it('pickCollege favors power schools for elite flag', () => {
    const pick = pickCollege(true);
    expect(COL_POWER.concat(['Missouri', 'Missouri'])).toContain(pick);
  });

  it('pickCollege returns a valid school for normal flow', () => {
    const pick = pickCollege(false);
    expect(COL_POWER.concat(COL_G5).concat(COL_FCS).concat(['Missouri', 'Missouri', 'Missouri'])).toContain(pick);
  });
});
