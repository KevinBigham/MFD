import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  PixelBadge,
  PixelButton,
  PixelPanel,
  PixelPlayerLink,
  PixelProgressBar,
  PixelScreenHeader,
  PixelSelect,
  PixelTable,
} from '@mfd/design-system/components';
import type { Position, RecordBook as RecordBookType, RecordCategory, RecordEntry } from '@mfd/engine';
import {
  selectRecords,
  useGameStore,
  useRecordChases,
  useRecentBrokenRecords,
  useRecentMilestones,
} from '../../app/store/game-store';

const screenStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
} as const;

const tabOptions: Array<{ id: RecordCategory; label: string }> = [
  { id: 'singleGame', label: 'Single Game' },
  { id: 'singleSeason', label: 'Single Season' },
  { id: 'career', label: 'Career' },
  { id: 'franchise', label: 'Franchise' },
];

const positionOptions = [
  { value: 'ALL', label: 'All Positions' },
  { value: 'QB', label: 'QB' },
  { value: 'RB', label: 'RB' },
  { value: 'WR', label: 'WR' },
  { value: 'TE', label: 'TE' },
  { value: 'DL', label: 'DL' },
  { value: 'LB', label: 'LB' },
  { value: 'CB', label: 'CB' },
  { value: 'S', label: 'S' },
  { value: 'K', label: 'K' },
];

interface RecordRow {
  stat: string;
  label: string;
  group: string;
  entry: RecordEntry;
  teamAbbr: string;
  isCurrent: boolean;
}

function statLabel(stat: string): string {
  return stat
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .replace('Yds', 'Yards')
    .replace('Def I N T', 'INT')
    .replace('Pass T D', 'Pass TD')
    .replace('Rush T D', 'Rush TD')
    .replace('Rec T D', 'Rec TD');
}

function statGroup(stat: string): string {
  if (stat.startsWith('pass')) return 'Passing';
  if (stat.startsWith('rush')) return 'Rushing';
  if (stat.startsWith('rec')) return 'Receiving';
  if (stat.includes('sack') || stat.includes('INT') || stat.includes('tackle')) return 'Defense';
  return 'Special Teams';
}

function positionMatches(positionFilter: string, stat: string): boolean {
  if (positionFilter === 'ALL') return true;
  if (positionFilter === 'QB') return stat.startsWith('pass');
  if (positionFilter === 'RB') return stat.startsWith('rush');
  if (positionFilter === 'WR' || positionFilter === 'TE') return stat.startsWith('rec');
  if (positionFilter === 'DL') return stat === 'sacks';
  if (positionFilter === 'LB') return stat === 'sacks' || stat === 'defINT' || stat === 'tackles';
  if (positionFilter === 'CB' || positionFilter === 'S') return stat === 'defINT' || stat === 'tackles';
  if (positionFilter === 'K') return stat.includes('fg') || stat.includes('kick');
  return true;
}

function buildRows(
  records: RecordBookType,
  category: RecordCategory,
  teamAbbrs: Record<string, string>,
  currentYear: number,
): RecordRow[] {
  return Object.entries(records[category])
    .flatMap<RecordRow>(([stat, entries]) => {
      const topEntry = entries[0];
      if (!topEntry) return [];
      return [{
        stat,
        label: statLabel(stat),
        group: statGroup(stat),
        entry: topEntry,
        teamAbbr: teamAbbrs[topEntry.teamId] ?? topEntry.teamId,
        isCurrent: topEntry.year === currentYear,
      }];
    })
    .sort((a, b) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label));
}

