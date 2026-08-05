import { describe, it, expect } from 'vitest';
import { EarnedDoctrineSchema } from './schema';

/**
 * Schema hardening island 12 (FINAL): GameState.earnedDoctrines entries
 * are typed against the real EarnedDoctrine/FranchiseDoctrine shape
 * (systems/franchise-doctrines.ts:22-25, types/franchise.ts:506-515)
 * instead of z.array(z.any()).
 *
 * The writer set is closed and exact-shape: awardDoctrine spreads a
 * DOCTRINE_DEFS catalog literal and adds earnedYear/earnedWeek, and
 * franchise-week.ts only ever pushes via awardDoctrine. Fixtures v1-v34
 * carry no earnedDoctrines key at all, and migration already backfills
 * the array, so .default([]) + strict strip is lossless for every golden
 * save. Readers only sort/group by category and check .id eligibility —
 * all declared. id stays a free-form string exactly as the interface
 * declares (the DoctrineId union is the catalog, not the stored type);
 * category is the 4-value DoctrineCategory enum.
 */

const championshipDna = {
  id: 'championship_dna',
  name: 'Championship DNA',
  description: 'The franchise has won multiple championships and expects to contend every year.',
  origin: 'Won 2+ Super Bowls',
  bonus: 'Free agent interest +10% — stars want to play for a winner.',
  category: 'reputation',
  earnedYear: 2031,
  earnedWeek: 21,
};

const trustTheProcess = {
  id: 'trust_the_process',
  name: 'Trust the Process',
  description: 'The franchise has proven that patience and rebuilding leads to championships.',
  origin: 'Won Super Bowl after a rebuilding phase',
  bonus: 'Owner patience +15% — the owner is more willing to wait for results.',
  category: 'strategy',
  earnedYear: 2029,
  earnedWeek: 22,
};

describe('EarnedDoctrineSchema (island 12: typed GameState.earnedDoctrines)', () => {
  it('round-trips the awardDoctrine writer shape without data loss', () => {
    const parsed = EarnedDoctrineSchema.safeParse(championshipDna);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(championshipDna);
    }
  });

  it('accepts every doctrine category in the enum', () => {
    for (const category of ['culture', 'strategy', 'reputation', 'personnel']) {
      const doctrine = { ...trustTheProcess, category };
      const parsed = EarnedDoctrineSchema.safeParse(doctrine);
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.category).toBe(category);
    }
  });

  it('accepts week-0 and mid-season awards', () => {
    const weekZero = { ...trustTheProcess, earnedWeek: 0 };
    const parsed = EarnedDoctrineSchema.safeParse(weekZero);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toEqual(weekZero);
  });

  it('rejects malformed doctrines loudly instead of passing them through as any', () => {
    expect(EarnedDoctrineSchema.safeParse({ id: 'cap_wizardry' }).success).toBe(false);
    expect(
      EarnedDoctrineSchema.safeParse({ ...trustTheProcess, category: 'mysticism' }).success,
    ).toBe(false);
    expect(
      EarnedDoctrineSchema.safeParse({ ...trustTheProcess, earnedYear: 'twenty twenty nine' }).success,
    ).toBe(false);
    expect(
      EarnedDoctrineSchema.safeParse({ ...trustTheProcess, earnedWeek: -1 }).success,
    ).toBe(false);
  });

  it('strips unknown keys so the typed shape stays authoritative', () => {
    const parsed = EarnedDoctrineSchema.safeParse({ ...trustTheProcess, synergyBoost: 5 });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect('synergyBoost' in parsed.data).toBe(false);
      expect(parsed.data).toEqual(trustTheProcess);
    }
  });
});
