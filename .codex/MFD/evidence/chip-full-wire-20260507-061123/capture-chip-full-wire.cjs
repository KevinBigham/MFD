const { chromium } = require('playwright');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const BASE_URL = process.env.CHIP_EVIDENCE_BASE_URL ?? 'http://127.0.0.1:5187/MFD/chip-full-wire-evidence.html';
const EVIDENCE_DIR = resolve(__dirname, 'screenshots');

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
];

const SURFACES = [
  { name: 'contact-sheet', expectedPose: null, minImages: 36 },
  { name: 'weekly', expectedPose: 'reviewing-tablet' },
  { name: 'route-training-camp', expectedPose: 'whistle-blow' },
  { name: 'halftime', expectedPose: 'time-out' },
  { name: 'recap', expectedPose: 'rallying' },
  { name: 'press', expectedPose: 'reviewing-tablet' },
  { name: 'achievement', expectedPose: 'proud' },
  { name: 'dock-collapsed', expectedPose: 'idle' },
  { name: 'dock-expanded', expectedPose: 'idle' },
];

async function imageMetrics(page, surface, viewport) {
  return page.evaluate(({ surface, viewport }) => {
    const images = Array.from(document.querySelectorAll('img[data-chip-image-pose], img[data-chip-contact-pose]'));
    return images.map((image) => {
      const rect = image.getBoundingClientRect();
      return {
        surface,
        viewport,
        pose: image.getAttribute('data-chip-image-pose') ?? image.getAttribute('data-chip-contact-pose'),
        src: image.getAttribute('src'),
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        renderedWidth: rect.width,
        renderedHeight: rect.height,
        complete: image.complete,
      };
    });
  }, { surface, viewport });
}

async function waitForImages(page) {
  await page.waitForFunction(() => {
    const images = Array.from(document.querySelectorAll('img[data-chip-image-pose], img[data-chip-contact-pose]'));
    return images.length > 0 && images.every((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
  });
}

async function captureSurface(page, surface, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(`${BASE_URL}?surface=${encodeURIComponent(surface.name)}`, { waitUntil: 'networkidle' });
  await page.waitForSelector(`[data-chip-evidence-surface="${surface.name}"]`, { state: 'visible' });
  await waitForImages(page);

  if (surface.expectedPose) {
    await page.waitForSelector(`img[data-chip-image-pose="${surface.expectedPose}"]`, { state: 'visible' });
  }

  const metrics = await imageMetrics(page, surface.name, viewport.name);
  if (surface.minImages && metrics.length < surface.minImages) {
    throw new Error(`${surface.name} expected at least ${surface.minImages} images, got ${metrics.length}`);
  }
  if (surface.expectedPose && !metrics.some((metric) => metric.pose === surface.expectedPose)) {
    throw new Error(`${surface.name} missing expected pose ${surface.expectedPose}`);
  }

  await page.screenshot({
    path: resolve(EVIDENCE_DIR, `${viewport.name}-${surface.name}.png`),
    fullPage: true,
    animations: 'disabled',
  });

  return metrics;
}

async function main() {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const metrics = [];

  try {
    for (const viewport of VIEWPORTS) {
      for (const surface of SURFACES) {
        metrics.push(...await captureSurface(page, surface, viewport));
      }
    }
  } finally {
    await browser.close();
  }

  await writeFile(
    resolve(EVIDENCE_DIR, 'chip-art-metrics.json'),
    `${JSON.stringify({
      capturedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      viewports: VIEWPORTS,
      surfaces: SURFACES.map((surface) => surface.name),
      metrics,
    }, null, 2)}\n`,
    'utf8',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
