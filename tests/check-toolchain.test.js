import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import * as toolchain from '../scripts/ci/check-toolchain.mjs';

describe('check-toolchain script', () => {
  it('detects xcode license issue text patterns', () => {
    expect(toolchain.detectXcodeLicenseIssue({
      stdout: '',
      stderr: 'You have not agreed to the Xcode license agreements.',
      error: null,
    })).toBe(true);
    expect(toolchain.detectXcodeLicenseIssue({
      stdout: 'git version 2.42.0',
      stderr: '',
      error: null,
    })).toBe(false);
  });

  it('reports missing node/npm with custom PATH', () => {
    var out = toolchain.checkNodeNpmPath('/definitely/missing/path');
    expect(out.ok).toBe(false);
    expect(out.nodePath).toBe('');
    expect(out.npmPath).toBe('');
  });

  it('runToolchainCheck returns stable report shape', () => {
    var out = toolchain.runToolchainCheck({ envPath: '/definitely/missing/path' });
    expect(typeof out.ok).toBe('boolean');
    expect(Array.isArray(out.checks)).toBe(true);
    expect(typeof out.generatedAt).toBe('string');
    expect(out.checks.length).toBe(3);
  });

  it('writes report JSON', () => {
    var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-toolchain-'));
    var file = path.join(root, 'toolchain-report.json');
    var out = toolchain.writeToolchainReport({
      ok: true,
      checks: [],
      environment: {},
      diagnostics: {},
      generatedAt: '2026-02-28T00:00:00.000Z',
    }, file);
    var parsed = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect(parsed.ok).toBe(true);
    expect(parsed.generatedAt).toBe('2026-02-28T00:00:00.000Z');
  });

  it('checkGitUsability maps xcode license failures', () => {
    var out = toolchain.checkGitUsability({
      runCommand: function () {
        return {
          status: 69,
          stdout: '',
          stderr: 'Please agree to the Xcode license',
          error: null,
        };
      },
    });
    expect(out.ok).toBe(false);
    expect(out.reason).toBe('xcode-license-blocked');
  });
});
