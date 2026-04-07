import { beforeEach, describe, expect, it } from 'vitest';

import {
  FO_BACKSTORIES,
  FO_FIRST_NAMES,
  FO_LAST_NAMES,
  FO_TRAITS,
  FRONT_OFFICE,
} from '../src/systems/front-office.js';
import { setSeed } from '../src/utils/rng.js';

describe('front-office.js', () => {
  beforeEach(() => {
    setSeed(2026);
  });

  it('exports name pools and traits', () => {
    expect(FO_FIRST_NAMES.length).toBeGreaterThan(20);
    expect(FO_LAST_NAMES.length).toBeGreaterThan(20);
    expect(Object.keys(FO_TRAITS).length).toBeGreaterThan(10);
    expect(Object.keys(FO_BACKSTORIES).length).toBeGreaterThan(3);
  });

  it('defines seven front office roles', () => {
    expect(FRONT_OFFICE.roles).toHaveLength(7);
    expect(FRONT_OFFICE.roles.map((r) => r.id)).toContain('gm');
    expect(FRONT_OFFICE.roles.map((r) => r.id)).toContain('medstaff');
  });

  it('generateStaff returns null for invalid role', () => {
    expect(FRONT_OFFICE.generateStaff('nope')).toBeNull();
  });

  it('generateStaff is deterministic for fixed seed', () => {
    setSeed(555);
    const a = FRONT_OFFICE.generateStaff('gm');
    setSeed(555);
    const b = FRONT_OFFICE.generateStaff('gm');

    expect(a).toEqual(b);
  });

  it('generateStaff returns values within expected ranges', () => {
    const role = FRONT_OFFICE.roles.find((r) => r.id === 'analytics');
    const s = FRONT_OFFICE.generateStaff('analytics');

    expect(s.roleId).toBe('analytics');
    expect(s.ovr).toBeGreaterThanOrEqual(40);
    expect(s.ovr).toBeLessThanOrEqual(95);
    expect(s.salary).toBeGreaterThanOrEqual(role.salaryRange[0]);
    expect(s.yearsLeft).toBeGreaterThanOrEqual(1);
    expect(s.yearsLeft).toBeLessThanOrEqual(5);
    expect(Object.keys(FO_TRAITS)).toContain(s.trait);
    expect(typeof s.backstory).toBe('string');
    expect(s.backstory.length).toBeGreaterThan(0);
  });

  it('getBonus returns 0 when no matching staff/action', () => {
    expect(FRONT_OFFICE.getBonus([], 'trades')).toBe(0);
    expect(FRONT_OFFICE.getBonus([{ roleId: 'medstaff', ovr: 90 }], 'trades')).toBe(0);
  });

  it('getBonus sums matching role effects', () => {
    const staff = [
      { roleId: 'gm', ovr: 80 },
      { roleId: 'cap_analyst', ovr: 70 },
      { roleId: 'player_relations', ovr: 90 },
    ];

    const capBonus = FRONT_OFFICE.getBonus(staff, 'cap');
    const moraleBonus = FRONT_OFFICE.getBonus(staff, 'morale');

    expect(capBonus).toBe(5); // (80-50)*0.1 + (70-50)*0.1
    expect(moraleBonus).toBe(4); // (90-50)*0.1
  });

  it('getCandidates returns sorted candidates', () => {
    const cands = FRONT_OFFICE.getCandidates('gm', 6);
    expect(cands).toHaveLength(6);
    for (let i = 1; i < cands.length; i += 1) {
      expect(cands[i - 1].ovr).toBeGreaterThanOrEqual(cands[i].ovr);
    }
  });
});
