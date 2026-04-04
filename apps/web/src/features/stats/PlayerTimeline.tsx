import { useMemo } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  PixelBadge,
  PixelButton,
  PixelMetricCard,
  PixelPanel,
  PixelPlayerLink,
  PixelScreenHeader,
} from '@mfd/design-system/components';
import { selectTeams, usePlayerTimeline, useGameStore } from '../../app/store/game-store';

const screenStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
} as const;

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
  const teams = useGameStore(selectTeams) ?? {};
  const timeline = getPlayerTimeline(playerId);
  const currentPlayer = useGameStore((state) => state.game?.players[playerId] ?? null);

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
