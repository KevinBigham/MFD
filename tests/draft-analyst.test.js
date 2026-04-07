import { describe, expect, it } from 'vitest';

import { BROADCAST_COMMENTARY, DRAFT_ANALYST_993 } from '../src/data/draft-analyst.js';

describe('draft-analyst.js', () => {
  it('defines analyst personalities with reaction pools', () => {
    expect(DRAFT_ANALYST_993).toHaveProperty('rodPemberton');
    expect(DRAFT_ANALYST_993).toHaveProperty('dianeHolloway');
    expect(DRAFT_ANALYST_993).toHaveProperty('marcusSteele');

    ['rodPemberton', 'dianeHolloway', 'marcusSteele'].forEach((k) => {
      const a = DRAFT_ANALYST_993[k];
      ['steal', 'reach', 'need', 'value', 'injuryConcern', 'characterConcern', 'sleeperAlert', 'bustAlert'].forEach((bucket) => {
        expect(Array.isArray(a[bucket])).toBe(true);
        expect(a[bucket].length).toBeGreaterThan(0);
      });
    });
  });

  it('fills play-by-play templates and retrieves commentary lines', () => {
    const line = BROADCAST_COMMENTARY.fill986('{qb} to {wr} for {yds}!', { qb: 'A', wr: 'B', yds: 22 });
    expect(line).toBe('A to B for 22!');

    const pickedDrive = BROADCAST_COMMENTARY.get('drives', 'TD', () => 0);
    expect(typeof pickedDrive).toBe('string');
    expect(pickedDrive.length).toBeGreaterThan(0);

    const fallback = BROADCAST_COMMENTARY.get('nope', 'nope', () => 0);
    expect(fallback).toBe('Great play.');
  });
});
