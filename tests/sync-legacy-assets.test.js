import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  copyFileIfChanged,
  syncLegacyAssets,
} from '../scripts/sync-legacy-assets.mjs';

function makeTmp() {
  var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-sync-legacy-'));
  var source = path.join(root, 'src-legacy');
  var dest = path.join(root, 'public', 'legacy');
  fs.mkdirSync(source, { recursive: true });
  return { root: root, source: source, dest: dest };
}

describe('sync-legacy-assets script', () => {
  it('copyFileIfChanged reports skipped when destination is identical', () => {
    var tmp = makeTmp();
    var src = path.join(tmp.root, 'a.txt');
    var dst = path.join(tmp.root, 'b.txt');
    fs.writeFileSync(src, 'abc');
    fs.writeFileSync(dst, 'abc');

    var out = copyFileIfChanged(src, dst);
    expect(out.skipped).toBe(true);
    expect(out.copied).toBe(false);
  });

  it('syncLegacyAssets copies required files and is idempotent', () => {
    var tmp = makeTmp();
    fs.writeFileSync(path.join(tmp.source, 'index.html'), '<html></html>');
    fs.writeFileSync(path.join(tmp.source, 'game.js'), 'console.log(1)');
    fs.writeFileSync(path.join(tmp.source, 'react.min.js'), 'react');
    fs.writeFileSync(path.join(tmp.source, 'react-dom.min.js'), 'react-dom');

    var first = syncLegacyAssets({ cwd: '/', sourceDir: tmp.source, destDir: tmp.dest, manifest: {
      version: 'x',
      entry: 'legacy/index.html',
      files: ['legacy/game.js', 'legacy/react.min.js', 'legacy/react-dom.min.js'],
    } });

    expect(first.ok).toBe(true);
    expect(first.copied.length).toBe(4);

    var second = syncLegacyAssets({ cwd: '/', sourceDir: tmp.source, destDir: tmp.dest, manifest: {
      version: 'x',
      entry: 'legacy/index.html',
      files: ['legacy/game.js', 'legacy/react.min.js', 'legacy/react-dom.min.js'],
    } });
    expect(second.ok).toBe(true);
    expect(second.skipped.length).toBe(4);
  });

  it('syncLegacyAssets fails when source files are missing', () => {
    var tmp = makeTmp();
    var out = syncLegacyAssets({ cwd: '/', sourceDir: tmp.source, destDir: tmp.dest, manifest: {
      version: 'x',
      entry: 'legacy/index.html',
      files: ['legacy/game.js'],
    } });
    expect(out.ok).toBe(false);
    expect(out.missing).toContain('legacy/index.html');
    expect(out.missing).toContain('legacy/game.js');
  });
});
