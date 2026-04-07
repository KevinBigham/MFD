import { describe, expect, it } from 'vitest';

import {
  runSystemsChecksBatchA,
  runSystemsChecksBatchB,
} from '../src/dev/module-validation/checks-systems.js';

describe('checks-systems', () => {
  it('runs systems check batches without failures', () => {
    var errors = [];
    var check = function (failed, message) {
      if (failed) errors.push(message);
    };
    runSystemsChecksBatchA(check);
    runSystemsChecksBatchB(check);
    expect(errors).toEqual([]);
  });
});
