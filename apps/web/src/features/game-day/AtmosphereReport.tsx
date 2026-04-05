/**
 * Atmosphere Report — embedded in GameDayRecap
 *
 * Crowd energy gauge, hostility meter, noise, factors list.
 */

import type { AtmosphereContext } from '@mfd/engine';
import { PixelPanel, PixelBadge } from '@mfd/design-system/components';

/* ── Shared styles ──────────────────────────────────────── */
const pixel = { fontFamily: 'var(--mfd-font-pixel)', fontSize: '8px' } as const;
const monoSm = { fontFamily: 'var(--mfd-font-mono)', fontSize: '11px' } as const;

/* ── Helpers ────────────────────────────────────────────── */

function intensityLabel(intensity: string): string {
  switch (intensity) {
    case 'super_bowl': return 'SUPER BOWL';
    case 'conference_championship': return 'CONFERENCE FINAL';
    case 'playoff': return 'PLAYOFF';
    case 'rivalry': return 'RIVALRY';
    default: return 'REGULAR';
  }
}

function intensityVariant(intensity: string): 'gold' | 'red' | 'cyan' | 'green' | 'default' {
  switch (intensity) {
    case 'super_bowl': return 'gold';
    case 'conference_championship': return 'gold';
    case 'playoff': return 'cyan';
    case 'rivalry': return 'red';
    default: return 'default';
  }
}

function energyColor(value: number): string {
  if (value >= 90) return 'var(--mfd-gold)';
  if (value >= 70) return 'var(--mfd-green)';
  if (value >= 40) return 'var(--mfd-cyan)';
  return '#666';
}

/* ── Meter Row ──────────────────────────────────────────── */

function MeterRow({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 80 ? 'var(--mfd-gold)' : pct >= 50 ? 'var(--mfd-green)' : 'var(--mfd-cyan)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ ...pixel, color: '#999', width: '50px' }}>{label}</span>
      <div style={{ flex: 1, height: '6px', background: '#222', border: '1px solid #333' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
      <span style={{ ...monoSm, color: '#ccc', width: '24px', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

/* ── Component ──────────────────────────────────────────── */

export interface AtmosphereReportProps {
  atmosphere: AtmosphereContext | null;
}

export function AtmosphereReport({ atmosphere }: AtmosphereReportProps) {
  if (!atmosphere) return null;

  return (
    <PixelPanel title="Stadium Atmosphere" accent={intensityVariant(atmosphere.intensity)}>
      <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Intensity badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <PixelBadge variant={intensityVariant(atmosphere.intensity)}>
            {intensityLabel(atmosphere.intensity)}
          </PixelBadge>
          <span style={{ ...pixel, color: energyColor(atmosphere.crowdEnergy) }}>
            ENERGY {atmosphere.crowdEnergy}
          </span>
        </div>

        {/* Meters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <MeterRow label="CROWD" value={atmosphere.crowdEnergy} />
          <MeterRow label="HOSTILE" value={atmosphere.hostility} />
          <MeterRow label="NOISE" value={atmosphere.noise} />
        </div>

        {/* Factors */}
        {atmosphere.factors.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {atmosphere.factors.map((f, i) => (
              <PixelBadge key={i} variant="default">{f.toUpperCase()}</PixelBadge>
            ))}
          </div>
        )}
      </div>
    </PixelPanel>
  );
}
