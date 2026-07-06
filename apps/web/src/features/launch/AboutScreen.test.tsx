import { renderToStaticMarkup } from 'react-dom/server';
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

  it('links to the repository and play guide', () => {
    const markup = renderToStaticMarkup(<AboutScreen />);

    expect(markup).toContain('Repository');
    expect(markup).toContain('Play Guide');
    expect(markup).toContain('https://github.com/KevinBigham/MFD');
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
