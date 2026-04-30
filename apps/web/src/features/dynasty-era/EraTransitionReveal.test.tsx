import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EraTransitionReveal } from './EraTransitionReveal';

const defaultProps = {
  open: true,
  eraName: 'Dynasty Era',
  eraType: 'dynasty' as const,
  narrative: 'Three banners in five years changed the building forever.',
  onContinue: vi.fn(),
};

describe('EraTransitionReveal', () => {
  it('renders nothing when the reveal stage is hidden', () => {
    const markup = renderToStaticMarkup(<EraTransitionReveal {...defaultProps} initialStage="hidden" />);

    expect(markup).toBe('');
  });

  it('renders the era badge SVG during the badge stage', () => {
    const markup = renderToStaticMarkup(<EraTransitionReveal {...defaultProps} initialStage="badge" />);

    expect(markup).toContain('data-testid="era-transition-badge"');
    expect(markup).toContain('data-era-badge-variant="dynasty"');
  });

  it('renders the era name once the name stage is active', () => {
    const markup = renderToStaticMarkup(<EraTransitionReveal {...defaultProps} initialStage="name" />);

    expect(markup).toContain('DYNASTY ERA');
    expect(markup).toContain('data-era-transition-stage="name"');
  });

  it('renders the narrative and Chip narration in the narrative stage', () => {
    const markup = renderToStaticMarkup(<EraTransitionReveal {...defaultProps} initialStage="narrative" />);

    expect(markup).toContain('Three banners in five years changed the building forever.');
    expect(markup).toContain('New era marker archived.');
    expect(markup).toContain('data-chip-pose="celebrate"');
  });

  it('shows all content and the continue CTA in the idle stage', () => {
    const markup = renderToStaticMarkup(<EraTransitionReveal {...defaultProps} initialStage="idle" reducedMotion />);

    expect(markup).toContain('DYNASTY ERA');
    expect(markup).toContain('Continue');
    expect(markup).toContain('data-era-transition-stage="idle"');
  });

  it('uses red palette and suppresses confetti for fall-from-grace', () => {
    const markup = renderToStaticMarkup(
      <EraTransitionReveal
        {...defaultProps}
        eraName="Fall From Grace"
        eraType="fall-from-grace"
        initialStage="narrative"
      />,
    );

    expect(markup).toContain('data-era-transition-accent="red"');
    expect(markup).toContain('data-chip-pose="concern"');
    expect(markup).not.toContain('data-testid="era-transition-confetti"');
  });
});
