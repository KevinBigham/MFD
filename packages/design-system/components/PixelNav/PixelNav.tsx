import { type CSSProperties, type ReactNode } from 'react';

export interface PixelNavItem {
  key: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface PixelNavProps {
  items: PixelNavItem[];
  activeKey: string;
  onSelect?: (key: string) => void;
  wrap?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function PixelNav({
  items,
  activeKey,
  onSelect,
  wrap = false,
  className,
  style,
}: PixelNavProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexWrap: wrap ? 'wrap' : 'nowrap',
        gap: '6px',
        overflowX: wrap ? 'visible' : 'auto',
        ...style,
      }}
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <button
            key={item.key}
            type="button"
            data-mfd-nav-item="true"
            data-active={active ? 'true' : 'false'}
            aria-pressed={active}
            disabled={item.disabled}
            onClick={() => {
              if (!item.disabled) {
                onSelect?.(item.key);
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              minHeight: '32px',
              padding: '7px 10px',
              border: `3px solid ${active ? 'var(--mfd-gold)' : 'var(--mfd-border)'}`,
              background: active ? 'rgba(255, 215, 0, 0.1)' : 'var(--mfd-bg-2)',
              color: item.disabled ? 'var(--mfd-text-faint)' : active ? 'var(--mfd-gold)' : 'var(--mfd-text-dim)',
              fontFamily: 'var(--mfd-font-pixel)',
              fontSize: '8px',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              cursor: item.disabled ? 'default' : 'pointer',
              flexShrink: 0,
            }}
          >
            {item.icon}
            <span>{item.label.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}
