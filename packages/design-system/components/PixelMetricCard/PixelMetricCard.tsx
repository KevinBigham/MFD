import type { ReactNode } from 'react';
import { PixelPanel } from '../PixelPanel';

type PixelAccent = 'default' | 'gold' | 'cyan' | 'green' | 'red';

interface PixelMetricCardProps {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  accent?: PixelAccent;
  badge?: ReactNode;
}

export function PixelMetricCard({
  label,
  value,
  detail,
  accent = 'default',
  badge,
}: PixelMetricCardProps) {
  return (
    <PixelPanel title={label} accent={accent}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '30px', color: '#fff', lineHeight: 1 }}>
            {value}
          </span>
          {badge}
        </div>
        {detail ? (
          <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
            {detail}
          </div>
        ) : null}
      </div>
    </PixelPanel>
  );
}
