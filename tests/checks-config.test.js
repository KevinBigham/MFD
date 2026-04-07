import { describe, expect, it } from 'vitest';

import {
  runConfigChecksBatchA,
  runConfigChecksBatchB,
} from '../src/dev/module-validation/checks-config.js';

describe('checks-config', () => {
  it('runs both config check batches without failures', () => {
    var errors = [];
    var check = function (failed, message) {
      if (failed) errors.push(message);
    };
    runConfigChecksBatchA(check);
    runConfigChecksBatchB(check);
    expect(errors).toEqual([]);
  });
});
