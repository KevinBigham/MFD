import type { ForecastBoard as ForecastBoardModel } from '@mfd/engine';
import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import { monoSm, pixelSm } from '../shared/pixelUi';

const CARD_ACCENT: Record<string, string> = {
  week_one_readiness: 'var(--mfd-gold)',
  scheme_cohesion: 'var(--mfd-cyan)',
  culture_stability: 'var(--mfd-green)',
  cap_flexibility: 'var(--mfd-gold)',
  owner_heat: 'var(--mfd-red)',
};

function deltaLabel(direction: 'up' | 'down' | 'flat', delta: number) {
  if (direction === 'flat' || delta === 0) return 'EVEN';
  return `${direction === 'up' ? '+' : ''}${delta}`;
}

export function ForecastBoard({ forecast }: { forecast: ForecastBoardModel }) {
  return (
    <PixelPanel title="Forecast Board" accent="cyan">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
          {forecast.summary}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '10px',
          }}
        >
          {forecast.cards.map((card) => {
            const accent = CARD_ACCENT[card.id] ?? 'var(--mfd-border)';
            return (
              <div
                key={card.id}
                style={{
                  border: `2px solid ${accent}`,
                  background: 'var(--mfd-bg-3)',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                  <span style={{ ...pixelSm, color: accent }}>{card.label}</span>
                  <PixelBadge variant={card.direction === 'up' ? 'green' : card.direction === 'down' ? 'red' : 'default'}>
                    {deltaLabel(card.direction, card.delta)}
                  </PixelBadge>
                </div>
                <div style={{ ...pixelSm, color: 'var(--mfd-text)' }}>{card.value}</div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{card.detail}</div>
              </div>
            );
          })}
        </div>
      </div>
    </PixelPanel>
  );
}
