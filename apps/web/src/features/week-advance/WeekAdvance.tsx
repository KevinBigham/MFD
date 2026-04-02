import { useState, useMemo, useCallback } from 'react';
import {
  MfdPanel, MfdBadge, MfdConsequenceRibbon,
} from '@mfd/design-system/components';
import {
  Play, CheckCircle, Clock, AlertTriangle,
  Users, DollarSign, Shield,
} from 'lucide-react';
import {
  useGameStore, selectUserTeam, selectRoster,
  selectWeek, selectYear, selectSchedule, selectLatestSummary, selectOffseasonState, selectPhase, selectTeams,
} from '../../app/store/game-store';

interface ChecklistItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: 'done' | 'warn' | 'pending';
  detail: string;
}

export function WeekAdvance() {
  const team = useGameStore(selectUserTeam);
  const roster = useGameStore(selectRoster);
  const week = useGameStore(selectWeek);
  const year = useGameStore(selectYear);
  const schedule = useGameStore(selectSchedule);
  const latestSummary = useGameStore(selectLatestSummary);
  const offseasonState = useGameStore(selectOffseasonState);
  const phase = useGameStore(selectPhase);
  const { advanceWeek } = useGameStore((s) => s.actions);

  const [advancing, setAdvancing] = useState(false);

  // Build checklist from live data
  const checklist = useMemo((): ChecklistItem[] => {
    if (!team) return [];
    const starters = roster.filter((p) => p.isStarter);
    const injured = roster.filter((p) => p.injury);
    const injuredStarters = starters.filter((p) => p.injury);

    return [
      {
        id: 'depth',
        label: 'Depth Chart Set',
        icon: <Users size={14} />,
        status: starters.length >= 22 ? 'done' : 'warn',
        detail: starters.length >= 22 ? 'All positions have starters' : `Only ${starters.length}/22 starters set`,
      },
      {
        id: 'injuries',
        label: 'Injury Review',
        icon: <AlertTriangle size={14} />,
        status: injuredStarters.length > 0 ? 'warn' : injured.length > 0 ? 'warn' : 'done',
        detail: injuredStarters.length > 0
          ? `${injuredStarters.length} injured starter(s)`
          : injured.length > 0
            ? `${injured.length} injured player(s), no starters affected`
            : 'All healthy',
      },
      {
        id: 'cap',
        label: 'Cap Compliant',
        icon: <DollarSign size={14} />,
        status: team.capSpace >= 0 ? 'done' : 'pending',
        detail: team.capSpace >= 0 ? `$${Math.round(team.capSpace)}M free` : `$${Math.round(-team.capSpace)}M OVER CAP`,
      },
      {
        id: 'gameplan',
        label: 'Schemes Set',
        icon: <Shield size={14} />,
        status: 'done',
        detail: `OFF: ${team.schemeOff} / DEF: ${team.schemeDef}`,
      },
    ];
  }, [team, roster]);

  const allClear = checklist.every((c) => c.status === 'done');
  const issueCount = checklist.filter((c) => c.status !== 'done').length;

  // Next opponent
  const matchup = useMemo(() => {
    if (!team || !schedule.length || (phase !== 'regular_season' && phase !== 'playoffs')) return null;
    const weekSchedule = schedule.find((w) => w.week === week);
    if (!weekSchedule) return null;
    const game = weekSchedule.games.find(
      (g) => g.homeTeamId === team.id || g.awayTeamId === team.id,
    );
    if (!game) return null;
    const opponentId = game.homeTeamId === team.id ? game.awayTeamId : game.homeTeamId;
    return { game, opponentId };
  }, [phase, team, schedule, week]);

  const teams = useGameStore(selectTeams);
  const opponent = matchup?.opponentId && teams ? teams[matchup.opponentId] : null;

  const handleAdvance = useCallback(async () => {
    setAdvancing(true);
    try {
      await advanceWeek();
    } finally {
      setAdvancing(false);
    }
  }, [advanceWeek]);

  const advanceLabel = phase === 'preseason'
    ? 'Begin Regular Season'
    : phase === 'playoffs'
      ? `Advance Playoffs`
      : phase === 'offseason'
        ? 'Open Free Agency'
        : phase === 'free_agency'
          ? `Resolve Free Agency Round ${offseasonState?.round ?? 1}`
          : phase === 'draft'
            ? 'Advance To Next Draft Pick'
            : phase === 'post_draft'
              ? 'Finalize Preseason'
              : `Advance to Week ${week + 1}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-lg)' }}>
      <div>
        <h1 style={{
          fontFamily: 'var(--mfd-font-serif)', fontSize: '1.375rem',
          fontWeight: 700, color: 'var(--mfd-text)', margin: 0,
        }}>{advanceLabel}</h1>
        <p style={{
          fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem',
          color: 'var(--mfd-text-dim)', margin: '4px 0 0',
        }}>
          {phase} // {allClear ? 'All clear' : `${issueCount} issue(s)`}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--mfd-sp-lg)' }}>
        {/* Pre-Advance Checklist */}
        <MfdPanel title="Pre-Advance Checklist" icon={<CheckCircle size={14} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
            {checklist.map((item) => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 'var(--mfd-sp-md)',
                padding: 'var(--mfd-sp-sm)',
                background: item.status === 'pending' ? 'color-mix(in srgb, var(--mfd-red) 6%, transparent)' : 'var(--mfd-bg-2)',
                border: `1px solid ${item.status === 'pending' ? 'var(--mfd-red)' : item.status === 'warn' ? 'var(--mfd-amber)' : 'var(--mfd-border)'}`,
                borderRadius: 'var(--mfd-rad-md)',
              }}>
                <div style={{
                  color: item.status === 'done' ? 'var(--mfd-green)' : item.status === 'warn' ? 'var(--mfd-amber)' : 'var(--mfd-red)',
                  flexShrink: 0, marginTop: 1,
                }}>
                  {item.status === 'done' ? <CheckCircle size={14} /> : item.status === 'warn' ? <AlertTriangle size={14} /> : <Clock size={14} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-sm)' }}>
                    <span style={{
                      fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem',
                      fontWeight: 500, color: 'var(--mfd-text)',
                    }}>{item.label}</span>
                    <MfdBadge variant={item.status === 'done' ? 'success' : item.status === 'warn' ? 'warning' : 'danger'}>
                      {item.status === 'done' ? 'OK' : item.status === 'warn' ? 'Warn' : 'Pending'}
                    </MfdBadge>
                  </div>
                  <div style={{
                    fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem',
                    color: 'var(--mfd-text-dim)', marginTop: 2,
                  }}>{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </MfdPanel>

        {/* Matchup + Advance Button */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-lg)' }}>
          <MfdPanel title={`Week ${week} Matchup`} icon={<Shield size={14} />}>
            {opponent ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--mfd-font-serif)', fontSize: '1.125rem', fontWeight: 700 }}>
                    vs {opponent.city} {opponent.name}
                  </span>
                  <MfdBadge variant="default">{opponent.wins}-{opponent.losses}</MfdBadge>
                </div>
                <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)' }}>
                  {opponent.schemeOff} offense / {opponent.schemeDef} defense
                </div>
              </div>
            ) : (
              <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.8125rem', color: 'var(--mfd-text-dim)' }}>
                {phase === 'offseason' && 'Re-sign window is active'}
                {phase === 'free_agency' && `Round ${offseasonState?.round ?? 1} market resolution`}
                {phase === 'draft' && 'Advance until your next pick'}
                {phase === 'post_draft' && 'Resetting league for preseason'}
                {phase !== 'offseason' && phase !== 'free_agency' && phase !== 'draft' && phase !== 'post_draft' && 'Bye Week'}
              </div>
            )}
          </MfdPanel>

          <MfdPanel title="Stakes" icon={<AlertTriangle size={14} />}>
            <MfdConsequenceRibbon
              consequences={[
                { id: 'c1', label: 'Owner Patience', delta: '-4 if loss', direction: 'warning' as const },
                { id: 'c2', label: 'Chemistry', delta: '+2 if win', direction: 'positive' as const },
                { id: 'c3', label: 'System Fit', delta: '+1 all players', direction: 'positive' as const },
              ]}
            />
          </MfdPanel>

          <button
            onClick={handleAdvance}
            disabled={advancing}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--mfd-sp-sm)',
              padding: 'var(--mfd-sp-md)',
              fontSize: '0.875rem', fontWeight: 700,
              fontFamily: 'var(--mfd-font-sans)',
              color: advancing ? 'var(--mfd-text-dim)' : 'var(--mfd-bg)',
              background: advancing ? 'var(--mfd-bg-3)' : allClear ? 'var(--mfd-green)' : 'var(--mfd-amber)',
              border: 'none',
              borderRadius: 'var(--mfd-rad-md)',
              cursor: advancing ? 'default' : 'pointer',
              transition: 'all var(--mfd-motion-fast)',
            }}
          >
            {advancing ? (
              <>
                <CheckCircle size={16} />
                Running {phase} simulation...
              </>
            ) : (
              <>
                <Play size={16} />
                {allClear ? advanceLabel : 'Advance Anyway'}
                {!allClear && <MfdBadge variant="danger">{issueCount} issue(s)</MfdBadge>}
              </>
            )}
          </button>
        </div>
      </div>

      <MfdPanel title="Latest Summary" icon={<Play size={14} />}>
        {latestSummary ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
            <div style={{
              fontFamily: 'var(--mfd-font-serif)', fontSize: '1rem',
              fontWeight: 700, color: 'var(--mfd-text)',
            }}>
              {latestSummary.headline}
            </div>
            <div style={{ display: 'flex', gap: 'var(--mfd-sp-sm)', flexWrap: 'wrap' }}>
              <MfdBadge variant="gold">{latestSummary.record}</MfdBadge>
              <MfdBadge variant={latestSummary.result === 'win' ? 'success' : latestSummary.result === 'loss' ? 'danger' : 'default'}>
                {latestSummary.result.toUpperCase()}
              </MfdBadge>
              <MfdBadge variant="default">{latestSummary.phase}</MfdBadge>
            </div>
          </div>
        ) : (
          <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)' }}>
            No simulated results yet.
          </div>
        )}
      </MfdPanel>
    </div>
  );
}
