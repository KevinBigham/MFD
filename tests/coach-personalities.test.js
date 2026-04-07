import { describe, expect, it } from 'vitest';

import { COACH_PERSONALITIES_991 } from '../src/data/coach-personalities.js';

describe('coach-personalities.js', () => {
  it('defines six coach archetypes with labels/icons', () => {
    const keys = Object.keys(COACH_PERSONALITIES_991);
    expect(keys).toHaveLength(6);
    expect(keys).toEqual(
      expect.arrayContaining(['grinder', 'professor', 'hothead', 'zen', 'visionary', 'firestarter'])
    );
  });

  it('provides win/loss/big-game quote pools for each archetype', () => {
    Object.values(COACH_PERSONALITIES_991).forEach((p) => {
      expect(typeof p.label).toBe('string');
      expect(typeof p.icon).toBe('string');
      expect(p.afterWin.length).toBeGreaterThan(2);
      expect(p.afterLoss.length).toBeGreaterThan(2);
      expect(p.beforeBigGame.length).toBeGreaterThan(2);
    });
  });
});
