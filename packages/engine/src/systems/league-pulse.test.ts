import { describe, it, expect } from 'vitest';
import {
  buildLeaguePulse,
  createRivalryHeatSpikePost,
  detectRivalryTierAscension,
  getLeaguePulseRivalry,
} from './league-pulse';
import { mulberry32 } from '../rng';
import type { LeagueRivalry, PowerRanking } from '../types';

function mkRivalry(overrides: Partial<LeagueRivalry>): LeagueRivalry {
  return {
    id: overrides.id ?? `${overrides.teamA ?? 'A'}::${overrides.teamB ?? 'B'}`,
    teamA: 'A',
    teamB: 'B',
    intensity: 40,
    isDivision: false,
    history: [],
    lastMetYear: null,
    lastMetWeek: null,
    ...overrides,
  };
}

function mkRanking(overrides: Partial<PowerRanking>): PowerRanking {
  return {
    rank: 1,
    teamId: 'TEAM',
    teamName: 'Team',
    score: 0,
    previousRank: null,
    delta: 0,
    blurb: '',
    record: '0-0',
    ...overrides,
  };
}

describe('league-pulse / buildLeaguePulse', () => {
  it('returns an empty pulse when given no rivalries and no rankings', () => {
    const pulse = buildLeaguePulse({ rivalries: [], teamNames: {} });
    expect(pulse.summary.totalRivalries).toBe(0);
    expect(pulse.summary.averageIntensity).toBe(0);
    expect(pulse.summary.topIntensity).toBe(0);
    expect(pulse.hottestRivalries).toHaveLength(0);
    expect(pulse.risers).toHaveLength(0);
    expect(pulse.fallers).toHaveLength(0);
  });

  it('classifies rivalries by intensity tier thresholds', () => {
    const rivalries: LeagueRivalry[] = [
      mkRivalry({ id: 'r1', intensity: 85 }),  // blood_feud
      mkRivalry({ id: 'r2', intensity: 60 }),  // heated
      mkRivalry({ id: 'r3', intensity: 35 }),  // budding
      mkRivalry({ id: 'r4', intensity: 10 }),  // quiet
    ];
    const pulse = buildLeaguePulse({ rivalries, teamNames: {} });
    expect(pulse.summary.bloodFeudCount).toBe(1);
    expect(pulse.summary.heatedCount).toBe(1);
    expect(pulse.summary.buddingCount).toBe(1);
    expect(pulse.summary.topIntensity).toBe(85);
    // quiet rivalries are below default min (25), so not in highlight list
    expect(pulse.hottestRivalries.map((e) => e.id)).toEqual(['r1', 'r2', 'r3']);
    expect(pulse.hottestRivalries[0]!.tier).toBe('blood_feud');
    expect(pulse.hottestRivalries[1]!.tier).toBe('heated');
    expect(pulse.hottestRivalries[2]!.tier).toBe('budding');
  });

  it('sorts hottestRivalries by intensity desc and respects maxRivalries clamp', () => {
    const rivalries = Array.from({ length: 50 }, (_, i) =>
      mkRivalry({ id: `r${i}`, intensity: i + 30 }),
    );
    const wide = buildLeaguePulse({ rivalries, teamNames: {} }, { maxRivalries: 100 });
    // clamped to 32
    expect(wide.hottestRivalries).toHaveLength(32);
    // highest intensity first
    expect(wide.hottestRivalries[0]!.intensity).toBe(79);

    const narrow = buildLeaguePulse({ rivalries, teamNames: {} }, { maxRivalries: 3 });
    expect(narrow.hottestRivalries).toHaveLength(3);
    expect(narrow.hottestRivalries.map((e) => e.intensity)).toEqual([79, 78, 77]);
  });

  it('filters by minIntensityForHighlight but still counts all rivalries in summary', () => {
    const rivalries: LeagueRivalry[] = [
      mkRivalry({ id: 'r1', intensity: 90 }),
      mkRivalry({ id: 'r2', intensity: 5 }),
      mkRivalry({ id: 'r3', intensity: 50 }),
    ];
    const pulse = buildLeaguePulse({ rivalries, teamNames: {} }, { minIntensityForHighlight: 60 });
    expect(pulse.summary.totalRivalries).toBe(3);
    expect(pulse.summary.averageIntensity).toBeCloseTo((90 + 5 + 50) / 3, 1);
    // only r1 (90) >= 60
    expect(pulse.hottestRivalries.map((e) => e.id)).toEqual(['r1']);
  });

  it('resolves team names from the name map, falling back to teamId', () => {
    const rivalries: LeagueRivalry[] = [
      mkRivalry({ id: 'HOME::AWAY', teamA: 'HOME', teamB: 'AWAY', intensity: 70 }),
      mkRivalry({ id: 'X::Y', teamA: 'X', teamB: 'Y', intensity: 40 }),
    ];
    const pulse = buildLeaguePulse({
      rivalries,
      teamNames: { HOME: 'Blaze', AWAY: 'Thunder' },
    });
    const first = pulse.hottestRivalries[0]!;
    expect(first.teamAName).toBe('Blaze');
    expect(first.teamBName).toBe('Thunder');
    const second = pulse.hottestRivalries[1]!;
    expect(second.teamAName).toBe('X'); // fallback
    expect(second.teamBName).toBe('Y'); // fallback
  });

  it('formats last-met label and surfaces first history entry', () => {
    const rivalries: LeagueRivalry[] = [
      mkRivalry({
        id: 'r1',
        intensity: 70,
        lastMetYear: 2026,
        lastMetWeek: 5,
        history: ['2026 Week 5: double-OT thriller', 'earlier spark'],
      }),
      mkRivalry({ id: 'r2', intensity: 60 }),
    ];
    const pulse = buildLeaguePulse({ rivalries, teamNames: {} });
    const hot = pulse.hottestRivalries[0]!;
    expect(hot.lastMetLabel).toBe('Y2026 W5');
    expect(hot.historyPreview).toBe('2026 Week 5: double-OT thriller');
    const cold = pulse.hottestRivalries[1]!;
    expect(cold.lastMetLabel).toBe('—');
    expect(cold.historyPreview).toBe('');
  });

  it('partitions power-ranking movers into risers (delta > 0) and fallers (delta < 0)', () => {
    const rankings: PowerRanking[] = [
      mkRanking({ teamId: 'UP1', rank: 1, previousRank: 5, delta: 4 }),
      mkRanking({ teamId: 'UP2', rank: 3, previousRank: 5, delta: 2 }),
      mkRanking({ teamId: 'FLAT', rank: 2, previousRank: 2, delta: 0 }),
      mkRanking({ teamId: 'DOWN1', rank: 10, previousRank: 2, delta: -8 }),
      mkRanking({ teamId: 'DOWN2', rank: 8, previousRank: 4, delta: -4 }),
    ];
    const pulse = buildLeaguePulse({ rivalries: [], teamNames: {}, powerRankings: rankings });
    expect(pulse.risers.map((e) => e.teamId)).toEqual(['UP1', 'UP2']);
    expect(pulse.fallers.map((e) => e.teamId)).toEqual(['DOWN1', 'DOWN2']);
  });

  it('respects maxMovers clamp on risers and fallers independently', () => {
    const rankings: PowerRanking[] = Array.from({ length: 10 }, (_, i) =>
      mkRanking({ teamId: `UP${i}`, rank: i + 1, previousRank: i + 5, delta: 4 - i * 0.1 }),
    );
    rankings.push(
      ...Array.from({ length: 10 }, (_, i) =>
        mkRanking({ teamId: `DN${i}`, rank: i + 11, previousRank: i + 1, delta: -1 - i * 0.1 }),
      ),
    );
    const pulse = buildLeaguePulse(
      { rivalries: [], teamNames: {}, powerRankings: rankings },
      { maxMovers: 3 },
    );
    expect(pulse.risers).toHaveLength(3);
    expect(pulse.fallers).toHaveLength(3);
  });

  it('does not mutate inputs', () => {
    const rivalries: LeagueRivalry[] = [
      mkRivalry({ id: 'r1', intensity: 80 }),
      mkRivalry({ id: 'r2', intensity: 50 }),
    ];
    const rankings: PowerRanking[] = [
      mkRanking({ teamId: 'UP', rank: 1, previousRank: 3, delta: 2 }),
      mkRanking({ teamId: 'DN', rank: 5, previousRank: 2, delta: -3 }),
    ];
    const rivalrySnap = structuredClone(rivalries);
    const rankingsSnap = structuredClone(rankings);
    buildLeaguePulse({ rivalries, teamNames: { A: 'Alpha' }, powerRankings: rankings });
    expect(rivalries).toEqual(rivalrySnap);
    expect(rankings).toEqual(rankingsSnap);
  });

  it('clamps malformed intensity values into [0, 100]', () => {
    const rivalries: LeagueRivalry[] = [
      mkRivalry({ id: 'hi', intensity: 999 }),
      mkRivalry({ id: 'lo', intensity: -50 }),
    ];
    const pulse = buildLeaguePulse({ rivalries, teamNames: {} });
    expect(pulse.summary.topIntensity).toBe(100);
    expect(pulse.hottestRivalries[0]!.intensity).toBe(100);
    expect(pulse.hottestRivalries[0]!.tier).toBe('blood_feud');
    // lo clamps to 0, below min threshold, not in hot list
    expect(pulse.hottestRivalries.find((e) => e.id === 'lo')).toBeUndefined();
  });
});

