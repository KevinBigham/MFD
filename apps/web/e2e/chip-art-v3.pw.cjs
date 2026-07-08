const { expect, test } = require('@playwright/test');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
];

const DOCK_SIGNATURE_VIEWPORTS = VIEWPORTS.filter((viewport) => viewport.name === 'desktop' || viewport.name === 'mobile');

const DOCK_SIGNATURE_POSES = [
  {
    pose: 'idle',
    fileName: 'chip-coach.png',
    profile: 'settled',
    text: 'Settle in. I have the sideline board clean and the next call framed.',
  },
  {
    pose: 'think',
    fileName: 'pose-think.png',
    profile: 'focused',
    text: 'Hold the snap. This is where the small roster clue turns into the right move.',
  },
  {
    pose: 'celebrate',
    fileName: 'pose-celebrate.png',
    profile: 'victory',
    text: 'That is a box-art win. Keep the camera on us for one more beat.',
  },
  {
    pose: 'warning',
    fileName: 'pose-warning.png',
    profile: 'urgent',
    text: 'Clock is hot. Fix the risk now before it owns the next screen.',
  },
  {
    pose: 'sad',
    fileName: 'pose-sad.png',
    profile: 'downbeat',
    text: 'Rough break, coach. We keep the lesson and leave the panic on the bench.',
  },
];

const evidenceDir = resolve(
  process.env.CHIP_ART_EVIDENCE_DIR ?? '../../.codex/MFD/evidence/chip-art-v3-local/screenshots',
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
  await expect(page.locator('[data-chip-host="true"]')).toBeVisible({ timeout: 8_000 });
  await expect(page.locator('[data-chip-host-portrait="true"]')).toBeVisible({ timeout: 8_000 });
  await expect(page.locator('[data-chip-host="true"] [data-chip-bubble="broadcast-card"]')).toBeVisible();
}

async function openDemoDock(page, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await resetBrowserState(page);
  await page.getByRole('button', { name: 'Launch Demo Scenario' }).click();
  await expect(page.locator('[data-chip-dock="true"]')).toBeVisible();
}

function primaryColdOpenAction(page) {
  return page.getByRole('button', { name: /Continue Briefing|Enter War Room/i }).first();
}

async function screenshot(locator, fileName) {
  await locator.screenshot({ path: resolve(evidenceDir, fileName), animations: 'disabled' });
}

async function elementBox(locator, label) {
  await expect(locator, `${label} exists`).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `${label} has a browser box`).not.toBeNull();
  return box;
}

