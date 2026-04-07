import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildRcBundle } from '../scripts/ci/build-rc-bundle.mjs';

describe('build-rc-bundle', () => {
  it('writes manifest and flags missing artifacts', () => {
    var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-rc-bundle-'));
    var cwd = process.cwd();
    try {
      process.chdir(root);
      fs.mkdirSync('dist', { recursive: true });
      fs.mkdirSync('docs', { recursive: true });
      fs.writeFileSync('dist/playability-report.json', '{}');
      fs.writeFileSync('docs/release-candidate-summary.md', '# summary\n');

      var out = buildRcBundle({
        files: ['dist/playability-report.json', 'docs/release-candidate-summary.md', 'dist/missing.json'],
        outputPath: 'dist/rc-bundle-manifest.json',
      });
      expect(fs.existsSync(out.outputPath)).toBe(true);
      expect(out.ok).toBe(false);
      expect(out.missing).toContain('dist/missing.json');
      expect(out.included.length).toBe(2);
    } finally {
      process.chdir(cwd);
    }
  });
});
