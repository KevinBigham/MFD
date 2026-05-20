import type { ReactNode } from 'react';

type PixelAccent = 'default' | 'gold' | 'cyan' | 'green' | 'red';

interface PixelMetricCardProps {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  accent?: PixelAccent;
  badge?: ReactNode;
}

const accentColor: Record<PixelAccent, string> = {
  default: 'var(--mfd-border-strong)',
  gold: 'var(--mfd-gold)',
  cyan: 'var(--mfd-cyan)',
  green: 'var(--mfd-green)',
  red: 'var(--mfd-red)',
};

const accentWash: Record<PixelAccent, string> = {
  default: 'rgba(174, 184, 195, 0.08)',
  gold: 'rgba(255, 215, 0, 0.12)',
  cyan: 'rgba(0, 229, 255, 0.11)',
  green: 'rgba(74, 222, 128, 0.10)',
  red: 'rgba(248, 113, 113, 0.12)',
};

export function PixelMetricCard({
  label,
  value,
  detail,
  accent = 'default',
  badge,
}: PixelMetricCardProps) {
  const color = accentColor[accent];

  return (
    <section
      data-mfd-pixel-metric="true"
      data-mfd-metric-accent={accent}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '12px',
        minHeight: '118px',
        padding: '14px 16px',
        border: `1px solid ${color}`,
        borderTop: `3px solid ${color}`,
        borderRadius: 'var(--mfd-rad-lg)',
        background: `linear-gradient(135deg, ${accentWash[accent]}, transparent 54%), var(--mfd-gradient-card)`,
        boxShadow: 'var(--mfd-shadow-panel)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
        <span style={{
          fontFamily: 'var(--mfd-font-pixel)',
          fontSize: '8px',
          lineHeight: 1.4,
          color,
          letterSpacing: 0,
          textTransform: 'uppercase',
        }}>
          {label}
        </span>
        {badge}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{
          fontFamily: 'var(--mfd-font-display)',
          fontSize: '34px',
          color: 'var(--mfd-text)',
          lineHeight: 0.95,
        }}>
          {value}
        </span>
        {detail ? (
          <div style={{
            fontFamily: 'var(--mfd-font-mono)',
            fontSize: '11px',
            lineHeight: 1.5,
            color: 'var(--mfd-text-dim)',
          }}>
            {detail}
          </div>
        ) : null}
      </div>
    </section>
  );
}
