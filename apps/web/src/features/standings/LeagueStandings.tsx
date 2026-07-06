import type { ColumnDef } from '@tanstack/react-table';
import type { StandingsRow } from '@mfd/engine';
import { PixelBadge, PixelPanel, PixelTable } from '@mfd/design-system/components';
import { selectPlayoffPicture, selectStandings, selectStatLeaders, selectUserTeam, useGameStore } from '../../app/store/game-store';
import {
  autoGrid,
  CommandCallout,
  display,
  mono,
  monoSm,
  navigateTo,
  pixelSm,
  screenStackStyle,
  PixelScreenHeader,
  PlayerNameLink,
} from '../shared/pixelUi';
import { TeamLogo } from '../shared/TeamLogo';
import { StandingsSignalSvg, StreakSignalSvg, type StandingsSignalKind } from './standingsSignalSvg';

type SeedSignalKind = Extract<StandingsSignalKind, 'seed_locked' | 'seed_bubble' | 'seed_out'>;
type PlayoffSeed = { seed: number; teamId: string; teamName: string; teamIcon: string; divisionWinner: boolean; indicator?: string };
type PlayoffPicture = { afc: PlayoffSeed[]; nfc: PlayoffSeed[] };
type StandingsSections = ReturnType<typeof selectStandings>;
type StatLeaders = ReturnType<typeof selectStatLeaders>;
type SourceAccent = 'default' | 'gold' | 'cyan' | 'green';

interface StandingsSourceRow {
  id: string;
  label: string;
  badge: string;
  accent: SourceAccent;
  detail: string;
}

function streakLabel(streak: number): string {
  if (streak > 0) return `W${streak}`;
  if (streak < 0) return `L${Math.abs(streak)}`;
  return 'EVEN';
}

function buildSeedSignals(playoffPicture: PlayoffPicture): Map<string, SeedSignalKind> {
  const signals = new Map<string, SeedSignalKind>();

  for (const seed of [...playoffPicture.afc, ...playoffPicture.nfc]) {
    if (seed.indicator === 'X' || seed.indicator === 'Y' || seed.seed <= 3) {
      signals.set(seed.teamId, 'seed_locked');
    } else {
      signals.set(seed.teamId, 'seed_bubble');
    }
  }

  return signals;
}

function playoffSeedCountLabel(playoffPicture: PlayoffPicture): string {
  const seedCount = Math.max(playoffPicture.afc.length, playoffPicture.nfc.length);
  return `${seedCount} seeds / conference`;
}

function seedSignalTitle(kind: SeedSignalKind): string {
  if (kind === 'seed_locked') return 'Playoff seed locked';
  if (kind === 'seed_bubble') return 'Playoff bubble';
  return 'Outside playoff picture';
}

export function buildStandingsSourceRows(
  standings: StandingsSections,
  playoffPicture: PlayoffPicture,
  statLeaders: StatLeaders,
): StandingsSourceRow[] {
  const teamRows = standings.reduce((total, section) => total + section.rows.length, 0);
  const playoffSeeds = playoffPicture.afc.length + playoffPicture.nfc.length;
  const leaderGroups = [statLeaders.passYds, statLeaders.rushYds, statLeaders.recYds, statLeaders.sacks, statLeaders.defINT];
  const leaderRows = leaderGroups.reduce((total, group) => total + group.length, 0);

  return [
    {
      id: 'division-tables',
      label: 'Division tables',
      badge: `${standings.length} divisions / ${teamRows} teams`,
      accent: 'cyan',
      detail: 'selectStandings maps STANDINGS_DIVISIONS through getDivisionStandings, reading current records, point differential, streaks, and home/away splits.',
    },
    {
      id: 'playoff-picture',
      label: 'Playoff picture',
      badge: `${playoffSeeds} seeds`,
      accent: 'gold',
      detail: 'selectPlayoffPicture reads the playoff-picture helper output. This route displays saved-season positioning; it does not write playoff brackets or clinch state.',
    },
    {
      id: 'stat-leaders',
      label: 'Stat leaders',
      badge: `${leaderRows} leaders`,
      accent: 'green',
      detail: 'selectStatLeaders reads current player and team season stats through getStatLeaders. The standings route does not create stats, records, or awards.',
    },
    {
      id: 'route-signals',
      label: 'Route signals',
      badge: 'display layer',
      accent: 'default',
      detail: 'Division-leader, seed-lock, bubble, out, and streak icons are local projections over selector rows. They do not change standings.',
    },
    {
      id: 'render-boundary',
      label: 'Just viewing',
      badge: 'display only',
      accent: 'default',
      detail: 'Opening League Standings does not play scheduled games, click Advance Week, write playoff brackets, update power rankings, create records, or generate news/social posts.',
    },
  ];
}

