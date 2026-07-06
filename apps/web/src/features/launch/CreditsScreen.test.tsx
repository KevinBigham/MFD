import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import appSource from '../../app/App.tsx?raw';
import { CreditsScreen } from './CreditsScreen';

describe('CreditsScreen', () => {
  it('renders launch credits', () => {
    const markup = renderToStaticMarkup(<CreditsScreen />);

    expect(markup).toContain('CREDITS');
    expect(markup).toContain('The launch build crew and technical foundation');
  });

  it('uses the PixelScreenHeader contract', () => {
    const markup = renderToStaticMarkup(<CreditsScreen />);

    expect(markup).toContain('MFD NETWORK');
    expect(markup).toContain('LAUNCH');
  });

  it('credits design and development', () => {
    const markup = renderToStaticMarkup(<CreditsScreen />);

    expect(markup).toContain('Design + Dev');
    expect(markup).toContain('Kevin Bigham');
  });

  it('credits AI agents and tech stack', () => {
    const markup = renderToStaticMarkup(<CreditsScreen />);

    expect(markup).toContain('ChatGPT Architect');
    expect(markup).toContain('Codex Builder');
    expect(markup).toContain('React 19');
    expect(markup).toContain('Vite 6');
  });

  it('is reachable from the app router', () => {
    expect(appSource).toContain("path: '/credits'");
    expect(appSource).toContain('LazyCreditsScreen');
  });

  it('does not log console errors during render', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      renderToStaticMarkup(<CreditsScreen />);
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});
