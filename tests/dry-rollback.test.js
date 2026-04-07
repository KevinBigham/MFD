import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { runDryRollbackCheck } from '../scripts/ci/dry-run-rollback.mjs';

describe('dry-run-rollback', () => {
  it('passes when rollback docs exist', () => {
    var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-rollback-'));
    var a = path.join(root, 'docs/hybrid-v3-rollback-drill.md');
    var b = path.join(root, 'docs/playable-rollback-plan.md');
    fs.mkdirSync(path.dirname(a), { recursive: true });
    fs.writeFileSync(a, '# a');
    fs.writeFileSync(b, '# b');
    var out = runDryRollbackCheck(root);
    expect(out.ok).toBe(true);
    expect(out.missingDocs).toEqual([]);
  });

  it('fails with missing document list', () => {
    var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-rollback-'));
    var out = runDryRollbackCheck(root);
    expect(out.ok).toBe(false);
    expect(out.missingDocs.length).toBe(2);
  });
});
