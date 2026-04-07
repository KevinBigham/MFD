import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildSharedWindowAudit,
  buildLaneReport,
  checkConflictWindow,
  classifyPaths,
  normalizePath,
  resolveSharedWindowProfile,
  resolveStrictLaneAllowlist,
  runNoGameplayDeltaCheck,
  writeLaneReport,
  writeSharedWindowAudit,
} from '../scripts/verify-no-gameplay-delta.mjs';

describe('verify-no-gameplay-delta', () => {
  it('normalizes slash formats', () => {
    expect(normalizePath('.\\src\\main.jsx')).toBe('src/main.jsx');
  });

  it('classifies safe, forbidden, and unknown paths', () => {
    var allowlist = {
      safePrefixes: ['docs/', 'src/dev/', 'tests/'],
      forbiddenPrefixes: ['src/systems/', 'src/data/'],
    };
    var out = classifyPaths([
      'docs/a.md',
      'src/dev/runtime-loader.js',
      'src/systems/playbook.js',
      'README.md',
    ], allowlist);

    expect(out.safe).toEqual(['docs/a.md', 'src/dev/runtime-loader.js']);
    expect(out.forbidden).toEqual(['src/systems/playbook.js']);
    expect(out.unknown).toEqual(['README.md']);
  });

  it('runNoGameplayDeltaCheck fails only when forbidden paths exist', () => {
    var out1 = runNoGameplayDeltaCheck({
      allowlistPath: 'scripts/allowlists/overnight-safe-paths.json',
      changedFiles: ['docs/x.md', 'src/dev/runtime-loader.js'],
    });
    expect(out1.ok).toBe(true);
    expect(out1.forbidden).toEqual([]);

    var out2 = runNoGameplayDeltaCheck({
      allowlistPath: 'scripts/allowlists/overnight-safe-paths.json',
      changedFiles: ['src/data/teams.js'],
    });
    expect(out2.ok).toBe(false);
    expect(out2.forbidden).toEqual(['src/data/teams.js']);
  });

  it('strict lane mode fails on unknown files outside lane safe prefixes', () => {
    var out = runNoGameplayDeltaCheck({
      allowlistPath: 'scripts/allowlists/overnight-safe-paths.json',
      changedFiles: ['src/app/launcher-shell.jsx', 'README.md'],
      strictLane: true,
      laneName: 'codex-hybrid-v4',
    });
    expect(out.ok).toBe(false);
    expect(out.strictUnknown).toEqual(['README.md']);
  });

  it('resolveStrictLaneAllowlist merges global forbidden with lane rules', () => {
    var allowlist = {
      safePrefixes: ['docs/'],
      forbiddenPrefixes: ['src/systems/'],
      strictLanes: {
        lane1: {
          safePrefixes: ['src/app/'],
          forbiddenPrefixes: ['src/data/'],
          sharedFiles: ['package.json'],
        },
      },
    };
    var lane = resolveStrictLaneAllowlist(allowlist, 'lane1');
    expect(lane.safePrefixes).toEqual(['src/app/']);
    expect(lane.forbiddenPrefixes).toEqual(['src/systems/', 'src/data/']);
    expect(lane.sharedFiles).toEqual(['package.json']);
  });

  it('checkConflictWindow blocks shared-file edits unless window enabled', () => {
    var laneAllowlist = {
      safePrefixes: ['docs/'],
      forbiddenPrefixes: ['src/systems/'],
      sharedFiles: ['package.json', 'docs/index.md'],
    };
    expect(checkConflictWindow(['docs/a.md'], laneAllowlist, { sharedWindow: false })).toEqual([]);
    expect(checkConflictWindow(['package.json'], laneAllowlist, { sharedWindow: false })).toEqual(['package.json']);
    expect(checkConflictWindow(['package.json'], laneAllowlist, { sharedWindow: true })).toEqual([]);
  });

  it('strict lane check fails shared-file edits outside conflict window', () => {
    var out = runNoGameplayDeltaCheck({
      allowlistPath: 'scripts/allowlists/overnight-safe-paths.json',
      changedFiles: ['package.json'],
      strictLane: true,
      laneName: 'codex-hybrid-v4',
      sharedWindow: false,
    });
    expect(out.ok).toBe(false);
    expect(out.sharedWindowViolations).toEqual(['package.json']);
  });

  it('resolveSharedWindowProfile reads v4 shared window presets', () => {
    var out = runNoGameplayDeltaCheck({
      allowlistPath: 'scripts/allowlists/overnight-safe-paths.json',
      changedFiles: ['docs/index.md'],
      strictLane: true,
      laneName: 'codex-hybrid-v4',
      sharedWindowProfile: 'contracts-integration',
    });
    expect(out.ok).toBe(true);
    expect(out.sharedWindowProfile).toBe('contracts-integration');
    expect(out.sharedWindowProfileFound).toBe(true);
    expect(out.sharedWindowAllowedFiles).toContain('docs/index.md');
  });

  it('fails when shared window profile is missing', () => {
    var out = runNoGameplayDeltaCheck({
      allowlistPath: 'scripts/allowlists/overnight-safe-paths.json',
      changedFiles: ['docs/index.md'],
      strictLane: true,
      laneName: 'codex-hybrid-v4',
      sharedWindowProfile: 'does-not-exist',
    });
    expect(out.ok).toBe(false);
    expect(out.sharedWindowProfileFound).toBe(false);
  });

  it('enforces allowed shared files from active profile', () => {
    var allowlist = {
      strictLanes: {
        lane1: {
          safePrefixes: ['docs/'],
          forbiddenPrefixes: [],
          sharedFiles: ['package.json', 'docs/index.md'],
        },
      },
      sharedWindowProfiles: {
        profile1: {
          enabled: true,
          allowedSharedFiles: ['docs/index.md'],
        },
      },
      forbiddenPrefixes: [],
      safePrefixes: [],
    };
    var laneAllowlist = resolveStrictLaneAllowlist(allowlist, 'lane1');
    var profile = resolveSharedWindowProfile(allowlist, 'profile1');
    var violations = checkConflictWindow(['package.json', 'docs/index.md'], laneAllowlist, {
      sharedWindowProfile: profile,
    });
    expect(violations).toEqual(['package.json']);
  });

  it('buildLaneReport produces stable JSON-serializable shape', () => {
    var report = buildLaneReport({
      ok: true,
      strictLane: true,
      laneName: 'codex-hybrid-v4',
      sharedWindow: true,
      changedFiles: ['docs/a.md'],
      safe: ['docs/a.md'],
      forbidden: [],
      unknown: [],
      strictUnknown: [],
      sharedWindowViolations: [],
      sharedWindowProfile: 'contracts-integration',
      sharedWindowProfileFound: true,
      sharedWindowAllowedFiles: ['docs/index.md'],
    });
    expect(report.ok).toBe(true);
    expect(report.changedCount).toBe(1);
    expect(typeof report.generatedAt).toBe('string');
    expect(Array.isArray(report.safe)).toBe(true);
    expect(Array.isArray(report.sharedWindowViolations)).toBe(true);
    expect(report.sharedWindowProfile).toBe('contracts-integration');
  });

  it('writeLaneReport writes report JSON to disk', () => {
    var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-lane-report-'));
    var reportPath = path.join(root, 'lane-report.json');
    var out = writeLaneReport(reportPath, {
      ok: true,
      strictLane: true,
      laneName: 'codex-hybrid-v4',
      sharedWindow: false,
      changedFiles: ['docs/a.md'],
      safe: ['docs/a.md'],
      forbidden: [],
      unknown: [],
      strictUnknown: [],
      sharedWindowViolations: [],
      sharedWindowProfile: 'closed',
      sharedWindowProfileFound: true,
      sharedWindowAllowedFiles: [],
    });
    var parsed = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect(parsed.ok).toBe(true);
    expect(parsed.changedCount).toBe(1);
  });

  it('buildSharedWindowAudit produces stable schema', () => {
    var out = buildSharedWindowAudit({
      ok: true,
      strictLane: true,
      laneName: 'codex-hybrid-v4',
      changedFiles: ['docs/index.md'],
      sharedWindow: true,
      sharedWindowProfile: 'contracts-integration',
      sharedWindowProfileFound: true,
      sharedWindowAllowedFiles: ['docs/index.md'],
      sharedWindowViolations: [],
    });
    expect(out.schemaVersion).toBe('shared-window-audit.v1');
    expect(out.windowEnabled).toBe(true);
    expect(out.sharedWindowAllowedFiles).toContain('docs/index.md');
  });

  it('writeSharedWindowAudit writes audit report JSON', () => {
    var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-shared-window-audit-'));
    var reportPath = path.join(root, 'shared-window-audit.json');
    var out = writeSharedWindowAudit(reportPath, {
      ok: false,
      strictLane: true,
      laneName: 'codex-hybrid-v4',
      changedFiles: ['package.json'],
      sharedWindow: false,
      sharedWindowProfile: 'closed',
      sharedWindowProfileFound: true,
      sharedWindowAllowedFiles: [],
      sharedWindowViolations: ['package.json'],
    });
    var parsed = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect(parsed.schemaVersion).toBe('shared-window-audit.v1');
    expect(parsed.ok).toBe(false);
    expect(parsed.sharedWindowViolations).toEqual(['package.json']);
  });
});
