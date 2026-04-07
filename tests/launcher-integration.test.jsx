import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import LauncherShell, {
  deriveLauncherBoot,
  safeReadStorage,
  safeWriteStorage,
} from '../src/app/launcher-shell.jsx';

describe('launcher-shell integration', () => {
  it('deriveLauncherBoot resolves forced mode from query/hash', () => {
    expect(deriveLauncherBoot({ query: '?mode=play', hash: '#status', storageValue: 'status' })).toEqual({
      mode: 'play',
      forcedMode: 'play',
    });
    expect(deriveLauncherBoot({ query: '', hash: '#status', storageValue: 'play' })).toEqual({
      mode: 'status',
      forcedMode: 'status',
    });
  });

  it('safeReadStorage and safeWriteStorage handle unavailable storage', () => {
    expect(safeReadStorage('k', null).ok).toBe(false);
    expect(safeWriteStorage('k', 'v', null).ok).toBe(false);
  });

  it('renders launcher tabs and status mode by default', () => {
    var html = renderToStaticMarkup(React.createElement(LauncherShell, { showDiagnostics: true }));
    expect(html).toContain('Play Now');
    expect(html).toContain('Module Status');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('Diagnostics:');
    expect(html).toContain('Loading Module Validation');
  });

  it('keeps status mode output stable even when import/export flag is enabled', () => {
    var html = renderToStaticMarkup(React.createElement(LauncherShell, {
      showDiagnostics: false,
      enableSaveImportExport: true,
    }));
    expect(html).toContain('Loading Module Validation');
    expect(html).not.toContain('Save Import/Export (Beta)');
  });
});
