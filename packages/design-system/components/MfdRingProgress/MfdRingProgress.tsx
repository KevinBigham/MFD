import { type CSSProperties } from 'react';

interface MfdRingProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

export function MfdRingProgress({
  value,
  max = 100,
  size = 64,
  strokeWidth = 4,
  color = 'var(--mfd-gold)',
  trackColor = 'var(--mfd-bg-3)',
  label,
  className,
  style,
}: MfdRingProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(value / max, 0), 1);
  const offset = circumference * (1 - pct);

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--mfd-sp-xs)',
        ...style,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset var(--mfd-motion-normal)' }}
        />
      </svg>
      {label && (
        <span style={{
          fontSize: '0.625rem',
          fontFamily: 'var(--mfd-font-mono)',
          color: 'var(--mfd-text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}>
          {label}
        </span>
      )}
    </div>
  );
}
