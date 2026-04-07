import { describe, expect, it } from 'vitest';

import { SCOUT_COSTS86, STARTER_COUNTS, genPickBlurb, genRunAlerts } from '../src/systems/scouting.js';

describe('scouting.js', () => {
  it('exposes starter counts and consistent scout point cost totals', () => {
    expect(STARTER_COUNTS.QB).toBe(1);
    expect(STARTER_COUNTS.OL).toBe(5);
    expect(SCOUT_COSTS86.full).toBe(SCOUT_COSTS86.measurables + SCOUT_COSTS86.interview + SCOUT_COSTS86.film);
  });

  it('genPickBlurb highlights talent, upside, and critical need', () => {
    const blurb = genPickBlurb(
      { pos: 'CB', ovr: 89, pot: 90, age: 22 },
      [{ pos: 'QB' }, { pos: 'RB' }, { pos: 'WR' }]
    );
    expect(blurb).toContain('Elite talent');
    expect(blurb).toContain('young upside');
    expect(blurb).toContain('fills critical need');
  });

  it('genPickBlurb adapts language for older veteran profile', () => {
    const blurb = genPickBlurb(
      { pos: 'LB', ovr: 73, pot: 75, age: 31 },
      [{ pos: 'LB' }, { pos: 'LB' }, { pos: 'LB' }]
    );
    expect(blurb).toContain('Solid contributor');
    expect(blurb).toContain('veteran presence');
  });

  it('genRunAlerts emits position-run and elite-talent warnings (max 2)', () => {
    const prevPool = [
      { pos: 'QB', ovr: 80 }, { pos: 'QB', ovr: 78 }, { pos: 'QB', ovr: 76 }, { pos: 'QB', ovr: 75 },
      { pos: 'CB', ovr: 88 }, { pos: 'WR', ovr: 87 },
    ];
    const pool = [
      { pos: 'QB', ovr: 74 }, // run collapse from 4 -> 0 starter-quality QBs
      { pos: 'CB', ovr: 86 },
      { pos: 'WR', ovr: 84 },
      { pos: 'DL', ovr: 83 },
    ];

    const alerts = genRunAlerts(pool, prevPool);
    expect(alerts.length).toBeLessThanOrEqual(2);
    expect(alerts.some((a) => a.includes('RUN on QBs'))).toBe(true);
  });

  it('genRunAlerts returns empty list when pools are missing', () => {
    expect(genRunAlerts(null, [])).toEqual([]);
    expect(genRunAlerts([], null)).toEqual([]);
  });
});
