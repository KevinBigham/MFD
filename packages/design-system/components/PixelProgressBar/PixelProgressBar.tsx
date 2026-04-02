import type { CSSProperties } from 'react';

type PixelProgressAccent = 'default' | 'gold' | 'cyan' | 'green' | 'red';

interface PixelProgressBarProps {
  value: number;
  max?: number;
  accent?: PixelProgressAccent;
  label?: string;
  valueLabel?: string;
  className?: string;
  style?: CSSProperties;
}

const accentFill: Record<PixelProgressAccent, string> = {
  default: 'var(--mfd-text)',
  gold: 'var(--mfd-gold)',
  cyan: 'var(--mfd-cyan)',
  green: 'var(--mfd-green)',
  red: 'var(--mfd-red)',
};

export function PixelProgressBar({
  value,
  max = 100,
  accent = 'default',
  label,
  valueLabel,
  className,
  style,
}: PixelProgressBarProps) {
  const safeMax = max <= 0 ? 1 : max;
  const pct = Math.max(0, Math.min(100, (value / safeMax) * 100));

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: '6px', ...style }}>
      {(label || valueLabel) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
          {label ? (
            <span style={{
              fontFamily: 'var(--mfd-font-pixel)',
              fontSize: '7px',
              color: 'var(--mfd-text-faint)',
              letterSpacing: '0.8px',
            }}>
              {label.toUpperCase()}
            </span>
          ) : <span />}
          {valueLabel ? (
            <span style={{
              fontFamily: 'var(--mfd-font-display)',
              fontSize: '18px',
              lineHeight: 1,
              color: accentFill[accent],
            }}>
              {valueLabel}
            </span>
          ) : null}
        </div>
      )}
      <div style={{ border: '3px solid var(--mfd-border)', background: 'var(--mfd-bg-3)', padding: '2px' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '10px',
            background: accentFill[accent],
            transition: 'width var(--mfd-motion-normal)',
          }}
        />
      </div>
    </div>
  );
}