describe('league-pulse / getLeaguePulseRivalry', () => {
  it('returns the matching rivalry entry', () => {
    const pulse = buildLeaguePulse({
      rivalries: [mkRivalry({ id: 'target', intensity: 80 })],
      teamNames: {},
    });
    const entry = getLeaguePulseRivalry(pulse, 'target');
    expect(entry).not.toBeNull();
    expect(entry?.id).toBe('target');
  });

  it('returns null for unknown rivalry ids', () => {
    const pulse = buildLeaguePulse({
      rivalries: [mkRivalry({ id: 'target', intensity: 80 })],
      teamNames: {},
    });
    expect(getLeaguePulseRivalry(pulse, 'missing')).toBeNull();
  });
});

describe('league-pulse / detectRivalryTierAscension', () => {
  it('returns null when intensity stays in the same tier', () => {
    expect(detectRivalryTierAscension(30, 40)).toBeNull(); // budding -> budding
    expect(detectRivalryTierAscension(55, 60)).toBeNull(); // heated -> heated
    expect(detectRivalryTierAscension(80, 90)).toBeNull(); // blood_feud -> blood_feud
  });

  it('returns null when intensity drops into a lower tier', () => {
    expect(detectRivalryTierAscension(80, 60)).toBeNull(); // blood_feud -> heated
    expect(detectRivalryTierAscension(55, 30)).toBeNull(); // heated -> budding
  });

  it('returns the new tier on budding -> heated ascension at the 51 threshold', () => {
    expect(detectRivalryTierAscension(50, 51)).toBe('heated');
    expect(detectRivalryTierAscension(30, 55)).toBe('heated');
  });

  it('returns blood_feud on heated -> blood_feud ascension at the 76 threshold', () => {
    expect(detectRivalryTierAscension(70, 76)).toBe('blood_feud');
    expect(detectRivalryTierAscension(60, 88)).toBe('blood_feud');
  });

  it('returns the new tier for quiet -> budding ascension', () => {
    expect(detectRivalryTierAscension(10, 25)).toBe('budding');
  });

  it('can leap across multiple tiers and returns the final landing tier', () => {
    expect(detectRivalryTierAscension(10, 90)).toBe('blood_feud');
  });
});

