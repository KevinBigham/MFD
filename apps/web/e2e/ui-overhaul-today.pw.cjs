/**
 * Today geometry — the LAY-04 / LAY-06 acceptance capture.
 *
 * WHY THIS EXISTS SEPARATELY FROM THE BASELINE HARNESS.
 * `ui-overhaul-baseline.pw.cjs` seeds its state by clicking "Launch Demo
 * Scenario", which builds a dynasty from `Date.now()`
 * (`apps/web/src/app/NewGameScreen.tsx:211,229`). WP-00 measured the
 * consequence: two runs of identical code produced Briefing heights up to
 * 93 px apart. That is fine for a magnitude — the legacy Briefing is 14
 * viewports tall and nobody needs three significant figures to see the problem
 * — but it is useless for a pass/fail budget. A 2.5-viewport ceiling judged
 * against a number that drifts by a tenth of a viewport on its own is a gate
 * that flickers.
 *
 * So this harness pins the clock before the app boots. `Date.now` is frozen to
 * a constant, which makes the demo seed a constant, which makes the dynasty a
 * constant. Nothing in the product changes; the non-determinism is neutralised
 * at its single source. The capture asserts that pinning worked by running the
 * whole matrix twice and requiring identical geometry.
 *
 * Run:
 *   pnpm --filter @mfd/web exec playwright test ui-overhaul-today
 *
 * Output:
 *   docs/ui-overhaul/evidence/today/geometry.json
 *   docs/ui-overhaul/evidence/today/*.png
 */

const { expect, test } = require('@playwright/test');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const evidenceDir = resolve(
  __dirname,
  process.env.MFD_UI_TODAY_DIR ?? '../../../docs/ui-overhaul/evidence/today',
);

/** Any fixed instant works; this one is pinned so the number is quotable. */
const PINNED_NOW = 1_767_225_600_000; // 2026-01-01T00:00:00Z

/** doc 09's matrix, trimmed to the classes the Today budget is specified at. */
const VIEWPORTS = [
  { name: 'phone-320x568', width: 320, height: 568, class: 'phone-portrait' },
  { name: 'phone-390x844', width: 390, height: 844, class: 'phone-portrait' },
  { name: 'phone-430x932', width: 430, height: 932, class: 'phone-portrait' },
  { name: 'landscape-844x390', width: 844, height: 390, class: 'phone-landscape' },
  { name: 'tablet-768x1024', width: 768, height: 1024, class: 'tablet' },
  { name: 'desktop-1440x900', width: 1440, height: 900, class: 'desktop' },
];

const SCREENSHOT_VIEWPORTS = new Set(['phone-390x844', 'desktop-1440x900']);

/**
 * LAY-04, verbatim from doc 09: "Today default ≤2.5 viewports at 390×844;
 * current baseline 14.0 — measured scroll height ≤2,110 px before optional
 * expansion."
 *
 * The metric is the *content region's* scroll height, not the document's.
 * `AppFrame` is a fixed-height grid, so the document never scrolls and
 * `document.scrollHeight / innerHeight` is 1.0 no matter how much content the
 * screen holds. Asserting on that number would pass at any depth — it measures
 * that the frame exists, not that Today is bounded.
 */
const TODAY_SCROLL_BUDGET_PX = 2110;
const TODAY_BUDGET_VIEWPORT = 'phone-390x844';

/**
 * The legacy Briefing at the same viewports, from the committed WP-00
 * baseline. Today is compared against real measured numbers rather than
 * against itself.
 */
const LEGACY_BRIEFING_SCROLL_PX = {
  'phone-320x568': 13449,
  'phone-390x844': 11945,
  'phone-430x932': 11590,
  'landscape-844x390': 7416,
  'tablet-768x1024': 7396,
  'desktop-1440x900': 6273,
};

/**
 * LAY-06, verbatim: "Phone shell fixed chrome envelope ≤152 px plus safe area
 * when no modal — geometry assertion; action dock accounted separately without
 * overlap." So the envelope and the dock are two numbers, not one sum, and
 * both are asserted. The legacy shell measures 383–429 px on phone for the
 * envelope alone.
 */
