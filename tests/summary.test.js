import { describe, expect, it } from 'vitest';

import { PHASE1_SUMMARY } from '../src/dev/module-validation/summary.js';

describe('summary', () => {
  it('exports frozen phase summary text', () => {
    expect(typeof PHASE1_SUMMARY.extractedModulesText).toBe('string');
    expect(PHASE1_SUMMARY.extractedModulesText.length).toBeGreaterThan(0);
    expect(Object.isFrozen(PHASE1_SUMMARY)).toBe(true);
  });
});
