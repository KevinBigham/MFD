import { describe, expect, it } from 'vitest';

import { BREAKOUT_SYSTEM } from '../src/systems/breakout-system.js';

describe('breakout-system.js', () => {
  function makePlayer(overrides = {}) {
    return {
      id: 'p1',
      name: 'Test Player',
      pos: 'QB',
      age: 23,
      ovr: 68,
      pot: 80,
      devTrait: 'normal',
      injury: null,
      ratings: { arm: 70, accuracy: 70 },
      stats: {},
      ...overrides,
    };
  }

  it('isEligible enforces age/ovr/potential/dev/injury guards', () => {
    expect(BREAKOUT_SYSTEM.isEligible(makePlayer())).toBe(true);
    expect(BREAKOUT_SYSTEM.isEligible(makePlayer({ age: 20 }))).toBe(false);
    expect(BREAKOUT_SYSTEM.isEligible(makePlayer({ ovr: 75 }))).toBe(false);
    expect(BREAKOUT_SYSTEM.isEligible(makePlayer({ pot: 72 }))).toBe(false);
    expect(BREAKOUT_SYSTEM.isEligible(makePlayer({ devTrait: 'superstar' }))).toBe(false);
    expect(BREAKOUT_SYSTEM.isEligible(makePlayer({ injury: { games: 2 } }))).toBe(false);
  });

  it('pick chooses up to 3 candidates based on pool size and rng gates', () => {
    const roster = [
      makePlayer({ id: 'a', pot: 85, ovr: 70 }),
      makePlayer({ id: 'b', pot: 83, ovr: 70 }),
      makePlayer({ id: 'c', pot: 82, ovr: 70 }),
      makePlayer({ id: 'd', pot: 81, ovr: 70 }),
      makePlayer({ id: 'e', pot: 80, ovr: 70 }),
      makePlayer({ id: 'f', pot: 79, ovr: 70 }),
    ];

    const picked = BREAKOUT_SYSTEM.pick(roster, () => 0);
    expect(picked).toHaveLength(3);
    expect(picked[0].playerId).toBe('a');
    expect(picked[0].targetOvr).toBeGreaterThanOrEqual(picked[0].ovrAtStart + 8);
  });

  it('resolve hit path upgrades player and marks candidate resolved', () => {
    const player = makePlayer({ ovr: 68, pot: 82, devTrait: 'normal' });
    const candidate = {
      playerId: player.id,
      ovrAtStart: 68,
      targetOvr: 76,
      resolved: false,
      hit: false,
      bust: false,
    };

    const out = BREAKOUT_SYSTEM.resolve(candidate, player, () => 0.1);
    expect(out.resolved).toBe(true);
    expect(out.hit).toBe(true);
    expect(out.bust).toBe(false);
    expect(player.ovr).toBe(76);
    expect(player.devTrait).toBe('star');
    expect(player.ratings.arm).toBeGreaterThan(70);
  });

  it('resolve bust path marks bust without forcing ovr jump', () => {
    const player = makePlayer({ ovr: 70, pot: 84, devTrait: 'normal' });
    const candidate = {
      playerId: player.id,
      ovrAtStart: 70,
      targetOvr: 78,
      resolved: false,
      hit: false,
      bust: false,
    };

    const out = BREAKOUT_SYSTEM.resolve(candidate, player, () => 0.99);
    expect(out.resolved).toBe(true);
    expect(out.hit).toBe(false);
    expect(out.bust).toBe(true);
    expect(player.ovr).toBe(70);
  });

  it('milestoneCheck emits one-time growth/stat milestones', () => {
    const player = makePlayer({
      name: 'Milestone QB',
      ovr: 72,
      stats: { passTD: 14 },
    });

    const candidate = { ovrAtStart: 68, resolved: false };

    const first = BREAKOUT_SYSTEM.milestoneCheck(candidate, player, 9);
    expect(first?.msg).toContain('gained +4 OVR');

    const second = BREAKOUT_SYSTEM.milestoneCheck(candidate, player, 9);
    expect(second?.msg).toContain('14+ TDs');

    const third = BREAKOUT_SYSTEM.milestoneCheck(candidate, player, 9);
    expect(third).toBeNull();
  });
});
