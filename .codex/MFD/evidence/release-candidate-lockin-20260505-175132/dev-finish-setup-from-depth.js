async (page) => {
  const notes = [];

  async function clickButton(name, wait = 300) {
    await page.getByRole('button', { name }).click({ timeout: 10000 });
    notes.push(`clicked button: ${name}`);
    await page.waitForTimeout(wait);
  }

  async function clickFirstButton(name, wait = 300) {
    await page.getByRole('button', { name }).first().click({ timeout: 10000 });
    notes.push(`clicked first button: ${name}`);
    await page.waitForTimeout(wait);
  }

  async function clickSpotlight(id, wait = 300) {
    await page.locator(`[data-spotlight-target="${id}"]`).first().click({ timeout: 10000 });
    notes.push(`clicked spotlight: ${id}`);
    await page.waitForTimeout(wait);
  }

  await page.getByRole('button', { name: /Best Players/s }).click({ timeout: 10000 });
  notes.push('selected depth philosophy');
  await page.waitForTimeout(300);
  await clickButton(/^Next$/);

  await clickSpotlight('wizard.cap-strategy.confirm');
  await clickButton(/^Next$/);

  await clickSpotlight('wizard.goals.confirm');
  await clickSpotlight('wizard.goals.confirm');
  await clickSpotlight('wizard.goals.confirm');
  await clickSpotlight('wizard.culture.confirm');
  await clickButton(/^Next$/);

  await clickButton(/^START WEEK 1$/, 1500);
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);

  const bodyText = await page.locator('body').innerText({ timeout: 10000 });
  return {
    notes,
    url: page.url(),
    chipVisible: /Chip|DYNASTY DESK|What now\?|Where am I\?/i.test(bodyText),
    briefingVisible: /Monday Briefing|Week 1/i.test(bodyText),
    bodyTextSample: bodyText.slice(0, 2200),
  };
}
