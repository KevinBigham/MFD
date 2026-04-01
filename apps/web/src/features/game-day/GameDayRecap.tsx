import {
  MfdBadge, MfdKpiCard, MfdKpiGrid, MfdPanel,
} from '@mfd/design-system/components';
import {
  Gamepad2, Trophy, Shield, HeartPulse,
} from 'lucide-react';
import {
  useGameStore,
  selectLatestSummary,
  selectPlayoffBracket,
  selectUserTeam,
  selectYear,
  selectPhase,
} from '../../app/store/game-store';

export function GameDayRecap() {
  const team = useGameStore(selectUserTeam);
  const latestSummary = useGameStore(selectLatestSummary);
  const playoffBracket = useGameStore(selectPlayoffBracket);
  const year = useGameStore(selectYear);
  const phase = useGameStore(selectPhase);

  if (!team) return null;

  const seasonStats = team.seasonStats;
  const latestResult = latestSummary
    ? latestSummary.result === 'win'
      ? 'WIN'
      : latestSummary.result === 'loss'
        ? 'LOSS'
        : latestSummary.result.toUpperCase()
    : 'NO GAME';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--mfd-font-serif)', fontSize: '1.375rem',
            fontWeight: 700, color: 'var(--mfd-text)', margin: 0,
          }}>Game Day Recap</h1>
          <p style={{
            fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem',
            color: 'var(--mfd-text-dim)', margin: '4px 0 0',
          }}>
            {team.city} {team.name} // {phase} // Season {year}
          </p>
        </div>
        <MfdBadge variant={latestSummary?.result === 'win' ? 'success' : latestSummary?.result === 'loss' ? 'danger' : 'default'}>
          {latestResult}
        </MfdBadge>
      </div>

      <MfdKpiGrid columns={4}>
        <MfdKpiCard label="Record" value={`${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ''}`} icon={<Trophy size={14} />} trend="flat" />
        <MfdKpiCard label="PF / PA" value={`${seasonStats.pointsFor} / ${seasonStats.pointsAgainst}`} icon={<Shield size={14} />} trend={seasonStats.pointDifferential >= 0 ? 'up' : 'down'} />
        <MfdKpiCard label="Yards" value={seasonStats.totalYards} icon={<Gamepad2 size={14} />} trend="flat" />
        <MfdKpiCard label="Injuries" value={latestSummary?.injuries.length ?? 0} icon={<HeartPulse size={14} />} trend={(latestSummary?.injuries.length ?? 0) > 0 ? 'down' : 'flat'} />
      </MfdKpiGrid>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 'var(--mfd-sp-lg)' }}>
        <MfdPanel title="Latest Result" icon={<Gamepad2 size={14} />}>
          {latestSummary ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-md)' }}>
              <div style={{
                fontFamily: 'var(--mfd-font-serif)', fontSize: '1.125rem',
                fontWeight: 700, color: 'var(--mfd-text)',
              }}>
                {latestSummary.headline}
              </div>
              <div style={{ display: 'flex', gap: 'var(--mfd-sp-sm)', flexWrap: 'wrap' }}>
                <MfdBadge variant="gold">{latestSummary.record}</MfdBadge>
                <MfdBadge variant="default">{latestSummary.phase}</MfdBadge>
                {latestSummary.mvpPlayerId && <MfdBadge variant="info">MVP: {latestSummary.mvpPlayerId}</MfdBadge>}
              </div>
              {latestSummary.notes.map((note) => (
                <div key={note} style={{
                  fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem',
                  color: 'var(--mfd-text-dim)',
                }}>
                  {note}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.8125rem', color: 'var(--mfd-text-dim)' }}>
              No simulated games yet. Start the regular season from Advance Week.
            </div>
          )}
        </MfdPanel>

        <MfdPanel title="Playoff Picture" icon={<Trophy size={14} />}>
          {playoffBracket ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
              <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)' }}>
                AFC Seeds: {playoffBracket.afc.map((seed) => `${seed.seed}.${seed.teamId}`).join(' / ')}
              </div>
              <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)' }}>
                NFC Seeds: {playoffBracket.nfc.map((seed) => `${seed.seed}.${seed.teamId}`).join(' / ')}
              </div>
              {playoffBracket.championTeamId && (
                <MfdBadge variant="success">Champion: {playoffBracket.championTeamId}</MfdBadge>
              )}
            </div>
          ) : (
            <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.8125rem', color: 'var(--mfd-text-dim)' }}>
              Bracket locks after Week 18.
            </div>
          )}
        </MfdPanel>
      </div>
    </div>
  );
}
