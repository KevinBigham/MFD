import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import { display, monoSm } from '../shared/pixelUi';
import type { RookieOfYearEntry } from '../../lib/rookie-of-year';

function formatCompositeScore(score: number): string {
  return score.toFixed(1);
}

export function RookieOfYearCard({
  entry,
}: {
  entry: RookieOfYearEntry;
}) {
  return (
    <PixelPanel title={`${entry.season} Rookie of the Year`} accent="gold">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <PixelBadge variant="gold">{entry.season}</PixelBadge>
          <PixelBadge variant="cyan">{entry.teamAbbr}</PixelBadge>
          <PixelBadge variant="default">{entry.position}</PixelBadge>
        </div>

        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
          {entry.headline}
        </div>

        <div style={{ ...display, fontSize: '28px', color: 'var(--mfd-text)', lineHeight: 1 }}>
          {entry.playerName.toUpperCase()}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Composite Score</div>
          <div style={{ ...display, fontSize: '20px', color: 'var(--mfd-gold)', lineHeight: 1 }}>
            {formatCompositeScore(entry.compositeScore)}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {entry.highlights.length === 0 ? (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
              No season highlights archived for this winner.
            </div>
          ) : (
            entry.highlights.map((highlight, index) => (
              <div key={`${entry.playerId}-${index}`} style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
                {highlight}
              </div>
            ))
          )}
        </div>
      </div>
    </PixelPanel>
  );
}
