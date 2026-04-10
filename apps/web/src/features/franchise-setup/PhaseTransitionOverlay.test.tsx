import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PhaseTransitionOverlay } from './PhaseTransitionOverlay';

describe('PhaseTransitionOverlay', () => {
  it('renders flavor text, loading tip, and typing dots', () => {
    const html = renderToStaticMarkup(
      <PhaseTransitionOverlay
        flavorText="Your AGM waves you toward the next room."
        loadingTip="Balanced rosters survive bad weeks better."
      />,
    );

    expect(html).toContain('Your AGM waves you toward the next room.');
    expect(html).toContain('Balanced rosters survive bad weeks better.');
    expect(html).toContain('mfd-typing');
  });
});
