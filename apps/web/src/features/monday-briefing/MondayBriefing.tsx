import { useMemo } from 'react';
import {
  MfdPanel, MfdKpiCard, MfdKpiGrid, MfdBadge,
  MfdRingProgress, MfdConsequenceRibbon,
} from '@mfd/design-system/components';
import {
  Calendar, DollarSign, AlertTriangle, Activity, Star, Shield,
} from 'lucide-react';
import { calcCapHit } from '@mfd/engine';
import {
  useGameStore, selectUserTeam, selectRoster,
  selectWeek, selectYear, selectSchedule, selectOwnerState, selectLatestSummary,
} from '../../app/store/game-store';

export function MondayBriefing() {
  const team = useGameStore(selectUserTeam);
  const roster = useGameStore(selectRoster);
  const week = useGameStore(selectWeek);
  const year = useGameStore(selectYear);
  const schedule = useGameStore(selectSchedule);
  const ownerState = useGameStore(selectOwnerState);
  const latestSummary = useGameStore(selectLatestSummary);

  const teamName = team ? `${team.city} ${team.name}` : 'No Team';
  const record = team ? `${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ''}` : '0-0';

  // Next opponent from schedule
  const nextGame = useMemo(() => {
    if (!team || !schedule.length) return null;
    const weekSchedule = schedule.find((w) => w.week === week);
    if (!weekSchedule) return null;
    const game = weekSchedule.games.find(
      (g) => g.homeTeamId === team.id || g.awayTeamId === team.id,
    );
    return game ?? null;
  }, [team, schedule, week]);

  const game = useGameStore((s) => s.game);
  const opponentId = nextGame
    ? (nextGame.homeTeamId === team?.id ? nextGame.awayTeamId : nextGame.homeTeamId)
    : null;
  const opponent = opponentId && game ? game.teams[opponentId] : null;
  const opponentName = opponent ? `${opponent.city} ${opponent.name}` : 'Bye Week';

  // Injuries
  const injuries = useMemo(() =>
    roster
      .filter((p) => p.injury)
      .map((p) => ({
        player: `${p.firstName.charAt(0)}. ${p.lastName}`,
        position: p.pos,
        status: p.injury!.severity,
        weeks: p.injury!.gamesOut,
      })),
  [roster]);

  // Dev watchlist — top prospects by potential gap
  const devWatchlist = useMemo(() =>
    roster
      .filter((p) => p.pot - p.ovr >= 5 && (p.devTrait === 'star' || p.devTrait === 'superstar' || p.devTrait === 'x-factor'))
      .sort((a, b) => (b.pot - b.ovr) - (a.pot - a.ovr))
      .slice(0, 3)
      .map((p) => ({
        player: `${p.firstName.charAt(0)}. ${p.lastName}`,
        position: p.pos,
        trait: p.devTrait === 'x-factor' ? 'X-Factor' : p.devTrait === 'superstar' ? 'Superstar' : 'Star',
        progress: Math.round((p.ovr / p.pot) * 100),
      })),
  [roster]);

  const capSpace = team ? `$${Math.round(team.capSpace * 10) / 10}M` : '$0M';
  const ownerMood = ownerState ? ownerState.approval : 0;
  const ownerLabel = ownerMood >= 70 ? 'Pleased' : ownerMood >= 50 ? 'Neutral' : ownerMood >= 30 ? 'Unhappy' : 'Furious';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-lg)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--mfd-font-serif)', fontSize: '1.375rem',
            fontWeight: 700, color: 'var(--mfd-text)', margin: 0,
          }}>Monday Briefing</h1>
          <p style={{
            fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem',
            color: 'var(--mfd-text-dim)', margin: '4px 0 0',
          }}>
            {teamName} // Season {year}, Week {week}
          </p>
        </div>
        <MfdBadge variant="gold">{record}</MfdBadge>
      </div>

      {/* KPI Row */}
      <MfdKpiGrid columns={4}>
        <MfdKpiCard
          label="Latest Result"
          value={latestSummary ? latestSummary.result.toUpperCase() : opponentName}
          icon={<Calendar size={14} />}
          trendLabel={latestSummary?.headline ?? `Week ${week}`}
          trend={latestSummary?.result === 'win' ? 'up' : latestSummary?.result === 'loss' ? 'down' : 'flat'}
        />
        <MfdKpiCard
          label="Point Diff"
          value={team ? team.seasonStats.pointDifferential : 0}
          icon={<DollarSign size={14} />}
          trend={team && team.seasonStats.pointDifferential >= 0 ? 'up' : 'down'}
          variant={team && team.seasonStats.pointDifferential >= 0 ? 'success' : 'default'}
        />
        <MfdKpiCard
          label="Owner Mood"
          value={ownerLabel}
          icon={<Shield size={14} />}
          trend={ownerMood >= 60 ? 'up' : 'down'}
          trendLabel={`Approval: ${ownerMood}`}
        />
        <MfdKpiCard
          label="Injuries"
          value={injuries.length}
          icon={<AlertTriangle size={14} />}
          variant={injuries.length > 2 ? 'danger' : 'default'}
          trendLabel={injuries.length > 0 ? 'Players out' : 'All healthy'}
          trend="flat"
        />
      </MfdKpiGrid>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--mfd-sp-lg)' }}>
        {/* Injuries */}
        <MfdPanel title="Injury Report" icon={<Activity size={14} />}>
          {injuries.length === 0 ? (
            <p style={{ color: 'var(--mfd-text-faint)', fontSize: '0.8125rem', margin: 0 }}>
              No injuries to report
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
              {injuries.map((inj) => (
                <div key={inj.player} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 'var(--mfd-sp-xs) 0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-sm)' }}>
                    <span style={{ fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem', color: 'var(--mfd-text)' }}>
                      {inj.player}
                    </span>
                    <MfdBadge variant="default">{inj.position}</MfdBadge>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-sm)' }}>
                    <MfdBadge variant={inj.status === 'out' || inj.status === 'ir' ? 'danger' : 'warning'}>
                      {inj.status}
                    </MfdBadge>
                    <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem', color: 'var(--mfd-text-faint)' }}>
                      {inj.weeks}w
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </MfdPanel>

        {/* Development Watchlist */}
        <MfdPanel title="Dev Watchlist" icon={<Star size={14} />}>
          {devWatchlist.length === 0 ? (
            <p style={{ color: 'var(--mfd-text-faint)', fontSize: '0.8125rem', margin: 0 }}>
              No standout prospects on roster
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-md)' }}>
              {devWatchlist.map((dev) => (
                <div key={dev.player} style={{ display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-md)' }}>
                  <MfdRingProgress
                    value={dev.progress}
                    size={36}
                    strokeWidth={3}
                    color={dev.progress > 60 ? 'var(--mfd-green)' : 'var(--mfd-cyan)'}
                  />
                  <div>
                    <div style={{ fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem', color: 'var(--mfd-text)' }}>
                      {dev.player}
                      <MfdBadge variant="default" style={{ marginLeft: 6 }}>{dev.position}</MfdBadge>
                    </div>
                    <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem', color: 'var(--mfd-text-dim)', marginTop: 2 }}>
                      {dev.trait}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </MfdPanel>
      </div>

      <MfdPanel title="Last Game / Next Game" icon={<Calendar size={14} />}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--mfd-sp-lg)' }}>
          <div>
            <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem', color: 'var(--mfd-text-faint)', marginBottom: 6 }}>
              LAST RESULT
            </div>
            <div style={{ fontFamily: 'var(--mfd-font-serif)', fontSize: '1rem', fontWeight: 700 }}>
              {latestSummary?.headline ?? 'No games simulated yet'}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem', color: 'var(--mfd-text-faint)', marginBottom: 6 }}>
              UPCOMING
            </div>
            <div style={{ fontFamily: 'var(--mfd-font-serif)', fontSize: '1rem', fontWeight: 700 }}>
              {opponentName}
            </div>
          </div>
        </div>
      </MfdPanel>
    </div>
  );
}
