import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  PixelBadge,
  PixelPanel,
  PixelSelect,
  PixelTable,
} from '@mfd/design-system/components';
import {
  selectTeamSchedule,
  selectUserTeam,
  selectWeek,
  selectWeekSchedule,
  useGameStore,
} from '../../app/store/game-store';
import {
  PixelScreenHeader,
  autoGrid,
  monoSm,
  screenStackStyle,
} from '../shared/pixelUi';

type TeamScheduleRow = ReturnType<typeof selectTeamSchedule> extends Array<infer Entry> ? Entry : never;
type WeekScheduleRow = ReturnType<ReturnType<typeof selectWeekSchedule>> extends Array<infer Entry> ? Entry : never;
type SourceAccent = 'default' | 'gold' | 'cyan' | 'green';

interface ScheduleSourceRow {
  id: string;
  label: string;
  badge: string;
  accent: SourceAccent;
  detail: string;
}

function resultLabel(entry: TeamScheduleRow) {
  if (entry.bye) return 'BYE';
  if (!entry.result) return 'Upcoming';
  const teamWon = entry.home
    ? entry.result.homeScore > entry.result.awayScore
    : entry.result.awayScore > entry.result.homeScore;
  const teamTied = entry.result.homeScore === entry.result.awayScore;
  if (teamTied) return `T ${entry.result.homeScore}-${entry.result.awayScore}`;
  return `${teamWon ? 'W' : 'L'} ${entry.home ? entry.result.homeScore : entry.result.awayScore}-${entry.home ? entry.result.awayScore : entry.result.homeScore}`;
}

export function buildScheduleSourceRows(
  teamSchedule: TeamScheduleRow[],
  weekSchedule: WeekScheduleRow[],
  selectedWeek: number,
  seasonWeeks: number,
): ScheduleSourceRow[] {
  const primetimeCount = teamSchedule.filter((entry) => entry.primetime).length;
  const flexedCount = teamSchedule.filter((entry) => entry.flexed).length;
  const completedCount = teamSchedule.filter((entry) => entry.result).length;
  const byeCount = teamSchedule.filter((entry) => entry.bye).length;

  return [
    {
      id: 'team-slate',
      label: 'Team slate',
      badge: `${teamSchedule.length} rows`,
      accent: 'cyan',
      detail: `selectTeamSchedule reads the saved user-team schedule across ${seasonWeeks} weeks, including byes, stored results, records after completed games, broadcasts, and flex tags.`,
    },
    {
      id: 'league-slate',
      label: 'League slate',
      badge: `W${selectedWeek} // ${weekSchedule.length} games`,
      accent: 'gold',
      detail: 'selectWeekSchedule(selectedWeek) projects saved ScheduledGame rows for the chosen week; changing the dropdown only changes this read.',
    },
    {
      id: 'broadcast-flex',
      label: 'Broadcast / flex',
      badge: `${primetimeCount} prime / ${flexedCount} flex`,
      accent: 'green',
      detail: 'Primetime, flexed, and broadcast network badges come from saved schedule fields assigned by week-advance and media paths.',
    },
    {
      id: 'results',
      label: 'Results / byes',
      badge: `${completedCount} final / ${byeCount} byes`,
      accent: 'default',
      detail: 'Final scores and record-after-game rows read stored results. Pending games stay pending until the advance-week path writes outcomes.',
    },
    {
      id: 'render-boundary',
      label: 'Just viewing',
      badge: 'display only',
      accent: 'default',
      detail: 'Opening Schedule does not generate a schedule, assign broadcasts, flex games, weather, results, records, news, or game-day packages.',
    },
  ];
}

