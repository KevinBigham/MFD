import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  updatePlayableTrend,
  writePlayableTrend,
} from '../scripts/ci/write-playable-trend.mjs';

describe('write-playable-trend', () => {
  it('keeps latest 7 entries and replaces duplicate date', () => {
    var entries = [];
    for (var i = 1; i <= 8; i += 1) {
      entries.push({
        date: '2026-02-0' + i,
        overallOk: true,
        failedSections: 0,
        failedChecks: 0,
      });
    }
    var out = updatePlayableTrend(entries, { overallOk: false, summary: { failedSections: 1, failedChecks: 2 } }, '2026-02-08T03:00:00.000Z');
    expect(out.length).toBe(7);
    expect(out[out.length - 1].date).toBe('2026-02-08');
    expect(out[out.length - 1].overallOk).toBe(false);
  });

  it('writes trend file from playability report', () => {
    var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-trend-'));
    var reportPath = path.join(root, 'playability-report.json');
    var trendPath = path.join(root, 'nightly-playable-trend.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      overallOk: true,
      summary: { failedSections: 0, failedChecks: 0 },
    }));
    var out = writePlayableTrend(reportPath, trendPath, '2026-02-28T01:00:00.000Z');
    expect(out.entries.length).toBe(1);
    expect(out.entries[0].date).toBe('2026-02-28');
    var parsed = JSON.parse(fs.readFileSync(trendPath, 'utf8'));
    expect(parsed.length).toBe(1);
  });
});
