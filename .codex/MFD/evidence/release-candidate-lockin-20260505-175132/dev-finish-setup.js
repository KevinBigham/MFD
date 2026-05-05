async (page) => {
  const notes = [];

  async function clickButton(name, options = {}) {
    const locator = page.getByRole('button', { name });
    await locator.click({ timeout: options.timeout ?? 10000 });
    notes.push(`clicked button: ${name}`);
    await page.waitForTimeout(options.wait ?? 250);
  }

  async function clickFirstButton(name, options = {}) {
    const locator = page.getByRole('button', { name }).first();
    await locator.click({ timeout: options.timeout ?? 10000 });
    notes.push(`clicked first button: ${name}`);
    await page.waitForTimeout(options.wait ?? 250);
  }

  async function clickSpotlight(id, options = {}) {
    const locator = page.locator(`[data-spotlight-target="${id}"]`).first();
    await locator.click({ timeout: options.timeout ?? 10000 });
    notes.push(`clicked spotlight: ${id}`);
    await page.waitForTimeout(options.wait ?? 250);
  }

  async function clickNext(options = {}) {
    await clickButton(/^Next$/, options);
  }

  await page.getByRole('button', { name: /Roster Pressure.*Open this pressure card/s }).click({ timeout: 10000 });
  notes.push('opened required roster pressure card');
  await page.waitForTimeout(250);
  await clickNext();

  await clickNext();

  await clickFirstButton(/^Hire$/);
  await clickNext();

  await clickFirstButton(/^Hire$/);
  await clickNext();

  await clickSpotlight('wizard.scheme.confirm');
  await clickSpotlight('wizard.scheme.confirm');
  await clickNext();

  await clickSpotlight('wizard.depth-chart.confirm');
  await clickNext();

  await clickSpotlight('wizard.cap-strategy.confirm');
  await clickNext();

  await clickSpotlight('wizard.goals.confirm');
  await clickSpotlight('wizard.goals.confirm');
  await clickSpotlight('wizard.goals.confirm');
  await clickSpotlight('wizard.culture.confirm');
  await clickNext();

  await clickButton(/^START WEEK 1$/, { wait: 1500 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);

  const bodyText = await page.locator('body').innerText({ timeout: 10000 });
  const chipVisible = /Chip|DYNASTY DESK|What now\?|Where am I\?/i.test(bodyText);
  const briefingVisible = /Monday Briefing|Week 1/i.test(bodyText);

  return {
    notes,
    url: page.url(),
    title: await page.title(),
    chipVisible,
    briefingVisible,
    bodyTextSample: bodyText.slice(0, 1800),
  };
}
