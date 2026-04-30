import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChipDock } from './ChipDock';
import { formatDynastyIndicatorLabel } from './dynastyIndicator';

describe('dynasty-year dock indicator', () => {
  it('renders the season year and coach name on the dock', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');

    const markup = renderToStaticMarkup(
      <ChipDock collapsed={false} dynastyIndicator={{ seasonYear: 2031, coachName: 'Mara Cole' }} />,
    );

    expect(markup).toContain('Year 2031 — Mara Cole');
  });

  it('truncates coach names longer than sixteen characters with an ellipsis', () => {
    expect(formatDynastyIndicatorLabel(2034, 'Alexandria Montgomery')).toBe('Year 2034 — Alexandria Montg…');
  });

  it('updates when the season year changes', () => {
    expect(formatDynastyIndicatorLabel(2031, 'Mara Cole')).toBe('Year 2031 — Mara Cole');
    expect(formatDynastyIndicatorLabel(2032, 'Mara Cole')).toBe('Year 2032 — Mara Cole');
  });
});
