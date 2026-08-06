/**
 * WP-00 — legacy shell geometry baseline.
 *
 * Captures the doc-09 viewport matrix against the CURRENT (legacy) shell so
 * later packets diff numbers rather than impressions. This spec must keep
 * passing unchanged for the whole migration: it is the "before" side of every
 * LAY-/READ-/TOUCH- acceptance criterion.
 *
 * KNOWN VARIANCE — read before asserting on these numbers.
 * The bootstrap clicks "Launch Demo Scenario", which seeds a fresh dynasty from
 * `Date.now()` (`apps/web/src/app/NewGameScreen.tsx`). Every run therefore gets
 * different players, and the Briefing — which renders names and generated prose
 * — varies by up to ~100 px between two runs of identical code. Measured across
 * repeat runs: `briefing` moves, `roster` / `contracts` / `settings` do not.
 *
 * Consequence: Briefing heights here are a magnitude, not a fixture. Any
 * pass/fail acceptance assertion (LAY-04's 2.5-viewport Today budget above all)
 * must load a pinned fixture from `src/ui/test/fixtures/ui-overhaul-fixtures.ts`
 * instead of clicking the demo button.
 *
 * Run:
 *   pnpm --filter @mfd/web exec playwright test ui-overhaul-baseline
 *
 * Output:
 *   docs/ui-overhaul/evidence/baseline-legacy/geometry.json
 *   docs/ui-overhaul/evidence/baseline-legacy/*.png
 */

const { expect, test } = require('@playwright/test');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const evidenceDir = resolve(
  __dirname,
  process.env.MFD_UI_BASELINE_DIR ?? '../../../docs/ui-overhaul/evidence/baseline-legacy',
);

// doc 09 — required viewport matrix.
const VIEWPORTS = [
  { name: 'phone-320x568', width: 320, height: 568, class: 'phone-portrait' },
  { name: 'phone-360x800', width: 360, height: 800, class: 'phone-portrait' },
  { name: 'phone-390x844', width: 390, height: 844, class: 'phone-portrait' },
  { name: 'phone-430x932', width: 430, height: 932, class: 'phone-portrait' },
  { name: 'landscape-667x375', width: 667, height: 375, class: 'phone-landscape' },
  { name: 'landscape-844x390', width: 844, height: 390, class: 'phone-landscape' },
  { name: 'landscape-932x430', width: 932, height: 430, class: 'phone-landscape' },
  { name: 'tablet-768x1024', width: 768, height: 1024, class: 'tablet' },
  { name: 'tablet-1024x768', width: 1024, height: 768, class: 'tablet' },
  { name: 'desktop-1280x720', width: 1280, height: 720, class: 'desktop' },
  { name: 'desktop-1440x900', width: 1440, height: 900, class: 'desktop' },
  { name: 'desktop-1600x1000', width: 1600, height: 1000, class: 'desktop' },
];

// The four surfaces the audit measured, so this baseline is directly comparable
// to BASELINE_MEASUREMENTS.json.
const ROUTES = [
  { name: 'briefing', hash: '#/' },
  { name: 'roster', hash: '#/roster' },
  { name: 'contracts', hash: '#/contracts' },
  { name: 'settings', hash: '#/settings' },
];

const SCREENSHOT_VIEWPORTS = new Set(['phone-390x844', 'desktop-1440x900']);

async function resetBrowserState(page) {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('mfd-boot-seen', 'true');
    await new Promise((done) => {
      const request = indexedDB.deleteDatabase('mfd');
      request.onsuccess = () => done();
      request.onerror = () => done();
      request.onblocked = () => done();
    });
  });
  await page.reload();
}

/** Runs in page context. Mirrors the metrics in doc 09's "for every critical route" list. */
function collectGeometry() {
  const doc = document.documentElement;
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  const all = [...document.querySelectorAll('*')];
  const visible = all.filter((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const style = getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none';
  });

  const scrollContainers = visible.filter((el) => {
    const style = getComputedStyle(el);
    const scrolls = /(auto|scroll)/.test(style.overflowY) || /(auto|scroll)/.test(style.overflowX);
    return scrolls && el.scrollHeight > el.clientHeight + 1;
  });

  const stickyOrFixed = visible
    .filter((el) => {
      const position = getComputedStyle(el).position;
      return position === 'fixed' || position === 'sticky';
    })
    .map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        position: getComputedStyle(el).position,
        top: Math.round(rect.top),
        height: Math.round(rect.height),
      };
    });

  const interactive = visible.filter((el) =>
    el.matches('a[href], button, input, select, textarea, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])'),
  );

  const smallTargets = interactive.filter((el) => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
  });

  const textElements = visible.filter(
    (el) => el.children.length === 0 && (el.textContent ?? '').trim().length > 0,
  );

  const smallText = textElements.filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12);

  const borderedElements = visible.filter((el) => {
    const style = getComputedStyle(el);
    return parseFloat(style.borderTopWidth) > 0 || parseFloat(style.borderLeftWidth) > 0;
  });

  return {
    viewport: { width: viewportWidth, height: viewportHeight },
    document: { scrollWidth: doc.scrollWidth, scrollHeight: doc.scrollHeight },
    viewportsOfScroll: Number((doc.scrollHeight / viewportHeight).toFixed(2)),
    horizontalOverflow: doc.scrollWidth > viewportWidth + 1,
    scrollContainerCount: scrollContainers.length,
    stickyOrFixed,
    fixedChromeHeight: stickyOrFixed.reduce((sum, el) => sum + el.height, 0),
    interactiveCount: interactive.length,
    smallTargetCount: smallTargets.length,
    visibleTextCount: textElements.length,
    smallTextCount: smallText.length,
    borderedElementCount: borderedElements.length,
    bodyFontSize: parseFloat(getComputedStyle(document.body).fontSize),
  };
}

test.describe('WP-00 legacy shell baseline', () => {
  test('captures the doc-09 viewport matrix for the legacy shell', async ({ page }) => {
    test.setTimeout(600_000);
    await mkdir(evidenceDir, { recursive: true });

    const captures = [];

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await resetBrowserState(page);
      await page.getByRole('button', { name: 'Launch Demo Scenario' }).click();
      await expect(page.locator('#root')).not.toBeEmpty();

      for (const route of ROUTES) {
        await page.evaluate((hash) => {
          window.location.hash = hash.slice(1);
        }, route.hash);
        await page.waitForTimeout(600);

        const geometry = await page.evaluate(collectGeometry);
        captures.push({
          ...geometry,
          viewport: viewport.name,
          viewportClass: viewport.class,
          measuredViewport: geometry.viewport,
          route: route.name,
        });

        if (SCREENSHOT_VIEWPORTS.has(viewport.name)) {
          await page.screenshot({
            path: resolve(evidenceDir, `${route.name}--${viewport.name}.png`),
            fullPage: false,
            animations: 'disabled',
          });
        }
      }
    }

    await writeFile(
      resolve(evidenceDir, 'geometry.json'),
      `${JSON.stringify({ shell: 'legacy', capturedAt: null, captures }, null, 2)}\n`,
      'utf8',
    );

    // Sanity: the capture ran everywhere, and it reproduces the audit's core
    // finding that the phone Briefing is many viewports tall.
    expect(captures).toHaveLength(VIEWPORTS.length * ROUTES.length);

    const phoneBriefing = captures.find(
      (capture) => capture.viewport === 'phone-390x844' && capture.route === 'briefing',
    );
    expect(phoneBriefing).toBeTruthy();
    expect(phoneBriefing.viewportsOfScroll).toBeGreaterThan(2.5);
  });
});
