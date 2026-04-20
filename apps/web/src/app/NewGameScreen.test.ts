// @ts-nocheck — test-only file, vitest provides node APIs
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
    expect(content).toContain("border: '1px solid var(--mfd-red)'");
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
});