async function expectPrimaryActionSharesChipColumn(page, viewportName) {
  const chipHost = page.locator('[data-chip-host="true"]');
  const action = primaryColdOpenAction(page);
  const chipBox = await elementBox(chipHost, `${viewportName} Chip host`);
  const actionBox = await elementBox(action, `${viewportName} cold-open primary action`);
  const actionCenterX = actionBox.x + actionBox.width / 2;

  expect(actionCenterX, `${viewportName} NEXT center should sit in Chip's column`).toBeGreaterThanOrEqual(chipBox.x - 12);
  expect(actionCenterX, `${viewportName} NEXT center should sit in Chip's column`).toBeLessThanOrEqual(
    chipBox.x + chipBox.width + 12,
  );
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
        pose: image.getAttribute('data-chip-image-pose'),
        src: image.getAttribute('src'),
        natural: { width: naturalWidth, height: naturalHeight },
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
  expect(metric.bboxAreaFraction, `${metric.label} visible Chip bbox fraction`).toBeGreaterThanOrEqual(0.24);
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

async function setDockSignaturePose(page, poseCase) {
  await page.evaluate(({ pose, fileName, profile, text }) => {
    const dock = document.querySelector('[data-chip-dock-state="expanded"]');
    if (!dock) throw new Error('Expanded Chip dock missing.');

    const chip = dock.querySelector('.mfd-chip-dock__portrait .mfd-chip');
    const frame = dock.querySelector('.mfd-chip-dock__portrait .mfd-chip__art-frame');
    const rig = dock.querySelector('.mfd-chip-dock__portrait .mfd-chip__motion-rig');
    const image = dock.querySelector('.mfd-chip-dock__portrait img[data-chip-image-pose]');
    const bubbleText = dock.querySelector('.mfd-chip-bubble__text');
    const poseTag = dock.querySelector('.mfd-chip-bubble__pose-tag');
    if (!chip || !frame || !rig || !image || !bubbleText || !poseTag) {
      throw new Error('Chip dock visual regression nodes missing.');
    }

    const src = `assets/chip/${fileName}`;
    chip.setAttribute('data-chip-pose', pose);
    chip.setAttribute('data-chip-motion-profile', profile);
    chip.setAttribute('data-chip-art-src', src);
    chip.setAttribute('data-chip-full-art-src', src);
    chip.setAttribute('aria-label', `Chip ${pose} regression pose`);
    frame.setAttribute('data-chip-pose-art', pose);
    rig.setAttribute('data-chip-motion-rig', profile);
    image.setAttribute('data-chip-image-pose', pose);
    image.setAttribute('src', src);
    bubbleText.textContent = text;
    poseTag.textContent = pose;
  }, poseCase);

  const image = page.locator(`.mfd-chip-dock__portrait img[data-chip-image-pose="${poseCase.pose}"]`).first();
  await expect(image, `${poseCase.pose} dock pose image`).toBeVisible();
  await image.evaluate(async (node) => {
    const img = node;
    if (!img.complete) {
      await new Promise((resolveImage, rejectImage) => {
        img.onload = () => resolveImage();
        img.onerror = () => rejectImage(new Error(`Chip image failed to load: ${img.currentSrc || img.src}`));
      });
    }
    if (typeof img.decode === 'function') {
      await img.decode().catch(() => undefined);
    }
  });
}

async function inspectDockLayout(page, label) {
  return page.locator('[data-chip-dock-state="expanded"]').evaluate((dock, currentLabel) => {
    const rectFor = (selector) => {
      const node = dock.querySelector(selector);
      if (!node) throw new Error(`${currentLabel}: missing ${selector}`);
      const rect = node.getBoundingClientRect();
      return {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };
    };
    const optionalRectFor = (selector) => {
      const node = dock.querySelector(selector);
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };
    };
    const overlaps = (first, second) => !(
      first.right <= second.left
      || first.left >= second.right
      || first.bottom <= second.top
      || first.top >= second.bottom
    );
    const bubbleText = dock.querySelector('.mfd-chip-bubble__text')?.textContent?.trim() ?? '';
    const controlsText = dock.querySelector('[data-chip-dock-controls="true"]')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const nameplateText = dock.querySelector('.mfd-chip-dock__nameplate')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const boxes = {
      portrait: rectFor('.mfd-chip-dock__portrait .mfd-chip__art-frame'),
      content: rectFor('.mfd-chip-dock__content'),
      bubble: rectFor('.mfd-chip-bubble'),
      controls: rectFor('[data-chip-dock-controls="true"]'),
      nameplate: rectFor('.mfd-chip-dock__nameplate'),
      pendingBadge: optionalRectFor('[data-chip-pending-decisions="true"]'),
    };

    return {
      boxes,
      text: {
        bubble: bubbleText,
        controls: controlsText,
        nameplate: nameplateText,
      },
      overlaps: {
        portraitContent: overlaps(boxes.portrait, boxes.content),
        nameplateContent: overlaps(boxes.nameplate, boxes.content),
        bubbleControls: overlaps(boxes.bubble, boxes.controls),
        pendingBadgeBubble: boxes.pendingBadge ? overlaps(boxes.pendingBadge, boxes.bubble) : false,
        pendingBadgeControls: boxes.pendingBadge ? overlaps(boxes.pendingBadge, boxes.controls) : false,
      },
    };
  }, label);
}

async function advanceColdOpenToAgmHire(page) {
  for (let index = 0; index < 5; index += 1) {
    await primaryColdOpenAction(page).click();
  }
  await expect(page.getByRole('button', { name: 'MAKE THIS YOUR AGM' })).toBeVisible();
  await expect(page.locator('[data-chip-host-portrait="true"] img[data-chip-image-pose="talk"]')).toBeVisible({
    timeout: 6_000,
  });
}

test('cold-open primary action stays in Chip column at all v3 viewports', async ({ page }) => {
  await mkdir(evidenceDir, { recursive: true });

  for (const viewport of VIEWPORTS) {
    await openColdOpen(page, viewport);
    await expectPrimaryActionSharesChipColumn(page, viewport.name);
    await page.screenshot({
      path: resolve(evidenceDir, `${viewport.name}-cold-open-chip-next.png`),
      animations: 'disabled',
      fullPage: true,
    });
  }
});

