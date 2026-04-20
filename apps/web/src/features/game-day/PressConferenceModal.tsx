import { PixelBadge, PixelButton, PixelModal, PixelPanel } from '@mfd/design-system/components';
import type { PressConferenceQueueEntry, PressConferenceResponseTier } from '@mfd/engine';
import { monoSm } from '../shared/pixelUi';

const TIER_LABELS: Record<PressConferenceResponseTier, string> = {
  high: 'High Ambition',
  mid: 'Measured',
  low: 'Low Key',
};

const TIER_ACCENTS: Record<PressConferenceResponseTier, 'gold' | 'cyan' | 'green'> = {
  high: 'gold',
  mid: 'cyan',
  low: 'green',
};

export function PressConferenceModal({
  open,
  entry,
  activeTier,
  promptBank = [],
  onTierChange,
  onRespond,
  onOpenChange,
}: {
  open: boolean;
  entry: PressConferenceQueueEntry | null;
  activeTier: PressConferenceResponseTier;
  promptBank?: readonly string[];
  onTierChange: (tier: PressConferenceResponseTier) => void;
  onRespond: (tier: PressConferenceResponseTier, response: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  if (!open || !entry) return null;

  const responses = activeTier === 'high'
    ? entry.responses.high
    : activeTier === 'low'
      ? entry.responses.low
      : entry.responses.mid;

  return (
    <PixelModal
      open={open}
      onOpenChange={onOpenChange}
      title="Postgame Press"
      description={`${entry.speaker} // ${entry.topic}`}
      accent="cyan"
      width={720}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant="cyan">{entry.speaker}</PixelBadge>
          <PixelBadge variant="gold">{entry.topic}</PixelBadge>
          <PixelBadge variant="default">{entry.scenario.replaceAll('_', ' ')}</PixelBadge>
        </div>

        <PixelPanel title="Podium Tone" accent="gold">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['high', 'mid', 'low'] as const).map((tier) => (
              <PixelButton
                key={tier}
                accent={activeTier === tier ? TIER_ACCENTS[tier] : 'default'}
                onClick={() => onTierChange(tier)}
              >
                {TIER_LABELS[tier]}
              </PixelButton>
            ))}
          </div>
        </PixelPanel>

        {promptBank.length > 0 ? (
          <PixelPanel title="Prompt Bank" accent="cyan">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {promptBank.slice(0, 3).map((prompt) => (
                <div key={prompt} style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
                  Q: {prompt}
                </div>
              ))}
            </div>
          </PixelPanel>
        ) : null}

        <PixelPanel title="Response Options" accent={TIER_ACCENTS[activeTier]}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {responses.map((response) => (
              <button
                key={response}
                type="button"
                onClick={() => onRespond(activeTier, response)}
                style={{
                  border: `2px solid var(--mfd-border)`,
                  background: 'var(--mfd-bg-2)',
                  color: 'var(--mfd-text)',
                  padding: '10px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'var(--mfd-font-mono)',
                  fontSize: '11px',
                  lineHeight: 1.6,
                }}
              >
                {response}
              </button>
            ))}
          </div>
        </PixelPanel>

        {entry.selectedResponse ? (
          <PixelPanel title="Last Answer" accent="green">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <PixelBadge variant="green">
                {TIER_LABELS[entry.selectedTier ?? 'mid']}
              </PixelBadge>
              <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{entry.selectedResponse}</div>
            </div>
          </PixelPanel>
        ) : null}
      </div>
    </PixelModal>
  );
}
