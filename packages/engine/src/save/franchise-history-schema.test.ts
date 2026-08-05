import { describe, it, expect } from 'vitest';
import { FranchiseHistoryEntrySchema } from './schema';

/**
 * Schema hardening island 8: GameState.franchiseHistory entries are typed
 * against the real FranchiseHistoryEntry interface (types/franchise.ts)
 * instead of z.array(z.any()).
 *
 * Both writers verified: history.ts archiveSeasonHistory emits the full
 * modern shape with all five optional fields (satisfies
 * FranchiseHistoryEntry), while scenario-challenge seeds a minimal
 * pre-identity entry without them — so fanbase/prestige/attendance/
 * stadiumName/keyStats stay optional exactly as the interface declares.
 * playoffFinish is a free-form string by design. Fixtures all carry empty
 * franchiseHistory, so strict strip is lossless: modern entries round-trip
 * byte-equal, minimal writer entries pass unchanged, malformed entries are
 * rejected loudly.
 */

const modernEntry = {
  year: 2029,
  teamId: 'chi',
  wins: 12,
  losses: 5,
  ties: 0,
  record: '12-5',
  pointDifferential: 104,
  playoffFinish: 'champion',
  majorEvents: ['Won the championship.', 'Week 14 comeback sealed the division.'],
  awardsWon: ['Coach of the Year'],
  recordsBroken: ['Single-season passing yards'],
  fanbase: 88,
  prestige: 91,
  attendance: 97,
  stadiumName: 'Blaze Field',
  keyStats: { totalYards: 6211, pointsFor: 486, pointsAgainst: 382 },
};

const minimalWriterEntry = {
  year: 2028,
  teamId: 'chi',
  wins: 14,
  losses: 3,
  ties: 0,
  record: '14-3',
  pointDifferential: 142,
  playoffFinish: 'champion',
  awardsWon: [],
  recordsBroken: [],
  majorEvents: ['Won the championship'],
};

describe('FranchiseHistoryEntrySchema (island 8: typed GameState.franchiseHistory)', () => {
  it('round-trips the archiveSeasonHistory modern shape without data loss', () => {
    const parsed = FranchiseHistoryEntrySchema.safeParse(modernEntry);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(modernEntry);
    }
  });

  it('round-trips the scenario-challenge minimal writer shape exactly', () => {
    const parsed = FranchiseHistoryEntrySchema.safeParse(minimalWriterEntry);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(minimalWriterEntry);
      expect(parsed.data.keyStats).toBeUndefined();
      expect(parsed.data.stadiumName).toBeUndefined();
    }
  });

  it('accepts free-form playoffFinish labels and partial optional fields', () => {
    const parsed = FranchiseHistoryEntrySchema.safeParse({
      ...minimalWriterEntry,
      playoffFinish: 'super_bowl_runner_up',
      fanbase: 74,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.playoffFinish).toBe('super_bowl_runner_up');
      expect(parsed.data.fanbase).toBe(74);
      expect(parsed.data.prestige).toBeUndefined();
    }
  });

  it('rejects malformed entries loudly instead of passing them through as any', () => {
    expect(FranchiseHistoryEntrySchema.safeParse({ year: 2029, teamId: 'chi' }).success).toBe(false);
    expect(FranchiseHistoryEntrySchema.safeParse({ ...modernEntry, wins: '12' }).success).toBe(false);
    expect(FranchiseHistoryEntrySchema.safeParse({ ...modernEntry, majorEvents: 'championship' }).success).toBe(false);
    expect(
      FranchiseHistoryEntrySchema.safeParse({
        ...modernEntry,
        keyStats: { totalYards: 6211, pointsFor: 486 },
      }).success,
    ).toBe(false);
  });

  it('strips unknown keys so the typed shape stays authoritative', () => {
    const parsed = FranchiseHistoryEntrySchema.safeParse({ ...modernEntry, hypeRating: 100 });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect('hypeRating' in parsed.data).toBe(false);
      expect(parsed.data).toEqual(modernEntry);
    }
  });
});