test('Chip PNG art is readable across cold-open and dock surfaces', async ({ page }) => {
  await mkdir(evidenceDir, { recursive: true });
  const metrics = [];

  for (const viewport of VIEWPORTS) {
    await openColdOpen(page, viewport);

    const hostPortrait = page.locator('[data-chip-host-portrait="true"]');
    const hostBubble = page.locator('[data-chip-host="true"] [data-chip-bubble="broadcast-card"]');
    const hostBubbleText = hostBubble.locator('.mfd-chip-bubble__text');
    await screenshot(hostPortrait, `${viewport.name}-cold-open-portrait-wave.png`);
    await screenshot(hostBubble, `${viewport.name}-cold-open-bubble-wave.png`);
    const hostMetric = await measureChip(hostPortrait, 'cold-open portrait', viewport.name);
    await expectReadableChip(hostMetric, { squareInline: true });
    await expectNoOverlap(
      hostPortrait.locator('.mfd-chip__art-frame'),
      hostBubbleText,
      `${viewport.name} portrait does not bleed into dialogue text`,
    );
    metrics.push(hostMetric);

    if (viewport.name === 'desktop') {
      await advanceColdOpenToAgmHire(page);
      await screenshot(hostPortrait, 'desktop-setup-portrait-talk.png');
      const talkMetric = await measureChip(hostPortrait, 'setup portrait talk', viewport.name);
      await expectReadableChip(talkMetric, { squareInline: true });
      metrics.push(talkMetric);
    }

    await openDemoDock(page, viewport);

    const expandedDock = page.locator('[data-chip-dock-state="expanded"]');
    await expect(expandedDock).toBeVisible();
    await screenshot(expandedDock, `${viewport.name}-dock-expanded-idle.png`);
    const expandedMetric = await measureChip(expandedDock.locator('.mfd-chip-dock__portrait'), 'expanded dock idle', viewport.name);
    await expectReadableChip(expandedMetric);
    await expectNoOverlap(
      expandedDock.locator('.mfd-chip-dock__portrait .mfd-chip__art-frame'),
      expandedDock.locator('.mfd-chip-dock__content'),
      `${viewport.name} expanded dock portrait does not overlap text content`,
    );
    metrics.push(expandedMetric);

    await expandedDock.getByRole('button', { name: 'Where am I?' }).click();
    await expect(expandedDock.locator('[data-chip-live-beat="chip.dock.summary"]')).toBeVisible();
    await screenshot(expandedDock, `${viewport.name}-dock-expanded-think.png`);
    const thinkMetric = await measureChip(expandedDock.locator('.mfd-chip-dock__portrait'), 'expanded dock think', viewport.name);
    await expectReadableChip(thinkMetric);
    metrics.push(thinkMetric);

    await expandedDock.getByRole('button', { name: 'Collapse Chip dock' }).click();
    const collapsedDock = page.locator('[data-chip-dock-state="collapsed"]');
    await expect(collapsedDock).toBeVisible();
    await screenshot(collapsedDock, `${viewport.name}-dock-collapsed-idle.png`);
    const collapsedMetric = await measureChip(collapsedDock, 'collapsed dock', viewport.name);
    await expectReadableChip(collapsedMetric, { squareInline: true });
    metrics.push(collapsedMetric);
  }

  await writeFile(resolve(evidenceDir, 'chip-art-metrics.json'), `${JSON.stringify(metrics, null, 2)}\n`, 'utf-8');
});

test('Chip dock signature poses stay readable on desktop and mobile', async ({ page }) => {
  await mkdir(evidenceDir, { recursive: true });
  const metrics = [];

  for (const viewport of DOCK_SIGNATURE_VIEWPORTS) {
    await openDemoDock(page, viewport);
    const expandedDock = page.locator('[data-chip-dock-state="expanded"]');
    await expect(expandedDock).toBeVisible();
    await expandedDock.getByRole('button', { name: 'Where am I?' }).click();
    await expect(expandedDock.locator('[data-chip-live-beat="chip.dock.summary"]')).toBeVisible();

    for (const poseCase of DOCK_SIGNATURE_POSES) {
      await setDockSignaturePose(page, poseCase);
      await screenshot(expandedDock, `${viewport.name}-dock-signature-${poseCase.pose}.png`);

      const metric = await measureChip(
        expandedDock.locator('.mfd-chip-dock__portrait'),
        `signature dock ${poseCase.pose}`,
        viewport.name,
      );
      await expectReadableChip(metric);

      const layout = await inspectDockLayout(page, `${viewport.name} ${poseCase.pose}`);
      expect(layout.text.bubble, `${viewport.name} ${poseCase.pose} dialogue text`).toBe(poseCase.text);
      expect(layout.text.nameplate, `${viewport.name} ${poseCase.pose} nameplate text`).toContain('CHIP');
      expect(layout.overlaps.portraitContent, `${viewport.name} ${poseCase.pose} portrait/content overlap`).toBe(false);
      expect(layout.overlaps.nameplateContent, `${viewport.name} ${poseCase.pose} nameplate/content overlap`).toBe(false);
      expect(layout.overlaps.bubbleControls, `${viewport.name} ${poseCase.pose} bubble/control overlap`).toBe(false);
      expect(layout.overlaps.pendingBadgeBubble, `${viewport.name} ${poseCase.pose} pending badge/bubble overlap`).toBe(false);
      expect(layout.overlaps.pendingBadgeControls, `${viewport.name} ${poseCase.pose} pending badge/control overlap`).toBe(false);

      metrics.push({
        ...metric,
        profile: poseCase.profile,
        visibleText: layout.text,
        boxes: layout.boxes,
      });
    }
  }

  await writeFile(
    resolve(evidenceDir, 'chip-dock-signature-pose-metrics.json'),
    `${JSON.stringify(metrics, null, 2)}\n`,
    'utf-8',
  );
});
