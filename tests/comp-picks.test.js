import { describe, expect, it } from 'vitest';

import { COMP_PICKS_986 } from '../src/systems/comp-picks.js';

function fa(name, pos, ovr) {
  return { name, pos, ovr };
}

describe('comp-picks.js', () => {
  it('returns no picks with no free-agent losses', () => {
    expect(COMP_PICKS_986.calculate([], [])).toEqual([]);
  });

  it('returns no picks when losses are below ovr threshold', () => {
    const picks = COMP_PICKS_986.calculate([fa('Depth Guy', 'WR', 67)], []);
    expect(picks).toEqual([]);
  });

  it('creates one pick for one qualifying unmatched loss', () => {
    const picks = COMP_PICKS_986.calculate([fa('Star QB', 'QB', 85)], []);
    expect(picks).toHaveLength(1);
    expect(picks[0].round).toBe(3);
    expect(picks[0].reason).toContain('Star QB');
  });

  it('filters out losses that are matched by comparable gains', () => {
    const lost = [fa('CB1', 'CB', 80)];
    const gained = [fa('CB2', 'CB', 78)]; // 78 >= 80 - 3
    const picks = COMP_PICKS_986.calculate(lost, gained);
    expect(picks).toEqual([]);
  });

  it('assigns base rounds by OVR bucket', () => {
    const lost = [
      fa('Elite', 'WR', 80), // round 3
      fa('Strong', 'LB', 75), // round 4
      fa('Solid', 'S', 70), // round 5
      fa('Depth', 'TE', 68), // round 6
    ];

    const picks = COMP_PICKS_986.calculate(lost, []);
    expect(picks[0].round).toBe(3);
    expect(picks[1].round).toBe(5);
    expect(picks[2].round).toBe(7);
    expect(picks[3].round).toBe(9);
  });

  it('caps awarded picks at four', () => {
    const lost = [
      fa('A', 'QB', 90),
      fa('B', 'WR', 88),
      fa('C', 'CB', 84),
      fa('D', 'LT', 82),
      fa('E', 'DE', 80),
    ];

    const picks = COMP_PICKS_986.calculate(lost, []);
    expect(picks).toHaveLength(4);
  });

  it('sorts net losses by OVR descending before assigning picks', () => {
    const lost = [
      fa('Mid', 'WR', 76),
      fa('Top', 'QB', 88),
      fa('Low', 'S', 72),
    ];

    const picks = COMP_PICKS_986.calculate(lost, []);
    expect(picks[0].ovr).toBe(88);
    expect(picks[1].ovr).toBe(76);
    expect(picks[2].ovr).toBe(72);
  });

  it('includes player identity in pick reason text', () => {
    const picks = COMP_PICKS_986.calculate([fa('Captain', 'LB', 79)], []);
    expect(picks[0].reason).toContain('Captain');
    expect(picks[0].reason).toContain('LB');
    expect(picks[0].reason).toContain('79');
    expect(picks[0].reason).toContain('departed');
  });
});
