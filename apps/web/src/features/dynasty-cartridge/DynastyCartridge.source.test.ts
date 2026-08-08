import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

const content = readFileSync(
  new URL('./DynastyCartridge.tsx', import.meta.url),
  'utf-8',
);

function sourceSection(startMarker: string, endMarker: string): string {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker, start + startMarker.length);

  if (start < 0 || end < 0) {
    throw new Error(`Could not find source section from ${startMarker} to ${endMarker}`);
  }

  return content.slice(start, end);
}

function expectSourceOrder(source: string, markers: string[]): void {
  let previousIndex = -1;
  for (const marker of markers) {
    const index = source.indexOf(marker);
    expect(index).toBeGreaterThan(previousIndex);
    previousIndex = index;
  }
}

describe('DynastyCartridge source contracts', () => {
  it('records clipboard export receipts only after building and copying the cartridge text', () => {
    const handleExport = sourceSection(
      'const handleExport = useCallback(() => {',
      'const handleDownload = useCallback(() => {',
    );

    expectSourceOrder(handleExport, [
      'const result = buildCartridge(game, meta);',
      'navigator.clipboard.writeText(result.json).then(() => {',
      'void recordPortableExport().catch',
    ]);
    expect(handleExport).toContain('if (!navigator.clipboard?.writeText) {');
    expect(handleExport).toContain('setTransientStatus(portableCopyFallbackMessage(fileName));');
    expect(handleExport.lastIndexOf('.catch(() => {')).toBeGreaterThan(
      handleExport.indexOf('void recordPortableExport().catch'),
    );
  });

  it('records download export receipts after the pre-receipt payload is created and clicked', () => {
    const handleDownload = sourceSection(
      'const handleDownload = useCallback(() => {',
      'const handleManualSave = useCallback(async () => {',
    );

    expectSourceOrder(handleDownload, [
      'const result = buildCartridge(game, meta);',
      'const blob = new Blob([result.json], { type: \'application/json\' });',
      'anchor.click();',
      'void recordPortableExport().catch',
    ]);
  });

  it('keeps manual local save slots separate from portable export receipts', () => {
    const handleManualSave = sourceSection(
      'const handleManualSave = useCallback(async () => {',
      'const handleLoadSlot = useCallback(async (id: number) => {',
    );

    expect(handleManualSave).toContain('await saveDynastyToSlot(game, `${teamName} S${year}W${week}`);');
    expect(handleManualSave).not.toContain('recordPortableExport');
    expect(handleManualSave).not.toContain('lastPortableExportYear');
  });

  it('persists validated cartridge imports before hydrating the active game', () => {
    const handleImport = sourceSection(
      'const handleImport = useCallback(async () => {',
      'const handleImportFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {',
    );
    const handleImportFile = sourceSection(
      'const handleImportFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {',
      'const stageCombinedBackupImport = useCallback((raw: string) => {',
    );

    expectSourceOrder(handleImport, [
      'const loaded = loadImportedCartridge(importText.trim());',
      'await autosaveDynasty(loaded);',
      'loadGame(loaded);',
      'await refreshSlots();',
    ]);
    expectSourceOrder(handleImportFile, [
      'const loaded = await loadImportedCartridgeFile(file);',
      'await autosaveDynasty(loaded);',
      'loadGame(loaded);',
      'await refreshSlots();',
    ]);
  });

  it('stages combined backups for preview before any autosave, sidecar replacement, or game hydration', () => {
    const stageCombinedBackupImport = sourceSection(
      'const stageCombinedBackupImport = useCallback((raw: string) => {',
      'const confirmCombinedBackupImport = useCallback(async () => {',
    );

    expectSourceOrder(stageCombinedBackupImport, [
      'const parsed = parseDynastyCombinedBackupJson(raw);',
      'const loaded = loadImportedCartridge(parsed.cartridgeText);',
      'setPendingCombinedImport({',
    ]);
    expect(stageCombinedBackupImport).not.toContain('await autosaveDynasty');
    expect(stageCombinedBackupImport).not.toContain('importDynastySidecarArchiveJson');
    expect(stageCombinedBackupImport).not.toContain('loadGame(');
  });

  it('applies combined backups only from the explicit confirmation path', () => {
    const confirmCombinedBackupImport = sourceSection(
      'const confirmCombinedBackupImport = useCallback(async () => {',
      'const handleImportCombinedBackup = useCallback(async () => {',
    );

    expectSourceOrder(confirmCombinedBackupImport, [
      'const sidecarResult = await importCombinedBackupAtomically(loaded, sidecarPayload);',
      'loadGame(loaded);',
      'setPendingCombinedImport(null);',
      'setSidecarRevision((current) => current + 1);',
      'await refreshSlots();',
    ]);
  });

  it('keeps complete sidecar archive import separate from .mfd GameState loading', () => {
    const stageSidecarImport = sourceSection(
      'const stageSidecarImport = useCallback((raw: string) => {',
      'const handleImportSidecars = useCallback(() => {',
    );
    const confirmSidecarImport = sourceSection(
      'const confirmSidecarImport = useCallback(() => {',
      'const slotSummary = useMemo(() => slots.map((slot) => ({',
    );

    expect(stageSidecarImport).toContain('parseDynastySidecarArchiveJson(raw)');
    expect(stageSidecarImport).toContain('setPendingSidecarImport({');
    expect(stageSidecarImport).not.toContain('importDynastySidecarArchiveJson');
    expectSourceOrder(confirmSidecarImport, [
      'if (!pendingSidecarImport) return;',
      'const result = mergeDynastySidecarArchiveJson(pendingSidecarImport.raw, pendingSidecarImport.selectedDynastyIds);',
      'setPendingSidecarImport(null);',
      'setSidecarRevision((current) => current + 1);',
    ]);
    expect(confirmSidecarImport).not.toContain('loadGame(');
    expect(confirmSidecarImport).not.toContain('loadImportedCartridge');
  });

  it('labels complete sidecar archives as browser-local history outside old cartridges', () => {
    expect(content).toContain('One-Click Combined Backup');
    expect(content).toContain('DYNASTY_COMBINED_BACKUP_KIND');
    expect(content).toContain('Old .mfd import unchanged');
    expect(content).toContain('Import validates the .mfd cartridge and every sidecar payload before loading the dynasty.');
    expect(content).toContain('Preview Combined Backup');
    expect(content).toContain('Confirm Combined Import');
    expect(content).toContain('Complete Dynasty Sidecars');
    expect(content).toContain('Hall of Fame archive');
    expect(content).toContain('scrapbook and playoff-lore buckets');
    expect(content).toContain('Rookie of the Year history');
    expect(content).toContain('roster-continuity snapshots');
    expect(content).toContain('GM career meta');
    expect(content).toContain('derived rivalry heat from mfd.rivalries.v1');
    expect(content).toContain('Older archives that do not carry rivalry heat leave the existing local rivalry store untouched.');
    expect(content).toContain('It does not load a save slot, write GameState');
    expect(content).toContain('change old .mfd import compatibility');
    expect(content).toContain('Classic .mfd import/export is current-save-only');
  });
});
