import { describe, it, expect } from 'vitest';
import { PlayerRivalrySchema } from './schema';

/**
 * Schema hardening island 9: GameState.playerRivalries entries are typed
 * against the real PlayerRivalry interface (types/season.ts) instead of
 * z.array(z.any()).
 *
 * The writer set is closed and exact-shape: player-rivalries.ts
 * detectNewRivalries/decayRivalries build and mutate exactly this shape,
 * the convention save seeds one literal of the same shape, and the
 * franchise-week updaters only touch intensity/tier/history. Fixtures
 * carry empty or absent playerRivalries, so strict strip is lossless:
 * modern entries round-trip byte-equal, malformed entries are rejected
 * loudly.
 */

const detectedRivalry = {
  id: 'pr-2029-9-p-qb1-p-cb2',
  playerAId: 'p-qb1',
  playerBId: 'p-cb2',
  playerAName: 'Jay Stone',
  playerBName: 'Marcus Reed',
  teamAId: 'chi',
  teamBId: 'det',
  intensity: 30,
  tier: 'budding',
  origin: 'Week 9, 2029: Reed picked off Stone 2 times',
  history: [{
    year: 2029,
    week: 9,
    description: 'Reed picked off Stone 2 times',
    intensityDelta: 30,
  }],
  seasonStarted: 2029,
};

const conventionSeedRivalry = {
  id: 'rivalry-user-qb-vs-rival-cb',
  playerAId: 'qb-1',
  playerBId: 'cb-9',
  playerAName: 'User QB',
  playerBName: 'Rival CB',
  teamAId: 'user',
  teamBId: 'rival',
  intensity: 67,
  tier: 'heated',
  origin: 'Week 14 division race collision',
  history: [{
    year: 2026,
    week: 9,
    description: 'Rival CB baited User QB into a late interception that flipped the first meeting.',
    intensityDelta: 12,
  }],
  seasonStarted: 2026,
};

describe('PlayerRivalrySchema (island 9: typed GameState.playerRivalries)', () => {
  it('round-trips the detectNewRivalries writer shape without data loss', () => {
    const parsed = PlayerRivalrySchema.safeParse(detectedRivalry);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(detectedRivalry);
    }
  });

  it('round-trips the convention-save seed rivalry exactly', () => {
    const parsed = PlayerRivalrySchema.safeParse(conventionSeedRivalry);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(conventionSeedRivalry);
    }
  });

  it('accepts every tier and a grown nemesis history', () => {
    const nemesis = {
      ...detectedRivalry,
      intensity: 88,
      tier: 'nemesis',
      history: [
        ...detectedRivalry.history,
        { year: 2030, week: 4, description: 'Stone torched Reed for the go-ahead score.', intensityDelta: 8 },
        { year: 2030, week: 14, description: 'Reed answered with a pick-six.', intensityDelta: 14 },
      ],
    };
    const parsed = PlayerRivalrySchema.safeParse(nemesis);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.tier).toBe('nemesis');
      expect(parsed.data.history).toHaveLength(3);
    }
  });

  it('rejects malformed rivalries loudly instead of passing them through as any', () => {
    expect(PlayerRivalrySchema.safeParse({ id: 'pr-x' }).success).toBe(false);
    expect(PlayerRivalrySchema.safeParse({ ...detectedRivalry, tier: 'legendary' }).success).toBe(false);
    expect(
      PlayerRivalrySchema.safeParse({
        ...detectedRivalry,
        history: [{ year: 2029, week: 9, description: 'fight', intensityDelta: 'big' }],
      }).success,
    ).toBe(false);
  });

  it('strips unknown keys so the typed shape stays authoritative', () => {
    const parsed = PlayerRivalrySchema.safeParse({ ...detectedRivalry, twitterBeef: true });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect('twitterBeef' in parsed.data).toBe(false);
      expect(parsed.data).toEqual(detectedRivalry);
    }
  });
});
