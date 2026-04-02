import type { CSSProperties } from 'react';

interface PixelStatBarProps {
  label: string;
  homeValue: string | number;
  awayValue: string | number;
  /** 0-1 ratio of home share (e.g. 0.6 means home has 60%) */
  homeRatio?: number;
  className?: string;
  style?: CSSProperties;
}

export function PixelStatBar({
  label,
  homeValue,
  awayValue,
  homeRatio,
  className,
  style,
}: PixelStatBarProps) {
  return (
    <div className={className} style={{ ...style }}>
      {/* Label */}
      <div style={{
        fontFamily: 'var(--mfd-font-pixel)',
        fontSize: '7px',
        color: '#555',
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '4px',
      }}>
        {label}
      </div>
      {/* Values + bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          fontFamily: 'var(--mfd-font-display)',
          fontSize: '24px',
          color: 'var(--mfd-home-color)',
          lineHeight: 1,
          minWidth: '50px',
          textAlign: 'right',
        }}>
          {homeValue}
        </span>
        {homeRatio != null && (
          <div style={{
            flex: 1,
            height: '6px',
            display: 'flex',
            gap: '2px',
            background: '#1a1a1a',
          }}>
            <div style={{ width: `${homeRatio * 100}%`, height: '100%', background: 'var(--mfd-home-color)' }} />
            <div style={{ width: `${(1 - homeRatio) * 100}%`, height: '100%', background: 'var(--mfd-away-color)' }} />
          </div>
        )}
        {homeRatio == null && (
          <span style={{
            fontFamily: 'var(--mfd-font-pixel)',
            fontSize: '6px',
            color: '#333',
          }}>
            VS
          </span>
        )}
        <span style={{
          fontFamily: 'var(--mfd-font-display)',
          fontSize: '24px',
          color: 'var(--mfd-away-color)',
          lineHeight: 1,
          minWidth: '50px',
          textAlign: 'left',
        }}>
          {awayValue}
        </span>
      </div>
    </div>
  );
}
