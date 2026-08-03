import { describe, it, expect } from 'vitest';
import { DraftProspectSchema } from './schema';

/**
 * Schema hardening island 3: GameState.draftClass entries are typed against
 * the real DraftProspect interface (types/draft.ts) instead of
 * z.array(z.any()).
 *
 * The writer set is closed and verified: makeProspect (systems/draft.ts)
 * produces exactly the typed shape, runCombine only fills `combine`,
 * bloodlines only fill `bloodline`, and no production code pushes extra keys
 * onto a prospect (scouting progress lives separately in
 * offseasonState.scoutingState). Migrations 7/15/30 already backfill
 * combine/region/bloodline for older saves, so strict strip is safe and
 * modern entries round-trip byte-equal. Malformed entries are rejected
 * loudly instead of silently passing through as `any`.
 */

const modernProspect = {
  id: 'prospect-2032-1',
  firstName: 'Jalen',
  lastName: 'Carter',
  pos: 'QB',
  college: 'Texas',
  region: 'south',
  ratings: { awareness: 88, speed: 91, stamina: 84 },
  projectedRound: 1,
  scoutGrade: 84,
  trueGrade: 88,
  personality: { workEthic: 9, loyalty: 6, greed: 4, pressure: 8, ambition: 10 },
  traits: ['field_general'],
  archetype: { archetype: 'gunslinger', label: 'Gunslinger', description: 'Big arm, bigger confidence.' },
  characterArchetype: 'ceiling',
  bustProbability: 0.12,
  stealProbability: 0.18,
  scoutingReports: [
    { type: 'film', accuracy: 0.8, grade: 86, notes: 'Picks apart zone coverage.' },
    { type: 'interview', accuracy: 0.6, grade: 84, notes: 'Football junkie.' },
  ],
  combine: { fortyYard: 4.62, benchPress: 18, vertical: 33.5, broadJump: 116, threeCone: 7.01, shuttle: 4.28 },
  bloodline: {
    parentPlayerId: 'player-hof-7',
    parentName: 'Ray Carter',
    parentTeamId: 'afce1',
    parentPosition: 'QB',
    relationship: 'son',
    legacyTag: 'franchise_royalty',
  },
};

describe('DraftProspectSchema (island 3: typed GameState.draftClass)', () => {
  it('round-trips a fully-scouted modern prospect without data loss', () => {
    const parsed = DraftProspectSchema.safeParse(modernProspect);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(modernProspect);
    }
  });

  it('round-trips the exact makeProspect writer shape (null combine, no bloodline)', () => {
    // Mirror of systems/draft.ts makeProspect: fresh class entries carry
    // combine: null and no bloodline key until assignBloodlinesToDraftClass.
    const { bloodline, ...freshProspect } = modernProspect;
    const fresh = {
      ...freshProspect,
      traits: [],
      archetype: null,
      scoutingReports: [],
      combine: null,
    };
    const parsed = DraftProspectSchema.safeParse(fresh);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({ ...fresh, bloodline: null });
    }
  });

  it('parses a legacy-era prospect missing combine and bloodline with defaults', () => {
    // Pre-migration-7 saves lack combine; pre-migration-30 saves lack
    // bloodline. Both default to null so direct parses stay lossless.
    const legacyProspect = {
      id: 'prospect-2024-12',
      firstName: 'Bo',
      lastName: 'Jackson',
      pos: 'RB',
      college: 'Auburn',
      region: 'south',
      ratings: { awareness: 80, speed: 95 },
      projectedRound: 1,
      scoutGrade: 82,
      trueGrade: 87,
      personality: { workEthic: 8, loyalty: 7, greed: 3, pressure: 9, ambition: 9 },
      traits: [],
      archetype: null,
      characterArchetype: 'balanced',
      bustProbability: 0.2,
      stealProbability: 0.1,
      scoutingReports: [],
    };
    const parsed = DraftProspectSchema.safeParse(legacyProspect);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.combine).toBeNull();
      expect(parsed.data.bloodline).toBeNull();
    }
  });

  it('rejects malformed prospects loudly instead of passing them through as any', () => {
    expect(DraftProspectSchema.safeParse({ id: 'prospect-x' }).success).toBe(false);
    expect(DraftProspectSchema.safeParse({ ...modernProspect, pos: 'GOALIE' }).success).toBe(false);
    expect(DraftProspectSchema.safeParse({ ...modernProspect, region: 'north' }).success).toBe(false);
    expect(
      DraftProspectSchema.safeParse({
        ...modernProspect,
        scoutingReports: [{ type: 'crystal_ball', accuracy: 1, grade: 99, notes: 'Saw it in a dream.' }],
      }).success,
    ).toBe(false);
    expect(
      DraftProspectSchema.safeParse({
        ...modernProspect,
        personality: { workEthic: 99, loyalty: 6, greed: 4, pressure: 8, ambition: 10 },
      }).success,
    ).toBe(false);
  });

  it('strips unknown keys so the typed shape stays authoritative', () => {
    const parsed = DraftProspectSchema.safeParse({ ...modernProspect, mysteryFutureField: 42 });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect('mysteryFutureField' in parsed.data).toBe(false);
      expect(parsed.data).toEqual(modernProspect);
    }
  });
});
