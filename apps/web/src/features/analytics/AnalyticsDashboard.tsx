import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { calculatePlayerEfficiency, type Player } from '@mfd/engine';
import {
  PixelBadge,
  PixelPanel,
  PixelSelect,
  PixelTable,
} from '@mfd/design-system/components';
import {
  selectAdvancedStats,
  selectAnalyticsLeaders,
  selectPlayerComparison,
  selectRoster,
  selectTeams,
  selectUserTeam,
  selectWeeklyTrend,
  useGameStore,
} from '../../app/store/game-store';
import {
  PixelScreenHeader,
  PlayerNameLink,
  autoGrid,
  display,
  mono,
  monoSm,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';

interface EfficiencyRow {
  id: string;
  name: string;
  pos: Player['pos'];
  efficiency: number;
  primary: number;
}

function rankAccent(rank: number | null): 'gold' | 'cyan' | 'green' | 'default' {
  if (!rank) return 'default';
  if (rank <= 5) return 'gold';
  if (rank <= 12) return 'cyan';
  return 'green';
}

function statLabel(stat: string): string {
  return stat
    .replaceAll(/([A-Z])/g, ' $1')
    .replace(/^./, (value) => value.toUpperCase());
}

function primaryStat(player: Player): number {
  if (player.pos === 'QB') return player.stats.passYds;
  if (player.pos === 'RB') return player.stats.rushYds;
  if (player.pos === 'WR' || player.pos === 'TE') return player.stats.recYds;
  if (player.pos === 'DL' || player.pos === 'LB') return player.stats.sacks;
  if (player.pos === 'CB' || player.pos === 'S') return player.stats.defINT;
  return player.stats.tackles;
}

function trendGlyph(current: number, next: number | undefined): string {
  if (next === undefined) return '→';
  if (current - next > Math.max(1, current * 0.1)) return '↑';
  if (current > next) return '↗';
  return '→';
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

const efficiencyColumns: ColumnDef<EfficiencyRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Player',
    cell: ({ row }) => <PlayerNameLink playerId={row.original.id} name={row.original.name} style={{ ...mono }} />,
  },
  {
    accessorKey: 'pos',
    header: 'Pos',
    cell: ({ getValue }) => <PixelBadge variant="default">{getValue() as string}</PixelBadge>,
    size: 56,
  },
  {
    accessorKey: 'efficiency',
    header: 'Eff',
    cell: ({ getValue }) => <PixelBadge variant="green">{Number(getValue()).toFixed(1)}</PixelBadge>,
    size: 70,
  },
  {
    accessorKey: 'primary',
    header: 'Primary',
    cell: ({ getValue }) => <span style={{ ...monoSm, color: '#ddd' }}>{getValue() as number}</span>,
    size: 80,
  },
];

