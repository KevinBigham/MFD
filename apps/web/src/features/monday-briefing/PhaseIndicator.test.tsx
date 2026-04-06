import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PhaseIndicator } from './PhaseIndicator';

describe('PhaseIndicator', () => {
  it('renders regular season label and tip', () => {
    const html = renderToStaticMarkup(
      <PhaseIndicator phase="regular_season" week={5} year={2026} />,
    );
    expect(html).toContain('REGULAR SEASON');
    expect(html).toContain('chase the playoffs');
  });

  it('renders offseason label and tip', () => {
    const html = renderToStaticMarkup(
      <PhaseIndicator phase="offseason" week={1} year={2026} />,
    );
    expect(html).toContain('OFFSEASON');
    expect(html).toContain('Re-sign players');
  });
});
