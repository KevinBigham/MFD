import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';

describe('NewGameScreen', () => {
  const content = readFileSync(new URL('./NewGameScreen.tsx', import.meta.url), 'utf-8');

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

  it('has autosave error state for corrupted saves', () => {
    expect(content).toContain('autosaveError');
    expect(content).toContain('setAutosaveError');
    expect(content).toContain('corrupted');
  });

  it('catch block in handleContinue sets error message', () => {
    expect(content).toContain('catch (err)');
    expect(content).toContain('setAutosaveError');
    expect(content).toContain('setHasAutosave(false)');
  });

  it('renders autosave error message with red styling', () => {
    expect(content).toContain('mfd-new-game-error');
    expect(content).toContain('{autosaveError}');
  });

  it('adds a file-first dynasty import path', () => {
    expect(content).toContain("type=\"file\"");
    expect(content).toContain('loadImportedCartridgeFile');
  });

  it('keeps a paste-code fallback next to file import', () => {
    expect(content).toContain('Paste backup code');
    expect(content).toContain('loadImportedCartridge(importText.trim())');
  });

  it('persists validated imports before hydrating the active game', () => {
    const fileImport = sourceSection(
      'const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {',
      'const handleImportText = async () => {',
    );
    const textImport = sourceSection(
      'const handleImportText = async () => {',
      'const scenarios = getAvailableScenarios();',
    );

    expectSourceOrder(fileImport, [
      'const imported = await loadImportedCartridgeFile(file);',
      'await autosaveDynasty(imported);',
      'loadGame(imported);',
    ]);
    expectSourceOrder(textImport, [
      'const imported = loadImportedCartridge(importText.trim());',
      'await autosaveDynasty(imported);',
      'loadGame(imported);',
    ]);
  });

  it('uses responsive launch-screen styles and pressed states', () => {
    expect(content).toContain("import './new-game-screen.css'");
    expect(content).toContain('mfd-new-game-command-grid');
    expect(content).toContain('aria-pressed={active}');
  });

  it('keeps rookie guidance tied to default difficulty flags', () => {
    expect(content).toContain('rookieDefaults.skipHalftimeDecision');
    expect(content).toContain('halftime decisions auto-skip');
    expect(content).not.toContain('CPU games stay on the fast path');
  });

  it('wires all three onboarding paths through New Dynasty only', () => {
    expect(content).toContain('createFastLaneSetupState');
    expect(content).toContain('persistSetupRunMode');
    expect(content).toContain("onboardingMode === 'instant'");
    expect(content).toContain("onboardingMode === 'guided'");
    expect(content).toContain("onboardingMode === 'full_gm'");
    expect(content).toContain("if (mode === 'dynasty')");
    expect(content).toContain("mode !== 'scenario'");
    expect(content).toContain("onboardingMode === 'full_gm' ? 'full' : 'fast_lane'");
    expect(content).toContain('&lt;90 SEC');
    expect(content).not.toContain('readFirstTenMinutesCompleted');
    expect(content).not.toContain('SETUP_RUN_MODE_KEY');
  });
});
