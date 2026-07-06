import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import { monoSm, pixelSm } from '../shared/pixelUi';

export interface DayOneDecisionLedgerEntry {
  id: string;
  label: string;
  choice: string;
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

export function DayOneDecisionLedger({ entries }: { entries: DayOneDecisionLedgerEntry[] }) {
  return (
    <PixelPanel title="Setup Decision Impact" accent="cyan">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {entries.length === 0 ? (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            Next action: hire the Assistant GM first. That sets Chip's first setup priority: cap space, starter and backup jobs, the Week 1 game plan, or owner patience. Consequence: choosing cap guidance while roster jobs or the plan are unsettled keeps money up front; unassigned players and no coach owning the plan still need fixing before Week 1.
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
                <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.5 }}>{entry.choice}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <PixelBadge variant={readinessVariant(entry.readinessDelta)}>
                  {`WEEK 1 ${formatSignedDelta(entry.readinessDelta)}`}
                </PixelBadge>
                <PixelBadge variant={volatilityVariant(entry.volatilityDelta)}>
                  {`MISTAKE CHANCE ${formatSignedDelta(entry.volatilityDelta)}`}
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
