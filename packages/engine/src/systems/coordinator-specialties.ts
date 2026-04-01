/**
 * MFD Coordinator Specialties System
 *
 * OC and DC specialty definitions with game simulation effects.
 */

import { RNG } from '../rng';
import type { CoordinatorSpecialty, StaffMember } from '../types';

// ── Offensive Coordinator Specialties ──────────────────

export const OC_SPECIALTIES: readonly CoordinatorSpecialty[] = [
  { id: 'run_guru', label: 'Run Game Guru', icon: 'footprints', effect: { rushMod: 2, runLanes: 0.03 }, desc: 'Boosts rushing efficiency' },
  { id: 'pass_arch', label: 'Pass Architect', icon: 'target', effect: { passMod: 2, pocket: 0.02 }, desc: 'Elevates passing game' },
  { id: 'rz_spec', label: 'Red Zone Specialist', icon: 'circle', effect: { rzTdPct: 0.04 }, desc: 'Better red zone TD conversion' },
  { id: 'tempo', label: 'Tempo Master', icon: 'zap', effect: { drivesBonus: 1 }, desc: 'Extra offensive possessions' },
  { id: 'play_action', label: 'Play-Action Expert', icon: 'layers', effect: { passMod: 1, stallReduction: 0.02 }, desc: 'Fewer 3-and-outs with PA' },
] as const;

// ── Defensive Coordinator Specialties ──────────────────

export const DC_SPECIALTIES: readonly CoordinatorSpecialty[] = [
  { id: 'blitz_des', label: 'Blitz Designer', icon: 'wind', effect: { pressureBoost: 0.03 }, desc: 'More effective blitz packages' },
  { id: 'cov_spec', label: 'Coverage Specialist', icon: 'shield', effect: { covAdj: 0.02, intBoost: 0.01 }, desc: 'Tighter coverage, more INTs' },
  { id: 'run_stop', label: 'Run Stopper', icon: 'square', effect: { rushMod: -2 }, desc: 'Shuts down opponent run game' },
  { id: 'turnover', label: 'Turnover Creator', icon: 'refresh-cw', effect: { intBoost: 0.02, fumbleBoost: 0.01 }, desc: 'Forces more turnovers' },
  { id: 'situational', label: 'Situational Master', icon: 'brain', effect: { stallReduction: 0.01, lateGameBoost: 0.03 }, desc: 'Better in crucial moments' },
] as const;

// ── Assignment ─────────────────────────────────────────

export function assignCoordSpecialty(
  staffMember: StaffMember,
  role: 'OC' | 'DC',
): CoordinatorSpecialty {
  if (staffMember.specialty75) return staffMember.specialty75;

  const pool = role === 'OC' ? OC_SPECIALTIES : DC_SPECIALTIES;
  const idx = Math.floor(RNG.ai() * pool.length);
  const spec = pool[idx] ?? pool[0]!;
  staffMember.specialty75 = spec;
  return spec;
}

// ── Lookup ─────────────────────────────────────────────

export function getSpecialtyById(id: string): CoordinatorSpecialty | null {
  return [...OC_SPECIALTIES, ...DC_SPECIALTIES].find((s) => s.id === id) ?? null;
}
