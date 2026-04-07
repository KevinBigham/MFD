import { describe, expect, it } from 'vitest';

import {
  MFSN_BROADCAST,
  MFSN_CONTENT_991,
  MFSN_DRAFT_GRADES,
  MFSN_DRAFT_LINES,
  MFSN_PREDICTIONS,
  MFSN_SHOW,
  MFSN_WEEKLY975,
} from '../src/data/mfsn-network.js';

describe('mfsn-network.js', () => {
  it('defines core show metadata and analyst lineup', () => {
    expect(MFSN_DRAFT_LINES.length).toBeGreaterThan(5);
    expect(MFSN_SHOW.analysts.length).toBeGreaterThanOrEqual(4);
    expect(MFSN_WEEKLY975.anchors.length).toBeGreaterThanOrEqual(3);
    expect(MFSN_WEEKLY975.segments).toContain('POWER_RANKINGS');
  });

  it('exposes content, broadcast, draft grade, and prediction structures', () => {
    expect(MFSN_CONTENT_991.openingLines.length).toBeGreaterThan(5);
    expect(MFSN_CONTENT_991.closingLines.length).toBeGreaterThan(5);
    expect(typeof MFSN_BROADCAST).toBe('object');
    expect(typeof MFSN_DRAFT_GRADES).toBe('object');
    expect(typeof MFSN_PREDICTIONS).toBe('object');
  });

  it('rotates analysts deterministically by pick number', () => {
    const a0 = MFSN_SHOW.getAnalyst(0);
    const a4 = MFSN_SHOW.getAnalyst(4);
    expect(a0.name).toBe(MFSN_SHOW.analysts[0].name);
    expect(a4.name).toBe(MFSN_SHOW.analysts[0].name);
  });
});
