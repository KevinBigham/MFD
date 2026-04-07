import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { runRcChecklist } from '../scripts/ci/check-rc-checklist.mjs';

function seedRequiredFiles(root, includeDocs) {
  var files = [
    'dist/playability-report.json',
    'dist/legacy-save-report.json',
    'dist/legacy-session-smoke-report.json',
    'dist/playable-build-report.json',
    'dist/playable-smoke-report.json',
    'dist/security-report.json',
  ];
  if (includeDocs) files.push('docs/release-candidate-summary.md');
  files.forEach(function (rel) {
    var abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, '{}');
  });
}

describe('check-rc-checklist', () => {
  it('passes when all required files exist', () => {
    var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-rc-check-'));
    seedRequiredFiles(root, true);
    var out = runRcChecklist(root);
    expect(out.ok).toBe(true);
    expect(out.missing).toEqual([]);
  });

  it('fails with missing list when required files are absent', () => {
    var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-rc-check-'));
    seedRequiredFiles(root, false);
    var out = runRcChecklist(root);
    expect(out.ok).toBe(false);
    expect(out.missing).toContain('docs/release-candidate-summary.md');
  });
});
