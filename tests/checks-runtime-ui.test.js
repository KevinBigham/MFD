import { describe, expect, it } from 'vitest';

import { validateStatusRows } from '../src/dev/module-validation/checks-runtime-ui.js';

describe('checks-runtime-ui', () => {
  it('reports duplicate and invalid rows', () => {
    var errors = [];
    var check = function (failed, message) {
      if (failed) errors.push(message);
    };
    validateStatusRows(check, [
      { name: 'a', status: true },
      { name: 'a', status: true },
      { name: '', status: true },
      { name: 'b', status: 'yes' },
    ]);

    expect(errors.some((e) => e.includes('duplicate status row'))).toBe(true);
    expect(errors.some((e) => e.includes('invalid shape'))).toBe(true);
  });
});
