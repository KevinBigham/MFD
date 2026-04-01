import { type CSSProperties, type ReactNode } from 'react';

type TrendDirection = 'up' | 'down' | 'flat';

interface MfdKpiCardProps {
  label: string;
  value: string | number;
  trend?: TrendDirection;
  trendLabel?: string;
  icon?: ReactNode;
  variant?: 'default' | 'gold' | 'danger' | 'success';
  className?: string;
  style?: CSSProperties;
}

const trendColors: Record<TrendDirection, string> = {
  up: 'var(--mfd-green)',
  down: 'var(--mfd-red)',
  flat: 'var(--mfd-text-dim)',
};

const trendSymbols: Record<TrendDirection, string> = {
  up: '\u25B2',
  down: '\u25BC',
  flat: '\u2014',
};

const variantAccents: Record<string, string> = {
  default: 'var(--mfd-border)',
  gold: 'var(--mfd-gold-mid)',
  danger: 'rgba(224,60,60,0.25)',
  success: 'rgba(0,184,122,0.25)',
};

export function MfdKpiCard({
  label,
  value,
  trend,
  trendLabel,
  icon,
  variant = 'default',
  className,
  style,
}: MfdKpiCardProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--mfd-sp-xs)',
        padding: 'var(--mfd-sp-md) var(--mfd-sp-lg)',
        background: 'var(--mfd-surface)',
        border: `1px solid ${variantAccents[variant]}`,
        borderRadius: 'var(--mfd-rad-lg)',
        minWidth: 140,
        ...style,
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: '0.6875rem',
          fontFamily: 'var(--mfd-font-mono)',
          color: 'var(--mfd-text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}>
          {label}
        </span>
        {icon && (
          <span style={{ color: 'var(--mfd-text-faint)', display: 'flex' }}>
            {icon}
          </span>
        )}
      </div>

      <span style={{
        fontSize: '1.5rem',
        fontFamily: 'var(--mfd-font-mono)',
        fontWeight: 600,
        color: variant === 'gold' ? 'var(--mfd-gold)' : 'var(--mfd-text)',
        lineHeight: 1.2,
      }}>
        {value}
      </span>

      {trend && (
        <span style={{
          fontSize: '0.6875rem',
          fontFamily: 'var(--mfd-font-mono)',
          color: trendColors[trend],
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          <span style={{ fontSize: '0.5rem' }}>{trendSymbols[trend]}</span>
          {trendLabel}
        </span>
      )}
    </div>
  );
}
