import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AutosaveToast } from './AutosaveToast';

describe('AutosaveToast', () => {
  it('does not render when visible is false', () => {
    const markup = renderToStaticMarkup(<AutosaveToast visible={false} />);
    expect(markup).toBe('');
  });

  it('renders GAME SAVED text when visible is true', () => {
    const markup = renderToStaticMarkup(<AutosaveToast visible={true} />);
    expect(markup).toContain('GAME SAVED');
  });

  it('uses green styling via mfd-green custom property', () => {
    const markup = renderToStaticMarkup(<AutosaveToast visible={true} />);
    expect(markup).toContain('--mfd-green');
  });

  it('includes the Check icon SVG', () => {
    const markup = renderToStaticMarkup(<AutosaveToast visible={true} />);
    expect(markup).toContain('<svg');
  });

  it('uses pixel font', () => {
    const markup = renderToStaticMarkup(<AutosaveToast visible={true} />);
    expect(markup).toContain('--mfd-font-pixel');
  });
});
