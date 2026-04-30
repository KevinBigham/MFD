import { useState } from 'react';
import { Chip, ChipDialogueBubble, PixelBadge, PixelButton, PixelModal, PixelPanel, type ChipPose } from '@mfd/design-system/components';
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

export function getPressConferenceChipPose(
  tier: PressConferenceResponseTier,
  lockedIn: boolean,
  reducedMotion = false,
): ChipPose {
  if (lockedIn) return 'thumbs-up';
  if (reducedMotion) return 'think';
  if (tier === 'high') return 'concern';
  if (tier === 'low') return 'thumbs-up';
  return 'think';
}

export function PressConferenceModal({
  open,
  entry,
  activeTier,
  promptBank = [],
  onTierChange,
  onRespond,
  onOpenChange,
  reducedMotion = false,
}: {
  open: boolean;
  entry: PressConferenceQueueEntry | null;
  activeTier: PressConferenceResponseTier;
  promptBank?: readonly string[];
  onTierChange: (tier: PressConferenceResponseTier) => void;
  onRespond: (tier: PressConferenceResponseTier, response: string) => void;
  onOpenChange: (open: boolean) => void;
  reducedMotion?: boolean;
}) {
  const [previewTier, setPreviewTier] = useState<PressConferenceResponseTier | null>(null);
  const [lockedIn, setLockedIn] = useState(false);

  if (!open || !entry) return null;

  const responses = activeTier === 'high'
    ? entry.responses.high
    : activeTier === 'low'
      ? entry.responses.low
      : entry.responses.mid;
  const chipTier = previewTier ?? activeTier;
  const chipPose = getPressConferenceChipPose(chipTier, lockedIn, reducedMotion);
  const setPreview = (tier: PressConferenceResponseTier | null) => {
    if (!reducedMotion) setPreviewTier(tier);
  };

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
        <div
          data-press-chip-host="true"
          data-press-chip-pose={chipPose}
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto minmax(0, 1fr)',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <Chip pose={chipPose} size="md" reducedMotion={reducedMotion} ariaLabel="Chip hosts the postgame press conference" />
          <ChipDialogueBubble
            text="Podium tone travels. Pick the answer you want quoted tomorrow."
            pose={chipPose}
            pointer="left"
            reducedMotion={reducedMotion}
            monoBody
          />
        </div>

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
                onMouseEnter={() => setPreview(tier)}
                onFocus={() => setPreview(tier)}
                onMouseLeave={() => setPreview(null)}
                onBlur={() => setPreview(null)}
                onClick={() => {
                  setPreview(null);
                  onTierChange(tier);
                }}
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
                onClick={() => {
                  setLockedIn(true);
                  onRespond(activeTier, response);
                }}
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
