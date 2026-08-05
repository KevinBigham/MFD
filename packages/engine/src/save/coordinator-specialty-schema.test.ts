import { describe, it, expect } from 'vitest';
import { CoordinatorSpecialtySchema, StaffCandidateSchema } from './schema';

/**
 * Schema hardening island 11: StaffCandidate.specialty75 (inside
 * GameState.coachingMarket.candidates) is typed against the real
 * CoordinatorSpecialty interface (types/team.ts:136-142) instead of
 * z.any().nullable().optional().
 *
 * The writer set is closed: coaching-market.ts builds candidates via
 * `{ ...member, desiredRole, fitScore, continuityTag, reasoning }` from a
 * generated StaffMember, and specialties only ever come from the
 * OC_SPECIALTIES/DC_SPECIALTIES catalogs assigned by
 * coordinator-specialties.ts assignCoordSpecialty (exact literal shape).
 * setup-hiring-catalog seeds null. Fixtures v1-v34 carry no specialty75
 * key at all, so nullable+optional is lossless for every golden save.
 * Readers only touch .id (coordinator-chemistry matrices) and .label
 * (franchise-setup summary), both declared. id/label/icon/desc stay
 * free-form strings exactly as the interface declares.
 */

const passArchitect = {
  id: 'pass_arch',
  label: 'Pass Architect',
  icon: 'target',
  effect: { passMod: 2, pocket: 0.02 },
  desc: 'Elevates passing game',
};

const runStopper = {
  id: 'run_stop',
  label: 'Run Stopper',
  icon: 'square',
  effect: { rushMod: -2 },
  desc: 'Shuts down opponent run game',
};

const baseCandidate = {
  id: 'cand-1',
  name: 'Coach Candidate',
  role: 'OC',
  archetype: 'offensive_guru',
  traits: [],
  ratings: { gameplan: 85 },
  level: 5,
  desiredRole: 'OC',
  fitScore: 88,
  continuityTag: 'strong',
  reasoning: ['Grades well.'],
};

describe('CoordinatorSpecialtySchema / StaffCandidate.specialty75 (island 11)', () => {
  it('round-trips a catalog specialty without data loss', () => {
    const parsed = CoordinatorSpecialtySchema.safeParse(passArchitect);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(passArchitect);
    }
  });

  it('accepts every catalog specialty shape incl. empty effect maps', () => {
    for (const spec of [passArchitect, runStopper, { ...passArchitect, effect: {} }]) {
      const parsed = CoordinatorSpecialtySchema.safeParse(spec);
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data).toEqual(spec);
    }
  });

  it('keeps StaffCandidate candidates valid with specialty, null, and absent specialty75', () => {
    const withSpec = StaffCandidateSchema.safeParse({ ...baseCandidate, specialty75: runStopper });
    expect(withSpec.success).toBe(true);
    if (withSpec.success) expect(withSpec.data.specialty75).toEqual(runStopper);

    const withNull = StaffCandidateSchema.safeParse({ ...baseCandidate, specialty75: null });
    expect(withNull.success).toBe(true);
    if (withNull.success) expect(withNull.data.specialty75).toBeNull();

    const absent = StaffCandidateSchema.safeParse(baseCandidate);
    expect(absent.success).toBe(true);
    if (absent.success) expect(absent.data.specialty75).toBeUndefined();
  });

  it('rejects malformed specialties loudly instead of passing them through as any', () => {
    expect(CoordinatorSpecialtySchema.safeParse({ id: 'pass_arch' }).success).toBe(false);
    expect(
      CoordinatorSpecialtySchema.safeParse({ ...passArchitect, effect: { passMod: 'high' } }).success,
    ).toBe(false);
    expect(
      CoordinatorSpecialtySchema.safeParse({ ...passArchitect, effect: 'boost' }).success,
    ).toBe(false);
    expect(
      StaffCandidateSchema.safeParse({ ...baseCandidate, specialty75: 'pass_arch' }).success,
    ).toBe(false);
  });

  it('strips unknown keys so the typed shape stays authoritative', () => {
    const parsed = CoordinatorSpecialtySchema.safeParse({ ...passArchitect, synergy: 99 });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect('synergy' in parsed.data).toBe(false);
      expect(parsed.data).toEqual(passArchitect);
    }
  });
});
