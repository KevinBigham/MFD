import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { runBlitzSummary, writeBlitzSummary } from '../scripts/ci/publish-blitz-summary.mjs';

describe('publish-blitz-summary', () => {
  it('renders gate and blocker sections', () => {
    var md = writeBlitzSummary({
      lane: { ok: true },
      playableBuild: { ok: true },
      playableSmoke: { ok: true },
      playability: { overallOk: false },
      e2e: { ok: true },
      importSafety: { ok: true },
      security: { ok: true },
      perfThreshold: { ok: true },
      contracts: { ok: true },
    });
    expect(md).toContain('# Hybrid v4 Blitz Summary');
    expect(md).toContain('## Gates');
    expect(md).toContain('## Blockers');
    expect(md).toContain('playability gate failing');
  });

  it('writes docs and dist summary outputs', () => {
    var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-blitz-summary-'));
    var cwd = process.cwd();
    try {
      process.chdir(root);
      fs.mkdirSync('dist', { recursive: true });
      var out = runBlitzSummary('docs/blitz-summary.md');
      expect(fs.existsSync(out.outputPath)).toBe(true);
      expect(fs.existsSync(out.distPath)).toBe(true);
    } finally {
      process.chdir(cwd);
    }
  });
});