const SHELL_CHROME_BUDGET = 152;

/**
 * The dock's own bound. Not in doc 09 — the criterion only says the dock is
 * accounted separately — so this is set to the nominal phone primary action
 * (48 px) plus its reason line and padding, and it is here so a dock that
 * grows silently fails rather than hiding inside "accounted separately".
 */
const DOCK_BUDGET = 152;

/** TOUCH-01 floor. */
const MIN_TARGET = 44;

async function bootPinned(page) {
  // Before any application code runs: freeze the clock, and opt this profile
  // into the new shell through the same localStorage channel the preference
  // toggle writes to.
  await page.addInitScript(
    ({ now, preferences }) => {
      const OriginalDate = Date;
      // eslint-disable-next-line no-global-assign
      Date = class extends OriginalDate {
        constructor(...args) {
          super(...(args.length ? args : [now]));
        }
        static now() {
          return now;
        }
      };
      window.localStorage.setItem('mfd-ui-preferences', preferences);
      window.localStorage.setItem('mfd-boot-seen', 'true');
    },
    {
      now: PINNED_NOW,
      preferences: JSON.stringify({ state: { uiOverhaulMode: 'v2' }, version: 0 }),
    },
  );

  await page.goto('/');
  await page.evaluate(async () => {
    await new Promise((done) => {
      const request = indexedDB.deleteDatabase('mfd');
      request.onsuccess = () => done();
      request.onerror = () => done();
      request.onblocked = () => done();
    });
  });
  await page.reload();
  await page.getByRole('button', { name: 'Launch Demo Scenario' }).click();
  await expect(page.locator('#root')).not.toBeEmpty();
}

/**
 * Waits for the DOM to stop changing rather than for a fixed delay.
 *
 * A `waitForTimeout` is a guess, and the first run of this harness caught the
 * consequence: with a 400ms wait the second pass measured four more text
 * elements at 844×390 than the first, because a warm cache let a lazy chunk
 * land inside the window. The repeat-run equality assertion is only meaningful
 * if both passes measure a settled screen.
 */
async function settle(page, { quietMs = 250, timeoutMs = 15_000 } = {}) {
  const started = Date.now();
  let previous = null;

  for (;;) {
    const signature = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll('*')].filter(
        (el) => el.children.length === 0 && (el.textContent ?? '').trim().length > 0,
      );
      return `${nodes.length}:${document.documentElement.scrollHeight}:${document.body.innerText.length}`;
    });

    if (signature === previous) return;
    previous = signature;

    if (Date.now() - started > timeoutMs) {
      throw new Error(`Today did not settle within ${timeoutMs}ms (last signature ${signature})`);
    }
    await page.waitForTimeout(quietMs);
  }
}

/**
 * Runs in page context. Mirrors `collectGeometry` in the baseline harness so
 * the two files are directly comparable, plus the Today-specific counts.
 */
