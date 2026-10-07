import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { SAVE_VERSION } from '@mfd/engine';
import appSource from '../../app/App.tsx?raw';
import { AboutScreen } from './AboutScreen';

describe('AboutScreen', () => {
  it('renders the launch identity blurb', () => {
    const markup = renderToStaticMarkup(<AboutScreen />);

    expect(markup).toContain('Browser-based football franchise dynasty simulation');
    expect(markup).toContain('Mr. Football Dynasty is a deterministic franchise sim');
  });

  it('uses the PixelScreenHeader contract', () => {
    const markup = renderToStaticMarkup(<AboutScreen />);

    expect(markup).toContain('MFD NETWORK');
    expect(markup).toContain('ABOUT MFD');
  });

  it('shows version and save stability context', () => {
    const markup = renderToStaticMarkup(<AboutScreen />);

    expect(markup).toContain('v1.0.0');
    expect(markup).toContain(`v${SAVE_VERSION}`);
    expect(markup).not.toContain('v35');
  });

  it('links to the repository and a readable checked-in play guide', () => {
    const markup = renderToStaticMarkup(<AboutScreen />);
    const guideHref = markup.match(/<a\b[^>]*href="([^"]+)"[^>]*>Play Guide<\/a>/)?.[1];

    expect(markup).toContain('Repository');
    expect(markup).toContain('https://github.com/KevinBigham/MFD');
    expect(guideHref).toBe('https://github.com/KevinBigham/MFD/blob/main/docs/PLAY_GUIDE.md');

    const guidePath = new URL(guideHref!).pathname.replace('/KevinBigham/MFD/blob/main/', '');
    const guide = readFileSync(new URL(`../../../../../${guidePath}`, import.meta.url), 'utf8');
    expect(guide.trim().length).toBeGreaterThan(0);
  });

  it('is reachable from the app router', () => {
    expect(appSource).toContain("path: '/about'");
    expect(appSource).toContain('LazyAboutScreen');
  });

  it('does not log console errors during render', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      renderToStaticMarkup(<AboutScreen />);
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});