export default function RecordBook() {
  const game = useGameStore((state) => state.game);
  const records = useGameStore(selectRecords);
  const chases = useRecordChases();
  const recentRecords = useRecentBrokenRecords();
  const recentMilestones = useRecentMilestones();
  const [activeTab, setActiveTab] = useState<RecordCategory>('singleSeason');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [selectedStat, setSelectedStat] = useState<string | null>(null);

  const teams = game?.teams ?? {};
  const players = game?.players ?? {};
  const currentYear = game?.year ?? 0;
  const teamAbbrs = useMemo(
    () => Object.fromEntries(Object.values(teams).map((team) => [team.id, team.abbr])),
    [teams],
  );

  const rows = useMemo(
    () => buildRows(records, activeTab, teamAbbrs, currentYear).filter((row) => positionMatches(positionFilter, row.stat)),
    [activeTab, currentYear, positionFilter, records, teamAbbrs],
  );

  const activeRow = rows.find((row) => row.stat === selectedStat) ?? rows[0] ?? null;
  const holderHistory = activeRow ? records[activeTab][activeRow.stat] ?? [] : [];
  const activeChases = chases.filter((chase) => {
    const pos = players[chase.playerId]?.pos ?? 'WR';
    return positionFilter === 'ALL' || pos === positionFilter;
  });
  const currentChase = activeRow
    ? activeChases.find((chase) => chase.stat === activeRow.stat) ?? null
    : null;

  const recordColumns = useMemo<ColumnDef<RecordRow, unknown>[]>(() => [
    {
      accessorKey: 'group',
      header: 'Group',
      cell: ({ getValue }) => <span style={{ color: 'var(--mfd-text-dim)' }}>{getValue() as string}</span>,
    },
    {
      accessorKey: 'label',
      header: 'Stat',
      cell: ({ row }) => (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span>{row.original.label}</span>
          {row.original.isCurrent ? <PixelBadge variant="gold">Current</PixelBadge> : null}
        </div>
      ),
    },
    {
      id: 'record',
      header: 'Record',
      cell: ({ row }) => row.original.entry.value,
    },
    {
      id: 'holder',
      header: 'Holder',
      cell: ({ row }) => row.original.entry.playerId ? (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <PixelPlayerLink
            playerId={row.original.entry.playerId}
            name={row.original.entry.playerName ?? 'Unknown'}
            ovr={players[row.original.entry.playerId]?.ovr}
          />
          <PixelBadge variant="cyan">{row.original.teamAbbr}</PixelBadge>
        </div>
      ) : row.original.entry.teamName,
    },
    {
      id: 'year',
      header: 'Year',
      cell: ({ row }) => row.original.entry.week ? `${row.original.entry.year} W${row.original.entry.week}` : row.original.entry.year,
    },
  ], [players]);

  return (
    <div style={screenStyle}>
      <style>{`
        @keyframes historianRecordFlash {
          0% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.28); }
          50% { box-shadow: 0 0 18px 2px rgba(255, 215, 0, 0.24); }
          100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.12); }
        }
      `}</style>

      <PixelScreenHeader
        title="Record Book"
        subtitle="League records, active record chases, and fresh milestones from around the dynasty."
        badges={<PixelBadge variant="gold">{activeChases.length} Active Chases</PixelBadge>}
      />

      <PixelPanel title="Active Chases" accent="gold">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {activeChases.length > 0 ? activeChases.map((chase) => (
            <div key={`${chase.playerId}-${chase.stat}`} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                <PixelPlayerLink
                  playerId={chase.playerId}
                  name={chase.playerName}
                  ovr={players[chase.playerId]?.ovr}
                />
                <PixelBadge variant="cyan">{teams[chase.teamId]?.abbr ?? chase.teamId}</PixelBadge>
              </div>
              <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
                {statLabel(chase.stat)}: {chase.currentValue} / {chase.recordValue}
              </div>
              <PixelProgressBar
                value={chase.pace}
                accent={chase.pace >= 95 ? 'gold' : 'green'}
                label="Pace"
                valueLabel={`${Math.round(chase.pace)}%`}
              />
              <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
                Projected {chase.projected}. {chase.weeksRemaining} games left.
              </div>
            </div>
          )) : (
            <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
              No record chases above the 80% pace threshold right now.
            </div>
          )}
        </div>
      </PixelPanel>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {tabOptions.map((tab) => (
          <PixelButton
            key={tab.id}
            accent={activeTab === tab.id ? 'gold' : 'default'}
            onClick={() => {
              setActiveTab(tab.id);
              setSelectedStat(null);
            }}
          >
            {tab.label}
          </PixelButton>
        ))}
        <PixelSelect
          value={positionFilter}
          onChange={(event) => setPositionFilter(event.target.value)}
          options={positionOptions}
          accent="cyan"
          style={{ minWidth: '180px', marginLeft: 'auto' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 0.8fr)', gap: '12px' }}>
        <PixelPanel title={tabOptions.find((tab) => tab.id === activeTab)?.label ?? 'Records'} accent="cyan">
          <PixelTable
            data={rows}
            columns={recordColumns}
            accent="cyan"
            onRowClick={(row) => setSelectedStat(row.stat)}
            emptyMessage="No records match this position filter."
          />
        </PixelPanel>

        <PixelPanel title="Record Detail" accent="gold">
          {activeRow ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '24px', color: 'var(--mfd-text)' }}>
                  {activeRow.label}
                </span>
                <PixelBadge variant={activeRow.isCurrent ? 'gold' : 'green'}>{activeRow.entry.value}</PixelBadge>
              </div>

              {currentChase ? (
                <PixelPanel title="Current Challenger" accent="green" padding="sm">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <PixelPlayerLink
                      playerId={currentChase.playerId}
                      name={currentChase.playerName}
                      ovr={players[currentChase.playerId]?.ovr}
                    />
                    <PixelProgressBar value={currentChase.pace} accent="green" valueLabel={`${Math.round(currentChase.pace)}%`} />
                    <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
                      Projected finish: {currentChase.projected}. Record holder: {currentChase.recordHolder}.
                    </div>
                  </div>
                </PixelPanel>
              ) : null}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {holderHistory.map((entry, index) => (
                  <div
                    key={`${entry.stat}-${entry.year}-${entry.week ?? 0}-${entry.playerId ?? index}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '10px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid var(--mfd-border)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {entry.playerId ? (
                        <PixelPlayerLink
                          playerId={entry.playerId}
                          name={entry.playerName ?? 'Unknown'}
                          ovr={players[entry.playerId]?.ovr}
                        />
                      ) : (
                        <span>{entry.teamName}</span>
                      )}
                      <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
                        {teams[entry.teamId]?.abbr ?? entry.teamId} · {entry.year}{entry.week ? ` W${entry.week}` : ''}
                      </span>
                    </div>
                    <PixelBadge variant={index === 0 ? 'gold' : 'default'}>{entry.value}</PixelBadge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
              Select a record to see the holder history and current chase context.
            </div>
          )}
        </PixelPanel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
        <PixelPanel title="Recent Records" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentRecords.slice(0, 5).map((record) => (
              <div
                key={`${record.playerId}-${record.stat}-${record.year}-${record.week}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '10px',
                  border: '3px solid var(--mfd-gold)',
                  background: 'rgba(255, 215, 0, 0.06)',
                  animation: 'historianRecordFlash 1.4s ease-in-out infinite',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                  <PixelPlayerLink playerId={record.playerId} name={record.playerName} ovr={players[record.playerId]?.ovr} />
                  <PixelBadge variant="gold">{record.newValue}</PixelBadge>
                </div>
                <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
                  {record.narrative}
                </div>
                <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-faint)' }}>
                  Previous: {record.previousHolder} at {record.previousValue}
                </div>
              </div>
            ))}
            {recentRecords.length === 0 ? (
              <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
                No new record breaks this week.
              </div>
            ) : null}
          </div>
        </PixelPanel>

        <PixelPanel title="Milestones" accent="green">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentMilestones.slice(0, 5).map((milestone) => (
              <div
                key={`${milestone.playerId}-${milestone.stat}-${milestone.milestoneLabel}-${milestone.year}-${milestone.week}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  paddingBottom: '10px',
                  borderBottom: '1px solid var(--mfd-border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                  <PixelPlayerLink playerId={milestone.playerId} name={milestone.playerName} ovr={players[milestone.playerId]?.ovr} />
                  <PixelBadge variant="green">{milestone.milestoneLabel}</PixelBadge>
                </div>
                <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
                  {milestone.narrative}
                </div>
              </div>
            ))}
            {recentMilestones.length === 0 ? (
              <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
                No new milestones recorded this week.
              </div>
            ) : null}
          </div>
        </PixelPanel>
      </div>
    </div>
  );
}
