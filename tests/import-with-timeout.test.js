import { describe, expect, it } from 'vitest';

import { importWithTimeout } from '../src/dev/import-with-timeout.js';

describe('import-with-timeout', () => {
  it('resolves when loader completes before timeout', async () => {
    var result = await importWithTimeout(function () {
      return Promise.resolve({ ok: true });
    }, 100);
    expect(result).toEqual({ ok: true });
  });

  it('rejects on timeout', async () => {
    await expect(importWithTimeout(function () {
      return new Promise(function () {});
    }, 5)).rejects.toThrow('timed out');
  });
});
