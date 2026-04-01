/**
 * MFD Coach Trait Mods System
 *
 * Aggregates coaching trait effects from HC + OC + DC
 * with hard caps to prevent overpowering.
 */

import { COACH_TRAITS } from '../config/coaching';
import type { Team } from '../types';

// ── Mod Shape ──────────────────────────────────────────

export interface CoachTraitMods {
  stallReduction: number;
  bigPlayBoost: number;
  rzTdBoost: number;
  pocketBoost: number;
  pressureBoost: number;
  bigPlayAllowed: number;
  intBoost: number;
  intReduction: number;
  moraleStability: number;
  moraleBoost: number;
  devRate: number;
  qbBoost: number;
  counterBoost: number;
}

// ── Hard Caps ──────────────────────────────────────────

const CAPS: Partial<Record<keyof CoachTraitMods, number>> = {
  stallReduction: 0.07,
  pocketBoost: 0.08,
  pressureBoost: 0.08,
  intBoost: 0.03,
  qbBoost: 6,
  devRate: 0.25,
  moraleBoost: 8,
};

// ── Aggregation ────────────────────────────────────────

export function getCoachTraitMods(team: Team): CoachTraitMods {
  const mods: CoachTraitMods = {
    stallReduction: 0, bigPlayBoost: 0, rzTdBoost: 0, pocketBoost: 0,
    pressureBoost: 0, bigPlayAllowed: 0, intBoost: 0, intReduction: 0,
    moraleStability: 0, moraleBoost: 0, devRate: 0, qbBoost: 0, counterBoost: 0,
  };

  if (!team.staff) return mods;

  const coaches = [team.staff.hc, team.staff.oc, team.staff.dc];

  for (const coach of coaches) {
    if (!coach?.traits) continue;

    for (const traitId of coach.traits) {
      const def = COACH_TRAITS[traitId];
      if (!def) continue;

      for (const [key, value] of Object.entries(def.effects)) {
        if (key in mods) {
          const m = mods as unknown as Record<string, number>;
          m[key] = (m[key] ?? 0) + value;
        }
      }
    }
  }

  for (const [key, cap] of Object.entries(CAPS)) {
    if (key in mods && cap !== undefined) {
      const m = mods as unknown as Record<string, number>;
      m[key] = Math.min(m[key] ?? 0, cap);
    }
  }

  return mods;
}
