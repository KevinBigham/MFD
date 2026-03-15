import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import PlayScreen from '../src/app/play-screen.jsx';

describe('play-screen integration', () => {
  it('renders loading state and direct-link fallback text', () => {
    var html = renderToStaticMarkup(React.createElement(PlayScreen, {
      basePath: '/app/',
      manifest: {
        version: 'v100',
        assetVersion: '20260315c',
        entry: 'legacy/index.html',
        files: ['legacy/game.js', 'legacy/react.min.js', 'legacy/react-dom.min.js'],
      },
    }));

    expect(html).toContain('Play Legacy Build');
    expect(html).toContain('Loading legacy game...');
    expect(html).toContain('Open legacy directly');
    expect(html).toContain('Legacy runtime version:');
    expect(html).toContain('legacy/index.html');
  });

  it('renders iframe with legacy URL', () => {
    var html = renderToStaticMarkup(React.createElement(PlayScreen, {
      basePath: '/season/',
      manifest: {
        version: 'v100',
        assetVersion: '20260315c',
        entry: 'legacy/index.html',
        files: ['legacy/game.js', 'legacy/react.min.js', 'legacy/react-dom.min.js'],
      },
    }));

    expect(html).toContain('src="/season/legacy/index.html?mode=play&amp;v=20260315c"');
    expect(html).toContain('Mr Football Dynasty Legacy');
  });

  it('shows import/export beta card only when feature flag is enabled', () => {
    var withoutFlag = renderToStaticMarkup(React.createElement(PlayScreen, {
      basePath: '/season/',
      manifest: {
        version: 'v100',
        assetVersion: '20260315c',
        entry: 'legacy/index.html',
        files: ['legacy/game.js', 'legacy/react.min.js', 'legacy/react-dom.min.js'],
      },
      enableSaveImportExport: false,
    }));
    expect(withoutFlag).not.toContain('Save Import/Export (Beta)');

    var withFlag = renderToStaticMarkup(React.createElement(PlayScreen, {
      basePath: '/season/',
      manifest: {
        version: 'v100',
        assetVersion: '20260315c',
        entry: 'legacy/index.html',
        files: ['legacy/game.js', 'legacy/react.min.js', 'legacy/react-dom.min.js'],
      },
      enableSaveImportExport: true,
    }));
    expect(withFlag).toContain('Save Import/Export (Beta)');
  });
});
