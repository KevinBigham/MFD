import { PixelPanel } from '@mfd/design-system/components';
import { readRookieOfYearEntries } from '../../lib/rookie-of-year-store';
import { monoSm } from '../shared/pixelUi';
import { RookieOfYearCard } from './RookieOfYearCard';

export function RookieOfYearHistory({
  dynastyId,
}: {
  dynastyId: string | null;
}) {
  const entries = dynastyId ? readRookieOfYearEntries(dynastyId) : [];

  return (
    <PixelPanel title="Rookie of the Year — Your Dynasty" accent="gold">
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
    </PixelPanel>
  );
}
