import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PixelSelect } from './PixelSelect';

describe('PixelSelect', () => {
  it('uses the shared touch target minimum', () => {
    const markup = renderToStaticMarkup(
      <PixelSelect
        aria-label="Depth sort"
        options={[
          { value: 'capHit', label: 'Cap Hit' },
          { value: 'savings', label: 'Cut Savings' },
        ]}
      />,
    );

    expect(markup).toContain('min-height:var(--mfd-touch-min)');
  });
});
