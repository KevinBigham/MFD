import { describe, expect, it } from 'vitest';

import {
  getLegacyRequiredFiles,
  LEGACY_MANIFEST,
  validateLegacyManifest,
} from '../src/app/legacy-manifest.js';

describe('legacy-manifest contract', () => {
  it('exposes required shape and legacy-prefixed files', () => {
    expect(typeof LEGACY_MANIFEST.version).toBe('string');
    expect(typeof LEGACY_MANIFEST.entry).toBe('string');
    expect(Array.isArray(LEGACY_MANIFEST.files)).toBe(true);

    var required = getLegacyRequiredFiles(LEGACY_MANIFEST);
    expect(required.length).toBeGreaterThanOrEqual(4);
    expect(required.every(function (p) { return p.indexOf('legacy/') === 0; })).toBe(true);
  });

  it('validateLegacyManifest passes for canonical manifest', () => {
    var out = validateLegacyManifest(LEGACY_MANIFEST);
    expect(out.ok).toBe(true);
    expect(out.errors).toEqual([]);
  });

  it('validateLegacyManifest fails for malformed manifests', () => {
    var out = validateLegacyManifest({ version: '', entry: '../index.html', files: ['bad.js'] });
    expect(out.ok).toBe(false);
    expect(out.errors.length).toBeGreaterThan(0);
  });
});
