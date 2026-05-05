import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const indexHtml = readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

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
});
