import { describe, expect, it } from 'vitest';

import { DB_CLEANER } from '../src/systems/db-cleaner.js';

describe('db-cleaner.js', () => {
  it('findStale identifies old year-keyed entries', () => {
    const db = {
      '2020-oppA': { v: 1 },
      '2023-oppB': { v: 2 },
      '2019-prospectX': { v: 3 },
      misc: { v: 4 },
    };

    const stale = DB_CLEANER.findStale(db, 2026, 3);
    expect(stale.sort()).toEqual(['2019-prospectX', '2020-oppA']);
  });

  it('prune removes stale keys and reports pruned count', () => {
    const db = {
      '2020-oppA': { v: 1 },
      '2023-oppB': { v: 2 },
      '2019-prospectX': { v: 3 },
      misc: { v: 4 },
    };

    const result = DB_CLEANER.prune(db, 2026, 3);
    expect(result.pruned).toBe(2);
    expect(result.db).toEqual({
      '2023-oppB': { v: 2 },
      misc: { v: 4 },
    });
  });
});
