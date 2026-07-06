import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  PixelBadge,
  PixelButton,
  PixelPanel,
  PixelPlayerLink,
  PixelScreenHeader,
  PixelSelect,
  PixelTable,
} from '@mfd/design-system/components';
import type { Position, Team } from '@mfd/engine';
import {
  selectCareerStatLeaders,
  selectLeagueAverages,
  selectLeagueLeaders,
  selectPlayerCareerComparison,
  selectPositionRankings,
  selectTeamSeasonHistory,
  selectTeams,
  selectUserTeamId,
  useGameStore,
} from '../../app/store/game-store';

const screenStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
} as const;

const EMPTY_TEAMS: Record<string, Team> = {};

const tabOptions = [
  { value: 'leaders', label: 'League Leaders' },
  { value: 'career', label: 'Career Leaders' },
  { value: 'compare', label: 'Player Compare' },
  { value: 'history', label: 'Team History' },
] as const;

const statOptions = [
  { value: 'passYds', label: 'Pass Yds' },
  { value: 'passTD', label: 'Pass TD' },
  { value: 'rushYds', label: 'Rush Yds' },
  { value: 'rushTD', label: 'Rush TD' },
  { value: 'rec', label: 'Receptions' },
  { value: 'recYds', label: 'Rec Yds' },
  { value: 'sacks', label: 'Sacks' },
  { value: 'defINT', label: 'INT' },
  { value: 'tackles', label: 'Tackles' },
];

const positionOptions = [
  { value: 'ALL', label: 'All Positions' },
  { value: 'QB', label: 'QB' },
  { value: 'RB', label: 'RB' },
  { value: 'WR', label: 'WR' },
  { value: 'TE', label: 'TE' },
  { value: 'OL', label: 'OL' },
  { value: 'DL', label: 'DL' },
  { value: 'LB', label: 'LB' },
  { value: 'CB', label: 'CB' },
  { value: 'S', label: 'S' },
  { value: 'K', label: 'K' },
  { value: 'P', label: 'P' },
];

const alignmentOptions = [
  { value: 'career', label: 'Career Year' },
  { value: 'age', label: 'By Age' },
  { value: 'calendar', label: 'Calendar Year' },
];

const statCentralSourceRows = [
  {
    id: 'current-season',
    label: 'Current season source',
    badge: 'game.players',
    accent: 'cyan',
    detail: 'Current leaderboards, league averages, and position rankings read live saved player stats for the active season.',
  },
  {
    id: 'season-history',
    label: 'Historical source',
    badge: 'playerSeasonHistory',
    accent: 'gold',
    detail: 'Past-season leaderboards, career timelines, and comparison seasons read archived player-season rows.',
  },
  {
    id: 'archive-fallback',
    label: 'Archive fallback',
    badge: 'playerArchive',
    accent: 'green',
    detail: 'Retired-player names, positions, and championship context can fall back to archived player records when the live roster no longer has the player.',
  },
  {
    id: 'local-controls',
    label: 'Local controls',
    badge: 'route state',
    accent: 'default',
    detail: 'Tabs, stat filters, season filters, comparison slots, and selected team history rows are local display state only.',
  },
  {
    id: 'render-boundary',
    label: 'Just viewing',
    badge: 'display only',
    accent: 'default',
    detail: 'Opening Stat Central does not write stats, records, news, social posts, history rows, or player-archive entries.',
  },
] as const;

function currentSeasonYear(gameYear: number, phase: string | undefined): number {
  return phase === 'offseason' || phase === 'free_agency' || phase === 'draft' || phase === 'post_draft'
    ? gameYear - 1
    : gameYear;
}

