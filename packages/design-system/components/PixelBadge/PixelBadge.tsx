import { type CSSProperties, type ReactNode } from 'react';

type PixelBadgeVariant = 'default' | 'gold' | 'cyan' | 'green' | 'red' | 'home' | 'away';

interface PixelBadgeProps {
  children: ReactNode;
  variant?: PixelBadgeVariant;
  className?: string;
  style?: CSSProperties;
}

const variantStyles: Record<PixelBadgeVariant, { border: string; color: string; bg: string }> = {
  default: { border: '#333',    color: '#999',    bg: 'transparent' },
  gold:    { border: '#ffd700', color: '#ffd700', bg: 'rgba(255, 215, 0, 0.08)' },
  cyan:    { border: '#00e5ff', color: '#00e5ff', bg: 'rgba(0, 229, 255, 0.08)' },
  green:   { border: '#4ade80', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.08)' },
  red:     { border: '#f87171', color: '#f87171', bg: 'rgba(248, 113, 113, 0.08)' },
  home:    { border: 'var(--mfd-home-color)', color: 'var(--mfd-home-color)', bg: 'var(--mfd-home-bg)' },
  away:    { border: 'var(--mfd-away-color)', color: 'var(--mfd-away-color)', bg: 'var(--mfd-away-bg)' },
};

export function PixelBadge({ children, variant = 'default', className, style }: PixelBadgeProps) {
  const v = variantStyles[variant];
  return (
    <span
      data-mfd-pixel-badge={variant}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: '22px',
        padding: '3px 7px',
        fontFamily: 'var(--mfd-font-pixel)',
        fontSize: '8px',
        lineHeight: 1.2,
        letterSpacing: 0,
        border: `1px solid ${v.border}`,
        borderRadius: 'var(--mfd-rad-md)',
        color: v.color,
        background: `linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 48%), ${v.bg}`,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
