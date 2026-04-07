import { describe, expect, it } from 'vitest';

import {
  buildModuleStatusRows,
  isValidStatusRowShape,
} from '../src/dev/module-validation/status-rows.js';

describe('status-rows', () => {
  it('builds non-empty rows with valid shape', () => {
    var rows = buildModuleStatusRows();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every(isValidStatusRowShape)).toBe(true);
  });
});