function collectTodayGeometry() {
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
    el.matches('a[href], button, input, select, textarea, summary, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])'),
  );

  const smallTargets = interactive
    .filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
    })
    .map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        text: (el.textContent ?? '').trim().slice(0, 40),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    });

  const textElements = visible.filter(
    (el) => el.children.length === 0 && (el.textContent ?? '').trim().length > 0,
  );
  const smallText = textElements.filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12);

  // The one scroller the archetype allows, and what it actually contains.
  const content = document.getElementById('mfd-v2-content');
  const screen = document.querySelector('[data-mfd-v2-screen="today"]');

  /**
   * Permanent chrome is everything the frame keeps out of the scroller — not
   * the sum of `position: fixed | sticky` elements.
   *
   * `AppFrame` is a three-row grid. Its header row is `position: relative` and
   * only the dock is sticky, so a fixed/sticky sum reported the header as
   * zero: adding `min-height: 320px` to the Today header left the number
   * unchanged at 89px while the content region collapsed to 64px at 844×390.
   * The gate said "in budget" for a screen showing one line of Today.
   *
   * LAY-06 accounts the action dock separately from the shell envelope, so
   * both numbers are recorded and asserted separately.
   */
  const dockNode = document.querySelector('[data-mfd-v2-action-dock="true"]');
  const dockHeight = dockNode ? Math.round(dockNode.getBoundingClientRect().height) : 0;
  const permanentChrome = content ? Math.round(viewportHeight - content.clientHeight) : 0;

  return {
    viewport: { width: viewportWidth, height: viewportHeight },
    document: { scrollWidth: doc.scrollWidth, scrollHeight: doc.scrollHeight },
    content: content
      ? {
        clientHeight: Math.round(content.clientHeight),
        scrollHeight: Math.round(content.scrollHeight),
        viewportsOfScroll: Number((content.scrollHeight / viewportHeight).toFixed(3)),
      }
      : null,
    viewportsOfScroll: Number((doc.scrollHeight / viewportHeight).toFixed(3)),
    horizontalOverflow: doc.scrollWidth > viewportWidth + 1,
    scrollContainerCount: scrollContainers.length,
    stickyOrFixed,
    permanentChrome,
    dockHeight,
    /** LAY-06's envelope: permanent chrome minus the separately-accounted dock. */
    shellChrome: permanentChrome - dockHeight,
    interactiveCount: interactive.length,
    smallTargetCount: smallTargets.length,
    smallTargets,
    visibleTextCount: textElements.length,
    smallTextCount: smallText.length,
    bodyFontSize: parseFloat(getComputedStyle(document.body).fontSize),
    readiness: screen ? screen.getAttribute('data-mfd-v2-readiness') : null,
    layoutMode: doc.dataset.mfdV2Mode ?? null,
    compactHeight: doc.dataset.mfdV2CompactHeight ?? null,
    taskRowCount: document.querySelectorAll('[data-mfd-v2-task]').length,
    openDisclosures: document.querySelectorAll('details[open]').length,
  };
}

async function captureMatrix(page, { screenshots }) {
  const captures = [];
  const expandedCounts = {};

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await bootPinned(page);

    await page.evaluate(() => {
      window.location.hash = '/today';
    });
    await expect(page.locator('[data-mfd-v2-screen="today"]')).toBeVisible();
    await settle(page);

    const geometry = await page.evaluate(collectTodayGeometry);
    captures.push({ ...geometry, viewport: viewport.name, viewportClass: viewport.class });

    if (screenshots && SCREENSHOT_VIEWPORTS.has(viewport.name)) {
      // The pointer is still where the demo button was clicked, which leaves a
      // task row in its hover state and puts a stray underline in the evidence.
      await page.mouse.move(0, 0);
      await page.screenshot({
        path: resolve(evidenceDir, `today--${viewport.name}.png`),
        fullPage: false,
        animations: 'disabled',
      });

      // The expanded state, so the evidence shows what the disclosures hold —
      // including the merged tasks the deduper collapsed — rather than only
      // the bounded default the budget is measured against.
      const expanded = await page.evaluate(() => {
        const nodes = [...document.querySelectorAll('details')];
        for (const node of nodes) node.open = true;
        return nodes.length;
      });
      await settle(page);
      await page.screenshot({
        path: resolve(evidenceDir, `today-expanded--${viewport.name}.png`),
        fullPage: false,
        animations: 'disabled',
      });
      expandedCounts[viewport.name] = expanded;

      for (const node of await page.locator('details').all()) {
        await node.evaluate((element) => { element.open = false; });
      }
      await settle(page);
    }
  }

  return { captures, expandedCounts };
}

/** Everything except the wall-clock-free geometry, for the repeat-run diff. */
function comparable(captures) {
  return captures.map((capture) => ({
    viewport: capture.viewport,
    scrollHeight: capture.document.scrollHeight,
    viewportsOfScroll: capture.viewportsOfScroll,
    contentScrollHeight: capture.content.scrollHeight,
    contentClientHeight: capture.content.clientHeight,
    permanentChrome: capture.permanentChrome,
    shellChrome: capture.shellChrome,
    dockHeight: capture.dockHeight,
    interactiveCount: capture.interactiveCount,
    smallTargetCount: capture.smallTargetCount,
    visibleTextCount: capture.visibleTextCount,
    smallTextCount: capture.smallTextCount,
    taskRowCount: capture.taskRowCount,
    readiness: capture.readiness,
  }));
}

