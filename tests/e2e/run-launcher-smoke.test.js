import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  runLauncherE2ESmoke,
  runLauncherE2ESmokeWithArtifacts,
} from '../../scripts/e2e/run-launcher-smoke.mjs';

function makeDist() {
  var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-e2e-launcher-'));
  var dist = path.join(root, 'dist');
  var assets = path.join(dist, 'assets');
  fs.mkdirSync(assets, { recursive: true });
  return { root: root, dist: dist, assets: assets };
}

describe('run-launcher-smoke', () => {
  it('passes static checks and skips browser suite when baseUrl is absent', async () => {
    var tmp = makeDist();
    fs.writeFileSync(path.join(tmp.dist, 'index.html'), '<!doctype html><html><body><div id="root"></div></body></html>');
    fs.writeFileSync(path.join(tmp.assets, 'index.js'), [
      '"Play Now";',
      '"Module Status";',
      '"legacy/index.html";',
      '"Open legacy directly";',
      '"Retry Launch";',
    ].join('\n'));

    var report = await runLauncherE2ESmoke(tmp.dist, { timeoutMs: 1000 });
    expect(report.ok).toBe(true);
    expect(report.summary.failed).toBe(0);
    expect(report.checks.some(function (item) { return item.name === 'browser suite executed' && item.skipped; })).toBe(true);
  });

  it('fails when dist artifacts are missing', async () => {
    var tmp = makeDist();
    var report = await runLauncherE2ESmoke(tmp.dist, { timeoutMs: 1000 });
    expect(report.ok).toBe(false);
    expect(report.summary.failed).toBeGreaterThan(0);
    expect(report.checks.some(function (item) { return item.name === 'dist index exists' && !item.pass; })).toBe(true);
  });

  it('writes report and summary artifacts with stable schema', async () => {
    var tmp = makeDist();
    fs.writeFileSync(path.join(tmp.dist, 'index.html'), '<!doctype html><html><body><div id="root"></div></body></html>');
    fs.writeFileSync(path.join(tmp.assets, 'index.js'), [
      '"Play Now";',
      '"Module Status";',
      '"legacy/index.html";',
      '"Open legacy directly";',
      '"Retry Launch";',
    ].join('\n'));

    var out = await runLauncherE2ESmokeWithArtifacts(tmp.dist, {
      reportPath: path.join(tmp.dist, 'e2e-launcher-report.json'),
      summaryPath: path.join(tmp.dist, 'e2e-launcher-summary.md'),
      timeoutMs: 1000,
    });

    var parsed = JSON.parse(fs.readFileSync(out.reportPath, 'utf8'));
    var summaryText = fs.readFileSync(out.summaryPath, 'utf8');

    expect(typeof parsed.version).toBe('string');
    expect(Array.isArray(parsed.checks)).toBe(true);
    expect(summaryText).toContain('# Launcher E2E Summary');
    expect(summaryText).toContain('| Check | Result | Detail |');
  });
});
