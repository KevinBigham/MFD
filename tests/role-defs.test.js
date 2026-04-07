import { describe, expect, it } from 'vitest';

import { ROLE_DEFS, assignDefaultRoles, getRoleSnapPct } from '../src/systems/role-defs.js';

describe('role-defs.js', () => {
  it('defines role groups and snap pct lookup behavior', () => {
    expect(Object.keys(ROLE_DEFS)).toEqual(expect.arrayContaining(['RB', 'WR', 'DL', 'LB']));
    expect(getRoleSnapPct('RB', 'rb1')).toBe(65);
    expect(getRoleSnapPct('RB', 'unknown')).toBe(50);
    expect(getRoleSnapPct('QB', 'starter')).toBe(100);
  });

  it('assignDefaultRoles sets roles by OVR order and skips injured players', () => {
    const roster = [
      { id: 'rb1', pos: 'RB', ovr: 85 },
      { id: 'rb2', pos: 'RB', ovr: 80 },
      { id: 'rb3', pos: 'RB', ovr: 75, injury: { games: 2 } },
      { id: 'wr1', pos: 'WR', ovr: 88 },
      { id: 'wr2', pos: 'WR', ovr: 82 },
      { id: 'wr3', pos: 'WR', ovr: 78 },
      { id: 'wr4', pos: 'WR', ovr: 70 },
    ];
    assignDefaultRoles(roster);

    expect(roster.find((p) => p.id === 'rb1').role).toBe('rb1');
    expect(roster.find((p) => p.id === 'rb2').role).toBe('3rd_down');
    expect(roster.find((p) => p.id === 'rb3').role).toBeUndefined();
    expect(roster.find((p) => p.id === 'wr1').role).toBe('wr_x');
    expect(roster.find((p) => p.id === 'wr4').role).toBe('wr_deep');
  });

  it('assignDefaultRoles increments roleWeeks on stable role and resets on change', () => {
    const roster = [
      { id: 'rb1', pos: 'RB', ovr: 85, role: 'rb1', roleWeeks: 2 },
      { id: 'rb2', pos: 'RB', ovr: 80, role: 'goal_line', roleWeeks: 4 },
      { id: 'rb3', pos: 'RB', ovr: 70, role: '3rd_down', roleWeeks: 1 },
    ];
    assignDefaultRoles(roster);
    expect(roster.find((p) => p.id === 'rb1').roleWeeks).toBe(3);
    expect(roster.find((p) => p.id === 'rb2').role).toBe('3rd_down');
    expect(roster.find((p) => p.id === 'rb2').roleWeeks).toBe(0);
  });
});
