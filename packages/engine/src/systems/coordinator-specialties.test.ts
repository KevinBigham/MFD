import { describe, expect, it } from 'vitest';

import { setSeed } from '../rng';
import type { CoordinatorSpecialty, StaffMember } from '../types';
import { assignCoordSpecialty, DC_SPECIALTIES, getSpecialtyById, OC_SPECIALTIES } from './coordinator-specialties';

function staff(role: 'OC' | 'DC', specialty75: CoordinatorSpecialty | null = null): StaffMember {
  return {
    id: `${role.toLowerCase()}-1`,
    name: `${role} Coach`,
    role,
    archetype: role === 'OC' ? 'QB Guru' : 'Coverage Guru',
    traits: [],
    ratings: {},
    level: 5,
    specialty75,
  };
}

describe('coordinator-specialties', () => {
  it('defines the exact offensive specialty catalog consumed by fit and chemistry systems', () => {
    expect(OC_SPECIALTIES).toEqual([
      { id: 'run_guru', label: 'Run Game Guru', icon: 'footprints', effect: { rushMod: 2, runLanes: 0.03 }, desc: 'Boosts rushing efficiency' },
      { id: 'pass_arch', label: 'Pass Architect', icon: 'target', effect: { passMod: 2, pocket: 0.02 }, desc: 'Elevates passing game' },
      { id: 'rz_spec', label: 'Red Zone Specialist', icon: 'circle', effect: { rzTdPct: 0.04 }, desc: 'Better red zone TD conversion' },
      { id: 'tempo', label: 'Tempo Master', icon: 'zap', effect: { drivesBonus: 1 }, desc: 'Extra offensive possessions' },
      { id: 'play_action', label: 'Play-Action Expert', icon: 'layers', effect: { passMod: 1, stallReduction: 0.02 }, desc: 'Fewer 3-and-outs with PA' },
    ]);
  });

  it('defines the exact defensive specialty catalog consumed by fit and chemistry systems', () => {
    expect(DC_SPECIALTIES).toEqual([
      { id: 'blitz_des', label: 'Blitz Designer', icon: 'wind', effect: { pressureBoost: 0.03 }, desc: 'More effective blitz packages' },
      { id: 'cov_spec', label: 'Coverage Specialist', icon: 'shield', effect: { covAdj: 0.02, intBoost: 0.01 }, desc: 'Tighter coverage, more INTs' },
      { id: 'run_stop', label: 'Run Stopper', icon: 'square', effect: { rushMod: -2 }, desc: 'Shuts down opponent run game' },
      { id: 'turnover', label: 'Turnover Creator', icon: 'refresh-cw', effect: { intBoost: 0.02, fumbleBoost: 0.01 }, desc: 'Forces more turnovers' },
      { id: 'situational', label: 'Situational Master', icon: 'brain', effect: { stallReduction: 0.01, lateGameBoost: 0.03 }, desc: 'Better in crucial moments' },
    ]);
  });

  it('keeps specialty ids unique across offensive and defensive catalogs', () => {
    const ids = [...OC_SPECIALTIES, ...DC_SPECIALTIES].map((specialty) => specialty.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('looks up specialties from both catalogs and returns null for unknown ids', () => {
    expect(getSpecialtyById('pass_arch')).toBe(OC_SPECIALTIES[1]);
    expect(getSpecialtyById('run_stop')).toBe(DC_SPECIALTIES[2]);
    expect(getSpecialtyById('future_specialty')).toBeNull();
  });

  it('assigns seeded OC specialties from the offensive pool and mutates the staff member', () => {
    setSeed(42);
    const coordinator = staff('OC');
    const assigned = assignCoordSpecialty(coordinator, 'OC');

    expect(OC_SPECIALTIES).toContain(assigned);
    expect(DC_SPECIALTIES).not.toContain(assigned);
    expect(coordinator.specialty75).toBe(assigned);

    setSeed(42);
    expect(assignCoordSpecialty(staff('OC'), 'OC').id).toBe(assigned.id);
  });

  it('assigns seeded DC specialties from the defensive pool and mutates the staff member', () => {
    setSeed(42);
    const coordinator = staff('DC');
    const assigned = assignCoordSpecialty(coordinator, 'DC');

    expect(DC_SPECIALTIES).toContain(assigned);
    expect(OC_SPECIALTIES).not.toContain(assigned);
    expect(coordinator.specialty75).toBe(assigned);

    setSeed(42);
    expect(assignCoordSpecialty(staff('DC'), 'DC').id).toBe(assigned.id);
  });

  it('returns an existing specialty without rerolling or consuming the AI RNG channel', () => {
    const existing = OC_SPECIALTIES[1]!;
    const coordinator = staff('OC', existing);

    setSeed(77);
    const retained = assignCoordSpecialty(coordinator, 'OC');
    const nextAfterRetained = assignCoordSpecialty(staff('DC'), 'DC');

    setSeed(77);
    const nextWithoutRetained = assignCoordSpecialty(staff('DC'), 'DC');

    expect(retained).toBe(existing);
    expect(coordinator.specialty75).toBe(existing);
    expect(nextAfterRetained.id).toBe(nextWithoutRetained.id);
  });
});
