import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DraftPickRevealCard, DraftPickRevealView } from './DraftPickReveal';

const draftPickProps = {
  overall: 17,
  round: 1,
  pick: 17,
  playerName: 'Jordan Velocity',
  position: 'WR',
  college: 'Test State',
  teamAbbrev: 'kc',
  reaction: 'Value held. The board came to us.',
};

describe('DraftPickReveal', () => {
  it('renders the reveal modal details when open', () => {
    const markup = renderToStaticMarkup(
      <DraftPickRevealView
        {...draftPickProps}
        open
        reducedMotion={false}
        onDismiss={vi.fn()}
      />,
    );

    expect(markup).toContain('aria-label="Draft Pick Reveal"');
    expect(markup).toContain('JORDAN VELOCITY');
    expect(markup).toContain('OVERALL #17');
  });

  it('hides the modal when closed', () => {
    const markup = renderToStaticMarkup(
      <DraftPickRevealView
        {...draftPickProps}
        open={false}
        reducedMotion={false}
        onDismiss={vi.fn()}
      />,
    );

    expect(markup).toBe('');
  });

  it('disables the flip animation when reduced motion is enabled', () => {
    const markup = renderToStaticMarkup(
      <DraftPickRevealView
        {...draftPickProps}
        open
        reducedMotion
        onDismiss={vi.fn()}
      />,
    );

    expect(markup).toContain('animation:none');
  });

  it('renders a recap-safe reveal card', () => {
    const markup = renderToStaticMarkup(
      <DraftPickRevealCard {...draftPickProps} title="Reveal Card" />,
    );

    expect(markup).toContain('--- REVEAL CARD ---');
    expect(markup).toContain('AGM: Value held. The board came to us.');
  });
});
