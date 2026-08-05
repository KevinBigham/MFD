import { describe, it, expect } from 'vitest';
import { OwnerSchema } from './schema';

/**
 * Schema hardening island 2: GameState.owners entries are typed against the
 * real Owner interface (types/franchise.ts) instead of z.record(z.any()).
 *
 * Both current writers (convention-save createOwner, franchise-setup
 * ensureOwnerRecord) produce exactly the typed shape, so modern entries
 * round-trip byte-equal. Legacy-era entries missing goals/personality parse
 * with defaults. .passthrough() preserves any historical extra keys so
 * loading and re-saving can never destroy owner data. Malformed entries are
 * rejected loudly.
 */

const modernOwner = {
  id: 'alpha-owner',
  name: 'ALPHA Ownership',
  archetype: 'win_now',
  patience: 24,
  goals: { floor: '9 wins', target: 'playoffs', ceiling: 'title' },
  personality: { spending: 6, patience: 4, mediaAwareness: 7 },
};

describe('OwnerSchema (island 2: typed GameState.owners)', () => {
  it('round-trips a modern engine-written owner without data loss', () => {
    const parsed = OwnerSchema.safeParse(modernOwner);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(modernOwner);
    }
  });

  it('round-trips both real writer shapes exactly', () => {
    // convention-save createOwner shape (same as modernOwner) and the
    // franchise-setup ensureOwnerRecord shape with blank goals.
    const setupOwner = {
      id: 'beta-owner',
      name: 'Beta Owner',
      archetype: 'patient_builder',
      patience: 80,
      goals: { floor: '', target: '', ceiling: '' },
      personality: { spending: 3, patience: 8, mediaAwareness: 6 },
    };
    const parsed = OwnerSchema.safeParse(setupOwner);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(setupOwner);
    }
  });

  it('parses a legacy-era owner missing goals and personality with defaults', () => {
    const legacyOwner = {
      id: 'legacy-owner',
      name: 'Old Save Owner',
      archetype: 'win_now',
      patience: 40,
    };
    const parsed = OwnerSchema.safeParse(legacyOwner);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.goals).toEqual({ floor: '', target: '', ceiling: '' });
      expect(parsed.data.personality).toEqual({ spending: 5, patience: 5, mediaAwareness: 5 });
    }
  });

  it('preserves historical extra keys so round-trips never destroy owner data', () => {
    const ownerWithExtras = {
      ...modernOwner,
      mood: 'demanding',
      approvalHistory: [{ year: 2025, approval: 61 }],
      legacyUnknownField: { nested: true },
    };
    const parsed = OwnerSchema.safeParse(ownerWithExtras);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(ownerWithExtras);
    }
  });

  it('rejects malformed owner entries instead of passing them downstream', () => {
    const missingId = { ...modernOwner } as Record<string, unknown>;
    delete missingId.id;
    expect(OwnerSchema.safeParse(missingId).success).toBe(false);

    const missingName = { ...modernOwner } as Record<string, unknown>;
    delete missingName.name;
    expect(OwnerSchema.safeParse(missingName).success).toBe(false);

    expect(OwnerSchema.safeParse({ ...modernOwner, patience: 'very' }).success).toBe(false);
    expect(OwnerSchema.safeParse('not-an-owner').success).toBe(false);
    expect(OwnerSchema.safeParse(null).success).toBe(false);
  });
});
