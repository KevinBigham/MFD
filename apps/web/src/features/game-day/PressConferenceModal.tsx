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
  if (lockedIn) return 'fist-bump';
  if (reducedMotion) return 'reviewing-tablet';
  if (tier === 'high') return 'skeptical';
  if (tier === 'low') return 'note-taking';
  return 'reviewing-tablet';
}

export function buildPressConferenceChipCopy(
  tier: PressConferenceResponseTier,
  lockedIn: boolean,
): string {
  if (lockedIn) {
    return 'Optional: open the press record later for the saved quote. Consequence: score, owner reaction, player effects, news, social reaction, and next week do not change.';
  }

  const quoteStyle = tier === 'high'
    ? 'High Ambition saves the strongest promise in this press record'
    : tier === 'low'
      ? 'Low Key saves the least committal answer in this press record'
      : 'Measured saves a balanced answer without adding a promise or deflection';

  return `Optional: choose a public answer for this saved press record. Where: Quote Style, then Response Options. Consequence: ${quoteStyle}; result and next week do not change.`;
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
  const chipCopy = buildPressConferenceChipCopy(chipTier, lockedIn);
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
            text={chipCopy}
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

        <PixelPanel title="What This Changes" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="cyan">Public quote only</PixelBadge>
              <PixelBadge variant="gold">No gameplay change</PixelBadge>
              <PixelBadge variant="default">Result already final</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
              Your answer changes the saved quote shown for this press moment. The game result, headline, owner
              reaction, player changes, news, social reaction, and next-week state are already final.
            </div>
          </div>
        </PixelPanel>

        <PixelPanel title="Quote Style" accent="gold">
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
