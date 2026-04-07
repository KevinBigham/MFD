import { describe, expect, it } from 'vitest';

import { RIVALRY_TRASH_991 } from '../src/data/rivalry-trash.js';

describe('rivalry-trash.js', () => {
  it('contains mild, spicy, and atomic trash-talk pools', () => {
    expect(RIVALRY_TRASH_991.mild.length).toBeGreaterThan(5);
    expect(RIVALRY_TRASH_991.spicy.length).toBeGreaterThan(5);
    expect(RIVALRY_TRASH_991.atomic.length).toBeGreaterThan(5);
  });
});
