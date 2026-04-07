import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  extractHtmlRefs,
  findForbiddenLegacyRefs,
  isExternalRef,
  normalizeRef,
  stripLocalRefSuffix,
  verifyLegacyRefs,
  verifyPlayableBuild,
} from '../scripts/check-playable-build.mjs';

function makeDist() {
  var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-playable-build-'));
  var dist = path.join(root, 'dist');
  fs.mkdirSync(path.join(dist, 'legacy'), { recursive: true });
  return { root: root, dist: dist };
}

describe('check-playable-build script', () => {
  it('extracts script/link references from html', () => {
    var refs = extractHtmlRefs([
      '<script src="game.js"></script>',
      '<link rel="stylesheet" href="styles.css">',
    ].join('\n'));
    expect(refs).toEqual(['game.js', 'styles.css']);
  });

  it('verifyLegacyRefs flags broken local refs only', () => {
    var tmp = makeDist();
    fs.writeFileSync(path.join(tmp.dist, 'legacy', 'game.js'), 'x');
    var out = verifyLegacyRefs(tmp.dist, ['game.js', 'missing.js', 'https://cdn.x/y.js'], 'legacy/index.html');
    expect(out).toEqual(['missing.js']);
  });

  it('findForbiddenLegacyRefs catches external and protocol-relative refs', () => {
    var out = findForbiddenLegacyRefs([
      'game.js',
      'https://cdn.example.com/game.js',
      '//cdn.example.com/x.js',
      'data:text/javascript,alert(1)',
      'javascript:alert(1)',
    ]);
    expect(out).toEqual([
      'https://cdn.example.com/game.js',
      '//cdn.example.com/x.js',
      'data:text/javascript,alert(1)',
      'javascript:alert(1)',
    ]);
  });

  it('normalizes refs and classifies schemes as external', () => {
    expect(normalizeRef('  game.js ')).toBe('game.js');
    expect(stripLocalRefSuffix('game.js?v=20260315c#boot')).toBe('game.js');
    expect(isExternalRef('mailto:test@example.com')).toBe(true);
    expect(isExternalRef('javascript:alert(1)')).toBe(true);
    expect(isExternalRef('//cdn.example.com/game.js')).toBe(true);
    expect(isExternalRef('/legacy/game.js')).toBe(false);
  });

  it('verifyPlayableBuild passes with full legacy payload', () => {
    var tmp = makeDist();
    fs.writeFileSync(path.join(tmp.dist, 'legacy', 'index.html'), [
      '<script src="react.min.js"></script>',
      '<script src="react-dom.min.js"></script>',
      '<script src="game.js?v=20260315c"></script>',
    ].join('\n'));
    fs.writeFileSync(path.join(tmp.dist, 'legacy', 'game.js'), 'x');
    fs.writeFileSync(path.join(tmp.dist, 'legacy', 'react.min.js'), 'x');
    fs.writeFileSync(path.join(tmp.dist, 'legacy', 'react-dom.min.js'), 'x');

    var out = verifyPlayableBuild(tmp.dist);
    expect(out.ok).toBe(true);
    expect(out.missingFiles).toEqual([]);
    expect(out.badRefs).toEqual([]);
  });

  it('verifyPlayableBuild fails on missing files and broken refs', () => {
    var tmp = makeDist();
    fs.writeFileSync(path.join(tmp.dist, 'legacy', 'index.html'), '<script src="missing.js"></script>');

    var out = verifyPlayableBuild(tmp.dist);
    expect(out.ok).toBe(false);
    expect(out.missingFiles.length).toBeGreaterThan(0);
    expect(out.badRefs).toContain('missing.js');
  });

  it('verifyPlayableBuild fails on forbidden external refs', () => {
    var tmp = makeDist();
    fs.writeFileSync(path.join(tmp.dist, 'legacy', 'index.html'), [
      '<script src=\"https://cdn.example.com/game.js\"></script>',
      '<script src=\"//cdn.example.com/extra.js\"></script>',
      '<script src=\"javascript:alert(1)\"></script>',
    ].join('\n'));
    fs.writeFileSync(path.join(tmp.dist, 'legacy', 'game.js'), 'x');
    fs.writeFileSync(path.join(tmp.dist, 'legacy', 'react.min.js'), 'x');
    fs.writeFileSync(path.join(tmp.dist, 'legacy', 'react-dom.min.js'), 'x');

    var out = verifyPlayableBuild(tmp.dist);
    expect(out.ok).toBe(false);
    expect(out.forbiddenRefs).toContain('https://cdn.example.com/game.js');
    expect(out.forbiddenRefs).toContain('//cdn.example.com/extra.js');
    expect(out.forbiddenRefs).toContain('javascript:alert(1)');
  });
});
