import { useMemo } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { PixelBadge, PixelButton, PixelPanel, PixelTable } from '@mfd/design-system/components';
import type { PlayerCareerStatLine } from '@mfd/engine';
import {
  selectFarewellCandidates,
  selectFarewellTours,
  selectPlayerProfileBundle,
  selectPlayerRivalries,
  selectTeamById,
  useGameStore,
} from '../../app/store/game-store';
import { useUiStore } from '../../app/store/ui-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  PlayerNameLink,
  autoGrid,
  monoSm,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';

function chartPoints(entries: Array<{ age: number; ovr: number }>) {
  if (entries.length <= 1) {
    return '0,100 100,0';
  }

  const minAge = Math.min(...entries.map((entry) => entry.age));
  const maxAge = Math.max(...entries.map((entry) => entry.age));
  const ageRange = Math.max(1, maxAge - minAge);
  const minOvr = Math.min(...entries.map((entry) => entry.ovr), 50);
  const maxOvr = Math.max(...entries.map((entry) => entry.ovr), 99);
  const ovrRange = Math.max(1, maxOvr - minOvr);

  return entries.map((entry, index) => {
    const x = (index / Math.max(1, entries.length - 1)) * 100;
    const y = 100 - (((entry.ovr - minOvr) / ovrRange) * 100);
    return `${x},${y}`;
  }).join(' ');
}

const statColumns: ColumnDef<PlayerCareerStatLine, unknown>[] = [
  {
    accessorKey: 'season',
    header: 'Season',
  },
  {
    accessorKey: 'team',
    header: 'Team',
    cell: ({ getValue }) => <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{getValue() as string}</span>,
  },
  {
    accessorKey: 'gamesPlayed',
    header: 'GP',
  },
  {
    accessorKey: 'gamesStarted',
    header: 'GS',
  },
  {
    id: 'stats',
    header: 'Key Stats',
    cell: ({ row }) => (
      <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
        {Object.entries(row.original.keyStats).map(([key, value]) => `${key}: ${value}`).join(' // ')}
      </span>
    ),
  },
];

interface ContractYearRow {
  year: number;
  baseSalary: number;
  capHit: number;
  deadCap: number;
}

const contractColumns: ColumnDef<ContractYearRow, unknown>[] = [
  { accessorKey: 'year', header: 'Year' },
  { accessorKey: 'baseSalary', header: 'Base', cell: ({ getValue }) => `$${getValue() as number}M` },
  { accessorKey: 'capHit', header: 'Cap Hit', cell: ({ getValue }) => `$${getValue() as number}M` },
  { accessorKey: 'deadCap', header: 'Dead Cap', cell: ({ getValue }) => `$${getValue() as number}M` },
];