function TrendBars({ label, values, accent }: { label: string; values: number[]; accent: 'gold' | 'cyan' | 'green' | 'red' }) {
  const max = Math.max(1, ...values.map((value) => Math.abs(value)));
  const color = accent === 'gold'
    ? 'var(--mfd-gold)'
    : accent === 'cyan'
      ? 'var(--mfd-cyan)'
      : accent === 'green'
        ? 'var(--mfd-green)'
        : 'var(--mfd-red)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ ...pixelSm, color: '#777' }}>{label.toUpperCase()}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', minHeight: '110px' }}>
        {values.map((value, index) => (
          <div key={`${label}-${index}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '100%',
                minHeight: '12px',
                height: `${Math.max(12, Math.round((Math.abs(value) / max) * 88))}px`,
                background: color,
                opacity: value >= 0 ? 0.95 : 0.6,
                border: `3px solid ${color}`,
                boxShadow: `0 0 0 2px rgba(0, 0, 0, 0.45) inset`,
              }}
            />
            <span style={{ ...monoSm, color: '#999' }}>W{index + 1}</span>
            <span style={{ ...monoSm, color: '#ddd' }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsDashboard() {
  const team = useGameStore(selectUserTeam);
  const roster = useGameStore(selectRoster);
  const teams = useGameStore(selectTeams);
  const advanced = useGameStore(selectAdvancedStats);
  const leaders = useGameStore(selectAnalyticsLeaders);
  const pointsTrend = useGameStore(selectWeeklyTrend('pointsFor'));
  const differentialTrend = useGameStore(selectWeeklyTrend('pointDifferential'));
  const thirdDownTrend = useGameStore(selectWeeklyTrend('thirdDownConversions'));
  const redZoneTrend = useGameStore(selectWeeklyTrend('redZoneScores'));

  const comparisonOptions = useMemo(() => {
    const entries = new Map<string, { value: string; label: string }>();

    for (const player of roster) {
      entries.set(player.id, { value: player.id, label: `${player.name} (${player.pos})` });
    }

    for (const bucket of Object.values(leaders)) {
      for (const leader of bucket) {
        if (!entries.has(leader.playerId)) {
          entries.set(leader.playerId, { value: leader.playerId, label: `${leader.name}` });
        }
      }
    }

    return Array.from(entries.values());
  }, [leaders, roster]);

  const [selectedA, setSelectedA] = useState<string>('');
  const [selectedB, setSelectedB] = useState<string>('');
  const playerAId = selectedA || comparisonOptions[0]?.value || null;
  const playerBId = selectedB || comparisonOptions[1]?.value || comparisonOptions[0]?.value || null;
  const comparison = useGameStore(selectPlayerComparison(playerAId, playerBId));

  const efficiencyRows = useMemo<EfficiencyRow[]>(() => roster
    .map((player) => ({
      id: player.id,
      name: player.name,
      pos: player.pos,
      efficiency: calculatePlayerEfficiency(player),
      primary: primaryStat(player),
    }))
    .sort((a, b) => b.efficiency - a.efficiency || b.primary - a.primary)
    .slice(0, 8), [roster]);

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Analytics"
        subtitle={`${team ? `${team.city} ${team.name}` : 'No Team'} // advanced efficiency, trends, and matchup comparison`}
        badges={(
          <>
            <PixelBadge variant={rankAccent(advanced.ranks.offense)}>
              Off #{advanced.ranks.offense ?? '--'}
            </PixelBadge>
            <PixelBadge variant={rankAccent(advanced.ranks.defense)}>
              Def #{advanced.ranks.defense ?? '--'}
            </PixelBadge>
            <PixelBadge variant={rankAccent(advanced.ranks.specialTeams)}>
              ST #{advanced.ranks.specialTeams ?? '--'}
            </PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(220)}>
        <PixelPanel title="Team Overview" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ ...monoSm, color: '#aaa' }}>QBR</span>
              <PixelBadge variant="gold">{advanced.stats.qbr}</PixelBadge>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ ...monoSm, color: '#aaa' }}>EPA</span>
              <PixelBadge variant={advanced.stats.epa >= 0 ? 'green' : 'red'}>{advanced.stats.epa}</PixelBadge>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ ...monoSm, color: '#aaa' }}>Success Rate</span>
              <PixelBadge variant="cyan">{formatPercent(advanced.stats.successRate)}</PixelBadge>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ ...monoSm, color: '#aaa' }}>Turnover Rate</span>
              <PixelBadge variant={advanced.stats.turnoverRate <= 1 ? 'green' : 'gold'}>{advanced.stats.turnoverRate}</PixelBadge>
            </div>
          </div>
        </PixelPanel>

        <PixelPanel title="Execution" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ ...monoSm, color: '#aaa' }}>Third Down</span>
              <PixelBadge variant="cyan">{formatPercent(advanced.stats.thirdDownRate)}</PixelBadge>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ ...monoSm, color: '#aaa' }}>Red Zone</span>
              <PixelBadge variant="gold">{formatPercent(advanced.stats.redZoneRate)}</PixelBadge>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ ...monoSm, color: '#aaa' }}>YAC / Game</span>
              <PixelBadge variant="green">{advanced.stats.yac}</PixelBadge>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ ...monoSm, color: '#aaa' }}>Pressure Rate</span>
              <PixelBadge variant={advanced.stats.pressureRate <= 0.1 ? 'green' : 'red'}>
                {formatPercent(advanced.stats.pressureRate)}
              </PixelBadge>
            </div>
          </div>
        </PixelPanel>

        <PixelPanel title="League Rank" accent="green">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              ['Offense', advanced.ranks.offense],
              ['Defense', advanced.ranks.defense],
              ['Special Teams', advanced.ranks.specialTeams],
            ].map(([label, rank]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <span style={{ ...monoSm, color: '#aaa' }}>{label}</span>
                <PixelBadge variant={rankAccent(rank as number | null)}>{rank ? `#${rank}` : '--'}</PixelBadge>
              </div>
            ))}
          </div>
        </PixelPanel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(320px, 1fr)', gap: '12px' }}>
        <PixelPanel title="Player Efficiency" accent="green">
          <PixelTable
            data={efficiencyRows}
            columns={efficiencyColumns}
            density="compact"
            accent="green"
          />
        </PixelPanel>

        <PixelPanel title="Player Comparison" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <PixelSelect
              value={playerAId ?? ''}
              accent="cyan"
              options={comparisonOptions}
              onChange={(event) => setSelectedA(event.target.value)}
            />
            <PixelSelect
              value={playerBId ?? ''}
              accent="gold"
              options={comparisonOptions}
              onChange={(event) => setSelectedB(event.target.value)}
            />

            {comparison ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ ...pixelSm, color: '#666' }}>{statLabel(String(comparison.stat))}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '10px', alignItems: 'center' }}>
                  <div style={{ border: '3px solid var(--mfd-cyan)', padding: '10px', background: 'rgba(34, 211, 238, 0.08)' }}>
                    <div style={{ ...mono, color: '#fff' }}>{comparison.playerA.name}</div>
                    <div style={{ ...display, fontSize: '22px', color: 'var(--mfd-cyan)' }}>{comparison.playerA.value}</div>
                    <div style={{ ...monoSm, color: '#999' }}>Efficiency {comparison.playerA.efficiency}</div>
                  </div>
                  <div style={{ ...display, fontSize: '24px', color: '#fff' }}>VS</div>
                  <div style={{ border: '3px solid var(--mfd-gold)', padding: '10px', background: 'rgba(250, 204, 21, 0.08)' }}>
                    <div style={{ ...mono, color: '#fff' }}>{comparison.playerB.name}</div>
                    <div style={{ ...display, fontSize: '22px', color: 'var(--mfd-gold)' }}>{comparison.playerB.value}</div>
                    <div style={{ ...monoSm, color: '#999' }}>Efficiency {comparison.playerB.efficiency}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
                Choose two players to compare their primary production and efficiency profile.
              </div>
            )}
          </div>
        </PixelPanel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 1fr)', gap: '12px' }}>
        <PixelPanel title="Weekly Trend" accent="cyan">
          <div style={autoGrid(180)}>
            <TrendBars label="Points For" values={pointsTrend} accent="green" />
            <TrendBars label="Point Diff" values={differentialTrend} accent="gold" />
            <TrendBars label="Third Down" values={thirdDownTrend} accent="cyan" />
            <TrendBars label="Red Zone" values={redZoneTrend} accent="red" />
          </div>
        </PixelPanel>

        <PixelPanel title="League Leaders" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {([
              ['Passing', leaders.passYds],
              ['Rushing', leaders.rushYds],
              ['Receiving', leaders.recYds],
              ['Sacks', leaders.sacks],
              ['INTs', leaders.defINT],
            ] as const).map(([label, entries]) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ ...pixelSm, color: '#666' }}>{label.toUpperCase()}</div>
                {entries.map((entry, index) => (
                  <div key={entry.playerId} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <div>
                      <div style={{ ...mono, color: '#fff' }}>
                        {trendGlyph(entry.value, entries[index + 1]?.value)} {entry.name}
                      </div>
                      <div style={{ ...monoSm, color: '#999' }}>
                        {entry.teamId ? `${teams?.[entry.teamId]?.city ?? ''} ${teams?.[entry.teamId]?.name ?? ''}`.trim() : 'Free Agent'}
                      </div>
                    </div>
                    <PixelBadge variant={index === 0 ? 'gold' : 'cyan'}>{entry.value}</PixelBadge>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </PixelPanel>
      </div>
    </div>
  );
}
