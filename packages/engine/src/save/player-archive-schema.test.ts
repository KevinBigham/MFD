import { describe, it, expect } from 'vitest';
import { PlayerArchiveEntrySchema } from './schema';

/**
 * Schema hardening island 7: GameState.playerArchive entries are typed
 * against the real PlayerArchiveEntry interface (types/franchise.ts)
 * instead of z.array(z.any()).
 *
 * The writer set is closed and exact-shape: history.ts ensureArchiveEntry /
 * syncPlayerArchiveEntry / recordPlayerRetirement are the only producers.
 * Reader audit (bloodlines, franchise-legends, roster-identity, web legacy
 * screens) stays inside the interface — award/championship extras are
 * derived at read time, never stored. careerStats mirrors the open
 * CareerStats index signature via catchall. Migration 18 backfills
 * jerseyNumber; retirementYear defaults for the same era. Modern entries
 * round-trip byte-equal, malformed entries are rejected loudly.
 */

const modernEntry = {
  playerId: 'p-77',
  firstName: 'Jay',
  lastName: 'Stone',
  name: 'Jay Stone',
  positions: ['QB'],
  jerseyNumber: 12,
  peakOvr: 96,
  peakYear: 2031,
  firstYear: 2026,
  lastYear: 2033,
  retirementYear: null,
  teamHistory: [
    { teamId: 'chi', firstYear: 2026, lastYear: 2030 },
    { teamId: 'dal', firstYear: 2031, lastYear: 2033 },
  ],
  careerStats: { seasons: 8, gp: 128, snaps: 8011, passYds: 34210, passTds: 261 },
};

describe('PlayerArchiveEntrySchema (island 7: typed GameState.playerArchive)', () => {
  it('round-trips a modern syncPlayerArchiveEntry record without data loss', () => {
    const parsed = PlayerArchiveEntrySchema.safeParse(modernEntry);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(modernEntry);
    }
  });

  it('round-trips a retired multi-position entry (open careerStats index preserved)', () => {
    const retired = {
      ...modernEntry,
      positions: ['S', 'LB'],
      retirementYear: 2035,
      careerStats: { seasons: 10, gp: 150, snaps: 9000, tackles: 812, interceptions: 21 },
    };
    const parsed = PlayerArchiveEntrySchema.safeParse(retired);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(retired);
    }
  });

  it('parses a legacy-era entry missing jerseyNumber, retirementYear, and careerStats with defaults', () => {
    const legacyEntry = {
      playerId: 'p-old',
      firstName: 'Red',
      lastName: 'Grange',
      name: 'Red Grange',
      positions: ['RB'],
      peakOvr: 91,
      peakYear: 2027,
      firstYear: 2026,
      lastYear: 2034,
      teamHistory: [{ teamId: 'chi', firstYear: 2026, lastYear: 2034 }],
    };
    const parsed = PlayerArchiveEntrySchema.safeParse(legacyEntry);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.jerseyNumber).toBeNull();
      expect(parsed.data.retirementYear).toBeNull();
      expect(parsed.data.careerStats).toBeUndefined();
    }
  });

  it('rejects malformed entries loudly instead of passing them through as any', () => {
    expect(PlayerArchiveEntrySchema.safeParse({ playerId: 'p-x' }).success).toBe(false);
    expect(PlayerArchiveEntrySchema.safeParse({ ...modernEntry, positions: ['GOALIE'] }).success).toBe(false);
    expect(
      PlayerArchiveEntrySchema.safeParse({
        ...modernEntry,
        teamHistory: [{ teamId: 'chi', firstYear: 2026 }],
      }).success,
    ).toBe(false);
    expect(
      PlayerArchiveEntrySchema.safeParse({
        ...modernEntry,
        careerStats: { seasons: 8, gp: 128, snaps: 8011, passYds: 'many' },
      }).success,
    ).toBe(false);
  });

  it('strips unknown keys so the typed shape stays authoritative', () => {
    const parsed = PlayerArchiveEntrySchema.safeParse({ ...modernEntry, hofScore: 999 });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect('hofScore' in parsed.data).toBe(false);
      expect(parsed.data).toEqual(modernEntry);
    }
  });
});
