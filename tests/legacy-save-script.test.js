import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  verifyLegacySave,
  writeLegacySaveReport,
} from '../scripts/check-legacy-save.mjs';

describe('check-legacy-save script', () => {
  it('returns passing checks with synthetic payload', () => {
    var out = verifyLegacySave();
    expect(out.ok).toBe(true);
    expect(out.checks.length).toBeGreaterThanOrEqual(5);
    expect(out.checks.every(function (row) {
      return typeof row.name === 'string' && typeof row.pass === 'boolean';
    })).toBe(true);
  });

  it('writes deterministic JSON report', () => {
    var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-legacy-save-'));
    var report = path.join(root, 'legacy-save-report.json');
    var out = writeLegacySaveReport(report, {
      generatedAt: '2026-02-28T00:00:00.000Z',
      ok: true,
      checks: [{ name: 'x', pass: true, detail: '' }],
    });
    var parsed = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect(parsed.ok).toBe(true);
    expect(parsed.checks.length).toBe(1);
  });
});
