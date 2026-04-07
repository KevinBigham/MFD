import { describe, expect, it } from 'vitest';

import { SCOUTING_TEMPLATES_991 } from '../src/data/scouting-templates.js';

describe('scouting-templates.js', () => {
  it('defines core positional scouting template groups', () => {
    const keys = Object.keys(SCOUTING_TEMPLATES_991);
    expect(keys).toEqual(expect.arrayContaining(['QB', 'RB', 'WR', 'DL', 'LB', 'CB', 'S', 'TE', 'OL']));
  });

  it('provides non-empty template pools with placeholder tokens', () => {
    Object.values(SCOUTING_TEMPLATES_991).forEach((group) => {
      Object.values(group).forEach((pool) => {
        expect(Array.isArray(pool)).toBe(true);
        expect(pool.length).toBeGreaterThan(0);
        expect(pool[0]).toContain('[PLAYER]');
      });
    });
  });
});
