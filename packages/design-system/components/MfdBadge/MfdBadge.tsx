import { type CSSProperties, type ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'gold' | 'purple';

interface MfdBadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
  style?: CSSProperties;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  default:  { bg: 'var(--mfd-bg-3)',     text: 'var(--mfd-text-dim)', border: 'var(--mfd-border)' },
  success:  { bg: 'rgba(0,184,122,0.12)', text: 'var(--mfd-green)',    border: 'rgba(0,184,122,0.25)' },
  danger:   { bg: 'rgba(224,60,60,0.12)', text: 'var(--mfd-red)',      border: 'rgba(224,60,60,0.25)' },
  warning:  { bg: 'rgba(224,122,16,0.12)', text: 'var(--mfd-orange)',  border: 'rgba(224,122,16,0.25)' },
  info:     { bg: 'rgba(74,159,232,0.12)', text: 'var(--mfd-blue)',    border: 'rgba(74,159,232,0.25)' },
  gold:     { bg: 'var(--mfd-gold-dim)',   text: 'var(--mfd-gold)',    border: 'var(--mfd-gold-mid)' },
  purple:   { bg: 'rgba(139,114,234,0.12)', text: 'var(--mfd-purple)', border: 'rgba(139,114,234,0.25)' },
};

export function MfdBadge({ children, variant = 'default', size = 'sm', className, style }: MfdBadgeProps) {
  const colors = variantColors[variant];
  const isSmall = size === 'sm';

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: isSmall ? '1px 6px' : '2px 8px',
        fontSize: isSmall ? '0.6875rem' : '0.75rem',
        fontFamily: 'var(--mfd-font-mono)',
        fontWeight: 500,
        lineHeight: 1.5,
        borderRadius: 'var(--mfd-rad-sm)',
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        color: colors.text,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
