import type { CSSProperties } from 'react';

interface PixelPlayerLinkProps {
  playerId: string;
  name: string;
  ovr?: number;
  style?: CSSProperties;
  title?: string;
}

export function PixelPlayerLink({
  playerId,
  name,
  ovr,
  style,
  title,
}: PixelPlayerLinkProps) {
  const color = (ovr ?? 0) >= 90 ? 'var(--mfd-gold)' : 'var(--mfd-text)';

  return (
    <button
      type="button"
      title={title ?? `Open ${name}`}
      onClick={(event) => {
        event.stopPropagation();
        if (typeof window !== 'undefined') {
          window.history.pushState({}, '', `/player/${playerId}`);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }}
      style={{
        border: 'none',
        background: 'transparent',
        padding: 0,
        margin: 0,
        cursor: 'pointer',
        color,
        textAlign: 'left',
        textDecoration: 'underline',
        textDecorationColor: (ovr ?? 0) >= 90 ? 'var(--mfd-gold)' : 'var(--mfd-cyan)',
        textUnderlineOffset: '2px',
        ...style,
      }}
    >
      {name}
    </button>
  );
}
