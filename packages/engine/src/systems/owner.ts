/**
 * MFD Owner System
 *
 * Owner archetypes, approval calculation, and mood tracking.
 * Five archetypes drive how owners evaluate GM performance.
 */

import { RNG } from '../rng';
import { cl } from '../utils';
import type { OwnerArchetypeId, OwnerState, Team, SeasonContext } from '../types';

// ── Archetype Definitions ──────────────────────────────

export interface OwnerArchetype {
  id: OwnerArchetypeId;
  label: string;
  desc: string;
  approvalCalc: (team: Team, season: SeasonContext) => number;
}

export const OWNER_ARCHETYPES: readonly OwnerArchetype[] = [
  {
    id: 'win_now',
    label: 'Win Now',
    desc: 'Demands immediate results. Impatient with losing.',
    approvalCalc: (t, s) => {
      if (s.phase === 'offseason') return 0;
      const gp = t.wins + t.losses;
      const wp = gp > 0 ? t.wins / gp : 0.5;
      if (wp >= 0.7) return 15;
      if (wp >= 0.5) return 5;
      if (wp >= 0.35) return -5;
      return -15;
    },
  },
  {
    id: 'patient_builder',
    label: 'Patient Builder',
    desc: 'Values long-term growth over short-term wins.',
    approvalCalc: (t, s) => {
      if (s.phase === 'offseason') return 0;
      const youngCount = t.roster.filter((p) => p.age <= 25).length;
      const youthPct = t.roster.length > 0 ? youngCount / t.roster.length : 0;
      if (youthPct >= 0.4) return 8;
      if (youthPct >= 0.25) return 3;
      return -3;
    },
  },
  {
    id: 'profit_first',
    label: 'Profit First',
    desc: 'Cares about cap efficiency and attendance.',
    approvalCalc: (t) => {
      const capPct = t.capUsed / 255;
      if (capPct <= 0.7) return 8;
      if (capPct <= 0.85) return 3;
      if (capPct <= 0.95) return -3;
      return -8;
    },
  },
  {
    id: 'fan_favorite',
    label: 'Fan Favorite',
    desc: 'Wants exciting play and star players.',
    approvalCalc: (t) => {
      const stars = t.roster.filter((p) => p.ovr >= 85).length;
      if (stars >= 5) return 12;
      if (stars >= 3) return 6;
      if (stars >= 1) return 0;
      return -8;
    },
  },
  {
    id: 'legacy_builder',
    label: 'Legacy Builder',
    desc: 'Values championships and franchise history.',
    approvalCalc: (t, s) => {
      if (s.phase === 'offseason') return 0;
      const gp = t.wins + t.losses;
      const wp = gp > 0 ? t.wins / gp : 0.5;
      if (wp >= 0.6) return 10;
      if (wp >= 0.45) return 2;
      return -6;
    },
  },
] as const;

// ── Initialization ─────────────────────────────────────

export function initOwner(): OwnerState {
  const idx = Math.floor(RNG.ai() * OWNER_ARCHETYPES.length);
  const arch = OWNER_ARCHETYPES[idx] ?? OWNER_ARCHETYPES[0]!;
  return {
    archetypeId: arch.id,
    label: arch.label,
    approval: 60,
    history: [],
  };
}

// ── Approval Update ────────────────────────────────────

export function updateOwnerApproval(
  owner: OwnerState,
  team: Team,
  season: SeasonContext,
): { approval: number; delta: number } {
  const arch = OWNER_ARCHETYPES.find((a) => a.id === owner.archetypeId)
    ?? OWNER_ARCHETYPES[0]!;

  const delta = arch.approvalCalc(team, season);
  owner.approval = cl(owner.approval + delta, 0, 100);

  owner.history.push({
    year: season.year,
    week: season.week,
    approval: owner.approval,
    delta,
  });

  if (owner.history.length > 40) {
    owner.history = owner.history.slice(-40);
  }

  return { approval: owner.approval, delta };
}

// ── Status Labels ──────────────────────────────────────

export interface OwnerStatusInfo {
  label: string;
  color: string;
  severity: number;
}

export function getOwnerStatus(approval: number): OwnerStatusInfo {
  if (approval >= 85) return { label: 'Thrilled', color: 'green', severity: 0 };
  if (approval >= 70) return { label: 'Pleased', color: 'teal', severity: 0 };
  if (approval >= 55) return { label: 'Content', color: 'slate', severity: 0 };
  if (approval >= 40) return { label: 'Concerned', color: 'amber', severity: 1 };
  if (approval >= 25) return { label: 'Frustrated', color: 'orange', severity: 2 };
  return { label: 'Furious', color: 'red', severity: 3 };
}
