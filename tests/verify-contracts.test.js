import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  formatDriftMarkdown,
  inferFixtureModule,
  runContractGate,
  validateFixtureShape,
} from '../scripts/verify-contracts.mjs';

function makeFixtureRoot() {
  var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-contracts-'));
  var fixtures = path.join(root, 'fixtures');
  fs.mkdirSync(fixtures, { recursive: true });
  return { root: root, fixtures: fixtures };
}

describe('verify-contracts', () => {
  it('skips in optional mode when fixtures are absent', () => {
    var tmp = makeFixtureRoot();
    var out = runContractGate({ fixturesDir: tmp.fixtures, mode: 'optional' });
    expect(out.ok).toBe(true);
    expect(out.skipped).toBe(true);
    expect(out.summary.fixtureCount).toBe(0);
  });

  it('fails in strict mode when fixtures are absent', () => {
    var tmp = makeFixtureRoot();
    var out = runContractGate({ fixturesDir: tmp.fixtures, mode: 'strict' });
    expect(out.ok).toBe(false);
    expect(out.skipped).toBe(true);
    expect(out.drift.length).toBe(1);
  });

  it('detects threshold drift from actual map', () => {
    var tmp = makeFixtureRoot();
    fs.writeFileSync(path.join(tmp.fixtures, 'threshold.json'), JSON.stringify({
      id: 'draft.threshold.r1elite',
      contractType: 'threshold',
      expected: 80,
      tolerance: 0,
    }));
    var actualPath = path.join(tmp.root, 'actual.json');
    fs.writeFileSync(actualPath, JSON.stringify({ 'draft.threshold.r1elite': 79 }));

    var cwd = process.cwd();
    try {
      process.chdir(tmp.root);
      var out = runContractGate({ fixturesDir: 'fixtures', actualPath: 'actual.json', mode: 'strict' });
      expect(out.ok).toBe(false);
      expect(out.drift.some(function (row) { return row.type === 'changed-threshold'; })).toBe(true);
      var markdown = formatDriftMarkdown(out);
      expect(markdown).toContain('# Contracts Drift Summary');
      expect(markdown).toContain('changed-threshold');
    } finally {
      process.chdir(cwd);
    }
  });

  it('supports tolerant mode with declared quirk tolerance', () => {
    var tmp = makeFixtureRoot();
    fs.writeFileSync(path.join(tmp.fixtures, 'threshold.json'), JSON.stringify({
      id: 'draft.threshold.r1elite',
      contractType: 'threshold',
      expected: 80,
      tolerance: 0,
      quirk: {
        tolerance: 2,
      },
    }));
    var actualPath = path.join(tmp.root, 'actual.json');
    fs.writeFileSync(actualPath, JSON.stringify({ 'draft.threshold.r1elite': 79 }));

    var cwd = process.cwd();
    try {
      process.chdir(tmp.root);
      var out = runContractGate({ fixturesDir: 'fixtures', actualPath: 'actual.json', mode: 'tolerant' });
      expect(out.ok).toBe(true);
      expect(out.drift.length).toBe(0);
    } finally {
      process.chdir(cwd);
    }
  });

  it('strict mode still fails when quirk tolerance is not enabled', () => {
    var tmp = makeFixtureRoot();
    fs.writeFileSync(path.join(tmp.fixtures, 'threshold.json'), JSON.stringify({
      id: 'draft.threshold.r1elite',
      contractType: 'threshold',
      expected: 80,
      tolerance: 0,
      quirk: {
        tolerance: 2,
      },
    }));
    var actualPath = path.join(tmp.root, 'actual.json');
    fs.writeFileSync(actualPath, JSON.stringify({ 'draft.threshold.r1elite': 79 }));

    var cwd = process.cwd();
    try {
      process.chdir(tmp.root);
      var out = runContractGate({ fixturesDir: 'fixtures', actualPath: 'actual.json', mode: 'strict' });
      expect(out.ok).toBe(false);
      expect(out.drift.some(function (row) { return row.type === 'changed-threshold'; })).toBe(true);
    } finally {
      process.chdir(cwd);
    }
  });

  it('maps fixture ids to owning check modules', () => {
    expect(inferFixtureModule('sim.output.contract.v1')).toBe('sim-output');
    expect(inferFixtureModule('draft.thresholds.contract.v1')).toBe('draft-thresholds');
    expect(inferFixtureModule('trade.thresholds.contract.v1')).toBe('trade-thresholds');
    expect(inferFixtureModule('chemistry.contract.v1')).toBe('chemistry');
    expect(inferFixtureModule('rivalry.contract.v1')).toBe('rivalry');
    expect(inferFixtureModule('unknown.contract.v1')).toBe('unmapped');
  });

  it('validates fixture shape before comparison', () => {
    var out = validateFixtureShape({ contractType: 'shape' }, 'fixture.json');
    expect(out.ok).toBe(false);
    expect(out.errors.join(' ')).toContain('id is required');
  });
});
