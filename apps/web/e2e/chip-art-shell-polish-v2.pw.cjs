const { expect, test } = require('@playwright/test');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
];

const evidenceDir = resolve(
  process.env.CHIP_ART_EVIDENCE_DIR ?? '../../.codex/MFD/evidence/chip-art-shell-polish-v2-local/screenshots',
);

async function resetBrowserState(page) {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('mfd-boot-seen', 'true');

    await new Promise((resolveDelete) => {
      const request = indexedDB.deleteDatabase('mfd');
      request.onsuccess = () => resolveDelete();
      request.onerror = () => resolveDelete();
      request.onblocked = () => resolveDelete();
    });
  });
  await page.reload();
}

async function openColdOpen(page, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await resetBrowserState(page);
  await page.getByRole('button', { name: 'Start Dynasty' }).click();
  await expect(page.getByText('COMMAND CENTER CRISIS ROOM')).toBeVisible();
  await expect(page.locator('[data-chip-host-portrait="true"]')).toBeVisible({ timeout: 8_000 });
  await expect(page.locator('[data-chip-host="true"] [data-chip-bubble="broadcast-card"]')).toBeVisible();
}

async function openDemoDock(page, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await resetBrowserState(page);
  await page.getByRole('button', { name: 'Launch Demo Scenario' }).click();
  await expect(page.locator('[data-chip-dock="true"]')).toBeVisible();
}

async function screenshot(locator, fileName) {
  await locator.screenshot({ path: resolve(evidenceDir, fileName), animations: 'disabled' });
}

async function measureChip(locator, label, viewport) {
  const img = locator.locator('img[data-chip-image-pose]').first();
  await expect(img, `${label} image exists`).toBeVisible();

  return img.evaluate(
    async (node, args) => {
      const image = node;
      if (!image.complete) {
        await new Promise((resolveImage, rejectImage) => {
          image.onload = () => resolveImage();
          image.onerror = () => rejectImage(new Error(`Chip image failed to load: ${image.currentSrc || image.src}`));
        });
      }
      if (typeof image.decode === 'function') {
        await image.decode().catch(() => undefined);
      }

      const frame = image.closest('.mfd-chip__art-frame');
      if (!frame) throw new Error('Chip art frame missing.');

      const frameRect = frame.getBoundingClientRect();
      const imageRect = image.getBoundingClientRect();
      const style = getComputedStyle(image);
      const width = Math.max(1, Math.round(frameRect.width));
      const height = Math.max(1, Math.round(frameRect.height));
      const naturalWidth = image.naturalWidth || width;
      const naturalHeight = image.naturalHeight || height;
      const scale = style.objectFit === 'contain'
        ? Math.min(width / naturalWidth, height / naturalHeight)
        : Math.max(width / naturalWidth, height / naturalHeight);
      const drawWidth = naturalWidth * scale;
      const drawHeight = naturalHeight * scale;
      const [posXRaw = '50%', posYRaw = '50%'] = style.objectPosition.split(/\s+/);
      const parsePosition = (value) => {
        if (value.endsWith('%')) return Number.parseFloat(value) / 100;
        if (value === 'left' || value === 'top') return 0;
        if (value === 'right' || value === 'bottom') return 1;
        return 0.5;
      };
      const x = (width - drawWidth) * parsePosition(posXRaw);
      const y = (height - drawHeight) * parsePosition(posYRaw);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Could not create Chip measurement canvas.');
      context.drawImage(image, x, y, drawWidth, drawHeight);

      const pixels = context.getImageData(0, 0, width, height).data;
      let inkPixels = 0;
      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;

      for (let pixel = 0; pixel < pixels.length; pixel += 4) {
        if (pixels[pixel + 3] <= 32) continue;
        const index = pixel / 4;
        const pixelX = index % width;
        const pixelY = Math.floor(index / width);
        inkPixels += 1;
        minX = Math.min(minX, pixelX);
        minY = Math.min(minY, pixelY);
        maxX = Math.max(maxX, pixelX);
        maxY = Math.max(maxY, pixelY);
      }

      const frameArea = width * height;
      const bboxArea = maxX >= minX && maxY >= minY
        ? (maxX - minX + 1) * (maxY - minY + 1)
        : 0;

      return {
        label: args.label,
        viewport: args.viewport,
        src: image.getAttribute('src'),
        frame: { width: frameRect.width, height: frameRect.height },
        image: { width: imageRect.width, height: imageRect.height },
        inkAreaFraction: inkPixels / frameArea,
        bboxAreaFraction: bboxArea / frameArea,
        aspectRatio: frameRect.width / frameRect.height,
      };
    },
    { label, viewport },
  );
}