test.describe('Today geometry', () => {
  test('holds the LAY-04 budget on pinned state, twice', async ({ page }) => {
    test.setTimeout(600_000);
    await mkdir(evidenceDir, { recursive: true });

    const { captures: first, expandedCounts } = await captureMatrix(page, { screenshots: true });
    const { captures: second } = await captureMatrix(page, { screenshots: false });

    // The reason this harness exists: the same code measured twice must give
    // the same numbers. If this fails, the state is not pinned and no budget
    // assertion below means anything.
    expect(comparable(second)).toEqual(comparable(first));

    await writeFile(
      resolve(evidenceDir, 'geometry.json'),
      `${JSON.stringify({
        shell: 'v2',
        screen: 'today',
        pinnedNow: PINNED_NOW,
        seedSource: 'Date.now frozen before app boot; demo scenario seed is derived from it',
        budgets: {
          contentScrollPx: TODAY_SCROLL_BUDGET_PX,
          budgetViewport: TODAY_BUDGET_VIEWPORT,
          shellChromePx: SHELL_CHROME_BUDGET,
          dockPx: DOCK_BUDGET,
          minTargetPx: MIN_TARGET,
        },
        legacyBriefingScrollPx: LEGACY_BRIEFING_SCROLL_PX,
        repeatRunIdentical: true,
        disclosuresPerViewport: expandedCounts,
        captures: first,
      }, null, 2)}\n`,
      'utf8',
    );

    // LAY-04, at the viewport the criterion names.
    const budgetCapture = first.find((capture) => capture.viewport === TODAY_BUDGET_VIEWPORT);
    expect(budgetCapture.content.scrollHeight, 'LAY-04 default Today scroll height at 390x844')
      .toBeLessThanOrEqual(TODAY_SCROLL_BUDGET_PX);
    expect(budgetCapture.openDisclosures, 'LAY-04 measures unexpanded content').toBe(0);

    for (const capture of first) {
      // Measured as viewport minus scroller, so a header that grows is caught.
      expect(capture.shellChrome, `${capture.viewport} shell chrome envelope`)
        .toBeLessThanOrEqual(SHELL_CHROME_BUDGET);
      expect(capture.dockHeight, `${capture.viewport} action dock`)
        .toBeLessThanOrEqual(DOCK_BUDGET);
      expect(capture.permanentChrome, `${capture.viewport} chrome accounting`)
        .toBe(capture.shellChrome + capture.dockHeight);
      expect(capture.horizontalOverflow, `${capture.viewport} horizontal overflow`).toBe(false);
      expect(capture.smallTargets, `${capture.viewport} sub-44px targets`).toEqual([]);
      expect(capture.smallTextCount, `${capture.viewport} sub-12px text`).toBe(0);

      // One scroll owner is the archetype's hard rule. The document must not be
      // the second one, which is what the `body` margin reset in `a11y.css`
      // prevents.
      expect(capture.scrollContainerCount, `${capture.viewport} scroll owners`).toBe(1);
      expect(capture.viewportsOfScroll, `${capture.viewport} document scroll`).toBe(1);

      // Every viewport, not just the criterion's: Today must be a large
      // multiple smaller than the surface it replaces, measured against the
      // committed legacy baseline rather than against itself.
      const legacy = LEGACY_BRIEFING_SCROLL_PX[capture.viewport];
      expect(legacy, `${capture.viewport} missing from the legacy baseline`).toBeGreaterThan(0);
      expect(capture.content.scrollHeight * 3, `${capture.viewport} vs legacy Briefing`)
        .toBeLessThan(legacy);
    }

    const phone = first.find((capture) => capture.viewport === 'phone-390x844');
    expect(phone.layoutMode).toBe('compact');
    expect(phone.compactHeight).toBe('false');

    const landscape = first.find((capture) => capture.viewport === 'landscape-844x390');
    expect(landscape.layoutMode).toBe('medium');
    expect(landscape.compactHeight).toBe('true');
  });
});
