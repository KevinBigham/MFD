import { useMemo } from 'react';
import {
  PixelBadge,
  PixelPanel,
  PixelTable,
} from '@mfd/design-system/components';
import type { ColumnDef } from '@tanstack/react-table';
import type { FranchiseHistoryEntry, PlayerArchiveEntry } from '@mfd/engine';
import { useGameStore, selectUserTeam } from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  monoSm,
  screenStackStyle,
} from '../shared/pixelUi';

const historyColumns: ColumnDef<FranchiseHistoryEntry, unknown>[] = [
  {
    accessorKey: 'year',
    header: 'Year',
    cell: ({ getValue }) => <span style={{ color: '#fff' }}>{getValue() as number}</span>,
  },
  {
    accessorKey: 'record',
    header: 'Record',
  },
  {
    accessorKey: 'pointDifferential',
    header: '+/-',
    cell: ({ getValue }) => {
      const value = getValue() as number;
      const sign = value > 0 ? '+' : '';
      return <span style={{ color: value >= 0 ? 'var(--mfd-green)' : 'var(--mfd-red)' }}>{sign}{value}</span>;
    },
  },
  {
    accessorKey: 'playoffFinish',
    header: 'Finish',
    cell: ({ getValue }) => <PixelBadge variant={finishAccent(getValue() as string)}>{formatFinish(getValue() as string)}</PixelBadge>,
  },
];

const playerColumns: ColumnDef<PlayerArchiveEntry, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Player',
    cell: ({ row }) => <span style={{ color: '#fff' }}>{row.original.name}</span>,
  },
  {
    id: 'positions',
    header: 'Pos',
    cell: ({ row }) => <PixelBadge variant="default">{row.original.positions.join('/')}</PixelBadge>,
  },
  {
    accessorKey: 'peakOvr',
    header: 'Peak',
    cell: ({ getValue }) => <span style={{ color: 'var(--mfd-cyan)' }}>{getValue() as number}</span>,
  },
  {
    id: 'span',
    header: 'Span',
    cell: ({ row }) => (
      <span style={{ fontFamily: 'var(--mfd-font-mono)' }}>
        {row.original.firstYear}-{row.original.retirementYear ?? row.original.lastYear}
      </span>
    ),
  },
];

export function LegacyTimeline() {
  const game = useGameStore((state) => state.game);
  const userTeam = useGameStore(selectUserTeam);

  const teamHistory = useMemo(() => {
    if (!game || !userTeam) return [];
    return [...game.franchiseHistory]
      .filter((entry) => entry.teamId === userTeam.id)
      .sort((a, b) => b.year - a.year);
  }, [game, userTeam]);

  const timelineEvents = useMemo(() => teamHistory.flatMap((entry) =>
    entry.majorEvents.map((event, index) => ({
      id: `${entry.year}-${index}`,
      year: entry.year,
      event,
      accent: finishAccent(entry.playoffFinish),
    }))), [teamHistory]);

  const allTimeRoster = useMemo(() => {
    if (!game || !userTeam) return [];
    return [...game.playerArchive]
      .filter((entry) => entry.teamHistory.some((stint) => stint.teamId === userTeam.id))
      .sort((a, b) => b.peakOvr - a.peakOvr || b.peakYear - a.peakYear || a.name.localeCompare(b.name));
  }, [game, userTeam]);

  const titleCount = teamHistory.filter((entry) => entry.playoffFinish === 'champion').length;
  const legendCount = allTimeRoster.filter((entry) => entry.peakOvr >= 85).length;

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Dynasty Legacy"
        subtitle={`${userTeam ? `${userTeam.city} ${userTeam.name}` : 'Franchise'} history, season arc, and all-time roster archive.`}
        badges={(
          <>
            <PixelBadge variant="gold">{teamHistory.length} seasons</PixelBadge>
            <PixelBadge variant="green">{titleCount} titles</PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(220)}>
        <PixelMetricCard label="Seasons Tracked" value={teamHistory.length} accent="gold" detail="Archived finishes in the dynasty timeline" />
        <PixelMetricCard label="Championships" value={titleCount} accent="green" detail="Titles captured in the archive" />
        <PixelMetricCard label="Legends" value={legendCount} accent="cyan" detail="Players who peaked at 85+ overall" />
      </div>

      <div style={autoGrid(340)}>
        <PixelPanel title="Season Results" accent="gold">
          {teamHistory.length === 0 ? (
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No completed seasons archived yet.</span>
          ) : (
            <PixelTable data={teamHistory} columns={historyColumns} accent="gold" />
          )}
        </PixelPanel>

        <PixelPanel title="Franchise Timeline" accent="cyan">
          {timelineEvents.length === 0 ? (
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Major events will start stacking once seasons complete.</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {timelineEvents.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    paddingLeft: '10px',
                    borderLeft: `3px solid ${accentColor(entry.accent)}`,
                  }}
                >
                  <span style={{ ...monoSm, color: '#fff', minWidth: '52px' }}>{entry.year}</span>
                  <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{entry.event}</span>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>
      </div>

      <PixelPanel title="All-Time Roster" accent="green">
        {allTimeRoster.length === 0 ? (
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Player archive will populate as the dynasty advances.</span>
        ) : (
          <PixelTable data={allTimeRoster} columns={playerColumns} accent="green" />
        )}
      </PixelPanel>
    </div>
  );
}

function finishAccent(finish: string): 'default' | 'gold' | 'cyan' | 'green' | 'red' {
  if (finish === 'champion') return 'green';
  if (finish.includes('super_bowl')) return 'gold';
  if (finish.includes('conference')) return 'cyan';
  if (finish === 'missed_playoffs') return 'red';
  return 'default';
}

function formatFinish(finish: string): string {
  return finish.replace(/_/g, ' ');
}

function accentColor(accent: 'default' | 'gold' | 'cyan' | 'green' | 'red') {
  if (accent === 'gold') return 'var(--mfd-gold)';
  if (accent === 'cyan') return 'var(--mfd-cyan)';
  if (accent === 'green') return 'var(--mfd-green)';
  if (accent === 'red') return 'var(--mfd-red)';
  return 'var(--mfd-border)';
}
