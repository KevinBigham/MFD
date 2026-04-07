import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  runImportSafetyCheck,
  writeImportSafetyReport,
} from '../scripts/check-import-safety.mjs';

describe('check-import-safety script', () => {
  it('passes structural checks without input payload', () => {
    var out = runImportSafetyCheck({ inputPath: '' });
    expect(out.ok).toBe(true);
    expect(out.checks.some(function (row) { return row.name === 'import schema constant is stable'; })).toBe(true);
  });

  it('fails when payload file is invalid', () => {
    var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-import-safety-'));
    var payloadPath = path.join(root, 'bad-import.json');
    fs.writeFileSync(payloadPath, '{bad json');

    var out = runImportSafetyCheck({ inputPath: payloadPath });
    expect(out.ok).toBe(false);
    expect(out.checks.some(function (row) { return row.name === 'import payload validates' && !row.pass; })).toBe(true);
  });

  it('writes import safety report artifact', () => {
    var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-import-safety-report-'));
    var reportPath = path.join(root, 'import-safety-report.json');
    var written = writeImportSafetyReport(reportPath, {
      generatedAt: '2026-02-28T00:00:00.000Z',
      ok: true,
      checks: [{ name: 'x', pass: true, detail: 'ok' }],
      inputPath: '',
      payloadBytes: 0,
      validation: null,
    });
    expect(fs.existsSync(written)).toBe(true);
    var parsed = JSON.parse(fs.readFileSync(written, 'utf8'));
    expect(parsed.ok).toBe(true);
    expect(Array.isArray(parsed.checks)).toBe(true);
  });
});
