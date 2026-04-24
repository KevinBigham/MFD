import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import appSource from '../../app/App.tsx?raw';
import { FaqScreen } from './FaqScreen';

describe('FaqScreen', () => {
  it('renders the FAQ shell', () => {
    const markup = renderToStaticMarkup(<FaqScreen />);

    expect(markup).toContain('FAQ');
    expect(markup).toContain('Fast answers for a first public launch visit');
  });

  it('uses the PixelScreenHeader contract', () => {
    const markup = renderToStaticMarkup(<FaqScreen />);

    expect(markup).toContain('MFD NETWORK');
    expect(markup).toContain('8 ANSWERS');
  });

  it('renders the core new-player questions', () => {
    const markup = renderToStaticMarkup(<FaqScreen />);

    expect(markup).toContain('WHAT IS MFD?');
    expect(markup).toContain('HOW LONG IS A SEASON?');
    expect(markup).toContain('CAN I PLAY MULTIPLE DYNASTIES?');
    expect(markup).toContain("WHAT&#x27;S CALL YOUR SHOT?");
  });

  it('renders save, rivalry, audio, and bug-report answers', () => {
    const markup = renderToStaticMarkup(<FaqScreen />);

    expect(markup).toContain('Sprint 70 keeps save version 35 unchanged');
    expect(markup).toContain('Rivalry heat tracks friction');
    expect(markup).toContain('master audio');
    expect(markup).toContain('GitHub repository issue tracker');
  });

  it('is reachable from the app router', () => {
    expect(appSource).toContain("path: '/faq'");
    expect(appSource).toContain('LazyFaqScreen');
  });

  it('does not log console errors during render', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      renderToStaticMarkup(<FaqScreen />);
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});
