import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TeachingTooltip, getNextTeachingTipIndex } from './TeachingTooltip';

describe('TeachingTooltip', () => {
  it('renders the first tip and current count', () => {
    const html = renderToStaticMarkup(
      <TeachingTooltip
        tips={['Start with the roster core.', 'Watch your weak links.']}
        agmName="Marcus Webb"
        agmAccent="var(--mfd-cyan)"
      />,
    );

    expect(html).toContain('MARCUS WEBB SAYS:');
    expect(html).toContain('Start with the roster core.');
    expect(html).toContain('1 / 2');
    expect(html).toContain('NEXT TIP');
  });

  it('wraps to the next tip index deterministically', () => {
    expect(getNextTeachingTipIndex(0, 3)).toBe(1);
    expect(getNextTeachingTipIndex(2, 3)).toBe(0);
    expect(getNextTeachingTipIndex(0, 0)).toBe(0);
  });
});
