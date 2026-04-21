import type { CSSProperties } from 'react';
import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import type { PlayoffLoreCard } from '../../lib/playoff-lore';
import { autoGrid, display, monoSm, pixelSm } from '../shared/pixelUi';

function roundLabel(round: PlayoffLoreCard['round']): string {
  switch (round) {
    case 'wild_card':
      return 'Wild Card';
    case 'divisional':
      return 'Divisional';
    case 'conference':
      return 'Conference Final';
    case 'super_bowl':
      return 'Championship';
    default:
      return 'Playoffs';
  }
}

function outcomeAccent(outcome: PlayoffLoreCard['outcome']) {
  return outcome === 'win' ? 'gold' as const : 'red' as const;
}

function surfaceStyle(outcome: PlayoffLoreCard['outcome']): CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '12px',
    border: `3px solid ${outcome === 'win' ? 'var(--mfd-gold)' : 'var(--mfd-red)'}`,
    background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.98) 0%, rgba(8, 12, 18, 0.98) 100%)',
    boxShadow: outcome === 'win'
      ? '0 0 0 2px rgba(255, 215, 0, 0.18) inset'
      : '0 0 0 2px rgba(255, 90, 90, 0.18) inset',
  };
}

export function PlayoffLoreCardView({ card }: { card: PlayoffLoreCard }) {
  return (
    <section style={surfaceStyle(card.outcome)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <PixelBadge variant="cyan">{card.seasonYear}</PixelBadge>
            <PixelBadge variant="default">{roundLabel(card.round)}</PixelBadge>
            <PixelBadge variant={outcomeAccent(card.outcome)}>{card.outcome.toUpperCase()}</PixelBadge>
          </div>
          <div style={{ ...display, fontSize: '24px', color: 'var(--mfd-text)' }}>
            {card.finalScore}
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{card.headline}</div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {card.tags.map((tag) => (
            <PixelBadge key={`${card.gameId}-${tag}`} variant="gold">{tag}</PixelBadge>
          ))}
        </div>
      </div>

      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
        {card.loreHook}
      </div>

      {card.namedGameName ? (
        <div style={{ ...pixelSm, color: 'var(--mfd-cyan)' }}>
          NAMED GAME // {card.namedGameName}
        </div>
      ) : null}

      <div style={autoGrid(170)}>
        {card.heroBlocks.map((block) => (
          <PixelPanel key={`${card.gameId}-${block.label}`} title={block.label} accent="cyan">
            <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
              {block.value}
            </div>
          </PixelPanel>
        ))}
      </div>
    </section>
  );
}
