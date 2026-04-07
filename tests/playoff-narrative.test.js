import { describe, expect, it } from 'vitest';

import { PLAYOFF_NARRATIVE_993 } from '../src/data/playoff-narrative.js';

describe('playoff-narrative.js', () => {
  it('contains all major playoff narrative buckets', () => {
    expect(PLAYOFF_NARRATIVE_993).toHaveProperty('clinchedBerth');
    expect(PLAYOFF_NARRATIVE_993).toHaveProperty('playoffWeekHype');
    expect(PLAYOFF_NARRATIVE_993).toHaveProperty('superBowlWeek');
    expect(PLAYOFF_NARRATIVE_993).toHaveProperty('championshipWin');
    expect(PLAYOFF_NARRATIVE_993).toHaveProperty('superBowlLoss');
    expect(PLAYOFF_NARRATIVE_993).toHaveProperty('earlyPlayoffExit');
    expect(PLAYOFF_NARRATIVE_993).toHaveProperty('hofInduction');
    expect(PLAYOFF_NARRATIVE_993).toHaveProperty('dynastyReflection');
    expect(PLAYOFF_NARRATIVE_993).toHaveProperty('firstTitleEver');
  });

  it('keeps each narrative pool populated and string-based', () => {
    Object.values(PLAYOFF_NARRATIVE_993).forEach((pool) => {
      expect(Array.isArray(pool)).toBe(true);
      expect(pool.length).toBeGreaterThan(5);
      pool.forEach((line) => expect(typeof line).toBe('string'));
    });
  });
});
