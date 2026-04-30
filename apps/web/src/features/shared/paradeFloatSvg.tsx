import type { ReactNode } from 'react';

interface ParadeFloatProps {
  banner: string;
  children?: ReactNode;
}

export function ParadeFloat({ banner, children }: ParadeFloatProps) {
  return (
    <svg
      viewBox="0 0 240 120"
      role="img"
      aria-label={`${banner} parade float`}
      data-testid="parade-float-svg"
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <path d="M20 72 L220 72 L232 92 L8 92 Z" fill="var(--mfd-bg-dim)" stroke="var(--mfd-gold)" strokeWidth="4" />
      <path d="M34 42 L206 42 L214 70 L26 70 Z" fill="var(--mfd-bg-2)" stroke="var(--mfd-cyan)" strokeWidth="3" />
      <path d="M48 18 L192 18 L198 38 L42 38 Z" fill="var(--mfd-gold)" />
      <text x="120" y="32" textAnchor="middle" fill="var(--mfd-bg)" fontFamily="var(--mfd-font-pixel)" fontSize="9">
        {banner}
      </text>
      <g transform="translate(68 28)" data-testid="parade-float-prop-slot">
        {children}
      </g>
      {[38, 82, 158, 202].map((x) => (
        <circle
          key={x}
          cx={x}
          cy="96"
          r="13"
          fill="var(--mfd-bg)"
          stroke="var(--mfd-text)"
          strokeWidth="3"
          data-testid="parade-float-wheel"
        />
      ))}
      {[38, 82, 158, 202].map((x) => (
        <circle key={`hub-${x}`} cx={x} cy="96" r="5" fill="var(--mfd-gold)" />
      ))}
    </svg>
  );
}