export default function StatCentral() {
  const game = useGameStore((state) => state.game);
  const teams = useGameStore(selectTeams) ?? EMPTY_TEAMS;
  const userTeamId = useGameStore(selectUserTeamId);
  const [activeTab, setActiveTab] = useState<(typeof tabOptions)[number]['value']>('leaders');
  const [selectedStat, setSelectedStat] = useState('passYds');
  const [selectedSeason, setSelectedSeason] = useState('current');
  const [selectedPos, setSelectedPos] = useState('ALL');
  const [compareIds, setCompareIds] = useState<string[]>(['', '', '', '']);
  const [alignment, setAlignment] = useState<'career' | 'age' | 'calendar'>('career');
  const [historyTeamId, setHistoryTeamId] = useState(userTeamId ?? '');
  const [selectedHistoryYear, setSelectedHistoryYear] = useState<number | null>(null);

  const currentYear = currentSeasonYear(game?.year ?? 0, game?.phase);
  const seasonOptions = useMemo(() => {
    const years = new Set<number>();
    Object.values(game?.playerSeasonHistory ?? {}).forEach((entries) => entries.forEach((entry) => years.add(entry.season)));
    years.add(currentYear);
    return [
      { value: 'current', label: `Current (${currentYear})` },
      ...[...years].sort((a, b) => b - a).map((year) => ({ value: String(year), label: String(year) })),
    ];
  }, [currentYear, game?.playerSeasonHistory]);

  const playerOptions = useMemo(() => [
    { value: '', label: 'Open Slot' },
    ...Object.values(game?.players ?? {})
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((player) => ({
        value: player.id,
        label: `${player.name} (${player.pos})`,
      })),
  ], [game?.players]);

  const teamOptions = useMemo(() =>
    Object.values(teams)
      .sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name))
      .map((team) => ({ value: team.id, label: `${team.city} ${team.name}` })),
  [teams]);

  const leagueLeaders = useGameStore(selectLeagueLeaders(
    selectedStat,
    selectedPos === 'ALL' ? undefined : selectedPos as Position,
    selectedSeason === 'current' ? undefined : Number(selectedSeason),
  ));
  const careerLeaders = useGameStore(selectCareerStatLeaders(selectedStat));
  const leagueAverages = useGameStore(selectLeagueAverages(selectedStat));
  const positionRankings = useGameStore(selectPositionRankings(selectedPos === 'ALL' ? 'QB' : selectedPos as Position));
  const comparison = useGameStore(selectPlayerCareerComparison(compareIds.filter(Boolean)));
  const history = useGameStore(selectTeamSeasonHistory(historyTeamId || userTeamId || ''));

  const activeHistorySeason = history.find((entry) => entry.year === selectedHistoryYear) ?? history.at(-1) ?? null;

  const comparisonRows = useMemo(() => {
    const labels = new Map<string, Record<string, string | number>>();
    for (const player of comparison.players) {
      player.seasons.forEach((season, index) => {
        const rowKey = alignment === 'calendar'
          ? String(season.year)
          : alignment === 'age'
            ? `Age ${season.year - player.seasons[0]!.year + (game?.players[player.playerId]?.age ?? player.careerLength)}`
            : `Year ${index + 1}`;
        const row = labels.get(rowKey) ?? { label: rowKey };
        row[`${player.playerId}:ovr`] = season.ovr;
        comparison.statColumns.forEach((stat) => {
          row[`${player.playerId}:${stat}`] = season.keyStats[stat] ?? 0;
        });
        labels.set(rowKey, row);
      });
    }
    return [...labels.values()];
  }, [alignment, comparison, game?.players]);

  const leaderColumns = useMemo<ColumnDef<(typeof leagueLeaders)[number], unknown>[]>(() => [
    { accessorKey: 'rank', header: 'Rank' },
    {
      accessorKey: 'playerName',
      header: 'Player',
      cell: ({ row }) => (
        <PixelPlayerLink playerId={row.original.playerId} name={row.original.playerName} ovr={game?.players[row.original.playerId]?.ovr} />
      ),
    },
    { accessorKey: 'teamAbbr', header: 'Team' },
    { accessorKey: 'pos', header: 'Pos' },
    { accessorKey: 'value', header: 'Value' },
    { accessorKey: 'perGame', header: 'Per Game' },
  ], [game?.players]);

  const careerColumns = useMemo<ColumnDef<(typeof careerLeaders)[number], unknown>[]>(() => [
    { accessorKey: 'rank', header: 'Rank' },
    {
      accessorKey: 'playerName',
      header: 'Player',
      cell: ({ row }) => (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <PixelPlayerLink playerId={row.original.playerId} name={row.original.playerName} ovr={game?.players[row.original.playerId]?.ovr} />
          {row.original.isActive ? <PixelBadge variant="green">Active</PixelBadge> : null}
        </div>
      ),
    },
    { accessorKey: 'pos', header: 'Pos' },
    { accessorKey: 'value', header: 'Value' },
    { accessorKey: 'years', header: 'Years' },
  ], [game?.players]);

  const historyColumns = useMemo<ColumnDef<(typeof history)[number], unknown>[]>(() => [
    { accessorKey: 'year', header: 'Year' },
    {
      id: 'record',
      header: 'W-L-T',
      cell: ({ row }) => `${row.original.wins}-${row.original.losses}-${row.original.ties}`,
    },
    { accessorKey: 'playoffResult', header: 'Finish' },
    { accessorKey: 'mvpName', header: 'MVP' },
    {
      id: 'keyStats',
      header: 'Key Stats',
      cell: ({ row }) => (
        <span style={{ fontFamily: 'var(--mfd-font-mono)', color: 'var(--mfd-text-dim)' }}>
          {row.original.keyStats.totalYards} yds / {row.original.keyStats.pointsFor} PF / {row.original.keyStats.pointsAgainst} PA
        </span>
      ),
    },
    {
      accessorKey: 'era',
      header: 'Era',
      cell: ({ getValue }) => getValue() ? <PixelBadge variant="gold">{getValue() as string}</PixelBadge> : '—',
    },
  ], []);

  return (
    <div style={screenStyle}>
      <PixelScreenHeader
        title="Stat Central"
        subtitle="League leaders, career ladders, and historical context from every era of the save."
        badges={<PixelBadge variant="cyan">{leagueLeaders.length} Rows Loaded</PixelBadge>}
      />

      <PixelPanel title="Stat Sources" accent="cyan">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '10px' }}>
          {statCentralSourceRows.map((row) => (
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
                <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: '#fff' }}>
                  {row.label}
                </span>
                <PixelBadge variant={row.accent}>{row.badge}</PixelBadge>
              </div>
              <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                {row.detail}
              </span>
            </div>
          ))}
        </div>
      </PixelPanel>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {tabOptions.map((tab) => (
          <PixelButton
            key={tab.value}
            accent={activeTab === tab.value ? 'gold' : 'default'}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </PixelButton>
        ))}
      </div>

      {activeTab === 'leaders' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <PixelSelect value={selectedStat} onChange={(event) => setSelectedStat(event.target.value)} options={statOptions} accent="cyan" />
            <PixelSelect value={selectedSeason} onChange={(event) => setSelectedSeason(event.target.value)} options={seasonOptions} accent="cyan" />
            <PixelSelect value={selectedPos} onChange={(event) => setSelectedPos(event.target.value)} options={positionOptions} accent="cyan" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(300px, 0.75fr)', gap: '12px' }}>
            <PixelPanel title="League Leaders" accent="cyan">
              <PixelTable data={leagueLeaders} columns={leaderColumns} accent="cyan" emptyMessage="No league leaders found for that filter." />
            </PixelPanel>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <PixelPanel title="Era Comparison" accent="green">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {leagueAverages.slice(-6).map((entry) => (
                    <div key={entry.year} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontFamily: 'var(--mfd-font-mono)', color: 'var(--mfd-text-dim)' }}>{entry.year}</span>
                      <span style={{ fontFamily: 'var(--mfd-font-mono)', color: 'var(--mfd-text)' }}>
                        Avg {entry.average} · Median {entry.median} · Top10 {entry.top10Avg}
                      </span>
                    </div>
                  ))}
                </div>
              </PixelPanel>

              {selectedPos !== 'ALL' ? (
                <PixelPanel title={`${selectedPos} Rankings`} accent="gold">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {positionRankings.slice(0, 5).map((entry) => (
                      <div key={entry.playerId} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <PixelPlayerLink playerId={entry.playerId} name={entry.playerName} ovr={entry.ovr} />
                          <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
                            {(entry.teamId ? teams[entry.teamId]?.abbr ?? entry.teamId : 'FA')} · Surplus {entry.surplus}
                          </span>
                        </div>
                        <PixelBadge variant="gold">#{entry.rank}</PixelBadge>
                      </div>
                    ))}
                  </div>
                </PixelPanel>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'career' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <PixelSelect value={selectedStat} onChange={(event) => setSelectedStat(event.target.value)} options={statOptions} accent="gold" />
          </div>
          <PixelPanel title="Career Leaders" accent="gold">
            <PixelTable data={careerLeaders} columns={careerColumns} accent="gold" emptyMessage="No career leaders found." />
          </PixelPanel>
        </div>
      ) : null}

      {activeTab === 'compare' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {compareIds.map((playerId, index) => (
              <PixelSelect
                key={`compare-slot-${index + 1}`}
                value={playerId}
                onChange={(event) => {
                  const next = [...compareIds];
                  next[index] = event.target.value;
                  setCompareIds(next);
                }}
                options={playerOptions}
                accent="cyan"
                style={{ minWidth: '220px' }}
              />
            ))}
            <PixelSelect value={alignment} onChange={(event) => setAlignment(event.target.value as typeof alignment)} options={alignmentOptions} accent="green" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {comparison.players.map((player) => (
              <PixelPanel key={player.playerId} title={player.playerName} accent="cyan">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <PixelBadge variant="gold">Peak {player.peakOvr}</PixelBadge>
                    <PixelBadge variant="green">{player.championships} Titles</PixelBadge>
                    <PixelBadge variant="cyan">{player.mvps} MVP</PixelBadge>
                  </div>
                  <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
                    Career length: {player.careerLength} seasons. All-Pro teams: {player.allPros}.
                  </div>
                </div>
              </PixelPanel>
            ))}
          </div>

          <PixelPanel title="Comparison Grid" accent="green">
            {comparison.players.length > 0 ? (
              <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--mfd-font-mono)', fontSize: '11px' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid var(--mfd-green)' }}>Frame</th>
                      {comparison.players.map((player) => (
                        <th key={player.playerId} style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid var(--mfd-green)' }}>
                          {player.playerName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row, index) => (
                      <tr key={`${row.label}-${index}`}>
                        <td style={{ padding: '8px', borderBottom: '1px solid var(--mfd-border)', color: 'var(--mfd-text-dim)' }}>
                          {String(row.label)}
                        </td>
                        {comparison.players.map((player) => (
                          <td key={`${row.label}-${player.playerId}`} style={{ padding: '8px', borderBottom: '1px solid var(--mfd-border)' }}>
                            OVR {row[`${player.playerId}:ovr`] ?? '—'}
                            <br />
                            {comparison.statColumns.slice(0, 3).map((stat) => `${stat}: ${row[`${player.playerId}:${stat}`] ?? 0}`).join(' · ')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
                Select at least one player to compare career arcs.
              </div>
            )}
          </PixelPanel>
        </div>
      ) : null}

      {activeTab === 'history' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <PixelSelect
              value={historyTeamId || userTeamId || teamOptions[0]?.value || ''}
              onChange={(event) => {
                setHistoryTeamId(event.target.value);
                setSelectedHistoryYear(null);
              }}
              options={teamOptions}
              accent="cyan"
              style={{ minWidth: '240px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)', gap: '12px' }}>
            <PixelPanel title="Team History" accent="cyan">
              <PixelTable
                data={history}
                columns={historyColumns}
                accent="cyan"
                onRowClick={(row) => setSelectedHistoryYear(row.year)}
                emptyMessage="No franchise history available."
              />
            </PixelPanel>

            <PixelPanel title="Season Detail" accent="gold">
              {activeHistorySeason ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <PixelBadge variant="gold">{activeHistorySeason.year}</PixelBadge>
                    {activeHistorySeason.era ? <PixelBadge variant="cyan">{activeHistorySeason.era}</PixelBadge> : null}
                  </div>
                  <div style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '24px', color: 'var(--mfd-text)' }}>
                    {activeHistorySeason.wins}-{activeHistorySeason.losses}-{activeHistorySeason.ties}
                  </div>
                  <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
                    Finish: {activeHistorySeason.playoffResult}
                  </div>
                  <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
                    MVP: {activeHistorySeason.mvpName ?? 'No clear MVP'}
                  </div>
                  <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
                    Total yards: {activeHistorySeason.keyStats.totalYards}
                  </div>
                  <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
                    Points for / against: {activeHistorySeason.keyStats.pointsFor} / {activeHistorySeason.keyStats.pointsAgainst}
                  </div>
                </div>
              ) : (
                <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
                  Select a season to inspect the arc of that team.
                </div>
              )}
            </PixelPanel>
          </div>
        </div>
      ) : null}
    </div>
  );
}
