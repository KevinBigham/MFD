import { describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const indexHtml = readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');
const activeManifest = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../public/manifest.json', import.meta.url)), 'utf8'),
) as {
  start_url?: string;
  scope?: string;
  icons?: Array<{ src?: string; type?: string }>;
};
const legacyRootManifest = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../../../public/manifest.json', import.meta.url)), 'utf8'),
) as {
  start_url?: string;
  scope?: string;
};

describe('index document release metadata', () => {
  it('uses current mobile web app metadata alongside the iOS legacy flag', () => {
    expect(indexHtml).toContain('<meta name="mobile-web-app-capable" content="yes" />');
    expect(indexHtml).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />');
  });

  it('lets Vite apply the configured base path to release assets', () => {
    expect(indexHtml).toContain('content="screenshots/v1/dashboard-desktop.png"');
    expect(indexHtml).toContain('href="manifest.json"');
    expect(indexHtml).toContain('href="favicon.svg"');
    expect(indexHtml).not.toContain('href="/MFD/manifest.json"');
    expect(indexHtml).not.toContain('%BASE_URL%manifest.json');
  });

  it('uses the web public manifest as the active PWA manifest', () => {
    expect(activeManifest.start_url).toBe('/MFD/');
    expect(activeManifest.scope).toBe('/MFD/');
    expect(activeManifest.icons?.map((icon) => icon.src).sort()).toEqual(['icon-192.svg', 'icon-512.svg']);
    expect(JSON.stringify(activeManifest)).not.toContain('/mr-football-dynasty/');
  });

  it('keeps the root public manifest distinguishable as legacy unwired metadata', () => {
    expect(legacyRootManifest.start_url).toBe('/mr-football-dynasty/');
    expect(legacyRootManifest.scope).toBe('/mr-football-dynasty/');
    expect(indexHtml).not.toContain('/mr-football-dynasty/');
  });
});

describe('Chip pose preloads (H10)', () => {
  const PRELOADED_POSES = [
    'pose-think',
    'pose-point-right',
    'pose-celebrate',
    'pose-reviewing-tablet',
    'pose-skeptical',
    'pose-proud',
  ] as const;

  it('preloads the six most common Chip poses with deploy-base-relative paths', () => {
    for (const pose of PRELOADED_POSES) {
      const href = `assets/chip/inline/${pose}.png`;
      expect(indexHtml).toContain(`<link rel="preload" as="image" href="${href}" />`);
      // The preloaded asset must exist or the link is dead weight.
      const stat = statSync(fileURLToPath(new URL(`../../public/${href}`, import.meta.url)), { throwIfNoEntry: false });
      expect(stat?.isFile(), href).toBe(true);
      // Relative hrefs only — never hardcode the deploy base.
      expect(indexHtml).not.toContain(`href="/MFD/${href}"`);
    }
  });
});
