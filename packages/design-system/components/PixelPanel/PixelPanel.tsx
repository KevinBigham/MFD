import { type CSSProperties, type ReactNode } from 'react';

interface PixelPanelProps {
  children: ReactNode;
  title?: string;
  /** Border accent color — defaults to --mfd-border */
  accent?: 'default' | 'gold' | 'cyan' | 'green' | 'red';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  style?: CSSProperties;
}

const accentBorder: Record<string, string> = {
  default: 'var(--mfd-pixel-border)',
  gold:    'var(--mfd-pixel-border-gold)',
  cyan:    'var(--mfd-pixel-border-cyan)',
  green:   'var(--mfd-pixel-border-green)',
  red:     'var(--mfd-pixel-border-red)',
};

const accentTitleColor: Record<string, string> = {
  default: 'var(--mfd-text-faint)',
  gold:    'var(--mfd-gold)',
  cyan:    'var(--mfd-cyan)',
  green:   'var(--mfd-green)',
  red:     'var(--mfd-red)',
};

const paddingMap = { none: '0', sm: '8px', md: '12px', lg: '16px' };

export function PixelPanel({
  children,
  title,
  accent = 'default',
  padding = 'md',
  className,
  style,
}: PixelPanelProps) {
  return (
    <section
      className={className}
      style={{
        background: 'var(--mfd-bg-2)',
        border: accentBorder[accent],
        overflow: 'hidden',
        ...style,
      }}
    >
      {title && (
        <div style={{
          padding: '6px 12px',
          borderBottom: `2px solid ${accent === 'default' ? 'var(--mfd-border)' : accentTitleColor[accent]}`,
          background: accent === 'default' ? 'var(--mfd-bg-3)' : `${accentTitleColor[accent]}11`,
        }}>
          <span style={{
            fontFamily: 'var(--mfd-font-pixel)',
            fontSize: '8px',
            color: accentTitleColor[accent],
            letterSpacing: '1px',
          }}>
            --- {title.toUpperCase()} ---
          </span>
        </div>
      )}
      <div style={{ padding: paddingMap[padding] }}>
        {children}
      </div>
    </section>
  );
}
