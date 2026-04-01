import { useMemo } from 'react';
import {
  MfdPanel, MfdBadge, MfdKpiGrid, MfdKpiCard,
  MfdRingProgress,
} from '@mfd/design-system/components';
import {
  Shield, AlertTriangle, Clock, TrendingDown,
  Flame, ThumbsUp, ThumbsDown, Target,
} from 'lucide-react';
import { getOwnerStatus } from '@mfd/engine';
import {
  useGameStore, selectUserTeam, selectOwnerState,
} from '../../app/store/game-store';

type OwnerStage = 'PATIENT' | 'RESTLESS' | 'DEMANDING' | 'ULTIMATUM';

const STAGE_CONFIG: Record<OwnerStage, { color: string; label: string; icon: React.ReactNode }> = {
  PATIENT: { color: 'var(--mfd-green)', label: 'Patient', icon: <ThumbsUp size={14} /> },
  RESTLESS: { color: 'var(--mfd-cyan)', label: 'Restless', icon: <Clock size={14} /> },
  DEMANDING: { color: 'var(--mfd-amber)', label: 'Demanding', icon: <AlertTriangle size={14} /> },
  ULTIMATUM: { color: 'var(--mfd-red)', label: 'Ultimatum', icon: <Flame size={14} /> },
};

function getStage(approval: number): OwnerStage {
  if (approval >= 70) return 'PATIENT';
  if (approval >= 50) return 'RESTLESS';
  if (approval >= 30) return 'DEMANDING';
  return 'ULTIMATUM';
}

