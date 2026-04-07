import { describe, expect, it } from 'vitest';

import { WEEKLY_CHALLENGES } from '../src/systems/weekly-challenges.js';

describe('weekly-challenges.js', () => {
  it('challenge pool has unique ids and valid reward fields', () => {
    const ids = WEEKLY_CHALLENGES.pool.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    WEEKLY_CHALLENGES.pool.forEach((c) => {
      expect(typeof c.xp).toBe('number');
      expect(typeof c.diff).toBe('string');
      expect(typeof c.check).toBe('function');
    });
  });

  it('checkResults marks newly completed challenges and sums XP', () => {
    const challenges = [
      { ...WEEKLY_CHALLENGES.pool.find((c) => c.id === 'score35'), completed: false },
      { ...WEEKLY_CHALLENGES.pool.find((c) => c.id === 'no_turnovers'), completed: false },
      { ...WEEKLY_CHALLENGES.pool.find((c) => c.id === 'win21'), completed: true },
    ];
    const gameResult = { userScore: 38, oppScore: 10, turnovers: 0, won: true, trailedAtHalf: false };

    const out = WEEKLY_CHALLENGES.checkResults(challenges, gameResult);
    expect(out.completed.map((c) => c.id).sort()).toEqual(['no_turnovers', 'score35']);
    expect(out.xpEarned).toBe(
      WEEKLY_CHALLENGES.pool.find((c) => c.id === 'score35').xp +
      WEEKLY_CHALLENGES.pool.find((c) => c.id === 'no_turnovers').xp
    );
    expect(challenges.find((c) => c.id === 'score35').completed).toBe(true);
  });

  it('checkResults returns empty result for missing inputs', () => {
    expect(WEEKLY_CHALLENGES.checkResults(null, {})).toEqual({ completed: [], xpEarned: 0 });
    expect(WEEKLY_CHALLENGES.checkResults([], null)).toEqual({ completed: [], xpEarned: 0 });
  });
});
