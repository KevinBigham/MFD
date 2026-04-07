import { describe, expect, it } from 'vitest';

import { runWithRetry } from '../scripts/ci/retry-once.mjs';

describe('retry-once helper', () => {
  it('retries once on first failure and then succeeds', async () => {
    var count = 0;
    var out = await runWithRetry(async function () {
      count += 1;
      if (count === 1) throw new Error('transient');
      return 'ok';
    }, 2);
    expect(out.ok).toBe(true);
    expect(out.attempts).toBe(2);
    expect(out.errors.length).toBe(1);
  });

  it('returns failure after max attempts', async () => {
    var out = await runWithRetry(async function () {
      throw new Error('always');
    }, 2);
    expect(out.ok).toBe(false);
    expect(out.attempts).toBe(2);
    expect(out.errors.length).toBe(2);
  });
});
