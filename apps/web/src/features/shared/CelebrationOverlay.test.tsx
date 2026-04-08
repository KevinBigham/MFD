import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CelebrationOverlay } from './CelebrationOverlay';

const defaultProps = {
  teamCity: 'Kansas City',
  teamName: 'BBQ Fountains',
  teamAbbrev: 'kc',
  year: 2026,
  seasonRecord: '14-3',
  onDismiss: vi.fn(),
};

describe('CelebrationOverlay', () => {
  it('renders the championship title', () => {
    const html = renderToStaticMarkup(<CelebrationOverlay {...defaultProps} />);
    expect(html).toContain('SUPER BOWL CHAMPIONS');
  });

  it('renders team name and record', () => {
    const html = renderToStaticMarkup(<CelebrationOverlay {...defaultProps} />);
    expect(html).toContain('Kansas City');
    expect(html).toContain('BBQ Fountains');
    expect(html).toContain('14-3');
  });

  it('renders MVP when provided', () => {
    const html = renderToStaticMarkup(<CelebrationOverlay {...defaultProps} mvpName="Patrick Mahomes" />);
    expect(html).toContain('Patrick Mahomes');
    expect(html).toContain('SUPER BOWL MVP');
  });

  it('renders era name when provided', () => {
    const html = renderToStaticMarkup(<CelebrationOverlay {...defaultProps} eraName="Golden Dynasty" />);
    expect(html).toContain('GOLDEN DYNASTY');
  });

  it('renders continue button', () => {
    const html = renderToStaticMarkup(<CelebrationOverlay {...defaultProps} />);
    expect(html).toContain('CONTINUE TO OFFSEASON');
  });

  it('renders confetti elements', () => {
    const html = renderToStaticMarkup(<CelebrationOverlay {...defaultProps} />);
    expect(html).toContain('confettiFall');
  });
});
