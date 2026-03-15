import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { LEGACY_MANIFEST, validateLegacyManifest } from '../src/app/legacy-manifest.js';

describe('legacy-manifest', () => {
  it('validates canonical manifest', () => {
    var out = validateLegacyManifest(LEGACY_MANIFEST);
    expect(out.ok).toBe(true);
  });

  it('keeps legacy html cache-bust token aligned with manifest asset version', () => {
    var canonicalHtml = fs.readFileSync(path.resolve(process.cwd(), 'mr-football-dynasty/index.html'), 'utf8');
    var publicHtml = fs.readFileSync(path.resolve(process.cwd(), 'public/legacy/index.html'), 'utf8');
    var expectedRef = 'game.js?v=' + LEGACY_MANIFEST.assetVersion;

    expect(canonicalHtml).toContain(expectedRef);
    expect(publicHtml).toContain(expectedRef);
    expect(publicHtml).toBe(canonicalHtml);
  });
});
