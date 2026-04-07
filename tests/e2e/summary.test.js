import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildE2ESummaryMarkdown, writeE2ESummary } from '../../scripts/e2e/summary.mjs';

describe('e2e summary writer', () => {
  it('renders pass/fail/skip rows in markdown output', () => {
    var markdown = buildE2ESummaryMarkdown({
      ok: false,
      generatedAt: '2026-02-28T00:00:00.000Z',
      distDir: '/tmp/dist',
      baseUrl: 'http://127.0.0.1:4173',
      checks: [
        { name: 'a', pass: true, detail: 'ok', skipped: false },
        { name: 'b', pass: false, detail: 'bad', skipped: false },
        { name: 'c', pass: true, detail: 'skip', skipped: true },
      ],
    });

    expect(markdown).toContain('# Launcher E2E Summary');
    expect(markdown).toContain('| a | PASS | ok |');
    expect(markdown).toContain('| b | FAIL | bad |');
    expect(markdown).toContain('| c | SKIP | skip |');
  });

  it('writes summary markdown to disk', () => {
    var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-e2e-summary-'));
    var outPath = path.join(root, 'summary.md');
    var written = writeE2ESummary(outPath, '# Demo\n');

    expect(written).toBe(path.resolve(outPath));
    expect(fs.existsSync(written)).toBe(true);
    expect(fs.readFileSync(written, 'utf8')).toContain('# Demo');
  });
});
