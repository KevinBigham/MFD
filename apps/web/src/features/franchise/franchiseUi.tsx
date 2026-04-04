import type { ReactNode } from 'react';
import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import type { FranchiseEra, FranchiseLegend } from '@mfd/engine';
import { display, mono, monoSm, pixelSm } from '../shared/pixelUi';

type Accent = 'default' | 'gold' | 'cyan' | 'green' | 'red';

function accentColor(accent: Accent): string {
  if (accent === 'gold') return 'var(--mfd-gold)';
  if (accent === 'cyan') return 'var(--mfd-cyan)';
  if (accent === 'green') return 'var(--mfd-green)';
  if (accent === 'red') return 'var(--mfd-red)';
  return 'var(--mfd-text-dim)';
}

function eraAccent(name: string): Accent {
  if (/dynasty/i.test(name)) return 'gold';
  if (/dark/i.test(name)) return 'red';
  if (/rebuild/i.test(name)) return 'cyan';
  if (/gold/i.test(name)) return 'green';
  return 'default';
}

export function FranchiseGauge({
  label,
  value,
  accent,
  detail,
}: {
  label: string;
  value: number;
  accent: Accent;
  detail?: ReactNode;
}) {
  return (
    <PixelPanel title={label} accent={accent}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
          <span style={{ ...display, fontSize: '28px', color: 'var(--mfd-text)', lineHeight: 1 }}>{value}</span>
          <PixelBadge variant={accent === 'default' ? 'default' : accent}>{label}</PixelBadge>
        </div>
        <div style={{
          height: '10px',
          border: '2px solid var(--mfd-text-dim)',
          background: 'var(--mfd-bg-2)',
          overflow: 'hidden',
        }}
        >
          <div style={{
            height: '100%',
            width: `${Math.max(0, Math.min(100, value))}%`,
            background: accentColor(accent),
          }}
          />
        </div>
        {detail ? <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{detail}</div> : null}
      </div>
    </PixelPanel>
  );
}

export function TrendSparkline({
  values,
  accent,
}: {
  values: number[];
  accent: Accent;
}) {
  if (values.length === 0) {
    return <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No trend data yet.</div>;
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 72 : (index / (values.length - 1)) * 144;
    const y = 42 - (((value - min) / range) * 36);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <svg width="100%" height="48" viewBox="0 0 144 48" role="img" aria-label="trend sparkline">
        <polyline
          fill="none"
          stroke={accentColor(accent)}
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        {values.map((value, index) => (
          <span key={`${value}-${index}`} style={{ ...pixelSm, color: 'var(--mfd-text-dim)' }}>
            Y-{values.length - index - 1}: {value}
          </span>
        ))}
      </div>
    </div>
  );
}

export function EraTimeline({ eras }: { eras: FranchiseEra[] }) {
  if (eras.length === 0) {
    return <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No franchise eras detected yet.</div>;
  }

  const totalSpan = eras.reduce((sum, era) => sum + ((era.endYear ?? era.startYear) - era.startYear + 1), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', minHeight: '44px', border: '2px solid var(--mfd-text-dim)', overflow: 'hidden' }}>
        {eras.map((era) => {
          const span = (era.endYear ?? era.startYear) - era.startYear + 1;
          return (
            <div
              key={`${era.name}-${era.startYear}`}
              style={{
                flex: `${span} 1 0`,
                background: accentColor(eraAccent(era.name)),
                color: 'var(--mfd-bg)',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '6px',
              }}
            >
              <span style={{ ...pixelSm, color: 'var(--mfd-bg)' }}>{era.name.toUpperCase()}</span>
              <span style={{ ...monoSm, color: 'var(--mfd-bg)' }}>
                {era.startYear}-{era.endYear ?? 'NOW'}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
        Timeline span: {totalSpan} season(s)
      </div>
    </div>
  );
}

export function LegendCard({ legend, index }: { legend: FranchiseLegend; index: number }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      padding: '12px',
      border: '3px solid var(--mfd-text-dim)',
      background: 'var(--mfd-bg-2)',
    }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
        <div>
          <div style={{ ...display, fontSize: '20px', color: 'var(--mfd-text)', lineHeight: 1 }}>
            #{index + 1} {legend.playerName.toUpperCase()}
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '6px' }}>
            {legend.pos} // peak {legend.peakOvr} // tenure {legend.tenureYears}Y
          </div>
        </div>
        <PixelBadge variant={legend.hallOfFame ? 'gold' : 'cyan'}>{legend.legacyScore.toFixed(1)}</PixelBadge>
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {legend.hallOfFame ? <PixelBadge variant="gold">HOF</PixelBadge> : null}
        {legend.championships > 0 ? <PixelBadge variant="green">{legend.championships}x Champ</PixelBadge> : null}
        {legend.mvps > 0 ? <PixelBadge variant="cyan">{legend.mvps}x MVP</PixelBadge> : null}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {legend.careerHighlights.slice(0, 3).map((highlight) => (
          <div key={highlight} style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            {highlight}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailStripe({
  label,
  value,
  accent = 'default',
}: {
  label: string;
  value: ReactNode;
  accent?: Accent;
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: '10px',
      alignItems: 'center',
      paddingBottom: '8px',
      borderBottom: `2px solid ${accentColor(accent)}`,
    }}
    >
      <span style={{ ...mono, color: 'var(--mfd-text-dim)' }}>{label}</span>
      <span style={{ ...mono, color: 'var(--mfd-text)' }}>{value}</span>
    </div>
  );
}
