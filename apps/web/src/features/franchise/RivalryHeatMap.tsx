import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import { selectUserTeam, useGameStore } from '../../app/store/game-store';
import { computeRivalryHeatMap } from '../../lib/rivalry-heat-map';
import { monoSm, teamThemeVars } from '../shared/pixelUi';

function heatBadgeVariant(level: ReturnType<typeof computeRivalryHeatMap>[number]['heatLevel']) {
  if (level === 'scalding') return 'gold' as const;
  if (level === 'hot') return 'red' as const;
  if (level === 'warm') return 'cyan' as const;
  return 'default' as const;
}

function heatLabel(level: ReturnType<typeof computeRivalryHeatMap>[number]['heatLevel']): string {
  return level.toUpperCase();
}

function formatRecord(wins: number, losses: number, ties: number): string {
  return `${wins}-${losses}-${ties}`;
}

function formatWinPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatLatestMeeting(entry: ReturnType<typeof computeRivalryHeatMap>[number]): string {
  if (!entry.latestMeeting) return 'No saved meetings yet';
  const result = entry.latestMeeting.result.toUpperCase();
  return `${result} ${entry.latestMeeting.score} // ${entry.latestMeeting.year} W${entry.latestMeeting.week}`;
}

export function RivalryHeatMap() {
  const game = useGameStore((state) => state.game);
  const userTeam = useGameStore(selectUserTeam);

  if (!userTeam) return null;

  const entries = computeRivalryHeatMap(game, userTeam.id);

  return (
    <PixelPanel title="Rivalries" accent="red">
      {entries.length === 0 ? (
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
          No rivalries declared for this franchise.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {entries.map((entry) => (
            <div
              key={entry.rivalTeamId}
              style={{
                ...teamThemeVars(entry.rivalTeamId),
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                alignItems: 'center',
                flexWrap: 'wrap',
                padding: '12px',
                borderLeft: '3px solid var(--mfd-team-primary)',
                background: 'var(--mfd-bg-elevated)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <PixelBadge variant="default">{entry.rivalAbbr}</PixelBadge>
                  <PixelBadge variant={heatBadgeVariant(entry.heatLevel)}>{heatLabel(entry.heatLevel)}</PixelBadge>
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>
                  {entry.rivalCityName}
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  Latest: {formatLatestMeeting(entry)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  {formatRecord(entry.wins, entry.losses, entry.ties)}
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  {entry.totalGames} game{entry.totalGames === 1 ? '' : 's'}
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>
                  {formatWinPct(entry.winPct)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{
        ...monoSm,
        color: 'var(--mfd-text-dim)',
        lineHeight: 1.6,
        borderTop: '1px solid var(--mfd-border)',
        paddingTop: '10px',
        marginTop: '10px',
      }}
      >
        Source: authored team rivalry content plus runtime team lookup. W-L-T, total games, and latest meeting are derived from saved completed schedule and playoff results; rendering does not write rivalry state.
      </div>
    </PixelPanel>
  );
}
