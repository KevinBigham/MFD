import { describe, expect, it } from 'vitest';

import { INCENTIVES_986 } from '../src/systems/incentives.js';

describe('incentives.js', () => {
  it('defines seven incentive types', () => {
    expect(INCENTIVES_986.types).toHaveLength(7);
  });

  it('returns empty results when player has no incentives', () => {
    const result = INCENTIVES_986.check(null, null);
    expect(result).toEqual({ hit: [], miss: [], totalBonus: 0 });
  });

  it('hits pass_yds incentive when threshold is met', () => {
    const player = {
      stats: { passYds: 4000 },
      incentives986: [{ id: 'pass_yds', threshold: 3500, bonus: 2.0 }],
    };

    const result = INCENTIVES_986.check(player, {});
    expect(result.hit).toHaveLength(1);
    expect(result.totalBonus).toBe(2.0);
  });

  it('hits rush_yds, rec_yds, sacks, and ints incentives via their mapped stats', () => {
    const player = {
      stats: { rushYds: 900, recYds: 750, sacks: 9, defINT: 5 },
      incentives986: [
        { id: 'rush_yds', threshold: 800, bonus: 1.5 },
        { id: 'rec_yds', threshold: 700, bonus: 1.5 },
        { id: 'sacks', threshold: 8, bonus: 1.5 },
        { id: 'ints', threshold: 4, bonus: 1.0 },
      ],
    };

    const result = INCENTIVES_986.check(player, {});
    expect(result.hit).toHaveLength(4);
    expect(result.totalBonus).toBe(5.5);
  });

  it('handles playoffs incentive based on team record flag', () => {
    const player = {
      stats: {},
      incentives986: [{ id: 'playoffs', threshold: 1, bonus: 1.0 }],
    };

    const hit = INCENTIVES_986.check(player, { madePlayoffs: true });
    const miss = INCENTIVES_986.check(player, { madePlayoffs: false });

    expect(hit.hit).toHaveLength(1);
    expect(hit.totalBonus).toBe(1.0);
    expect(miss.hit).toHaveLength(0);
    expect(miss.miss).toHaveLength(1);
  });

  it('pro_bowl incentive is currently unhandled by check() and misses by default', () => {
    const player = {
      stats: { proBowls: 1 },
      incentives986: [{ id: 'pro_bowl', threshold: 1, bonus: 2.5 }],
    };

    const result = INCENTIVES_986.check(player, {});
    expect(result.hit).toHaveLength(0);
    expect(result.miss).toHaveLength(1);
    expect(result.totalBonus).toBe(0);
  });

  it('tracks partial hits and misses in mixed incentive sets', () => {
    const player = {
      stats: { passYds: 3200, rushYds: 850, sacks: 3 },
      incentives986: [
        { id: 'pass_yds', threshold: 3500, bonus: 2.0 },
        { id: 'rush_yds', threshold: 800, bonus: 1.5 },
        { id: 'sacks', threshold: 8, bonus: 1.5 },
      ],
    };

    const result = INCENTIVES_986.check(player, {});
    expect(result.hit).toHaveLength(1);
    expect(result.miss).toHaveLength(2);
    expect(result.totalBonus).toBe(1.5);
  });

  it('treats unknown incentive ids as misses', () => {
    const player = {
      stats: { passYds: 99999 },
      incentives986: [{ id: 'unknown_id', threshold: 1, bonus: 9.9 }],
    };

    const result = INCENTIVES_986.check(player, {});
    expect(result.hit).toHaveLength(0);
    expect(result.miss).toHaveLength(1);
    expect(result.totalBonus).toBe(0);
  });
});