describe('league-pulse / createRivalryHeatSpikePost', () => {
  const rivalry: LeagueRivalry = mkRivalry({
    id: 'HOME::AWAY',
    teamA: 'HOME',
    teamB: 'AWAY',
    intensity: 55,
  });
  const teamNames = { HOME: 'Blaze', AWAY: 'Thunder' };

  it('returns null for quiet and budding ascensions', () => {
    const rng = mulberry32(42);
    expect(createRivalryHeatSpikePost(rivalry, 'quiet', teamNames, 5, rng)).toBeNull();
    expect(createRivalryHeatSpikePost(rivalry, 'budding', teamNames, 5, rng)).toBeNull();
  });

  it('returns a heated post with both team names interpolated', () => {
    const rng = mulberry32(42);
    const post = createRivalryHeatSpikePost(rivalry, 'heated', teamNames, 5, rng);
    expect(post).not.toBeNull();
    expect(post!.content).toContain('Blaze');
    expect(post!.content).toContain('Thunder');
    expect(post!.trigger).toBe('rivalry');
    expect(post!.sentiment).toBe('hype');
    expect(post!.timestamp).toBe(5);
    expect(post!.id).toBe('social-rivalry-heat-HOME::AWAY-5-heated');
  });

  it('returns a blood_feud post with different copy than heated', () => {
    const rngA = mulberry32(99);
    const rngB = mulberry32(99);
    const heated = createRivalryHeatSpikePost(rivalry, 'heated', teamNames, 7, rngA);
    const feud = createRivalryHeatSpikePost(rivalry, 'blood_feud', teamNames, 7, rngB);
    expect(feud).not.toBeNull();
    expect(feud!.content).toMatch(/BLOOD FEUD/i);
    expect(feud!.id).toContain('blood_feud');
    // Same seed, different tier = different content
    expect(feud!.content).not.toBe(heated!.content);
  });

  it('falls back to the team id when no team name is supplied', () => {
    const rng = mulberry32(1);
    const post = createRivalryHeatSpikePost(rivalry, 'heated', {}, 3, rng);
    expect(post!.content).toContain('HOME');
    expect(post!.content).toContain('AWAY');
  });

  it('is deterministic for the same rng seed', () => {
    const postA = createRivalryHeatSpikePost(rivalry, 'heated', teamNames, 9, mulberry32(777));
    const postB = createRivalryHeatSpikePost(rivalry, 'heated', teamNames, 9, mulberry32(777));
    expect(postA).toEqual(postB);
  });
});
