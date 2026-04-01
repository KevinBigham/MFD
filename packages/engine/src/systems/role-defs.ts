/**
 * MFD Role Definitions System
 *
 * Position-specific role assignments with snap percentages.
 * Assigns roles by OVR ranking within each position group.
 */

import type { Player, Position } from '../types';

// ── Role Data ──────────────────────────────────────────

export interface RoleDef {
  id: string;
  label: string;
  snapPct: number;
}

export const ROLE_DEFS: Partial<Record<Position, readonly RoleDef[]>> = {
  RB: [
    { id: 'rb1', label: 'RB1 (Bellcow)', snapPct: 65 },
    { id: '3rd_down', label: '3rd Down Back', snapPct: 25 },
    { id: 'goal_line', label: 'Goal Line', snapPct: 10 },
  ],
  WR: [
    { id: 'wr_x', label: 'X (Outside)', snapPct: 45 },
    { id: 'wr_slot', label: 'Slot', snapPct: 35 },
    { id: 'wr_deep', label: 'Deep Threat', snapPct: 20 },
  ],
  DL: [
    { id: 'pass_rush', label: 'Pass Rusher', snapPct: 55 },
    { id: 'run_stop', label: 'Run Stopper', snapPct: 45 },
  ],
  LB: [
    { id: 'pass_rush_lb', label: 'Blitzer', snapPct: 40 },
    { id: 'coverage_lb', label: 'Coverage', snapPct: 35 },
    { id: 'run_stop_lb', label: 'Run Stopper', snapPct: 25 },
  ],
} as const;

// ── Role Assignment ────────────────────────────────────

export function assignDefaultRoles(roster: Player[]): void {
  const byPos: Partial<Record<Position, Player[]>> = {};

  for (const p of roster) {
    if (!byPos[p.pos]) byPos[p.pos] = [];
    byPos[p.pos]!.push(p);
  }

  for (const pos of ['RB', 'WR', 'DL', 'LB'] as Position[]) {
    const players = (byPos[pos] ?? [])
      .filter((p) => !p.injury || !p.injury.gamesOut)
      .sort((a, b) => b.ovr - a.ovr);

    const roles = ROLE_DEFS[pos];
    if (!roles || players.length === 0) continue;

    for (let i = 0; i < players.length; i++) {
      const p = players[i]!;
      const roleDef = i < roles.length ? roles[i]! : roles[roles.length - 1]!;
      const newRole = roleDef.id;

      if (p.role === newRole) {
        p.roleWeeks = (p.roleWeeks ?? 0) + 1;
      } else {
        p.role = newRole;
        p.roleWeeks = 0;
      }
    }
  }
}

// ── Snap Percentage Lookup ─────────────────────────────

export function getRoleSnapPct(pos: Position, roleId: string): number {
  const roles = ROLE_DEFS[pos];
  if (!roles) return 100;
  const r = roles.find((d) => d.id === roleId);
  return r ? r.snapPct : 50;
}
