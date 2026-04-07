import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildPlayabilityReportInput,
  runPlayabilityReport,
} from '../scripts/report-playability.mjs';

describe('report-playability script', () => {
  it('returns missing-section defaults when reports are absent', () => {
    var input = buildPlayabilityReportInput();
    expect(input.launcher.ok).toBe(false);
    expect(input.save.ok).toBe(false);
    expect(Array.isArray(input.launcher.checks)).toBe(true);
  });

  it('writes a stable playability report document', () => {
    var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-playability-report-'));
    var outPath = path.join(root, 'playability-report.json');
    var out = runPlayabilityReport(outPath);
    var parsed = JSON.parse(fs.readFileSync(out.outputPath, 'utf8'));
    expect(parsed.schemaVersion).toBe('playability-report.v1');
    expect(typeof parsed.generatedAt).toBe('string');
    expect(parsed.sections).toBeDefined();
    expect(parsed.summary).toBeDefined();
    expect(parsed.sessionHealth).toBeDefined();
    expect(typeof parsed.overallOk).toBe('boolean');
  });
});