const teamColumns: ColumnDef<TeamScheduleRow, unknown>[] = [
  {
    accessorKey: 'week',
    header: 'Week',
    cell: ({ row }) => (
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        <PixelBadge variant={row.original.primetime ? 'gold' : 'default'}>{`W${row.original.week}`}</PixelBadge>
        {row.original.flexed ? <PixelBadge variant="gold">FLEXED</PixelBadge> : null}
      </div>
    ),
  },
  {
    id: 'opponent',
    header: 'Opponent',
    cell: ({ row }) => (
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        <PixelBadge variant={row.original.home ? 'cyan' : 'green'}>{row.original.bye ? 'BYE' : row.original.home ? 'HOME' : 'AWAY'}</PixelBadge>
        <span style={{ color: row.original.primetime ? 'var(--mfd-gold)' : '#fff' }}>{row.original.opponentName}</span>
      </div>
    ),
  },
  {
    accessorKey: 'broadcastNetwork',
    header: 'Network',
    cell: ({ row }) => row.original.broadcastNetwork ? (
      <PixelBadge variant={row.original.primetime ? 'gold' : 'cyan'}>{row.original.broadcastNetwork}</PixelBadge>
    ) : (
      <span style={{ color: '#777' }}>-</span>
    ),
  },
  {
    id: 'spotlight',
    header: 'Spotlight',
    cell: ({ row }) => (
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {row.original.primetime ? <PixelBadge variant="gold">Primetime</PixelBadge> : <PixelBadge variant="default">Standard</PixelBadge>}
      </div>
    ),
  },
  {
    id: 'result',
    header: 'Result',
    cell: ({ row }) => (
      <span style={{ color: row.original.result ? (resultLabel(row.original).startsWith('W') ? 'var(--mfd-green)' : resultLabel(row.original).startsWith('L') ? 'var(--mfd-red)' : '#fff') : '#999' }}>
        {resultLabel(row.original)}
      </span>
    ),
  },
  {
    accessorKey: 'recordAfterGame',
    header: 'Record',
    cell: ({ row }) => row.original.recordAfterGame ?? <span style={{ color: '#777' }}>Pending</span>,
  },
];

const weekColumns: ColumnDef<WeekScheduleRow, unknown>[] = [
  {
    id: 'matchup',
    header: 'Matchup',
    cell: ({ row }) => (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: row.original.primetime ? 'var(--mfd-gold)' : '#fff' }}>
          {row.original.awayTeamName} @ {row.original.homeTeamName}
        </span>
        {row.original.flexed ? <PixelBadge variant="gold">FLEXED</PixelBadge> : null}
      </div>
    ),
  },
  {
    accessorKey: 'broadcastNetwork',
    header: 'Network',
    cell: ({ row }) => row.original.broadcastNetwork ? (
      <PixelBadge variant={row.original.primetime ? 'gold' : 'cyan'}>{row.original.broadcastNetwork}</PixelBadge>
    ) : (
      <span style={{ color: '#777' }}>-</span>
    ),
  },
  {
    id: 'result',
    header: 'Result',
    cell: ({ row }) => row.original.result
      ? `${row.original.result.awayScore}-${row.original.result.homeScore}`
      : <span style={{ color: '#777' }}>Upcoming</span>,
  },
];

export function TeamSchedule() {
  const team = useGameStore(selectUserTeam);
  const currentWeek = useGameStore(selectWeek);
  const teamSchedule = useGameStore(selectTeamSchedule);
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const weekSchedule = useGameStore(selectWeekSchedule(selectedWeek));
  const seasonWeeks = Math.max(currentWeek, selectedWeek, ...teamSchedule.map((entry) => entry.week), 1);
  const sourceRows = buildScheduleSourceRows(teamSchedule, weekSchedule, selectedWeek, seasonWeeks);

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Schedule"
        subtitle={`${team ? `${team.city} ${team.name}` : 'Franchise'} // full ${seasonWeeks}-week slate with broadcasts and flex windows`}
        badges={(
          <>
            <PixelBadge variant="cyan">Week {selectedWeek}</PixelBadge>
            <PixelBadge variant="gold">{teamSchedule.filter((entry) => entry.primetime).length} primetime</PixelBadge>
          </>
        )}
      />

      <PixelPanel title="Schedule Sources" accent="cyan">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '10px' }}>
          {sourceRows.map((row) => (
            <div
              key={row.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '10px',
                border: '2px solid var(--mfd-border)',
                background: 'var(--mfd-bg-2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ ...monoSm, color: '#fff' }}>{row.label}</span>
                <PixelBadge variant={row.accent}>{row.badge}</PixelBadge>
              </div>
              <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                {row.detail}
              </span>
            </div>
          ))}
        </div>
      </PixelPanel>

      <div style={autoGrid(260)}>
        <PixelPanel title="Team Schedule" accent="cyan">
          <PixelTable
            data={teamSchedule}
            columns={teamColumns}
            accent="cyan"
            emptyMessage="Schedule unavailable"
          />
        </PixelPanel>

        <PixelPanel title="League Slate" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ ...monoSm, color: '#ddd' }}>All games for the selected week.</div>
              <PixelSelect
                aria-label="Select league week"
                value={String(selectedWeek)}
                onChange={(event) => setSelectedWeek(Number(event.target.value))}
                options={Array.from({ length: seasonWeeks }, (_, index) => ({
                  value: String(index + 1),
                  label: `Week ${index + 1}`,
                }))}
                accent="gold"
              />
            </div>
            <PixelTable
              data={weekSchedule}
              columns={weekColumns}
              accent="gold"
              emptyMessage="No games for this week"
            />
          </div>
        </PixelPanel>
      </div>
    </div>
  );
}
