import { beforeEach, describe, expect, it } from 'vitest';

import { RING_OF_HONOR_LOG, autoRingOfHonor, getRingOfHonor, nominateForRing } from '../src/systems/ring-of-honor.js';

describe('ring-of-honor.js', () => {
  beforeEach(() => {
    Object.keys(RING_OF_HONOR_LOG).forEach((k) => delete RING_OF_HONOR_LOG[k]);
  });

  it('nominates players once with deterministic fallback number and reason', () => {
    const added = nominateForRing('AAA', { name: 'Legend One', pos: 'QB', ovr: 86 }, 2026);
    const dup = nominateForRing('AAA', { name: 'Legend One', pos: 'QB', ovr: 86 }, 2026);
    const added2 = nominateForRing('AAA', { name: 'Solid Vet', pos: 'LB', ovr: 81 }, 2026);

    expect(added).toBe(true);
    expect(dup).toBe(false);
    expect(added2).toBe(true);

    const honors = getRingOfHonor('AAA');
    expect(honors).toHaveLength(2);
    expect(honors[0].reason).toBe('Franchise legend');
    expect(honors[1].reason).toBe('Fan favorite');
    expect(honors[0].number).toBeGreaterThanOrEqual(10);
    expect(honors[0].number).toBeLessThanOrEqual(98);
  });

  it('autoRingOfHonor promotes departed high-ovr players from last season when history is deep enough', () => {
    const teams = [{ id: 'AAA', abbr: 'AAA', roster: [{ name: 'Still Here', ovr: 79 }] }];
    const history = [
      { year: 2023, teams: [] },
      { year: 2024, teams: [] },
      {
        year: 2025,
        teams: [
          {
            id: 'AAA',
            abbr: 'AAA',
            roster: [
              { name: 'Still Here', ovr: 79, pos: 'WR' },
              { name: 'Retired Star', ovr: 84, pos: 'RB', number: 22 },
              { name: 'Too Low', ovr: 81, pos: 'S', number: 33 },
            ],
          },
        ],
      },
    ];

    autoRingOfHonor(teams, history, 2026);

    const honors = getRingOfHonor('AAA');
    expect(honors).toHaveLength(1);
    expect(honors[0].name).toBe('Retired Star');
    expect(honors[0].number).toBe(22);
  });
});
