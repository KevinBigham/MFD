import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  runLegacySessionSmoke,
  writeLegacySessionSmokeReport,
} from '../scripts/smoke-legacy-session.mjs';

function makeDist() {
  var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-legacy-session-'));
  var dist = path.join(root, 'dist');
  var assets = path.join(dist, 'assets');
  fs.mkdirSync(path.join(dist, 'legacy'), { recursive: true });
  fs.mkdirSync(assets, { recursive: true });
  return { root: root, dist: dist, assets: assets };
}

describe('smoke-legacy-session script', () => {
  it('passes when dist and prerequisite reports are present', () => {
    var tmp = makeDist();
    fs.writeFileSync(path.join(tmp.dist, 'index.html'), '<html></html>');
    fs.writeFileSync(path.join(tmp.dist, 'legacy', 'index.html'), '<html></html>');
    fs.writeFileSync(path.join(tmp.dist, 'legacy', 'game.js'), 'x');
    fs.writeFileSync(path.join(tmp.dist, 'playable-build-report.json'), JSON.stringify({ ok: true }));
    fs.writeFileSync(path.join(tmp.dist, 'playable-smoke-report.json'), JSON.stringify({ ok: true, checks: [] }));
    fs.writeFileSync(path.join(tmp.assets, 'index.js'), '"Play Now";"Module Status";"Open legacy directly";"Retry Launch";');

    var out = runLegacySessionSmoke(tmp.dist);
    expect(out.ok).toBe(true);
    expect(out.checks.every(function (row) { return row.pass; })).toBe(true);
    expect(out.sessionHealth.state).toBe('healthy');
  });

  it('writes smoke report and captures failures for incomplete dist', () => {
    var tmp = makeDist();
    var out = runLegacySessionSmoke(tmp.dist);
    expect(out.ok).toBe(false);

    var reportPath = writeLegacySessionSmokeReport(path.join(tmp.dist, 'legacy-session-smoke-report.json'), {
      generatedAt: '2026-02-28T00:00:00.000Z',
      ok: out.ok,
      checks: out.checks,
      distDir: out.distDir,
      sessionHealth: out.sessionHealth,
    });
    var parsed = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    expect(parsed.ok).toBe(false);
    expect(parsed.checks.some(function (row) { return !row.pass; })).toBe(true);
    expect(parsed.sessionHealth.state).toBe('unresponsive');
  });
});
