import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import { monoSm, pixelSm } from '../shared/pixelUi';

export interface DayOneBetLedgerEntry {
  id: string;
  label: string;
  bet: string;
  readinessDelta: number;
  volatilityDelta: number;
  summaryLine: string;
}

function formatSignedDelta(value: number): string {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function readinessVariant(delta: number): 'green' | 'red' | 'default' {
  if (delta > 0) return 'green';
  if (delta < 0) return 'red';
  return 'default';
}

function volatilityVariant(delta: number): 'green' | 'red' | 'default' {
  if (delta < 0) return 'green';
  if (delta > 0) return 'red';
  return 'default';
}

export function DayOneBetLedger({ entries }: { entries: DayOneBetLedgerEntry[] }) {
  return (
    <PixelPanel title="Day 1 Bet Ledger" accent="cyan">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {entries.length === 0 ? (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            No Day 1 bets are locked yet. The room still needs its first commitment.
          </div>
        ) : entries.map((entry) => (
          <div
            key={entry.id}
            style={{
              border: '2px solid var(--mfd-border)',
              background: 'var(--mfd-bg-3)',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ ...pixelSm, color: 'var(--mfd-cyan)' }}>{entry.label.toUpperCase()}</div>
                <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.5 }}>{entry.bet}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <PixelBadge variant={readinessVariant(entry.readinessDelta)}>
                  {`WK1 ${formatSignedDelta(entry.readinessDelta)}`}
                </PixelBadge>
                <PixelBadge variant={volatilityVariant(entry.volatilityDelta)}>
                  {`VOL ${formatSignedDelta(entry.volatilityDelta)}`}
                </PixelBadge>
              </div>
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
              {entry.summaryLine}
            </div>
          </div>
        ))}
      </div>
    </PixelPanel>
  );
}
