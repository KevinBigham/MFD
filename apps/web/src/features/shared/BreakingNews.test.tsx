import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BreakingNews } from './BreakingNews';

const defaultProps = {
  headline: 'BLOCKBUSTER TRADE',
  detail: 'The KC BBQ Fountains have traded their star QB to the LA Traffic Jams!',
  onDismiss: vi.fn(),
  revealDelay: 0,
};

describe('BreakingNews', () => {
  it('renders the breaking news banner', () => {
    const html = renderToStaticMarkup(<BreakingNews {...defaultProps} />);
    expect(html).toContain('BREAKING NEWS');
  });

  it('renders MFSN label', () => {
    const html = renderToStaticMarkup(<BreakingNews {...defaultProps} />);
    expect(html).toContain('MFSN');
  });

  it('renders dismiss instruction', () => {
    const html = renderToStaticMarkup(<BreakingNews {...defaultProps} />);
    expect(html).toContain('CLICK ANYWHERE TO CONTINUE');
  });

  it('renders CSS keyframes for animation', () => {
    const html = renderToStaticMarkup(<BreakingNews {...defaultProps} />);
    expect(html).toContain('breakingSlideIn');
  });

  it('has alert role for accessibility', () => {
    const html = renderToStaticMarkup(<BreakingNews {...defaultProps} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
  });
});
