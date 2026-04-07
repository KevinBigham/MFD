import { describe, expect, it } from 'vitest';

import {
  runDataChecksBatchA,
  runDataChecksBatchB,
} from '../src/dev/module-validation/checks-data.js';

describe('checks-data', () => {
  it('runs data check batches without failures', () => {
    var errors = [];
    var check = function (failed, message) {
      if (failed) errors.push(message);
    };
    runDataChecksBatchA(check);
    runDataChecksBatchB(check);
    expect(errors).toEqual([]);
  });
});
