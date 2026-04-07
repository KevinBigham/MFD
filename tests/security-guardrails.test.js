import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  runSecurityGuardrailsCheck,
  validateSecurityGuardrailsReport,
  writeSecurityGuardrailsReport,
} from '../scripts/check-security-guardrails.mjs';

describe('security guardrails script', () => {
  it('returns structured checks', () => {
    var out = runSecurityGuardrailsCheck();
    expect(Array.isArray(out.checks)).toBe(true);
    expect(out.checks.length).toBeGreaterThanOrEqual(8);
    expect(typeof out.ok).toBe('boolean');
  });

  it('validates security report schema', () => {
    var valid = validateSecurityGuardrailsReport({
      schemaVersion: 'security-report.v2',
      generatedAt: '2026-02-28T00:00:00.000Z',
      ok: true,
      checks: [{ name: 'x', pass: true, detail: '' }],
    });
    expect(valid.ok).toBe(true);

    var invalid = validateSecurityGuardrailsReport({
      schemaVersion: 'security-report.v1',
      generatedAt: '',
      ok: 'true',
      checks: [{}],
    });
    expect(invalid.ok).toBe(false);
    expect(invalid.errors.length).toBeGreaterThan(0);
  });

  it('writes report JSON', () => {
    var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-security-'));
    var report = path.join(root, 'security-report.json');
    var out = writeSecurityGuardrailsReport(report, {
      schemaVersion: 'security-report.v2',
      generatedAt: '2026-02-28T00:00:00.000Z',
      ok: true,
      checks: [{ name: 'x', pass: true, detail: '' }],
    });
    var parsed = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect(parsed.schemaVersion).toBe('security-report.v2');
    expect(parsed.ok).toBe(true);
    expect(parsed.checks.length).toBe(1);
  });
});
