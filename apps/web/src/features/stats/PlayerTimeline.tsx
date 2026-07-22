import { useMemo } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import type { DraftRecap } from '@mfd/engine';
import {
  PixelBadge,
  PixelButton,
  PixelMetricCard,
  PixelPanel,
  PixelPlayerLink,
  PixelScreenHeader,
} from '@mfd/design-system/components';
import { selectDraftRecaps, selectTeams, selectTransactionLog, usePlayerTimeline, useGameStore } from '../../app/store/game-store';
import { buildPlayerTransactionMemoryRows } from '../shared/playerTransactionMemory';

type DraftRecapMemoryAccent = 'green' | 'red' | 'cyan';

const screenStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
} as const;

const timelineSourceRows = [
  {
    id: 'timeline-read-model',
    label: 'Timeline read model',
    badge: 'getPlayerCareerTimeline',
    accent: 'cyan',
    detail: 'The route reads the existing engine timeline model through the store selector; it does not build or persist seasons itself.',
  },
  {
    id: 'archived-seasons',
    label: 'Archived seasons',
    badge: 'playerSeasonHistory',
    accent: 'gold',
    detail: 'Durable season cards come from archived player-season rows, including saved age, OVR, team, games, and key stats.',
  },
  {
    id: 'current-season',
    label: 'Current-season row',
    badge: 'game.players',
    accent: 'green',
    detail: 'Active players can receive a current-season row from live saved player stats when that season has not already been archived.',
  },
  {
    id: 'archive-fallback',
    label: 'Archive fallback',
    badge: 'playerArchive',
    accent: 'default',
    detail: 'Retired or missing live players can still resolve name and position from the saved player archive.',
  },
  {
    id: 'receipts',
    label: 'Awards and highlights',
    badge: 'awards/records',
    accent: 'default',
    detail: 'Award badges and highlights read existing awards, records, and milestone receipts for the matching season.',
  },
  {
    id: 'transaction-log',
    label: 'Transaction memory',
    badge: 'transactionLog',
    accent: 'gold',
    detail: 'Roster-move memories read saved transactionLog rows for this player; the timeline does not create or repair transactions.',
  },
  {
    id: 'draft-recaps',
    label: 'Draft recap memory',
    badge: 'draftRecaps',
    accent: 'gold',
    detail: 'Draft-class memories read saved user-team draftRecaps for this player; the timeline does not generate or repair recaps.',
  },
  {
    id: 'render-boundary',
    label: 'Just viewing',
    badge: 'display only',
    accent: 'default',
    detail: 'Opening Player Timeline does not write seasons, awards, records, milestones, draft recaps, player archives, or profile history.',
  },
] as const;

function draftRecapMemoryForPlayer(draftRecaps: DraftRecap[], playerId: string) {
  for (const recap of draftRecaps) {
    const pick = recap.picks.find((entry) => entry.playerId === playerId) ?? null;
    if (!pick) continue;
    const valueDelta = pick.valueDelta === 0 ? 'even value' : `${pick.valueDelta > 0 ? '+' : ''}${pick.valueDelta} value`;
    const accent: DraftRecapMemoryAccent = pick.verdict === 'steal' ? 'green' : pick.verdict === 'reach' ? 'red' : 'cyan';
    return {
      id: `draft-recap-${recap.year}-${pick.playerId}`,
      badge: `${pick.verdict.toUpperCase()} // Class ${recap.classGrade}`,
      yearLabel: `${recap.year} draft`,
      pickLabel: `Round ${pick.round}, pick ${pick.pick}`,
      detail: `Projected #${pick.projectedPick}, selected #${pick.pick}, ${valueDelta}.`,
      accent,
    };
  }
  return null;
}

function buildPolyline(values: number[]): string {
  if (values.length <= 1) return '0,80 100,20';
  const minValue = Math.min(...values, 50);
  const maxValue = Math.max(...values, 99);
  const span = Math.max(1, maxValue - minValue);
  return values.map((value, index) => {
    const x = (index / Math.max(1, values.length - 1)) * 100;
    const y = 100 - (((value - minValue) / span) * 80 + 10);
    return `${x},${y}`;
  }).join(' ');
}

