async (page) => {
  const consoleEntries = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      consoleEntries.push(`${message.type()}: ${message.text()}`);
    }
  });

  async function bodyText() {
    return page.locator('body').innerText({ timeout: 10000 });
  }

  async function go(route) {
    await page.goto(`http://localhost:5173/MFD/#${route}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);
    await page.waitForTimeout(700);
  }

  async function loadLatestAutosaveIfNeeded() {
    await go('/dynasty');
    const continueButton = page.getByRole('button', { name: /Continue Latest Autosave/i });
    if (await continueButton.isVisible().catch(() => false)) {
      await continueButton.click({ timeout: 10000 });
      await page.waitForTimeout(1200);
    }
  }

  async function currentWeek() {
    const text = await bodyText();
    const match = text.match(/\bWK\s*0?(\d{1,2})\b/i) ?? text.match(/\bWeek\s+(\d{1,2})\b/i);
    return match ? Number(match[1]) : null;
  }

  async function clickIfVisible(name) {
    const button = page.getByRole('button', { name }).first();
    if (await button.isVisible().catch(() => false)) {
      const clicked = await button.click({ timeout: 3000 }).then(() => true).catch(() => false);
      if (!clicked) return false;
      await page.waitForTimeout(700);
      return true;
    }
    return false;
  }

  async function clearHalftimeOrModal() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const clicked = await clickIfVisible(/^Switch$/i)
        || await clickIfVisible(/^Stick$/i)
        || await clickIfVisible(/^Gamble$/i)
        || await clickIfVisible(/^Continue$/i)
        || await clickIfVisible(/^Close$/i)
        || await clickIfVisible(/^Hide$/i);
      if (!clicked) return;
      await page.waitForTimeout(1200);
    }
  }

  await page.setViewportSize({ width: 1366, height: 900 });
  await loadLatestAutosaveIfNeeded();

  const weeks = [];
  for (let step = 0; step < 8; step += 1) {
    await clearHalftimeOrModal();
    await go('/game-plan');
    await clearHalftimeOrModal();
    const before = await currentWeek();
    await clickIfVisible(/Save Weekly Prep & Sim/i);
    await clearHalftimeOrModal();

    await go('/week-advance');
    await clickIfVisible(/Advance To Week/i);
    await clearHalftimeOrModal();
    await page.waitForTimeout(1800);
    await clearHalftimeOrModal();
    const after = await currentWeek();
    const text = await bodyText();
    weeks.push({
      before,
      after,
      url: page.url(),
      sample: text.replace(/\s+/g, ' ').slice(0, 320),
      chipVisible: /DYNASTY DESK\s*\/\/\s*CHIP|Where am I\?|What now\?/i.test(text),
      errorVisible: /Something went wrong|Cannot read properties|Unhandled Runtime Error/i.test(text),
    });
    if (after !== null && before !== null && after <= before) break;
    if (after !== null && after >= 9) break;
  }

  const laterRoutes = ['/', '/roster', '/depth-chart', '/game-plan', '/week-advance', '/trades', '/cap-lab', '/settings', '/dynasty', '/standings', '/power-rankings', '/league-pulse'];
  const routeSamples = [];
  for (const route of laterRoutes) {
    await go(route);
    const text = await bodyText();
    routeSamples.push({
      route,
      sample: text.replace(/\s+/g, ' ').slice(0, 260),
      errorVisible: /Something went wrong|Cannot read properties|Unhandled Runtime Error/i.test(text),
      chipVisible: /DYNASTY DESK\s*\/\/\s*CHIP|Where am I\?|What now\?/i.test(text),
    });
  }

  return {
    weeks,
    finalWeek: weeks.at(-1)?.after ?? null,
    advancedCount: weeks.filter((week) => week.before !== null && week.after !== null && week.after > week.before).length,
    routeSamples,
    routeErrors: routeSamples.filter((route) => route.errorVisible),
    chipRouteCount: routeSamples.filter((route) => route.chipVisible).length,
    consoleEntries,
    consoleErrorCount: consoleEntries.filter((entry) => entry.startsWith('error:')).length,
    finalUrl: page.url(),
  };
}
