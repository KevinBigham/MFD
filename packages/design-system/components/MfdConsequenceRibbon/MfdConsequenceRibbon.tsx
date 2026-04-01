import { type CSSProperties } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

interface Consequence {
  id: string;
  label: string;
  delta: string;
  direction: 'positive' | 'negative' | 'neutral' | 'warning';
}

interface MfdConsequenceRibbonProps {
  consequences: Consequence[];
  className?: string;
  style?: CSSProperties;
}

const directionConfig = {
  positive: { color: 'var(--mfd-green)', Icon: TrendingUp },
  negative: { color: 'var(--mfd-red)', Icon: TrendingDown },
  neutral:  { color: 'var(--mfd-text-dim)', Icon: Minus },
  warning:  { color: 'var(--mfd-orange)', Icon: AlertTriangle },
};

export function MfdConsequenceRibbon({ consequences, className, style }: MfdConsequenceRibbonProps) {
  if (consequences.length === 0) return null;

  return (
    <div
      className={className}
      role="status"
      aria-label="Action consequences"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--mfd-sp-lg)',
        padding: 'var(--mfd-sp-sm) var(--mfd-sp-lg)',
        background: 'var(--mfd-bg-2)',
        borderTop: '1px solid var(--mfd-border)',
        borderBottom: '1px solid var(--mfd-border)',
        overflowX: 'auto',
        animation: 'mfd-slideIn var(--mfd-motion-normal)',
        ...style,
      }}
    >
      {consequences.map((c) => {
        const { color, Icon } = directionConfig[c.direction];
        return (
          <div
            key={c.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            <Icon size={12} style={{ color, flexShrink: 0 }} />
            <span style={{
              fontSize: '0.6875rem',
              fontFamily: 'var(--mfd-font-mono)',
              color: 'var(--mfd-text-dim)',
            }}>
              {c.label}
            </span>
            <span style={{
              fontSize: '0.75rem',
              fontFamily: 'var(--mfd-font-mono)',
              fontWeight: 600,
              color,
            }}>
              {c.delta}
            </span>
          </div>
        );
      })}
    </div>
  );
}