async function expectReadableChip(metric, options = {}) {
  expect(metric.image.width, `${metric.label} rendered image width`).toBeGreaterThan(0);
  expect(metric.image.height, `${metric.label} rendered image height`).toBeGreaterThan(0);
  expect(metric.bboxAreaFraction, `${metric.label} visible Chip bbox fraction`).toBeGreaterThanOrEqual(0.3);
  if (options.squareInline) {
    expect(metric.aspectRatio, `${metric.label} inline portrait aspect`).toBeGreaterThanOrEqual(0.95);
    expect(metric.aspectRatio, `${metric.label} inline portrait aspect`).toBeLessThanOrEqual(1.05);
  }
}

async function expectNoOverlap(first, second, label) {
  const secondHandle = await second.elementHandle();
  expect(secondHandle, `${label} target exists`).not.toBeNull();
  const overlap = await first.evaluate((firstNode, secondNode) => {
    const firstRect = firstNode.getBoundingClientRect();
    const secondRect = secondNode.getBoundingClientRect();
    return !(
      firstRect.right <= secondRect.left ||
      firstRect.left >= secondRect.right ||
      firstRect.bottom <= secondRect.top ||
      firstRect.top >= secondRect.bottom
    );
  }, secondHandle);
  expect(overlap, label).toBe(false);
}

test('Chip PNG art is readable on cold-open and dock surfaces', async ({ page }) => {
  await mkdir(evidenceDir, { recursive: true });
  const metrics = [];

  for (const viewport of VIEWPORTS) {
    await openColdOpen(page, viewport);

    const hostPortrait = page.locator('[data-chip-host-portrait="true"]');
    const hostBubble = page.locator('[data-chip-host="true"] [data-chip-bubble="broadcast-card"]');
    const hostBubbleText = hostBubble.locator('.mfd-chip-bubble__text');
    await screenshot(hostPortrait, `${viewport.name}-cold-open-portrait.png`);
    await screenshot(hostBubble, `${viewport.name}-cold-open-bubble.png`);
    const hostMetric = await measureChip(hostPortrait, 'cold-open portrait', viewport.name);
    await expectReadableChip(hostMetric, { squareInline: true });
    await expectNoOverlap(hostPortrait.locator('.mfd-chip__art-frame'), hostBubbleText, `${viewport.name} portrait does not bleed into dialogue text`);
    metrics.push(hostMetric);

    await openDemoDock(page, viewport);

    const expandedDock = page.locator('[data-chip-dock-state="expanded"]');
    await expect(expandedDock).toBeVisible();
    await screenshot(expandedDock, `${viewport.name}-dock-expanded.png`);
    const expandedMetric = await measureChip(expandedDock.locator('.mfd-chip-dock__portrait'), 'expanded dock', viewport.name);
    await expectReadableChip(expandedMetric);
    await expectNoOverlap(
      expandedDock.locator('.mfd-chip-dock__portrait .mfd-chip__art-frame'),
      expandedDock.locator('.mfd-chip-dock__content'),
      `${viewport.name} expanded dock portrait does not overlap text content`,
    );
    metrics.push(expandedMetric);

    await expandedDock.getByRole('button', { name: 'Collapse Chip dock' }).click();
    const collapsedDock = page.locator('[data-chip-dock-state="collapsed"]');
    await expect(collapsedDock).toBeVisible();
    await screenshot(collapsedDock, `${viewport.name}-dock-collapsed.png`);
    const collapsedMetric = await measureChip(collapsedDock, 'collapsed dock', viewport.name);
    await expectReadableChip(collapsedMetric, { squareInline: true });
    metrics.push(collapsedMetric);
  }

  await writeFile(resolve(evidenceDir, 'chip-art-metrics.json'), `${JSON.stringify(metrics, null, 2)}\n`, 'utf-8');
});
