import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  runPlayableSmoke,
  runPlayableSmokeWithReport,
} from '../scripts/smoke-play-now.mjs';

function makeDist() {
  var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-playable-smoke-'));
  var dist = path.join(root, 'dist');
  var assets = path.join(dist, 'assets');
  fs.mkdirSync(path.join(dist, 'legacy'), { recursive: true });
  fs.mkdirSync(assets, { recursive: true });
  return { root: root, dist: dist, assets: assets };
}

describe('smoke-play-now script', () => {
  it('passes when required dist artifacts and launcher tokens exist', () => {
    var tmp = makeDist();
    fs.writeFileSync(path.join(tmp.dist, 'index.html'), '<html></html>');
    fs.writeFileSync(path.join(tmp.dist, 'legacy', 'index.html'), '<html></html>');
    fs.writeFileSync(path.join(tmp.dist, 'legacy', 'game.js'), 'x');
    fs.writeFileSync(path.join(tmp.dist, 'legacy', 'react.min.js'), 'x');
    fs.writeFileSync(path.join(tmp.dist, 'legacy', 'react-dom.min.js'), 'x');
    fs.writeFileSync(path.join(tmp.assets, 'index.js'), '"Play Now";"Module Status";"legacy/index.html";');

    var out = runPlayableSmoke(tmp.dist);
    expect(out.ok).toBe(true);
    expect(out.checks.every(function (item) { return item.pass; })).toBe(true);
  });

  it('fails and reports failed checks when dist is incomplete', () => {
    var tmp = makeDist();
    fs.writeFileSync(path.join(tmp.dist, 'index.html'), '<html></html>');
    var out = runPlayableSmoke(tmp.dist);
    expect(out.ok).toBe(false);
    expect(out.checks.some(function (item) { return !item.pass; })).toBe(true);
  });

  it('writes a stable JSON smoke report', () => {
    var tmp = makeDist();
    fs.writeFileSync(path.join(tmp.dist, 'index.html'), '<html></html>');
    fs.writeFileSync(path.join(tmp.dist, 'legacy', 'index.html'), '<html></html>');
    fs.writeFileSync(path.join(tmp.dist, 'legacy', 'game.js'), 'x');
    fs.writeFileSync(path.join(tmp.dist, 'legacy', 'react.min.js'), 'x');
    fs.writeFileSync(path.join(tmp.dist, 'legacy', 'react-dom.min.js'), 'x');
    fs.writeFileSync(path.join(tmp.assets, 'index.js'), '"Play Now";"Module Status";"legacy/index.html";');

    var reportPath = path.join(tmp.dist, 'playable-smoke-report.json');
    var out = runPlayableSmokeWithReport(tmp.dist, reportPath);
    var parsed = JSON.parse(fs.readFileSync(out.report, 'utf8'));

    expect(parsed.ok).toBe(true);
    expect(Array.isArray(parsed.checks)).toBe(true);
    expect(parsed.checks.length).toBeGreaterThan(0);
    expect(typeof parsed.generatedAt).toBe('string');
  });
});
