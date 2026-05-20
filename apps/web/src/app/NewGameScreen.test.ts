import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';

describe('NewGameScreen', () => {
  const content = readFileSync(new URL('./NewGameScreen.tsx', import.meta.url), 'utf-8');

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
});
