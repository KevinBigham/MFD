import { describe, expect, it } from 'vitest';
import { assignDefaultRoles, getRoleSnapPct, ROLE_DEFS } from './role-defs';
import { makePlayer } from './test-helpers';

describe('role definitions', () => {
  it('defines rotation roles for position groups with shared snap responsibilities', () => {
    expect(ROLE_DEFS.RB?.map((role) => [role.id, role.snapPct])).toEqual([
      ['rb1', 65],
      ['3rd_down', 25],
      ['goal_line', 10],
    ]);
    expect(ROLE_DEFS.WR?.map((role) => role.id)).toEqual(['wr_x', 'wr_slot', 'wr_deep']);
    expect(ROLE_DEFS.DL?.map((role) => role.id)).toEqual(['pass_rush', 'run_stop']);
    expect(ROLE_DEFS.LB?.map((role) => role.id)).toEqual(['pass_rush_lb', 'coverage_lb', 'run_stop_lb']);
  });

  it('assigns eligible players by position and OVR while leaving unsupported positions unchanged', () => {
    const roster = [
      makePlayer('rb-low', 'afce1', 'RB', 70),
      makePlayer('rb-high', 'afce1', 'RB', 88),
      makePlayer('wr-slot', 'afce1', 'WR', 77),
      makePlayer('wr-x', 'afce1', 'WR', 84),
      makePlayer('qb-1', 'afce1', 'QB', 95),
    ];
    roster[4]!.role = 'Starter';

    assignDefaultRoles(roster);

    expect(roster.find((player) => player.id === 'rb-high')?.role).toBe('rb1');
    expect(roster.find((player) => player.id === 'rb-low')?.role).toBe('3rd_down');
    expect(roster.find((player) => player.id === 'wr-x')?.role).toBe('wr_x');
    expect(roster.find((player) => player.id === 'wr-slot')?.role).toBe('wr_slot');
    expect(roster.find((player) => player.id === 'qb-1')?.role).toBe('Starter');
  });

  it('skips injured players and increments roleWeeks only when the assigned role is unchanged', () => {
    const roster = [
      makePlayer('rb-healthy-1', 'afce1', 'RB', 83),
      makePlayer('rb-healthy-2', 'afce1', 'RB', 79),
      makePlayer('rb-injured', 'afce1', 'RB', 91),
    ];
    roster[0]!.role = 'rb1';
    roster[0]!.roleWeeks = 4;
    roster[1]!.role = 'goal_line';
    roster[1]!.roleWeeks = 6;
    roster[2]!.role = 'rb1';
    roster[2]!.roleWeeks = 10;
    roster[2]!.injury = { type: 'hamstring', severity: 'minor', gamesOut: 2 };

    assignDefaultRoles(roster);

    expect(roster[0]!.role).toBe('rb1');
    expect(roster[0]!.roleWeeks).toBe(5);
    expect(roster[1]!.role).toBe('3rd_down');
    expect(roster[1]!.roleWeeks).toBe(0);
    expect(roster[2]!.role).toBe('rb1');
    expect(roster[2]!.roleWeeks).toBe(10);
  });

  it('uses the last defined role for surplus eligible players in a position group', () => {
    const roster = [
      makePlayer('rb-1', 'afce1', 'RB', 90),
      makePlayer('rb-2', 'afce1', 'RB', 80),
      makePlayer('rb-3', 'afce1', 'RB', 70),
      makePlayer('rb-4', 'afce1', 'RB', 60),
    ];

    assignDefaultRoles(roster);

    expect(roster.map((player) => player.role)).toEqual(['rb1', '3rd_down', 'goal_line', 'goal_line']);
  });

  it('returns configured snap percentages, unknown-role fallback, and unsupported-position fallback', () => {
    expect(getRoleSnapPct('RB', 'rb1')).toBe(65);
    expect(getRoleSnapPct('WR', 'wr_slot')).toBe(35);
    expect(getRoleSnapPct('RB', 'unknown')).toBe(50);
    expect(getRoleSnapPct('QB', 'anything')).toBe(100);
  });
});
