import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PixelPlayerLink } from './PixelPlayerLink';

interface ClickableProps {
  onClick: (event: { stopPropagation: () => void }) => void;
}

describe('PixelPlayerLink', () => {
  it('renders a button labelled with the player name', () => {
    const markup = renderToStaticMarkup(
      <PixelPlayerLink playerId="player-1" name="Jay Stone" ovr={91} />,
    );

    expect(markup).toContain('Open Jay Stone');
    expect(markup).toContain('Jay Stone');
    expect(markup).toContain('var(--mfd-gold)');
  });

  it('navigates through the hash router when clicked', () => {
    const location = { hash: '' };
    vi.stubGlobal('window', { location });

    const element = PixelPlayerLink({ playerId: 'player one', name: 'Jay Stone' }) as ReactElement<ClickableProps>;
    const stopPropagation = vi.fn();
    element.props.onClick({ stopPropagation });

    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(location.hash).toBe('/player/player%20one');

    vi.unstubAllGlobals();
  });
});
