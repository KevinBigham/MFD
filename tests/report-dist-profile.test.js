import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildProfile,
  listAssetFiles,
} from '../scripts/report-dist-profile.mjs';

function makeTmpDist() {
  var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-dist-'));
  var dist = path.join(root, 'dist');
  var assets = path.join(dist, 'assets');
  fs.mkdirSync(assets, { recursive: true });
  return { root: root, dist: dist, assets: assets };
}

describe('report-dist-profile script helpers', () => {
  it('lists only css/js assets', () => {
    var tmp = makeTmpDist();
    fs.writeFileSync(path.join(tmp.assets, 'a.js'), 'console.log(1);');
    fs.writeFileSync(path.join(tmp.assets, 'b.css'), 'body{}');
    fs.writeFileSync(path.join(tmp.assets, 'c.txt'), 'x');

    expect(listAssetFiles(tmp.assets)).toEqual(['a.js', 'b.css']);
  });

  it('buildProfile reads index preloads and sorts assets by size desc', () => {
    var tmp = makeTmpDist();
    fs.writeFileSync(path.join(tmp.dist, 'index.html'), [
      '<!doctype html>',
      '<link rel="modulepreload" href="/assets/vendor-x.js">',
      '<link href="/assets/index-x.js" rel="modulepreload">',
      '<div>app</div>',
    ].join('\n'));
    fs.writeFileSync(path.join(tmp.assets, 'small.js'), 'x');
    fs.writeFileSync(path.join(tmp.assets, 'large.js'), 'xxxxxxxxxx');

    var profile = buildProfile(tmp.dist);
    expect(profile.index.modulePreloads).toEqual([
      '/assets/vendor-x.js',
      '/assets/index-x.js',
    ]);
    expect(profile.index.modulePreloadsCount).toBe(2);
    expect(profile.assets.length).toBe(2);
    expect(profile.assets[0].file).toBe('large.js');
    expect(profile.assets[1].file).toBe('small.js');
    expect(profile.topAssets.length).toBe(2);
    expect(profile.index.bytes).toBeGreaterThan(0);
  });

  it('throws a clear error when dist index is missing', () => {
    var tmp = makeTmpDist();
    fs.rmSync(path.join(tmp.dist, 'index.html'), { force: true });
    expect(function () {
      buildProfile(tmp.dist);
    }).toThrow('dist/index.html not found');
  });

  it('keeps deterministic order for tied asset sizes', () => {
    var tmp = makeTmpDist();
    fs.writeFileSync(path.join(tmp.dist, 'index.html'), '<link rel=\"modulepreload\" href=\"/assets/vendor.js\">');
    fs.writeFileSync(path.join(tmp.assets, 'a.js'), 'xx');
    fs.writeFileSync(path.join(tmp.assets, 'b.js'), 'xx');

    var profile = buildProfile(tmp.dist);
    expect(profile.assets.map(function (a) { return a.file; })).toEqual(['a.js', 'b.js']);
  });
});
