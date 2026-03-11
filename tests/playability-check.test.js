import { describe, expect, it } from 'vitest';

import {
  buildExpectedLegacyFiles,
  createDefaultProbe,
  normalizeBasePath,
  normalizeLegacyAssetPath,
  probeLegacyAssets,
  runPlayabilityCheck,
} from '../src/app/playability-check.js';
import { LEGACY_MANIFEST } from '../src/app/legacy-manifest.js';

describe('playability-check helpers', () => {
  it('buildExpectedLegacyFiles mirrors manifest-required files', () => {
    var files = buildExpectedLegacyFiles(LEGACY_MANIFEST);
    expect(files).toContain('legacy/index.html');
    expect(files).toContain('legacy/game.js');
    expect(new Set(files).size).toBe(files.length);
  });

  it('normalizes asset paths for probing', () => {
    expect(normalizeLegacyAssetPath('/legacy/game.js')).toBe('legacy/game.js');
    expect(normalizeLegacyAssetPath('\\legacy\\react.min.js')).toBe('legacy/react.min.js');
  });

  it('probeLegacyAssets returns missing files when probe fails', async () => {
    var out = await probeLegacyAssets(['legacy/index.html', 'legacy/game.js'], async function (path) {
      return path === 'legacy/index.html';
    });
    expect(out.ok).toBe(false);
    expect(out.missingFiles).toEqual(['legacy/game.js']);
    expect(out.checks.length).toBe(2);
  });

  it('runPlayabilityCheck handles invalid manifest safely', async () => {
    var out = await runPlayabilityCheck({ version: '', entry: '', files: [] }, async function () {
      return true;
    });
    expect(out.ok).toBe(false);
    expect(out.errors.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════
// basePath-aware probing (truthfulness cleanup)
// ═══════════════════════════════════════════════

describe('basePath-aware probing', () => {
  it('normalizeBasePath adds leading/trailing slashes', () => {
    expect(normalizeBasePath('mr-football-dynasty')).toBe('/mr-football-dynasty/');
    expect(normalizeBasePath('/mr-football-dynasty')).toBe('/mr-football-dynasty/');
    expect(normalizeBasePath('/mr-football-dynasty/')).toBe('/mr-football-dynasty/');
    expect(normalizeBasePath('')).toBe('/');
    expect(normalizeBasePath(null)).toBe('/');
    expect(normalizeBasePath('/')).toBe('/');
  });

  it('createDefaultProbe prefixes basePath to fetched URL', async () => {
    var fetchedUrls = [];
    // Capture the URL that would be fetched by injecting a custom global fetch
    var origFetch = globalThis.fetch;
    globalThis.fetch = async function (url) {
      fetchedUrls.push(url);
      return { ok: true };
    };
    try {
      var probe = createDefaultProbe('/mr-football-dynasty/');
      await probe('legacy/game.js');
      expect(fetchedUrls.length).toBe(1);
      expect(fetchedUrls[0]).toBe('/mr-football-dynasty/legacy/game.js');
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('createDefaultProbe with root basePath fetches from /', async () => {
    var fetchedUrls = [];
    var origFetch = globalThis.fetch;
    globalThis.fetch = async function (url) {
      fetchedUrls.push(url);
      return { ok: true };
    };
    try {
      var probe = createDefaultProbe('/');
      await probe('legacy/game.js');
      expect(fetchedUrls[0]).toBe('/legacy/game.js');
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('probeLegacyAssets threads basePath to default probe when no custom probeFn', async () => {
    var fetchedUrls = [];
    var origFetch = globalThis.fetch;
    globalThis.fetch = async function (url) {
      fetchedUrls.push(url);
      return { ok: true };
    };
    try {
      await probeLegacyAssets(['legacy/index.html', 'legacy/game.js'], null, '/mr-football-dynasty/');
      expect(fetchedUrls).toContain('/mr-football-dynasty/legacy/index.html');
      expect(fetchedUrls).toContain('/mr-football-dynasty/legacy/game.js');
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('probeLegacyAssets ignores basePath when custom probeFn provided', async () => {
    var probed = [];
    var out = await probeLegacyAssets(
      ['legacy/index.html'],
      async function (path) { probed.push(path); return true; },
      '/mr-football-dynasty/'
    );
    expect(out.ok).toBe(true);
    expect(probed).toEqual(['legacy/index.html']);
  });
});
