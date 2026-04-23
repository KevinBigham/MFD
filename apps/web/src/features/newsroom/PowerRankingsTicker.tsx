import type { PowerRanking } from '@mfd/engine';
import { PixelBadge } from '@mfd/design-system/components';
import { useGameStore, selectPowerRankings, selectUserTeamId } from '../../app/store/game-store';
import { display, monoSm, navigateTo } from '../shared/pixelUi';

type Accent = 'default' | 'gold' | 'cyan' | 'green' | 'red';

function deltaAccent(delta: number): Accent {
  if (delta > 0) return 'green';
  if (delta < 0) return 'red';
  return 'default';
}

function deltaLabel(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return '—';
}

function rankAccent(ranking: PowerRanking, userTeamId: string | null, teamCount: number): Accent {
  if (ranking.teamId === userTeamId) return 'cyan';
  if (ranking.rank <= 5) return 'gold';
  if (ranking.rank > Math.max(0, teamCount - 5)) return 'red';
  return 'default';
}

interface PowerRankingsTickerProps {
  /** Max number of entries to render. Default 12 (a wide desktop ticker). */
  limit?: number;
  /** If true, clicking an entry deep-links to `/power-rankings`. Default true. */
  clickable?: boolean;
}

/**
 * Compact horizontal strip of power rankings for dashboard / hub placement.
 * Renders the top `limit` teams by rank, each as a tile with rank chip, abbr,
 * and delta arrow. The user team gets a cyan highlight regardless of position.
 *
 * Empty state: shows a dim monospace note instead of rendering a hollow row.
 */
export function PowerRankingsTicker({ limit = 12, clickable = true }: PowerRankingsTickerProps = {}) {
  const rankings = useGameStore(selectPowerRankings);
  const userTeamId = useGameStore(selectUserTeamId);

  if (rankings.length === 0) {
    return (
      <div
        data-testid="power-rankings-ticker-empty"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          border: '2px solid var(--mfd-border)',
          background: 'var(--mfd-bg-2)',
        }}
      >
        <PixelBadge variant="default">POWER</PixelBadge>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
          Rankings populate after the first regular-season week.
        </div>
      </div>
    );
  }

  const entries = rankings.slice(0, limit);
  const teamCount = rankings.length;

  return (
    <div
      data-testid="power-rankings-ticker"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px',
      }}
      >
        <div style={{ ...display, fontSize: '16px', color: 'var(--mfd-gold)', lineHeight: 1 }}>
          POWER RANKINGS // WEEKLY TICKER
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
          {entries.length} of {teamCount}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
        }}
      >
        {entries.map((ranking) => {
          const accent = rankAccent(ranking, userTeamId, teamCount);
          const delta = deltaAccent(ranking.delta);
          const onClick = clickable ? () => navigateTo('/power-rankings') : undefined;
          return (
            <div
              key={ranking.teamId}
              data-testid={`power-rankings-ticker-entry-${ranking.teamId}`}
              onClick={onClick}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={clickable
                ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigateTo('/power-rankings');
                  }
                }
                : undefined}
              style={{
                flex: '0 0 auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '8px 10px',
                minWidth: '130px',
                border: `2px solid ${accent === 'default' ? 'var(--mfd-border)' : `var(--mfd-${accent})`}`,
                background: 'var(--mfd-bg-2)',
                cursor: clickable ? 'pointer' : 'default',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                <PixelBadge variant={accent}>{`#${ranking.rank}`}</PixelBadge>
                <PixelBadge variant={delta}>{deltaLabel(ranking.delta)}</PixelBadge>
              </div>
              <div style={{ ...display, fontSize: '18px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                {ranking.teamName.toUpperCase()}
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                {ranking.record} // {ranking.score.toFixed(1)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
