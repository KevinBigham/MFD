import type { ChoiceForecastPreview } from '@mfd/engine';
import { PixelBadge } from '@mfd/design-system/components';
import { monoSm } from '../shared/pixelUi';

function formatSignedDelta(value: number): string {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function primaryVariant(delta: number): 'green' | 'red' | 'default' {
  if (delta > 0) return 'green';
  if (delta < 0) return 'red';
  return 'default';
}

function volatilityVariant(delta: number): 'green' | 'red' | 'default' {
  if (delta < 0) return 'green';
  if (delta > 0) return 'red';
  return 'default';
}

function renderContextLabel(label: string, delta: number): string {
  return `${label} ${formatSignedDelta(delta)}`;
}

export function ChoiceDeltaBadges({ preview }: { preview?: ChoiceForecastPreview | null }) {
  if (!preview) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <PixelBadge variant={primaryVariant(preview.weekOneReadinessDelta)}>
          {`Week 1 ${formatSignedDelta(preview.weekOneReadinessDelta)}`}
        </PixelBadge>
        <PixelBadge variant={volatilityVariant(preview.weekOneVolatilityDelta)}>
          {`Mistake Chance ${formatSignedDelta(preview.weekOneVolatilityDelta)}`}
        </PixelBadge>
        <span style={{ ...monoSm, color: 'var(--mfd-cyan)' }}>
          {renderContextLabel(preview.secondaryDelta.label, preview.secondaryDelta.delta)}
        </span>
        {preview.bonusDelta ? (
          <span style={{ ...monoSm, color: 'var(--mfd-red)' }}>
            {renderContextLabel(preview.bonusDelta.label, preview.bonusDelta.delta)}
          </span>
        ) : null}
      </div>
      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
        {preview.summaryLine}
      </div>
    </div>
  );
}
