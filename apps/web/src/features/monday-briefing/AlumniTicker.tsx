import type { AlumniUpdate } from '@mfd/engine';
import { mono, monoSm, pixelSm } from '../shared/pixelUi';

interface AlumniTickerProps {
  updates: AlumniUpdate[];
  reducedMotion?: boolean;
}

const shellStyle = {
  position: 'relative',
  overflow: 'hidden',
  border: '1px solid rgba(245, 196, 90, 0.35)',
  background: 'linear-gradient(90deg, rgba(16, 18, 24, 0.96), rgba(28, 18, 10, 0.94) 45%, rgba(12, 15, 22, 0.96))',
  boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.04)',
} as const;

const itemStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '10px',
  whiteSpace: 'nowrap',
  paddingRight: '20px',
} as const;

const separatorStyle = {
  ...pixelSm,
  color: 'var(--mfd-accent-gold, #f5c45a)',
} as const;

export function AlumniTicker({ updates, reducedMotion = false }: AlumniTickerProps) {
  if (updates.length === 0) return null;

  const renderItems = (entries: AlumniUpdate[]) => entries.map((update, index) => (
    <div key={`${update.subjectId}-${index}`} style={itemStyle}>
      <span style={{ ...pixelSm, color: '#f8e3a2', textTransform: 'uppercase' }}>{update.subjectName}</span>
      <span style={{ ...monoSm, color: '#d7dbe3', lineHeight: 1.5 }}>{update.text}</span>
      {index < entries.length - 1 ? <span style={separatorStyle}>●</span> : null}
    </div>
  ));

  return (
    <div style={shellStyle}>
      <style>
        {`
          @keyframes mfd-alumni-marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}
      </style>
      <div
        data-motion={reducedMotion ? 'reduced' : 'marquee'}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '10px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ ...pixelSm, color: '#f7d36b', textTransform: 'uppercase' }}>WHERE ARE THEY NOW</span>
          <span style={{ ...mono, color: '#7d8593', fontSize: '11px' }}>ALUMNI WIRE</span>
        </div>

        {reducedMotion ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 18px' }}>
            {renderItems(updates)}
          </div>
        ) : (
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                display: 'flex',
                width: 'max-content',
                gap: '20px',
                animation: 'mfd-alumni-marquee 28s linear infinite',
                willChange: 'transform',
              }}
            >
              {renderItems([...updates, ...updates])}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