function standingsColumns(userTeamId: string | null, seedSignals: Map<string, SeedSignalKind>): ColumnDef<StandingsRow, unknown>[] {
  return [
    {
      accessorKey: 'rank',
      header: '#',
      size: 32,
    },
    {
      accessorKey: 'teamName',
      header: 'Team',
      cell: ({ row }) => {
        const isUserTeam = row.original.teamId === userTeamId;
        const isDivisionLeader = row.original.rank === 1;
        const seedSignal = seedSignals.get(row.original.teamId) ?? 'seed_out';
        return (
          <div
            data-division-leader-row={isDivisionLeader ? 'true' : undefined}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: isUserTeam || isDivisionLeader ? '2px 6px' : 0,
              border: isUserTeam ? '3px solid var(--mfd-gold)' : 'none',
              boxShadow: isDivisionLeader ? 'inset 0 0 0 1px var(--mfd-gold)' : undefined,
              borderRadius: isDivisionLeader ? 'var(--mfd-rad-sm)' : undefined,
            }}
          >
            {isDivisionLeader ? <StandingsSignalSvg kind="division_leader" title="Division leader" /> : null}
            <StandingsSignalSvg kind={seedSignal} title={seedSignalTitle(seedSignal)} />
            <TeamLogo icon={row.original.teamIcon} size={22} />
            <span style={{ ...mono, color: isUserTeam ? 'var(--mfd-gold)' : 'var(--mfd-text)' }}>
              {row.original.teamName}
            </span>
          </div>
        );
      },
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
      cell: ({ getValue }) => {
        const streak = getValue() as number;
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span>{streakLabel(streak)}</span>
            <StreakSignalSvg streak={streak} />
          </span>
        );
      },
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
  const seedSignals = buildSeedSignals(playoffPicture);
  const columns = standingsColumns(userTeam?.id ?? null, seedSignals);
  const userDivision = standings
    .flatMap((section) => section.rows)
    .find((row) => row.teamId === userTeam?.id);
  const sourceRows = buildStandingsSourceRows(standings, playoffPicture, statLeaders);
  const seedCountLabel = playoffSeedCountLabel(playoffPicture);

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="League Standings"
        subtitle="Division tables, playoff picture, and season leaders across the league."
        badges={(
          <>
            <PixelBadge variant="gold">8 divisions</PixelBadge>
            <PixelBadge variant="cyan">{seedCountLabel}</PixelBadge>
          </>
        )}
      />

      <CommandCallout
        title={userDivision ? 'Read the division math first' : 'Use this after a result'}
        body={userDivision
          ? `${userTeam?.city ?? 'Your club'} sits ${userDivision.wins}-${userDivision.losses}-${userDivision.ties}. Let that record decide whether the next move is buy, hold, or develop.`
          : 'Standings are a diagnosis screen. After Week 1, use the table to decide if the roster needs aggression or patience.'}
        accent="gold"
        meta={(
          <>
            <PixelBadge variant="cyan">8 divisions</PixelBadge>
            {userDivision ? <PixelBadge variant="gold">User rank {userDivision.rank}</PixelBadge> : null}
          </>
        )}
        actions={[
          { label: 'Power Board', accent: 'cyan', onClick: () => navigateTo('/power-rankings') },
          { label: 'Trade Desk', accent: 'gold', onClick: () => navigateTo('/trades') },
        ]}
      />

      <PixelPanel title="Standings Sources" accent="cyan">
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={autoGrid(520)}>
            {standings.map((section) => (
              <PixelPanel key={`${section.conference}-${section.division}`} title={`${section.conference} ${section.division}`} accent="cyan">
                <PixelTable
                  data={section.rows}
                  columns={columns}
                  accent="cyan"
                  density="compact"
                  responsive="cards"
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
                  <div style={{ ...display, fontSize: '22px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                    {conference.label}
                  </div>
                  {conference.seeds.map((seed) => (
                    <div key={seed.teamId} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TeamLogo icon={seed.teamIcon} size={24} />
                        <div>
                        <div style={{ ...mono, color: seed.teamId === userTeam?.id ? 'var(--mfd-gold)' : 'var(--mfd-text)' }}>
                          #{seed.seed} {seed.teamName}
                        </div>
                        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                          {seed.divisionWinner ? 'Division winner' : 'Wildcard'}
                        </div>
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

        <PixelPanel title="Stat Leaders" accent="green">
          <div style={autoGrid(260)}>
          {([
            ['Passing Yards', statLeaders.passYds],
            ['Rushing Yards', statLeaders.rushYds],
            ['Receiving Yards', statLeaders.recYds],
            ['Sacks', statLeaders.sacks],
            ['INTs', statLeaders.defINT],
          ] as const).map(([label, leaders]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
              <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>{label.toUpperCase()}</div>
              {leaders.map((leader, index) => (
                <div key={leader.playerId} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ ...mono, color: 'var(--mfd-text)' }}>{index + 1}.</span>
                      <PlayerNameLink playerId={leader.playerId} name={leader.playerName} style={{ ...mono }} />
                    </div>
                    <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{leader.teamName}</div>
                  </div>
                  <PixelBadge variant="green">{leader.value}</PixelBadge>
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
