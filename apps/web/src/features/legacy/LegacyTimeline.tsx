import { useMemo, useState } from 'react';
import {
  PixelBadge,
  PixelButton,
  PixelPanel,
  PixelTable,
} from '@mfd/design-system/components';
import type {
  AwardsHistoryEntry,
  FranchiseHistoryEntry,
  HallOfFameEntry,
  PlayerArchiveEntry,
  RecordBook,
  RecordEntry,
} from '@mfd/engine';
import type { ColumnDef } from '@tanstack/react-table';
import {
  selectAwardsHistory,
  selectCeremonies,
  selectDynastyScore,
  selectDynastyTimeline,
  selectHallOfFame,
  selectHistoricalMentoringChains,
  selectRecords,
  selectUserMentoringPairs,
  selectUserTeam,
  useGameStore,
} from '../../app/store/game-store';
import { CeremonyViewer } from './CeremonyViewer';
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
    cell: ({ row, getValue }) => (
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        {row.original.playoffFinish === 'champion' ? <PixelBadge variant="gold">Trophy</PixelBadge> : null}
        <span style={{ color: '#fff' }}>{getValue() as number}</span>
      </div>
    ),
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
  {
    id: 'awardsWon',
    header: 'Awards',
    cell: ({ row }) => (
      <StackedBadges
        items={row.original.awardsWon}
        emptyLabel="None"
        accent="gold"
      />
    ),
  },
  {
    id: 'recordsBroken',
    header: 'Records',
    cell: ({ row }) => (
      <StackedBadges
        items={row.original.recordsBroken}
        emptyLabel="None"
        accent="cyan"
      />
    ),
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
  const awardsHistory = useGameStore(selectAwardsHistory);
  const ceremonies = useGameStore(selectCeremonies);
  const dynastyScore = useGameStore(selectDynastyScore);
  const dynastyTimeline = useGameStore(selectDynastyTimeline);
  const hallOfFame = useGameStore(selectHallOfFame);
  const records = useGameStore(selectRecords);
  const activeMentoringPairs = useGameStore(selectUserMentoringPairs);
  const historicalMentoring = useGameStore(selectHistoricalMentoringChains);
  const [selectedCeremonyId, setSelectedCeremonyId] = useState<string | null>(null);

  const teamHistory = useMemo(() => {
    if (!game || !userTeam) return [];
    return [...game.franchiseHistory]
      .filter((entry) => entry.teamId === userTeam.id)
      .sort((a, b) => b.year - a.year);
  }, [game, userTeam]);

  const timelineYears = useMemo(() => {
    const historyByYear = new Map(teamHistory.map((entry) => [entry.year, entry]));
    const grouped = new Map<number, typeof dynastyTimeline>();

    for (const event of dynastyTimeline) {
      const current = grouped.get(event.year) ?? [];
      current.push(event);
      grouped.set(event.year, current);
    }

    return [...grouped.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([year, events]) => ({
        year,
        summary: historyByYear.get(year) ?? null,
        events: [...events].sort((a, b) =>
          (b.week ?? 99) - (a.week ?? 99) ||
          importanceWeight(b.importance) - importanceWeight(a.importance) ||
          a.headline.localeCompare(b.headline)),
      }));
  }, [dynastyTimeline, teamHistory]);

  const allTimeRoster = useMemo(() => {
    if (!game || !userTeam) return [];
    return [...game.playerArchive]
      .filter((entry) => entry.teamHistory.some((stint) => stint.teamId === userTeam.id))
      .sort((a, b) => b.peakOvr - a.peakOvr || b.peakYear - a.peakYear || a.name.localeCompare(b.name));
  }, [game, userTeam]);

  const awardRows = useMemo(() => [...awardsHistory].sort((a, b) => b.year - a.year), [awardsHistory]);
  const recordPanels = useMemo(() => buildRecordPanels(records), [records]);

  const titleCount = teamHistory.filter((entry) => entry.playoffFinish === 'champion').length;
  const legendCount = allTimeRoster.filter((entry) => entry.peakOvr >= 85).length;
  const hallCount = hallOfFame.length;
  const selectedCeremony = ceremonies.find((entry) => entry.id === selectedCeremonyId) ?? null;

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Dynasty Legacy"
        subtitle={`${userTeam ? `${userTeam.city} ${userTeam.name}` : 'Franchise'} history, award eras, record trails, and mentoring chains.`}
        badges={(
          <>
            <PixelBadge variant="gold">{teamHistory.length} seasons</PixelBadge>
            <PixelBadge variant="green">{titleCount} titles</PixelBadge>
            <PixelBadge variant="cyan">{hallCount} hall of famers</PixelBadge>
            <PixelBadge variant="gold">{`Dynasty ${dynastyScore}`}</PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(220)}>
        <PixelMetricCard label="Seasons Tracked" value={teamHistory.length} accent="gold" detail="Archived finishes in the dynasty timeline" />
        <PixelMetricCard label="Championships" value={titleCount} accent="green" detail="Titles captured in the archive" />
        <PixelMetricCard label="Legends" value={legendCount} accent="cyan" detail="Players who peaked at 85+ overall" />
        <PixelMetricCard label="Dynasty Score" value={dynastyScore} accent="gold" detail="Championships, playoff trips, awards, and records blended" />
      </div>

      <div style={autoGrid(360)}>
        <PixelPanel title="Season Results" accent="gold">
          {teamHistory.length === 0 ? (
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No completed seasons archived yet.</span>
          ) : (
            <PixelTable data={teamHistory} columns={historyColumns} accent="gold" />
          )}
        </PixelPanel>

        <PixelPanel title="Awards History" accent="cyan">
          {awardRows.length === 0 ? (
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Award classes will appear once the first season is completed.</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {awardRows.map((entry) => (
                <div key={entry.year} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ ...monoSm, color: '#fff' }}>{entry.year}</span>
                    <PixelBadge variant="cyan">{entry.ceremony.headline}</PixelBadge>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {marqueeAwards(entry).map((award) => (
                      <PixelBadge key={`${entry.year}-${award.awardId}`} variant={awardAccent(award.awardId)}>
                        {`${award.label}: ${award.winnerName}`}
                      </PixelBadge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>
      </div>

      <div style={autoGrid(360)}>
        <PixelPanel title="Dynasty Timeline" accent="cyan">
          {timelineYears.length === 0 ? (
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Major events will start stacking once seasons complete.</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {timelineYears.map((entry) => (
                <div key={entry.year} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '10px',
                  border: `3px solid ${entry.summary?.playoffFinish === 'champion' ? 'var(--mfd-gold)' : 'var(--mfd-border)'}`,
                  background: 'var(--mfd-bg-2)',
                }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ ...monoSm, color: '#fff' }}>{entry.year}</span>
                      {entry.summary ? <PixelBadge variant={finishAccent(entry.summary.playoffFinish)}>{entry.summary.record}</PixelBadge> : null}
                      {entry.summary?.playoffFinish === 'champion' ? <PixelBadge variant="gold">Championship Year</PixelBadge> : null}
                    </div>
                    {entry.summary ? <PixelBadge variant="default">{formatFinish(entry.summary.playoffFinish)}</PixelBadge> : null}
                  </div>
                  {entry.events.map((event) => (
                    <div
                      key={event.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        paddingLeft: '10px',
                        borderLeft: `3px solid ${dynastyAccent(event.importance)}`,
                        background: event.importance === 'landmark' ? 'rgba(255, 215, 0, 0.06)' : event.importance === 'major' ? 'rgba(0, 229, 255, 0.05)' : 'transparent',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ ...monoSm, color: '#fff' }}>{event.headline}</span>
                        <PixelBadge variant={event.importance === 'landmark' ? 'gold' : event.importance === 'major' ? 'cyan' : 'default'}>
                          {event.importance}
                        </PixelBadge>
                      </div>
                      <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                        {event.type.replaceAll('_', ' ')}{event.week !== null ? ` // Week ${event.week}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </PixelPanel>

        <PixelPanel title="Ceremonies" accent="gold">
          {ceremonies.length === 0 ? (
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Ceremony broadcasts will archive here after the first major milestone lands.</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ceremonies.map((ceremony) => (
                <div key={ceremony.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '12px',
                  alignItems: 'center',
                  padding: '10px',
                  border: '3px solid var(--mfd-border)',
                  background: 'var(--mfd-bg-2)',
                  flexWrap: 'wrap',
                }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ ...monoSm, color: '#fff' }}>{ceremony.headline}</div>
                    <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                      {ceremony.year} // {ceremony.type.replaceAll('_', ' ')}
                    </div>
                  </div>
                  <PixelButton accent="gold" onClick={() => setSelectedCeremonyId(ceremony.id)}>
                    View
                  </PixelButton>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>
      </div>

      <PixelPanel title="Hall of Fame" accent="red">
        {hallOfFame.length === 0 ? (
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Inductees will appear after retired legends clear the threshold.</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[...hallOfFame]
              .sort((a, b) => b.inductionYear - a.inductionYear || b.peakOvr - a.peakOvr || a.name.localeCompare(b.name))
              .map((entry) => (
                <HallOfFameCard key={`${entry.playerId}-${entry.inductionYear}`} entry={entry} userTeamId={userTeam?.id ?? null} />
              ))}
          </div>
        )}
      </PixelPanel>

      <PixelPanel title="Records Book" accent="green">
        <div style={autoGrid(260)}>
          {recordPanels.map((panel) => (
            <div key={panel.title}>
              <div style={{ ...monoSm, color: '#fff', marginBottom: '8px' }}>{panel.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {panel.entries.length === 0 ? (
                  <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Waiting on the first benchmark.</span>
                ) : (
                  panel.entries.map((entry) => (
                    <div key={`${panel.title}-${entry.stat}`} style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '10px', borderLeft: `3px solid ${panel.accent}` }}>
                      <span style={{ ...monoSm, color: '#fff' }}>
                        {recordLabel(entry.stat)}: {entry.value}
                      </span>
                      <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                        {entry.playerName ?? entry.teamName} // {entry.year}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </PixelPanel>

      <div style={autoGrid(360)}>
        <PixelPanel title="Mentoring Report" accent="green">
          {activeMentoringPairs.length === 0 ? (
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No active mentoring pairs are locked in right now.</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeMentoringPairs.map((pair) => (
                <div key={`${pair.mentorId}-${pair.menteeId}`} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <span style={{ ...monoSm, color: '#fff' }}>{pair.mentorName}{' -> '}{pair.menteeName}</span>
                    <PixelBadge variant="green">{`+${pair.bonus} OVR`}</PixelBadge>
                  </div>
                  <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                    {pair.positionGroup} room pairing for {pair.year}.
                  </span>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>

        <PixelPanel title="Mentoring Chains" accent="gold">
          {historicalMentoring.length === 0 ? (
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Historical chains will appear once offseason mentorships start stacking.</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {historicalMentoring.map((entry) => (
                <div key={entry.id} style={{ display: 'flex', gap: '12px', paddingLeft: '10px', borderLeft: '3px solid var(--mfd-gold)' }}>
                  <span style={{ ...monoSm, color: '#fff', minWidth: '52px' }}>{entry.year}</span>
                  <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{entry.summary}</span>
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

      <CeremonyViewer
        ceremony={selectedCeremony}
        open={!!selectedCeremony}
        onOpenChange={(open) => {
          if (!open) setSelectedCeremonyId(null);
        }}
      />
    </div>
  );
}

function StackedBadges({
  items,
  accent,
  emptyLabel,
}: {
  items: string[];
  accent: 'gold' | 'cyan';
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{emptyLabel}</span>;
  }

  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {items.slice(0, 2).map((item) => (
        <PixelBadge key={item} variant={accent}>{item}</PixelBadge>
      ))}
      {items.length > 2 ? <PixelBadge variant="default">{`+${items.length - 2}`}</PixelBadge> : null}
    </div>
  );
}

function HallOfFameCard({ entry, userTeamId }: { entry: HallOfFameEntry; userTeamId: string | null }) {
  const hasUserTeamTie = userTeamId ? entry.teams.includes(userTeamId) : false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '10px', borderLeft: `3px solid ${hasUserTeamTie ? 'var(--mfd-cyan)' : 'var(--mfd-red)'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ ...monoSm, color: '#fff' }}>{entry.name}</span>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <PixelBadge variant={hasUserTeamTie ? 'cyan' : 'red'}>{entry.position}</PixelBadge>
          <PixelBadge variant="gold">{`Class of ${entry.inductionYear}`}</PixelBadge>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <PixelBadge variant="default">{`Peak ${entry.peakOvr}`}</PixelBadge>
        <PixelBadge variant="default">{`${entry.careerYears} seasons`}</PixelBadge>
        {entry.awards.mvps > 0 ? <PixelBadge variant="gold">{`${entry.awards.mvps} MVP`}</PixelBadge> : null}
        {entry.awards.allPros > 0 ? <PixelBadge variant="green">{`${entry.awards.allPros} All-Pro`}</PixelBadge> : null}
        {entry.awards.proBowls > 0 ? <PixelBadge variant="cyan">{`${entry.awards.proBowls} Pro Bowl`}</PixelBadge> : null}
      </div>
      <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{entry.highlights.join(' // ')}</span>
    </div>
  );
}

function marqueeAwards(entry: AwardsHistoryEntry) {
  const marqueeIds = new Set(['mvp', 'opoy', 'dpoy', 'oroy', 'droy']);
  return entry.awards.filter((award) => marqueeIds.has(award.awardId));
}

function buildRecordPanels(records: RecordBook) {
  return [
    {
      title: 'Single Game',
      accent: 'var(--mfd-gold)',
      entries: recordLeaders(records.singleGame),
    },
    {
      title: 'Single Season',
      accent: 'var(--mfd-cyan)',
      entries: recordLeaders(records.singleSeason),
    },
    {
      title: 'Career',
      accent: 'var(--mfd-green)',
      entries: recordLeaders(records.career),
    },
    {
      title: 'Franchise',
      accent: 'var(--mfd-red)',
      entries: recordLeaders(records.franchise),
    },
  ];
}

function recordLeaders(bucket: Record<string, RecordEntry[]>) {
  return Object.values(bucket)
    .map((entries) => entries[0] ?? null)
    .filter((entry): entry is RecordEntry => entry !== null)
    .sort((a, b) => a.stat.localeCompare(b.stat));
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

function awardAccent(awardId: string): 'default' | 'gold' | 'cyan' | 'green' | 'red' {
  if (awardId === 'mvp') return 'gold';
  if (awardId === 'opoy' || awardId === 'oroy') return 'green';
  if (awardId === 'dpoy') return 'red';
  if (awardId === 'droy') return 'cyan';
  return 'default';
}

function recordLabel(stat: string): string {
  if (stat === 'passYds') return 'Passing Yards';
  if (stat === 'rushYds') return 'Rushing Yards';
  if (stat === 'recYds') return 'Receiving Yards';
  if (stat === 'touchdowns') return 'Touchdowns';
  if (stat === 'passTD') return 'Passing TDs';
  if (stat === 'rushTD') return 'Rushing TDs';
  if (stat === 'defINT') return 'Interceptions';
  if (stat === 'pointsGame') return 'Points in Game';
  if (stat === 'pointsSeason') return 'Points in Season';
  if (stat === 'wins') return 'Wins';
  if (stat === 'winStreak') return 'Win Streak';
  if (stat === 'gp') return 'Games Played';
  return 'Sacks';
}

function accentColor(accent: 'default' | 'gold' | 'cyan' | 'green' | 'red') {
  if (accent === 'gold') return 'var(--mfd-gold)';
  if (accent === 'cyan') return 'var(--mfd-cyan)';
  if (accent === 'green') return 'var(--mfd-green)';
  if (accent === 'red') return 'var(--mfd-red)';
  return 'var(--mfd-border)';
}

function dynastyAccent(importance: 'landmark' | 'major' | 'minor') {
  if (importance === 'landmark') return 'var(--mfd-gold)';
  if (importance === 'major') return 'var(--mfd-cyan)';
  return 'var(--mfd-border)';
}

function importanceWeight(importance: 'landmark' | 'major' | 'minor') {
  if (importance === 'landmark') return 3;
  if (importance === 'major') return 2;
  return 1;
}
