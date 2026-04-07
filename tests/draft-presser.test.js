import { describe, expect, it } from 'vitest';

import { DRAFT_PRESSER975 } from '../src/data/draft-presser.js';

describe('draft-presser.js', () => {
  const team = { id: 'hawks', abbr: 'ATL' };
  const picks = [
    { name: 'Top Pick', pos: 'QB', _draftRound: 1 },
    { name: 'Sleeper Pick', pos: 'LB', _draftRound: 5 },
  ];

  it('returns empty list for missing required inputs', () => {
    expect(DRAFT_PRESSER975.generateQuestions(null, picks, team, 2026)).toEqual([]);
    expect(DRAFT_PRESSER975.generateQuestions({ grade: 'A' }, [], team, 2026)).toEqual([]);
  });

  it('generates up to three question blocks with answer effects', () => {
    const q = DRAFT_PRESSER975.generateQuestions({ grade: 'A' }, picks, team, 2026);
    expect(q.length).toBeGreaterThan(0);
    expect(q.length).toBeLessThanOrEqual(3);
    q.forEach((item) => {
      expect(typeof item.q).toBe('string');
      expect(item.opts.length).toBeGreaterThan(0);
      item.opts.forEach((opt) => {
        expect(typeof opt.text).toBe('string');
        expect(typeof opt.effect).toBe('object');
      });
    });
  });

  it('branches messaging for low-grade drafts', () => {
    const q = DRAFT_PRESSER975.generateQuestions({ grade: 'D' }, picks, team, 2026);
    expect(q[0].q).toContain('Analysts are calling this draft');
  });
});
