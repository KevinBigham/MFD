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
  default: 'var(--mfd-border-strong)',
  gold:    'var(--mfd-gold)',
  cyan:    'var(--mfd-cyan)',
  green:   'var(--mfd-green)',
  red:     'var(--mfd-red)',
};

const accentTitleColor: Record<string, string> = {
  default: 'var(--mfd-text-faint)',
  gold:    'var(--mfd-gold)',
  cyan:    'var(--mfd-cyan)',
  green:   'var(--mfd-green)',
  red:     'var(--mfd-red)',
};

const accentWash: Record<string, string> = {
  default: 'rgba(174, 184, 195, 0.08)',
  gold:    'rgba(255, 215, 0, 0.12)',
  cyan:    'rgba(0, 229, 255, 0.11)',
  green:   'rgba(74, 222, 128, 0.10)',
  red:     'rgba(248, 113, 113, 0.12)',
};

const paddingMap = { none: '0', sm: '10px', md: '14px', lg: '18px' };

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
      data-mfd-pixel-panel="true"
      data-mfd-panel-accent={accent}
      className={className}
      style={{
        position: 'relative',
        background: 'var(--mfd-gradient-card)',
        border: `1px solid ${accentBorder[accent]}`,
        borderTop: `3px solid ${accentBorder[accent]}`,
        borderLeft: `3px solid ${accentBorder[accent]}`,
        borderRadius: 'var(--mfd-rad-lg)',
        boxShadow: 'var(--mfd-shadow-panel)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {title && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          minHeight: '40px',
          padding: '9px 13px',
          borderBottom: `1px solid ${accent === 'default' ? 'var(--mfd-border)' : accentBorder[accent]}`,
          background: `linear-gradient(90deg, ${accentWash[accent]}, transparent 72%), rgba(0, 0, 0, 0.16)`,
        }}>
          <span
            aria-hidden="true"
            style={{
              width: '18px',
              height: '4px',
              background: accentTitleColor[accent],
              boxShadow: `0 0 16px ${accentTitleColor[accent]}`,
              flex: '0 0 auto',
            }}
          />
          <span style={{
            fontFamily: 'var(--mfd-font-pixel)',
            fontSize: '9px',
            lineHeight: 1.35,
            color: accentTitleColor[accent],
            letterSpacing: 0,
          }}>
            {title.toUpperCase()}
          </span>
        </div>
      )}
      <div style={{ padding: paddingMap[padding] }}>
        {children}
      </div>
    </section>
  );
}
