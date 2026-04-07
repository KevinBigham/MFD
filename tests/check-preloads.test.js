import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  loadForbiddenTokens,
  parseCommaList,
  extractModulePreloadHrefs,
  findForbiddenPreloads,
  verifyPreloadsFromHtml,
  writePreloadReport,
} from '../scripts/check-preloads.mjs';

describe('check-preloads script helpers', () => {
  it('extracts modulepreload links regardless of attribute order/quotes', () => {
    var html = [
      '<link href="/assets/vendor-abc.js" rel="modulepreload" crossorigin>',
      "<link rel='modulepreload' href='/assets/game-systems-xyz.js'>",
      '<link rel="stylesheet" href="/assets/style.css">',
    ].join('\n');

    expect(extractModulePreloadHrefs(html)).toEqual([
      '/assets/vendor-abc.js',
      '/assets/game-systems-xyz.js',
    ]);
  });

  it('flags forbidden heavy preload tokens', () => {
    var preloadLinks = [
      '/assets/vendor-abc.js',
      '/assets/game-systems-xyz.js',
      '/assets/data-packs-123.js',
    ];
    expect(findForbiddenPreloads(preloadLinks, ['game-systems', 'data-packs'])).toEqual([
      '/assets/game-systems-xyz.js',
      '/assets/data-packs-123.js',
    ]);
  });

  it('verifies html and returns empty violations for safe preloads', () => {
    var html = [
      '<link rel="modulepreload" href="/assets/vendor-abc.js">',
      '<link rel="modulepreload" href="/assets/module-validation-runtime-abc.js">',
    ].join('\n');

    var out = verifyPreloadsFromHtml(html, ['game-systems', 'data-packs']);
    expect(out.preloadLinks.length).toBe(2);
    expect(out.violations).toEqual([]);
    expect(out.modulePreloadsCount).toBe(2);
  });

  it('returns empty preload list when no modulepreload links exist', () => {
    var out = verifyPreloadsFromHtml('<link rel=\"stylesheet\" href=\"/x.css\">', ['game-systems']);
    expect(out.preloadLinks).toEqual([]);
    expect(out.violations).toEqual([]);
    expect(out.modulePreloadsCount).toBe(0);
  });

  it('supports token list parsing and precedence over token file', () => {
    expect(parseCommaList('a, b ,c')).toEqual(['a', 'b', 'c']);
    expect(parseCommaList(' , , ')).toEqual([]);

    var tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-tokens-'));
    var tokenFile = path.join(tmp, 'tokens.json');
    fs.writeFileSync(tokenFile, JSON.stringify({ tokens: ['x', 'y'] }));

    var fromFile = loadForbiddenTokens({ cwd: '/', tokensPath: tokenFile });
    expect(fromFile).toEqual(['x', 'y']);

    var fromList = loadForbiddenTokens({ cwd: '/', tokensPath: tokenFile, tokensList: 'a,b' });
    expect(fromList).toEqual(['a', 'b']);
  });

  it('writes preload report payload to disk', () => {
    var tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-preload-report-'));
    var reportPath = path.join(tmp, 'preload-report.json');
    var written = writePreloadReport(reportPath, {
      preloadLinks: ['/assets/vendor.js'],
      violations: [],
      modulePreloadsCount: 1,
      forbiddenTokens: ['game-systems'],
    });
    var parsed = JSON.parse(fs.readFileSync(written, 'utf8'));
    expect(parsed.modulePreloadsCount).toBe(1);
    expect(parsed.preloadLinks).toEqual(['/assets/vendor.js']);
  });
});
