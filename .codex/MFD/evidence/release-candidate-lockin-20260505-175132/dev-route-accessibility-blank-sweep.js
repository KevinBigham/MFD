async (page) => {
  const routes = [
    '/',
    '/roster',
    '/depth-chart',
    '/game-plan',
    '/week-advance',
    '/trades',
    '/cap-lab',
    '/settings',
    '/dynasty',
    '/inbox',
    '/league-pulse',
    '/news',
    '/standings',
    '/power-rankings',
    '/scouting',
    '/draft',
  ];
  const consoleEntries = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      consoleEntries.push(`${message.type()}: ${message.text()}`);
    }
  });

  async function loadLatestAutosaveIfNeeded() {
    await page.goto('http://localhost:5173/MFD/#/dynasty');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);
    await page.waitForTimeout(700);
    const continueButton = page.getByRole('button', { name: /Continue Latest Autosave/i });
    if (await continueButton.isVisible().catch(() => false)) {
      await continueButton.click({ timeout: 10000 });
      await page.waitForTimeout(1200);
    }
  }

  async function inspectRoute(route, viewport) {
    await page.setViewportSize(viewport);
    await page.goto(`http://localhost:5173/MFD/#${route}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);
    await page.waitForTimeout(700);
    return page.evaluate(() => {
      const isVisible = (el) => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
      };
      const visibleButtons = Array.from(document.querySelectorAll('button')).filter(isVisible);
      const unnamedButtons = visibleButtons
        .map((button) => ({
          text: button.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          aria: button.getAttribute('aria-label') ?? '',
          title: button.getAttribute('title') ?? '',
        }))
        .filter((button) => !button.text && !button.aria && !button.title);
      const nestedInteractive = document.querySelectorAll('button button, button [role="button"], [role="button"] button').length;
      const headings = Array.from(document.querySelectorAll('h1,h2,h3,[role="heading"]'))
        .filter(isVisible)
        .map((heading) => heading.textContent?.replace(/\s+/g, ' ').trim() ?? '')
        .filter(Boolean)
        .slice(0, 4);
      const text = document.body.innerText.replace(/\s+/g, ' ').trim();
      const badBlankCopy = /\b(No data\.|undefined|null|NaN|Cannot read properties|Unhandled Runtime Error)\b/i.test(text);
      const loadingOnly = /^Loading route/i.test(text) || text.length < 80;
      const overflowX = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      return {
        url: window.location.href,
        headings,
        buttonCount: visibleButtons.length,
        unnamedButtonCount: unnamedButtons.length,
        unnamedButtons,
        nestedInteractive,
        badBlankCopy,
        loadingOnly,
        overflowX,
        sample: text.slice(0, 260),
      };
    });
  }

  await loadLatestAutosaveIfNeeded();

  const desktop = [];
  for (const route of routes) {
    desktop.push({ route, ...(await inspectRoute(route, { width: 1366, height: 900 })) });
  }

  const mobileRoutes = ['/', '/roster', '/depth-chart', '/game-plan', '/week-advance', '/trades', '/cap-lab', '/settings', '/dynasty'];
  const mobile = [];
  for (const route of mobileRoutes) {
    mobile.push({ route, ...(await inspectRoute(route, { width: 390, height: 844 })) });
  }

  const failures = [...desktop, ...mobile].filter((entry) =>
    entry.unnamedButtonCount > 0
    || entry.nestedInteractive > 0
    || entry.badBlankCopy
    || entry.loadingOnly
    || entry.overflowX > 6,
  );

  return {
    desktop,
    mobile,
    failures,
    consoleEntries,
    consoleErrorCount: consoleEntries.filter((entry) => entry.startsWith('error:')).length,
    finalUrl: page.url(),
  };
}