export default function PlayerTimeline() {
  const { playerId } = useParams({ from: '/player/$playerId/timeline' });
  const navigate = useNavigate();
  const getPlayerTimeline = usePlayerTimeline();
  const teamsState = useGameStore(selectTeams);
  const teams = useMemo(() => teamsState ?? {}, [teamsState]);
  const transactionLog = useGameStore(selectTransactionLog);
  const draftRecaps = useGameStore(selectDraftRecaps);
  const timeline = getPlayerTimeline(playerId);
  const currentPlayer = useGameStore((state) => state.game?.players[playerId] ?? null);
  const transactionRows = useMemo(
    () => buildPlayerTransactionMemoryRows(transactionLog, playerId, teams),
    [playerId, teams, transactionLog],
  );
  const draftRecapMemory = useMemo(
    () => draftRecapMemoryForPlayer(draftRecaps, playerId),
    [draftRecaps, playerId],
  );

  const ovrPoints = useMemo(
    () => buildPolyline(timeline.seasons.map((season) => season.ovr)),
    [timeline.seasons],
  );

  const totals = useMemo(() => timeline.seasons.reduce((acc, season) => {
    acc.gamesPlayed += Number(season.stats.gamesPlayed ?? 0);
    acc.passYds += Number(season.stats.passYds ?? 0);
    acc.rushYds += Number(season.stats.rushYds ?? 0);
    acc.recYds += Number(season.stats.recYds ?? 0);
    acc.sacks += Number(season.stats.sacks ?? 0);
    acc.defINT += Number(season.stats.defINT ?? 0);
    acc.awards += season.awards.length;
    return acc;
  }, {
    gamesPlayed: 0,
    passYds: 0,
    rushYds: 0,
    recYds: 0,
    sacks: 0,
    defINT: 0,
    awards: 0,
  }), [timeline.seasons]);

  return (
    <div style={screenStyle}>
      <PixelScreenHeader
        title={timeline.playerName || 'Player Timeline'}
        subtitle={`${timeline.pos} career arc across ${timeline.seasons.length} season${timeline.seasons.length === 1 ? '' : 's'}.`}
        badges={currentPlayer ? <PixelBadge variant="gold">{currentPlayer.ovr} OVR</PixelBadge> : undefined}
      />

      <PixelPanel title="Timeline Sources" accent="cyan">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '10px' }}>
          {timelineSourceRows.map((row) => (
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

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '12px', alignItems: 'start' }}>
        <PixelPanel title="OVR Arc" accent="cyan">
          <svg viewBox="0 0 100 100" role="img" aria-label="Career OVR progression" style={{ width: '100%', height: '180px', background: 'var(--mfd-bg-3)', border: '3px solid var(--mfd-border)' }}>
            <polyline fill="none" stroke="var(--mfd-cyan)" strokeWidth="3" points={ovrPoints} />
            {timeline.seasons.map((season, index) => {
              const [x = '0', y = '0'] = ovrPoints.split(' ')[index]?.split(',') ?? [];
              return <circle key={`${season.year}-${season.ovr}`} cx={x} cy={y} r="3.5" fill="var(--mfd-gold)" />;
            })}
          </svg>
        </PixelPanel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <PixelButton accent="cyan" onClick={() => { void navigate({ to: `/player/${playerId}` }); }}>
            Back To Profile
          </PixelButton>
          <PixelButton accent="gold" onClick={() => { void navigate({ to: '/stat-central' }); }}>
            Open Compare
          </PixelButton>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <PixelMetricCard label="Career Games" value={totals.gamesPlayed} accent="green" />
        <PixelMetricCard label="Pass Yards" value={totals.passYds} accent="cyan" />
        <PixelMetricCard label="Rush Yards" value={totals.rushYds} accent="gold" />
        <PixelMetricCard label="Awards" value={totals.awards} accent="red" />
      </div>

      <PixelPanel title="Transaction Memory" accent={transactionRows.length > 0 ? 'green' : 'cyan'}>
        {transactionRows.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '10px' }}>
            {transactionRows.map((row) => (
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
                  <PixelBadge variant={row.accent}>{row.typeLabel}</PixelBadge>
                  <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
                    {row.yearWeek}
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text)', lineHeight: 1.5 }}>
                  {row.detail}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            No saved transaction rows for this player yet.
          </div>
        )}
      </PixelPanel>

      <PixelPanel title="Draft Class Memory" accent={draftRecapMemory ? 'gold' : 'cyan'}>
        {draftRecapMemory ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <PixelBadge variant={draftRecapMemory.accent}>{draftRecapMemory.badge}</PixelBadge>
              <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
                {draftRecapMemory.yearLabel}
              </span>
            </div>
            <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text)' }}>
              {draftRecapMemory.pickLabel}
            </span>
            <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
              Saved draft recap: {draftRecapMemory.detail}
            </span>
          </div>
        ) : (
          <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            No saved draft recap pick is linked to this player yet.
          </div>
        )}
      </PixelPanel>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {timeline.seasons.map((season, index) => {
          const previous = timeline.seasons[index - 1] ?? null;
          const teamChanged = previous && previous.teamId !== season.teamId;
          return (
            <PixelPanel key={`${season.year}-${season.teamId ?? 'fa'}`} title={`Season ${season.year}`} accent={teamChanged ? 'gold' : 'default'}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <PixelBadge variant="cyan">{season.teamAbbr}</PixelBadge>
                    <PixelBadge variant="gold">Age {season.age}</PixelBadge>
                    <PixelBadge variant="green">{season.ovr} OVR</PixelBadge>
                    {teamChanged ? <PixelBadge variant="red">New Team</PixelBadge> : null}
                  </div>
                  {season.teamId && teams[season.teamId] ? (
                    <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
                      {teams[season.teamId]!.city} {teams[season.teamId]!.name}
                    </span>
                  ) : null}
                </div>

                <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text)' }}>
                  GP {season.stats.gamesPlayed ?? 0} · Pass {season.stats.passYds ?? 0} · Rush {season.stats.rushYds ?? 0} · Rec {season.stats.recYds ?? 0} · Sacks {season.stats.sacks ?? 0} · INT {season.stats.defINT ?? 0}
                </div>

                {season.awards.length > 0 ? (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {season.awards.map((award) => <PixelBadge key={`${season.year}-${award}`} variant="gold">{award}</PixelBadge>)}
                  </div>
                ) : null}

                {season.highlights.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {season.highlights.map((highlight) => (
                      <div key={`${season.year}-${highlight}`} style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
                        {highlight}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
                    No major records or milestone highlights logged for this season.
                  </div>
                )}
              </div>
            </PixelPanel>
          );
        })}
      </div>

      {timeline.playerId ? (
        <PixelPanel title="Career Links" accent="green">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <PixelPlayerLink playerId={timeline.playerId} name="Open Player Profile" ovr={currentPlayer?.ovr} />
            <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
              Use Stat Central to compare this player against other careers in the save.
            </span>
          </div>
        </PixelPanel>
      ) : null}
    </div>
  );
}