export function OwnerMood() {
  const team = useGameStore(selectUserTeam);
  const ownerState = useGameStore(selectOwnerState);

  const game = useGameStore((s) => s.game);
  const owner = team && game ? game.owners[team.ownerId] : null;

  const approval = ownerState?.approval ?? 60;
  const patience = owner?.patience ?? 60;
  const stage = getStage(approval);
  const confidenceScore = Math.round(patience * 0.65 + approval * 0.35);
  const hotSeat = approval < 30;
  const cfg = STAGE_CONFIG[stage];

  const ownerName = owner?.name ?? 'Unknown Owner';
  const archetype = ownerState?.label ?? 'Unknown';

  // Approval history from owner state
  const approvalHistory = useMemo(() => {
    if (!ownerState?.history?.length) return [approval];
    return ownerState.history.slice(-6).map((h) => h.approval);
  }, [ownerState, approval]);

  // Owner goals from owners table
  const goals = useMemo(() => {
    if (!owner || !team) return [];
    const wins = team.wins;
    const losses = team.losses;
    return [
      {
        id: 'g1',
        label: 'Winning Record',
        status: wins > losses ? 'met' as const : wins === losses ? 'at_risk' as const : 'failing' as const,
        progress: `${wins}-${losses}`,
      },
      {
        id: 'g2',
        label: 'Playoff Contention',
        status: wins >= 7 ? 'met' as const : wins >= 4 ? 'at_risk' as const : 'failing' as const,
        progress: wins >= 7 ? 'On track' : 'Bubble',
      },
      {
        id: 'g3',
        label: 'Cap Health',
        status: team.capSpace > 20 ? 'met' as const : team.capSpace > 0 ? 'at_risk' as const : 'failing' as const,
        progress: `$${Math.round(team.capSpace)}M free`,
      },
    ];
  }, [owner, team]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-lg)' }}>
      <div>
        <h1 style={{
          fontFamily: 'var(--mfd-font-serif)', fontSize: '1.375rem',
          fontWeight: 700, color: 'var(--mfd-text)', margin: 0,
        }}>Owner Relations</h1>
        <p style={{
          fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem',
          color: 'var(--mfd-text-dim)', margin: '4px 0 0',
        }}>
          {ownerName} // {archetype} // Stage: {stage}
        </p>
      </div>

      {/* Hot Seat Warning */}
      {hotSeat && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-md)',
          padding: 'var(--mfd-sp-md)',
          background: 'color-mix(in srgb, var(--mfd-red) 12%, transparent)',
          border: '1px solid var(--mfd-red)',
          borderRadius: 'var(--mfd-rad-md)',
        }}>
          <Flame size={18} style={{ color: 'var(--mfd-red)', flexShrink: 0 }} />
          <div>
            <div style={{
              fontFamily: 'var(--mfd-font-sans)', fontSize: '0.875rem',
              fontWeight: 600, color: 'var(--mfd-red)',
            }}>HOT SEAT</div>
            <div style={{
              fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem',
              color: 'var(--mfd-text-dim)',
            }}>Owner patience running out. Win now or face consequences.</div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <MfdKpiGrid columns={4}>
        <MfdKpiCard label="Approval" value={approval} icon={<ThumbsDown size={14} />}
          trend={approval < 50 ? 'down' : 'up'} variant={approval < 40 ? 'danger' : 'default'} />
        <MfdKpiCard label="Patience" value={patience} icon={<Clock size={14} />}
          trend={patience < 40 ? 'down' : 'flat'} variant={patience < 40 ? 'danger' : 'default'} />
        <MfdKpiCard label="Confidence" value={confidenceScore} icon={<Shield size={14} />}
          trend={confidenceScore < 40 ? 'down' : 'flat'} variant={confidenceScore < 40 ? 'danger' : 'default'} />
        <MfdKpiCard label="Stage" value={stage} icon={cfg.icon} trend="flat"
          variant={stage === 'ULTIMATUM' || stage === 'DEMANDING' ? 'danger' : 'default'} />
      </MfdKpiGrid>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--mfd-sp-lg)' }}>
        {/* Confidence Arc */}
        <MfdPanel title="Confidence Arc" icon={<Shield size={14} />}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-xl)' }}>
            <MfdRingProgress
              value={confidenceScore}
              size={80} strokeWidth={6}
              color={cfg.color}
              label={`${confidenceScore}`}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
              {(['PATIENT', 'RESTLESS', 'DEMANDING', 'ULTIMATUM'] as const).map((s) => {
                const sc = STAGE_CONFIG[s];
                const active = stage === s;
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-sm)', opacity: active ? 1 : 0.4 }}>
                    {sc.icon}
                    <span style={{
                      fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem',
                      fontWeight: active ? 600 : 400,
                      color: active ? sc.color : 'var(--mfd-text-dim)',
                    }}>{sc.label}</span>
                    {active && <MfdBadge variant={s === 'PATIENT' ? 'success' : s === 'RESTLESS' ? 'info' : s === 'DEMANDING' ? 'warning' : 'danger'}>ACTIVE</MfdBadge>}
                  </div>
                );
              })}
            </div>
          </div>
        </MfdPanel>

        {/* Approval Trend */}
        <MfdPanel title="Approval Trend" icon={<TrendingDown size={14} />}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 }}>
            {approvalHistory.map((val, i) => (
              <div key={i} style={{
                flex: 1,
                height: `${val}%`,
                background: val < 40 ? 'var(--mfd-red)' : val < 60 ? 'var(--mfd-amber)' : 'var(--mfd-green)',
                borderRadius: '2px 2px 0 0',
                transition: 'height var(--mfd-motion-fast)',
              }} />
            ))}
          </div>
          <div style={{
            fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem',
            color: 'var(--mfd-text-dim)', marginTop: 'var(--mfd-sp-xs)',
          }}>
            Recent weeks — {approvalHistory.length > 1 && approvalHistory[approvalHistory.length - 1]! < approvalHistory[0]! ? 'trending down' : 'stable'}
          </div>
        </MfdPanel>
      </div>

      {/* Owner Goals */}
      <MfdPanel title="Owner Goals" icon={<Target size={14} />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-md)' }}>
          {goals.map((goal) => (
            <div key={goal.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: 'var(--mfd-sp-xs) 0',
              borderBottom: '1px solid var(--mfd-border)',
            }}>
              <span style={{ fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem' }}>{goal.label}</span>
              <div style={{ display: 'flex', gap: 'var(--mfd-sp-sm)', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)' }}>
                  {goal.progress}
                </span>
                <MfdBadge variant={goal.status === 'met' ? 'success' : goal.status === 'failing' ? 'danger' : 'warning'}>
                  {goal.status === 'met' ? 'Met' : goal.status === 'failing' ? 'Failing' : 'At Risk'}
                </MfdBadge>
              </div>
            </div>
          ))}
        </div>
      </MfdPanel>
    </div>
  );
}
