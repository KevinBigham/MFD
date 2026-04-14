import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PixelEkg } from '@mfd/design-system/components';

describe('PixelEkg', () => {
  const points = [
    { time: 0, wp: 48 },
    { time: 1, wp: 62, event: 'touchdown' },
    { time: 2, wp: 35, event: 'turnover' },
    { time: 3, wp: 54, event: 'big_play' },
  ];

  it('renders with data', () => {
    const markup = renderToStaticMarkup(<PixelEkg points={points} />);
    expect(markup).toContain('aria-label="Win probability EKG"');
  });

  it('renders spike markers for event points', () => {
    const markup = renderToStaticMarkup(<PixelEkg points={points} />);
    expect(markup).toContain('data-testid="pixel-ekg-spike"');
  });

  it('maps event colors for scoring and turnovers', () => {
    const markup = renderToStaticMarkup(<PixelEkg points={points} />);
    expect(markup).toContain('var(--mfd-gold)');
    expect(markup).toContain('var(--mfd-red)');
  });

  it('renders an empty state', () => {
    const markup = renderToStaticMarkup(<PixelEkg points={[]} />);
    expect(markup).toContain('NO SIGNAL');
  });

  it('stretches responsively inside a fluid container', () => {
    const markup = renderToStaticMarkup(<PixelEkg points={points} />);
    expect(markup).toContain('width:100%');
  });
});
