import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { readRookieOfYearEntries } from '../../lib/rookie-of-year-store';
import { monoSm, navigateTo } from '../shared/pixelUi';
import { RookieOfYearCard } from './RookieOfYearCard';

export function RookieOfYearHistory({
  dynastyId,
}: {
  dynastyId: string | null;
}) {
  const entries = dynastyId ? readRookieOfYearEntries(dynastyId) : [];

  return (
    <PixelPanel title="Rookie of the Year — Your Dynasty" accent="gold">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {entries.length === 0 ? (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            No rookie award archive yet. Finish a season to crown the first winner.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {entries.map((entry) => (
              <RookieOfYearCard key={`${entry.playerId}-${entry.season}`} entry={entry} />
            ))}
          </div>
        )}

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
          padding: '10px',
          border: '2px solid var(--mfd-gold)',
          background: 'var(--mfd-bg-2)',
        }}
        >
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7, maxWidth: '560px' }}>
            Turn the award archive into the next class plan: scout the board, run the draft room, and develop the rookie who can join this wall.
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <PixelButton accent="cyan" onClick={() => navigateTo('/scouting')}>Scouting</PixelButton>
            <PixelButton accent="gold" onClick={() => navigateTo('/draft')}>Draft Board</PixelButton>
            <PixelButton accent="green" onClick={() => navigateTo('/player-development')}>Development</PixelButton>
          </div>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '10px',
          border: '2px solid var(--mfd-border)',
          background: 'var(--mfd-bg-2)',
        }}
        >
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <PixelBadge variant="cyan">mfd.rookieOfYear.v1</PixelBadge>
            <PixelBadge variant="gold">Year rollover</PixelBadge>
            <PixelBadge variant={dynastyId ? 'green' : 'default'}>
              {dynastyId ? 'Dynasty scoped' : 'No dynasty id'}
            </PixelBadge>
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            Source: reads browser-local rookie award entries through readRookieOfYearEntries(dynastyId).
            App shell syncRookieOfYearAtYearRollover computes the completed previousYear with computeRookieOfYear
            and upserts one winner per dynasty season. Opening this panel does not recompute winners, write GameState,
            change the sidecar, autosave, or play games or reroll saved outcomes.
          </div>
        </div>
      </div>
    </PixelPanel>
  );
}
