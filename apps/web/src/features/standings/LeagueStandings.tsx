import type { ColumnDef } from '@tanstack/react-table';
import { PixelBadge, PixelPanel, PixelTable } from '@mfd/design-system/components';
import { selectPlayoffPicture, selectStandings, selectStatLeaders, selectUserTeam, useGameStore } from '../../app/store/game-store';
import {
  autoGrid,
  display,
  mono,
  monoSm,
  pixelSm,
  screenStackStyle,
  PixelScreenHeader,
} from '../shared/pixelUi';

function streakLabel(streak: number): string {
  if (streak > 0) return `W${streak}`;
  if (streak < 0) return `L${Math.abs(streak)}`;
  return 'EVEN';
}

function standingsColumns(userTeamId: string | null): ColumnDef<(ReturnType<typeof useGameStore.getState> extends never ? never : any), unknown>[] {
  return [
    {
      accessorKey: 'rank',
      header: '#',
      size: 32,
    },
    {
      accessorKey: 'teamName',
      header: 'Team',
      cell: ({ row }) => (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: row.original.teamId === userTeamId ? '2px 6px' : 0,
          border: row.original.teamId === userTeamId ? '3px solid var(--mfd-gold)' : 'none',
        }}
        >
          <span style={{ ...mono, color: row.original.teamId === userTeamId ? 'var(--mfd-gold)' : '#fff' }}>
            {row.original.teamName}
          </span>
        </div>
      ),
    },
    {
      id: 'record',
      header: 'W-L-T',
      cell: ({ row }) => `${row.original.wins}-${row.original.losses}-${row.original.ties}`,
    },
    {
      accessorKey: 'pct',
      header: 'Pct',
      cell: ({ getValue }) => Number(getValue() as number).toFixed(3),
    },
    {
      accessorKey: 'pointsFor',
      header: 'PF',
    },
    {
      accessorKey: 'pointsAgainst',
      header: 'PA',
    },
    {
      accessorKey: 'pointDifferential',
      header: 'Diff',
      cell: ({ getValue }) => {
        const value = getValue() as number;
        return <span style={{ color: value >= 0 ? 'var(--mfd-green)' : 'var(--mfd-red)' }}>{value >= 0 ? `+${value}` : value}</span>;
      },
    },
    {
      accessorKey: 'streak',
      header: 'Strk',
      cell: ({ getValue }) => streakLabel(getValue() as number),
    },
    {
      accessorKey: 'homeRecord',
      header: 'Home',
    },
    {
      accessorKey: 'awayRecord',
      header: 'Away',
    },
  ];
}

export function LeagueStandings() {
  const standings = useGameStore(selectStandings);
  const playoffPicture = useGameStore(selectPlayoffPicture);
  const statLeaders = useGameStore(selectStatLeaders);
  const userTeam = useGameStore(selectUserTeam);
  const columns = standingsColumns(userTeam?.id ?? null);

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="League Standings"
        subtitle="Division tables, playoff picture, and season leaders across the league."
        badges={(
          <>
            <PixelBadge variant="gold">8 divisions</PixelBadge>
            <PixelBadge variant="cyan">7 seeds / conference</PixelBadge>
          </>
        )}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2.4fr) minmax(280px, 1fr)', gap: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={autoGrid(520)}>
            {standings.map((section) => (
              <PixelPanel key={`${section.conference}-${section.division}`} title={`${section.conference} ${section.division}`} accent="cyan">
                <PixelTable
                  data={section.rows}
                  columns={columns}
                  accent="cyan"
                  density="compact"
                />
              </PixelPanel>
            ))}
          </div>

          <PixelPanel title="Playoff Picture" accent="gold">
            <div style={autoGrid(320)}>
              {[
                { label: 'AFC', seeds: playoffPicture.afc },
                { label: 'NFC', seeds: playoffPicture.nfc },
              ].map((conference) => (
                <div key={conference.label} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ ...display, fontSize: '22px', color: '#fff', lineHeight: 1 }}>
                    {conference.label}
                  </div>
                  {conference.seeds.map((seed) => (
                    <div key={seed.teamId} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                      <div>
                        <div style={{ ...mono, color: seed.teamId === userTeam?.id ? 'var(--mfd-gold)' : '#fff' }}>
                          #{seed.seed} {seed.teamName}
                        </div>
                        <div style={{ ...monoSm, color: '#999' }}>
                          {seed.divisionWinner ? 'Division winner' : 'Wildcard'}
                        </div>
                      </div>
                      {seed.indicator ? <PixelBadge variant="gold">{seed.indicator}</PixelBadge> : null}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </PixelPanel>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <PixelPanel title="Stat Leaders" accent="green">
            {([
              ['Passing Yards', statLeaders.passYds],
              ['Rushing Yards', statLeaders.rushYds],
              ['Receiving Yards', statLeaders.recYds],
              ['Sacks', statLeaders.sacks],
              ['INTs', statLeaders.defINT],
            ] as const).map(([label, leaders]) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                <div style={{ ...pixelSm, color: '#666' }}>{label.toUpperCase()}</div>
                {leaders.map((leader, index) => (
                  <div key={leader.playerId} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <div>
                      <div style={{ ...mono, color: '#fff' }}>{index + 1}. {leader.playerName}</div>
                      <div style={{ ...monoSm, color: '#999' }}>{leader.teamName}</div>
                    </div>
                    <PixelBadge variant="green">{leader.value}</PixelBadge>
                  </div>
                ))}
              </div>
            ))}
          </PixelPanel>
        </div>
      </div>
    </div>
  );
}
