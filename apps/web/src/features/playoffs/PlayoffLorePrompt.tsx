import { useRef } from 'react';
import { PixelButton, PixelModal } from '@mfd/design-system/components';
import { selectUserTeam, useGameStore } from '../../app/store/game-store';
import type { PlayoffLoreCard } from '../../lib/playoff-lore';
import { monoSm, teamThemeVars } from '../shared/pixelUi';
import { createExportFrame } from '../season/export-frame';
import { PlayoffLoreCardView } from './PlayoffLoreCard';

export interface PlayoffLorePromptProps {
  open: boolean;
  onClose: () => void;
}

function slugifyRound(round: PlayoffLoreCard['round']): string {
  return round.replaceAll('_', '-');
}

export function dismissPlayoffLorePrompt(
  clearReveal: () => void,
  onClose: () => void,
): void {
  clearReveal();
  onClose();
}

function titleCase(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part[0] ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
    .join(' ');
}

export async function exportPlayoffLoreAsPng(
  target: HTMLElement,
  card: PlayoffLoreCard,
  teamId?: string | null,
): Promise<string> {
  const { exportRecapAsPng } = await import('../season/recap-share');
  const { frame, cleanup } = createExportFrame(target, {
    title: 'Playoff Lore',
    subtitle: `${card.seasonYear} ${titleCase(card.round)}`,
    footer: `${card.seasonYear} • ${titleCase(card.round)} • MFD`,
    themeVars: teamThemeVars(teamId ?? undefined),
  });
  try {
    const dataUrl = await exportRecapAsPng(frame);
    if (typeof document !== 'undefined') {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `playoff-lore-${card.seasonYear}-${slugifyRound(card.round)}.png`;
      link.click();
    }
    return dataUrl;
  } finally {
    cleanup();
  }
}

export function PlayoffLorePrompt({ open, onClose }: PlayoffLorePromptProps) {
  const card = useGameStore((state) => state.pendingPlayoffLoreReveal);
  const userTeam = useGameStore(selectUserTeam);
  const clearReveal = useGameStore((state) => state.actions.clearPendingPlayoffLoreReveal);
  const exportRef = useRef<HTMLDivElement | null>(null);

  if (!card) return null;

  const dismiss = () => dismissPlayoffLorePrompt(clearReveal, onClose);
  const exportCard = async () => {
    if (!exportRef.current) return;
    await exportPlayoffLoreAsPng(exportRef.current, card, userTeam?.id);
  };

  return (
    <PixelModal
      open={open}
      onOpenChange={(isOpen) => { if (!isOpen) dismiss(); }}
      title="Playoff Lore Card"
      accent="gold"
      width={700}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
          The playoff archive stamped this round immediately. It will fold into the dynasty scrapbook at season rollover.
        </div>

        <div ref={exportRef}>
          <PlayoffLoreCardView card={card} />
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <PixelButton accent="default" onClick={dismiss}>
            Dismiss
          </PixelButton>
          <PixelButton accent="gold" onClick={() => { void exportCard(); }}>
            Export PNG
          </PixelButton>
        </div>
      </div>
    </PixelModal>
  );
}
