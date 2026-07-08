async (page) => {
  const evidenceDir = '/Users/tkevinbigham/Documents/GitHub/MFD-clean-chip-recovery/.codex/MFD/evidence/release-candidate-lockin-20260505-175132';
  const downloadPath = `${evidenceDir}/dev-exported-week2.mfd`;
  const notes = [];

  async function bodyText() {
    return page.locator('body').innerText({ timeout: 10000 });
  }

  async function go(route) {
    await page.goto(`http://localhost:5173/MFD/#${route}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);
    await page.waitForTimeout(500);
    notes.push(`navigated ${route}`);
  }

  async function skipBootIfNeeded() {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const text = await bodyText().catch(() => '');
      if (/Start Dynasty|Continue Latest Autosave|Mr\. Football Dynasty/i.test(text) && !/Initializing engine core/i.test(text)) return;
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }
  }

  async function ensureDynastyLoaded(label) {
    await skipBootIfNeeded();
    const continueButton = page.getByRole('button', { name: /Continue Latest Autosave/i });
    if (await continueButton.isVisible().catch(() => false)) {
      await continueButton.click({ timeout: 10000 });
      await page.waitForTimeout(1200);
      notes.push(`loaded latest autosave before ${label}`);
    }
  }

  await go('/dynasty');
  await ensureDynastyLoaded('manual save check');
  await go('/dynasty');
  await page.getByRole('button', { name: 'Create Save Slot' }).click({ timeout: 10000 });
  notes.push('created manual save slot');
  await page.waitForTimeout(700);

  const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
  await page.getByRole('button', { name: 'Download .mfd' }).click({ timeout: 10000 });
  const download = await downloadPromise;
  await download.saveAs(downloadPath);
  notes.push(`downloaded export to ${downloadPath}`);

  await page.getByLabel('Paste backup code').fill('not a valid dynasty cartridge');
  await page.getByRole('button', { name: 'Import Backup Code' }).click({ timeout: 10000 });
  await page.waitForTimeout(400);
  const badImportText = await bodyText();
  const badImportSafe = /Could not decode cartridge|Check that you pasted the full string|Invalid cartridge JSON|Import failed|Save data/i.test(badImportText);
  notes.push(`bad import safe error visible: ${badImportSafe}`);

  await page.locator('input[type="file"]').setInputFiles(downloadPath);
  await page.waitForTimeout(900);
  const importText = await bodyText();
  const importLoaded = /Imported dynasty loaded|Season 2026|Week 2|WK 02/i.test(importText);
  notes.push(`valid import file loaded: ${importLoaded}`);

  await page.reload();
  await page.waitForTimeout(1500);
  await skipBootIfNeeded();
  const recoveryText = await bodyText();
  const continueButtonVisible = await page.getByRole('button', { name: /Continue Latest Autosave/i }).isVisible().catch(() => false);
  if (continueButtonVisible) {
    await page.getByRole('button', { name: /Continue Latest Autosave/i }).click({ timeout: 10000 });
    await page.waitForTimeout(1000);
    notes.push('loaded latest autosave after reload');
  } else {
    notes.push('continue latest autosave was not visible after reload');
  }

  const loadedAfterReloadText = await bodyText();
  const loadedAfterReload = /WK 02|Week 2|Season 2026/i.test(loadedAfterReloadText)
    && /New York Concrete Jungle Cabbies|NYC/i.test(loadedAfterReloadText);
  notes.push(`week/team survived reload load: ${loadedAfterReload}`);

  await go('/dynasty');
  const rowText = await bodyText();
  const manualSlotVisible = /Local Save Slots[\s\S]*MANUAL|S2026 W2|S2026W2/i.test(rowText);
  const manualSlotTarget = page.getByText(/New York Concrete Jungle Cabbies\s*\/\/\s*S2026 W2/i).first();
  if (await manualSlotTarget.isVisible().catch(() => false)) {
    await manualSlotTarget.click({ timeout: 10000 });
    await page.getByRole('button', { name: 'Load Selected' }).click({ timeout: 10000 });
    await page.getByRole('button', { name: /^Load$/ }).click({ timeout: 10000 });
    await page.waitForTimeout(700);
    notes.push('loaded selected manual save slot');
  } else {
    notes.push('manual save row target not found for click');
  }
  const manualLoadText = await bodyText();
  const manualLoadOk = /Save slot loaded|Season 2026|Week 2|WK 02/i.test(manualLoadText);

  await go('/settings');
  const settingsText = await bodyText();
  const settingsOk = /Settings|Autosave|Sim Speed|Halftime Hell/i.test(settingsText);

  const chipControls = ['Where am I?', 'What now?', 'Replay', 'Snooze', 'Enable'];
  const chipControlResults = {};
  for (const label of chipControls) {
    const locator = page.getByRole('button', { name: label }).first();
    const visible = await locator.isVisible().catch(() => false);
    chipControlResults[label] = visible;
    if (visible) {
      await locator.click({ timeout: 10000 });
      await page.waitForTimeout(250);
    }
  }
  const chipTextAfterControls = await bodyText();
  const chipControlsOk = Object.values(chipControlResults).every(Boolean)
    && /Chip|DYNASTY DESK|Where am I\?|What now\?|Snooze|Enable/i.test(chipTextAfterControls);

  return {
    notes,
    downloadPath,
    exportSuggestedFilename: download.suggestedFilename(),
    badImportSafe,
    importLoaded,
    continueButtonVisible,
    loadedAfterReload,
    manualSlotVisible,
    manualLoadOk,
    settingsOk,
    chipControlResults,
    chipControlsOk,
    finalUrl: page.url(),
    finalSample: chipTextAfterControls.slice(0, 2200),
  };
}
