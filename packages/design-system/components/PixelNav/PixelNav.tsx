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
      data-mfd-pixel-nav="true"
      className={className}
      style={{
        display: 'flex',
        flexWrap: wrap ? 'wrap' : 'nowrap',
        gap: '8px',
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
            data-selected={active ? 'true' : 'false'}
            aria-pressed={active}
            aria-current={active ? 'page' : undefined}
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
              minHeight: '38px',
              padding: '8px 12px',
              border: `2px solid ${active ? 'var(--mfd-gold)' : 'var(--mfd-border)'}`,
              borderRadius: 'var(--mfd-rad-md)',
              background: active
                ? 'linear-gradient(180deg, rgba(255, 215, 0, 0.16), rgba(255, 215, 0, 0.07))'
                : item.disabled
                  ? 'rgba(16, 21, 27, 0.76)'
                  : 'var(--mfd-bg-2)',
              color: item.disabled ? 'var(--mfd-text-faint)' : active ? 'var(--mfd-gold)' : 'var(--mfd-text-dim)',
              fontFamily: 'var(--mfd-font-pixel)',
              fontSize: '8px',
              lineHeight: 1.25,
              letterSpacing: 0,
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              cursor: item.disabled ? 'default' : 'pointer',
              opacity: item.disabled ? 0.62 : 1,
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