export function PlayerProfile() {
  const { playerId } = useParams({ from: '/player/$playerId' });
  const bundle = useGameStore(selectPlayerProfileBundle(playerId));
  const team = useGameStore(selectTeamById(bundle?.profile.player.teamId ?? ''));
  const rivalries = useGameStore(selectPlayerRivalries(playerId));
  const farewellCandidates = useGameStore(selectFarewellCandidates);
  const farewellTours = useGameStore(selectFarewellTours);
  const navigate = useNavigate();
  const setFocusedPlayerContext = useUiStore((state) => state.setFocusedPlayerContext);
  const startFarewellTour = useGameStore((state) => state.actions.startFarewellTour);

  const chartData = useMemo(() => bundle ? chartPoints(bundle.profile.developmentArc) : '', [bundle]);

  if (!bundle) {
    return (
      <div style={screenStackStyle}>
        <PixelScreenHeader title="Player Profile" subtitle="Player not found." />
      </div>
    );
  }

  const { profile, value, comparables, projection } = bundle;
  const player = profile.player;
  const hasFarewellTour = farewellTours.some((tour) => tour.playerId === player.id);
  const isFarewellCandidate = farewellCandidates.some((candidate) => candidate.id === player.id);

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title={player.name}
        subtitle={`${player.pos} // ${team ? `${team.city} ${team.name}` : 'Free Agent'} // age ${player.age} // jersey #${player.jerseyNumber || '--'}`}
        badges={(
          <>
            <PixelBadge variant={player.ovr >= 90 ? 'gold' : player.ovr >= 80 ? 'green' : 'cyan'}>{player.ovr} OVR</PixelBadge>
            <PixelBadge variant="default">{player.pos}</PixelBadge>
            {profile.legacyHistoryPartial ? <PixelBadge variant="gold">Legacy history partial</PixelBadge> : null}
          </>
        )}
      />

      <div style={autoGrid(210)}>
        <PixelMetricCard label="Age" value={player.age} accent="cyan" detail={`Dev trait: ${player.devTrait}`} />
        <PixelMetricCard label="Trade Value" value={value.tradeValue} accent="gold" detail="Relative trade market score" />
        <PixelMetricCard label="Market Value" value={`$${value.marketValue}M`} accent="green" detail="Expected annual FA ask" />
        <PixelMetricCard label="Surplus" value={`$${value.surplus}M`} accent={value.surplus >= 0 ? 'green' : 'red'} detail="Value minus current annual cap hit" />
      </div>

      <div style={autoGrid(320)}>
        <PixelPanel title="Development Arc" accent={player.ovr >= 90 ? 'gold' : 'cyan'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <svg viewBox="0 0 100 100" role="img" aria-label="OVR development arc" style={{ width: '100%', height: '180px', border: '3px solid var(--mfd-border)', background: 'var(--mfd-bg-2)' }}>
              <polyline
                fill="none"
                stroke={player.ovr >= 90 ? 'var(--mfd-gold)' : 'var(--mfd-cyan)'}
                strokeWidth="3"
                points={chartData}
              />
              {profile.developmentArc.map((entry, index) => {
                const [x, y] = chartData.split(' ')[index]?.split(',') ?? ['0', '0'];
                return (
                  <circle
                    key={`${entry.age}-${entry.ovr}`}
                    cx={x}
                    cy={y}
                    r="3.4"
                    fill={player.ovr >= 90 ? 'var(--mfd-gold)' : 'var(--mfd-cyan)'}
                  />
                );
              })}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              {profile.developmentArc.map((entry) => (
                <div key={`arc-${entry.age}-${entry.ovr}`} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>AGE {entry.age}</span>
                  <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{entry.ovr} OVR</span>
                </div>
              ))}
            </div>
          </div>
        </PixelPanel>

        <PixelPanel title="Projection" accent="green">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Next Year</span>
              <PixelBadge variant="cyan">{projection.nextYearOvr} OVR</PixelBadge>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Peak</span>
              <PixelBadge variant="green">{projection.peakOvr} OVR @ {projection.peakAge}</PixelBadge>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Retirement Age</span>
              <PixelBadge variant="gold">{projection.retirementAge}</PixelBadge>
            </div>
          </div>
        </PixelPanel>
      </div>

      <div style={autoGrid(320)}>
        <PixelPanel title="Contract" accent="gold">
          {profile.contractDetails.yearByYear.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={autoGrid(160)}>
                <PixelMetricCard label="Total Value" value={`$${profile.contractDetails.totalValue}M`} accent="gold" />
                <PixelMetricCard label="Guaranteed" value={`$${profile.contractDetails.guaranteedRemaining}M`} accent="red" />
              </div>
              <PixelTable data={profile.contractDetails.yearByYear} columns={contractColumns} accent="gold" density="compact" />
            </div>
          ) : (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No active contract on file.</div>
          )}
        </PixelPanel>

        <PixelPanel title="Personality Report" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {profile.personalityReport.traits.length > 0
                ? profile.personalityReport.traits.map((trait) => <PixelBadge key={trait} variant="cyan">{trait}</PixelBadge>)
                : <PixelBadge variant="default">No flagged traits</PixelBadge>}
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Agent style: {profile.personalityReport.agentStyle}</div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Media presence: {profile.personalityReport.mediaPresence}</div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Locker room: {profile.personalityReport.lockerRoomImpact}</div>
          </div>
        </PixelPanel>

        <PixelPanel title="Endorsements" accent="green">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {player.endorsements.filter((deal) => deal.active).length > 0 ? player.endorsements.filter((deal) => deal.active).map((deal) => (
              <div key={deal.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{deal.brandName}</span>
                  <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{deal.yearsRemaining} year(s) left</span>
                </div>
                <PixelBadge variant={deal.tier === 'global' ? 'gold' : deal.tier === 'national' ? 'green' : 'cyan'}>
                  ${deal.revenuePerYear.toFixed(1)}M
                </PixelBadge>
              </div>
            )) : <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No active endorsement deals.</div>}
            <PixelButton accent="green" onClick={() => { void navigate({ to: '/endorsements' }); }}>
              Open Endorsements
            </PixelButton>
          </div>
        </PixelPanel>
      </div>

      <PixelPanel title="Career Stats" accent="cyan">
        <PixelTable data={profile.careerStats} columns={statColumns} accent="cyan" density="compact" />
      </PixelPanel>

      <div style={autoGrid(320)}>
        <PixelPanel title="Awards" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {profile.awardsWon.length > 0
              ? profile.awardsWon.map((award) => <PixelBadge key={award} variant="gold">{award}</PixelBadge>)
              : <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No awards recorded yet.</div>}
          </div>
        </PixelPanel>

        <PixelPanel title="Mentor & Injury History" accent="red">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {profile.mentorHistory.length > 0 ? profile.mentorHistory.map((entry) => (
              <div key={`${entry.mentorName}-${entry.bonus}`} style={{ ...monoSm, color: 'var(--mfd-text)' }}>
                {entry.mentorName}: +{entry.bonus} OVR
              </div>
            )) : <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No mentor notes.</div>}
            {profile.injuryHistory.length > 0 ? profile.injuryHistory.map((entry) => (
              <div key={`${entry.type}-${entry.season}`} style={{ ...monoSm, color: 'var(--mfd-text)' }}>
                {entry.season}: {entry.type} ({entry.weeksOut} weeks)
              </div>
            )) : <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No major injuries logged.</div>}
          </div>
        </PixelPanel>

        <PixelPanel title="Active Rivalries" accent={rivalries.some((rivalry) => rivalry.tier === 'nemesis') ? 'red' : rivalries.length > 0 ? 'gold' : 'cyan'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {rivalries.length > 0 ? rivalries.map((rivalry) => {
              const opponentName = rivalry.playerAId === player.id ? rivalry.playerBName : rivalry.playerAName;
              return (
                <div key={rivalry.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{opponentName}</span>
                    <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{rivalry.origin}</span>
                  </div>
                  <PixelBadge variant={rivalry.tier === 'nemesis' ? 'red' : rivalry.tier === 'heated' ? 'gold' : 'cyan'}>
                    {rivalry.tier.toUpperCase()} {rivalry.intensity}
                  </PixelBadge>
                </div>
              );
            }) : <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No active player rivalries.</div>}
            <PixelButton accent="cyan" onClick={() => { void navigate({ to: '/rivalries' }); }}>
              View Rivalries
            </PixelButton>
          </div>
        </PixelPanel>
      </div>

      <PixelPanel title="Comparable Players" accent="green">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {comparables.map((comparable) => (
            <div key={comparable.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid var(--mfd-border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <PlayerNameLink playerId={comparable.id} name={comparable.name} ovr={comparable.ovr} style={{ ...monoSm }} />
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{comparable.pos} // age {comparable.age}</span>
              </div>
              <PixelBadge variant={comparable.ovr >= 90 ? 'gold' : 'cyan'}>{comparable.ovr} OVR</PixelBadge>
            </div>
          ))}
        </div>
      </PixelPanel>

      <PixelPanel title="Actions" accent="gold">
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelButton
            accent="gold"
            onClick={() => {
              void navigate({ to: `/player/${player.id}/timeline` });
            }}
          >
            View Career Timeline
          </PixelButton>
          <PixelButton
            accent="cyan"
            onClick={() => {
              setFocusedPlayerContext(player.id, 'trades');
              void navigate({ to: '/trades' });
            }}
          >
            Trade
          </PixelButton>
          <PixelButton
            accent="red"
            onClick={() => {
              setFocusedPlayerContext(player.id, 'contracts');
              void navigate({ to: '/contracts' });
            }}
          >
            Cut
          </PixelButton>
          <PixelButton
            accent="green"
            onClick={() => {
              setFocusedPlayerContext(player.id, 'contracts');
              void navigate({ to: '/contracts' });
            }}
          >
            Extend
          </PixelButton>
          {team?.isUser && isFarewellCandidate && !hasFarewellTour ? (
            <PixelButton
              accent="gold"
              onClick={() => {
                void startFarewellTour(player.id);
              }}
            >
              Start Farewell Tour
            </PixelButton>
          ) : null}
        </div>
      </PixelPanel>
    </div>
  );
}
