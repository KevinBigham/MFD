import { describe, expect, it } from 'vitest';
import { LEGACY_SYSTEM } from '../src/systems/legacy-system.js';

describe('legacy-system', function () {
  it('has 12 achievements defined', function () {
    expect(LEGACY_SYSTEM.ACHIEVEMENTS.length).toBe(12);
  });

  it('has 5 perks defined', function () {
    expect(LEGACY_SYSTEM.PERKS.length).toBe(5);
  });

  it('all achievements have required fields', function () {
    LEGACY_SYSTEM.ACHIEVEMENTS.forEach(function (a) {
      expect(a.id).toBeTruthy();
      expect(a.label).toBeTruthy();
      expect(a.desc).toBeTruthy();
      expect(typeof a.xp).toBe('number');
      expect(a.xp).toBeGreaterThan(0);
    });
  });

  it('all perks have required fields', function () {
    LEGACY_SYSTEM.PERKS.forEach(function (p) {
      expect(p.id).toBeTruthy();
      expect(p.label).toBeTruthy();
      expect(p.desc).toBeTruthy();
      expect(typeof p.xpRequired).toBe('number');
      expect(p.xpRequired).toBeGreaterThan(0);
    });
  });

  it('perks are ordered by XP requirement', function () {
    for (var i = 1; i < LEGACY_SYSTEM.PERKS.length; i++) {
      expect(LEGACY_SYSTEM.PERKS[i].xpRequired).toBeGreaterThanOrEqual(LEGACY_SYSTEM.PERKS[i - 1].xpRequired);
    }
  });

  it('achievement IDs are unique', function () {
    var ids = LEGACY_SYSTEM.ACHIEVEMENTS.map(function (a) { return a.id; });
    var unique = ids.filter(function (v, i, a) { return a.indexOf(v) === i; });
    expect(unique.length).toBe(ids.length);
  });

  it('perk IDs are unique', function () {
    var ids = LEGACY_SYSTEM.PERKS.map(function (p) { return p.id; });
    var unique = ids.filter(function (v, i, a) { return a.indexOf(v) === i; });
    expect(unique.length).toBe(ids.length);
  });
});
