import { useMemo } from 'react';
import { PixelBadge, PixelPanel, PixelTable } from '@mfd/design-system/components';
import type { PowerRanking as PowerRankingEntry } from '@mfd/engine';
import type { ColumnDef } from '@tanstack/react-table';
import {
  useGameStore,
  selectPowerRankings,
  selectUserPowerRanking,
  selectUserTeam,
} from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  display,
  monoSm,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';

export function PowerRankings() {
  const rankings = useGameStore(selectPowerRankings);
  const userTeam = useGameStore(selectUserTeam);
  const userRanking = useGameStore(selectUserPowerRanking);

  const topTeam = rankings[0] ?? null;
  const biggestMover = useMemo(() =>
    [...rankings]
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.rank - b.rank)[0] ?? null,
  [rankings]);

  const columns = useMemo<ColumnDef<PowerRankingEntry, unknown>[]>(() => [
    {
      accessorKey: 'rank',
      header: 'Rank',
      cell: ({ row }) => (
        <PixelBadge variant={rankAccent(row.original, userTeam?.id ?? null, rankings.length)}>
          #{row.original.rank}
        </PixelBadge>
      ),
    },
    {
      id: 'delta',
      header: 'Trend',
      cell: ({ row }) => (
        <PixelBadge variant={deltaAccent(row.original.delta)}>
          {deltaLabel(row.original.delta)}
        </PixelBadge>
      ),
    },
    {
      accessorKey: 'teamName',
      header: 'Team',
      cell: ({ row }) => {
        const accent = rankAccent(row.original, userTeam?.id ?? null, rankings.length);
        return (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              paddingLeft: '10px',
              borderLeft: `3px solid ${accentColor(accent)}`,
            }}
          >
            <span style={{ ...display, fontSize: '18px', color: '#fff', lineHeight: 1 }}>
              {row.original.teamName.toUpperCase()}
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {row.original.teamId === userTeam?.id ? <PixelBadge variant="cyan">USER TEAM</PixelBadge> : null}
              {row.original.rank <= 5 ? <PixelBadge variant="gold">TOP 5</PixelBadge> : null}
              {row.original.rank > rankings.length - 5 ? <PixelBadge variant="red">BOTTOM 5</PixelBadge> : null}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'record',
      header: 'Record',
      cell: ({ row }) => <span style={{ color: '#fff', fontFamily: 'var(--mfd-font-mono)' }}>{row.original.record}</span>,
    },
    {
      accessorKey: 'score',
      header: 'Score',
      cell: ({ row }) => (
        <span style={{ color: 'var(--mfd-cyan)', fontFamily: 'var(--mfd-font-mono)' }}>
          {row.original.score.toFixed(1)}
        </span>
      ),
    },
    {
      accessorKey: 'blurb',
      header: 'Broadcast Note',
      cell: ({ row }) => <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{row.original.blurb}</span>,
    },
  ], [rankings, userTeam]);

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Power Rankings"
        subtitle="League-wide momentum board with weekly movement, tier pressure, and narrative context."
        badges={(
          <>
            <PixelBadge variant="gold">{rankings.length} teams tracked</PixelBadge>
            {userRanking ? <PixelBadge variant="cyan">USER #{userRanking.rank}</PixelBadge> : null}
          </>
        )}
      />

      <div style={autoGrid(220)}>
        <PixelMetricCard
          label="No. 1 Team"
          value={topTeam ? `#${topTeam.rank}` : 'N/A'}
          accent="gold"
          detail={topTeam?.teamName ?? 'No rankings generated yet'}
          badge={topTeam ? <PixelBadge variant="gold">{topTeam.record}</PixelBadge> : null}
        />
        <PixelMetricCard
          label="User Position"
          value={userRanking ? `#${userRanking.rank}` : 'UNRANKED'}
          accent={userRanking ? rankAccent(userRanking, userTeam?.id ?? null, rankings.length) : 'default'}
          detail={userRanking?.blurb ?? 'Advance a regular-season week to generate the table.'}
          badge={userRanking ? <PixelBadge variant={deltaAccent(userRanking.delta)}>{deltaLabel(userRanking.delta)}</PixelBadge> : null}
        />
        <PixelMetricCard
          label="Biggest Mover"
          value={biggestMover ? biggestMover.teamName : 'N/A'}
          accent={biggestMover ? deltaAccent(biggestMover.delta) : 'default'}
          detail={biggestMover ? `Shift ${deltaLabel(biggestMover.delta)} this week` : 'No weekly movement recorded yet.'}
          badge={biggestMover ? <PixelBadge variant={deltaAccent(biggestMover.delta)}>{`#${biggestMover.rank}`}</PixelBadge> : null}
        />
      </div>

      <PixelPanel title="League Ladder" accent="gold">
        {rankings.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ ...pixelSm, color: 'var(--mfd-gold)' }}>NO TABLE YET</div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              Power rankings generate after each regular-season week. Advance the season to start the drama cycle.
            </div>
          </div>
        ) : (
          <PixelTable
            data={rankings}
            columns={columns}
            accent="gold"
            maxHeight={720}
          />
        )}
      </PixelPanel>
    </div>
  );
}

function rankAccent(
  ranking: PowerRankingEntry,
  userTeamId: string | null,
  teamCount: number,
): 'default' | 'gold' | 'cyan' | 'green' | 'red' {
  if (ranking.teamId === userTeamId) return 'cyan';
  if (ranking.rank <= 5) return 'gold';
  if (ranking.rank > Math.max(0, teamCount - 5)) return 'red';
  return 'default';
}

function deltaAccent(delta: number): 'default' | 'gold' | 'cyan' | 'green' | 'red' {
  if (delta > 0) return 'green';
  if (delta < 0) return 'red';
  return 'default';
}

function deltaLabel(delta: number): string {
  if (delta > 0) return `UP ${delta}`;
  if (delta < 0) return `DOWN ${Math.abs(delta)}`;
  return 'EVEN';
}

function accentColor(accent: 'default' | 'gold' | 'cyan' | 'green' | 'red'): string {
  if (accent === 'gold') return 'var(--mfd-gold)';
  if (accent === 'cyan') return 'var(--mfd-cyan)';
  if (accent === 'green') return 'var(--mfd-green)';
  if (accent === 'red') return 'var(--mfd-red)';
  return 'var(--mfd-border)';
}
