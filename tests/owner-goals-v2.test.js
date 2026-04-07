import { describe, expect, it } from 'vitest';

import { OWNER_GOALS, OWNER_TYPES } from '../src/systems/owner-goals-v2.js';

describe('owner-goals-v2.js', () => {
  it('defines expected owner archetypes', () => {
    const ids = OWNER_TYPES.map((t) => t.id);
    expect(ids).toEqual(['patient', 'win_now', 'penny']);
  });

  it('make_playoffs and exceed logic works', () => {
    const goal = OWNER_GOALS.find((g) => g.id === 'make_playoffs');
    expect(goal.check({ madePlayoffs: true })).toBe(true);
    expect(goal.check({ madePlayoffs: false })).toBe(false);
    expect(goal.exceed({ wonChamp: true })).toBe(true);
  });

  it('cap_discipline and no_dead_cap thresholds are evaluated correctly', () => {
    const cap = OWNER_GOALS.find((g) => g.id === 'cap_discipline');
    const dead = OWNER_GOALS.find((g) => g.id === 'no_dead_cap');

    expect(cap.check({ capRoom: 20 })).toBe(true);
    expect(cap.exceed({ capRoom: 39 })).toBe(false);
    expect(cap.exceed({ capRoom: 40 })).toBe(true);

    expect(dead.check({ deadCap: 15 })).toBe(true);
    expect(dead.check({ deadCap: 16 })).toBe(false);
    expect(dead.exceed({ deadCap: 5 })).toBe(true);
  });
});
