import { describe, it, expect } from 'vitest';
import { FarewellTourSchema } from './schema';

/**
 * Schema hardening island 10: GameState.farewellTours entries are typed
 * against the real FarewellTour interface (types/season.ts) instead of
 * z.array(z.any()).
 *
 * The writer set is closed and exact-shape: jersey-retirement.ts
 * startFarewellTour builds exactly this literal, generateFarewellMoment
 * only spreads an existing moment and overrides opponent/narrative, and
 * franchise-week.ts reads tours without mutating them (offseason resets
 * the array to []). Fixtures carry empty or absent farewellTours, so
 * strict strip is lossless: modern entries round-trip byte-equal,
 * malformed entries are rejected loudly.
 */

const startedTour = {
  playerId: 'p-legend-01',
  playerName: 'Johnny Unitas',
  teamId: 'bal',
  finalSeason: true,
  announcedWeek: 9,
  moments: [
    {
      week: 10,
      type: 'emotional_speech',
      narrative: 'Johnny Unitas addressed the room before Pittsburgh, and the speech hit hard.',
      opponent: 'Pittsburgh Steelers',
    },
    {
      week: 12,
      type: 'gift_exchange',
      narrative: 'Cleveland honored Johnny Unitas with a quiet pregame gift exchange.',
      opponent: 'Cleveland Browns',
    },
    {
      week: 16,
      type: 'final_home_game',
      narrative: 'Johnny Unitas took one last home tunnel walk with the crowd in full voice.',
      opponent: 'Cincinnati Bengals',
    },
    {
      week: 17,
      type: 'final_game',
      narrative: 'Johnny Unitas closed the book on a long career against Pittsburgh.',
      opponent: 'Pittsburgh Steelers',
    },
  ],
};

const minimalTour = {
  playerId: 'p-2',
  playerName: 'A. Legend',
  teamId: 'chi',
  finalSeason: true,
  announcedWeek: 14,
  moments: [
    { week: 17, type: 'final_game', narrative: 'One last ride.', opponent: 'Detroit Lions' },
  ],
};

describe('FarewellTourSchema (island 10: typed GameState.farewellTours)', () => {
  it('round-trips the startFarewellTour writer shape without data loss', () => {
    const parsed = FarewellTourSchema.safeParse(startedTour);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(startedTour);
    }
  });

  it('accepts a minimal single-moment tour and standing_ovation stops', () => {
    const ovation = {
      ...minimalTour,
      moments: [
        { week: 15, type: 'standing_ovation', narrative: 'The crowd rose.', opponent: 'Green Bay Packers' },
        ...minimalTour.moments,
      ],
    };
    const parsed = FarewellTourSchema.safeParse(ovation);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.moments).toHaveLength(2);
      expect(parsed.data).toEqual(ovation);
    }
  });

  it('accepts every moment type in the enum', () => {
    const types = ['standing_ovation', 'gift_exchange', 'emotional_speech', 'final_home_game', 'final_game'];
    for (const type of types) {
      const tour = {
        ...minimalTour,
        moments: [{ week: 17, type, narrative: 'n', opponent: 'o' }],
      };
      expect(FarewellTourSchema.safeParse(tour).success).toBe(true);
    }
  });

  it('rejects malformed tours loudly instead of passing them through as any', () => {
    expect(FarewellTourSchema.safeParse({ playerId: 'p-x' }).success).toBe(false);
    expect(FarewellTourSchema.safeParse({ ...minimalTour, finalSeason: 'yes' }).success).toBe(false);
    expect(
      FarewellTourSchema.safeParse({
        ...minimalTour,
        moments: [{ week: 17, type: 'parade', narrative: 'n', opponent: 'o' }],
      }).success,
    ).toBe(false);
    expect(
      FarewellTourSchema.safeParse({
        ...minimalTour,
        moments: [{ week: '17', type: 'final_game', narrative: 'n', opponent: 'o' }],
      }).success,
    ).toBe(false);
  });

  it('strips unknown keys so the typed shape stays authoritative', () => {
    const parsed = FarewellTourSchema.safeParse({ ...minimalTour, jerseyRetired: true });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect('jerseyRetired' in parsed.data).toBe(false);
      expect(parsed.data).toEqual(minimalTour);
    }
  });
});
