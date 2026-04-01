import {
  MfdPanel, MfdBadge, MfdKpiGrid, MfdKpiCard,
  MfdRingProgress, MfdConsequenceRibbon,
} from '@mfd/design-system/components';
import {
  Shield, AlertTriangle, Clock, TrendingDown,
  Flame, ThumbsUp, ThumbsDown, Target,
} from 'lucide-react';

// ── Mock Owner State ──────────────────────────────────

const MOCK_OWNER = {
  name: 'Richard Harmon',
  archetype: 'Win Now',
  mood: 42,
  patience: 35,
  confidenceScore: 39,
  stage: 'DEMANDING' as 'PATIENT' | 'RESTLESS' | 'DEMANDING' | 'ULTIMATUM',
  hotSeat: true,
  hotSeatReason: 'Owner patience running out.',
  approvalHistory: [72, 68, 60, 55, 48, 42],
};

const MOCK_GOALS = [
  { id: 'g1', label: 'Win 10+ Games', status: 'failing' as const, progress: '6-8' },
  { id: 'g2', label: 'Make Playoffs', status: 'at_risk' as const, progress: 'Bubble' },
  { id: 'g3', label: 'Stay Under Cap', status: 'met' as const, progress: '$44.3M free' },
];

const MOCK_ULTIMATUMS = [
  { id: 'u1', label: 'Trade Worst Contract', desc: 'Owner demands you trade the worst contract on the roster.', deadline: 'Week 12' },
  { id: 'u2', label: 'Fire a Coordinator', desc: 'Owner demands a coaching change at the coordinator level.', deadline: 'End of Season' },
];

const STAGE_CONFIG = {
  PATIENT: { color: 'var(--mfd-green)', label: 'Patient', icon: <ThumbsUp size={14} /> },
  RESTLESS: { color: 'var(--mfd-cyan)', label: 'Restless', icon: <Clock size={14} /> },
  DEMANDING: { color: 'var(--mfd-amber)', label: 'Demanding', icon: <AlertTriangle size={14} /> },
  ULTIMATUM: { color: 'var(--mfd-red)', label: 'Ultimatum', icon: <Flame size={14} /> },
} as const;

export function OwnerMood() {
  const cfg = STAGE_CONFIG[MOCK_OWNER.stage];

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
          {MOCK_OWNER.name} // {MOCK_OWNER.archetype} // Stage: {MOCK_OWNER.stage}
        </p>
      </div>

      {/* Hot Seat Warning */}
      {MOCK_OWNER.hotSeat && (
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
            }}>{MOCK_OWNER.hotSeatReason}</div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <MfdKpiGrid columns={4}>
        <MfdKpiCard
          label="Mood"
          value={MOCK_OWNER.mood}
          icon={<ThumbsDown size={14} />}
          trend="down"
          variant={MOCK_OWNER.mood < 40 ? 'danger' : 'default'}
        />
        <MfdKpiCard
          label="Patience"
          value={MOCK_OWNER.patience}
          icon={<Clock size={14} />}
          trend="down"
          variant={MOCK_OWNER.patience < 40 ? 'danger' : 'default'}
        />
        <MfdKpiCard
          label="Confidence"
          value={MOCK_OWNER.confidenceScore}
          icon={<Shield size={14} />}
          trend="down"
          variant="danger"
        />
        <MfdKpiCard
          label="Stage"
          value={MOCK_OWNER.stage}
          icon={cfg.icon}
          trend="flat"
          variant={MOCK_OWNER.stage === 'ULTIMATUM' || MOCK_OWNER.stage === 'DEMANDING' ? 'danger' : 'default'}
        />
      </MfdKpiGrid>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--mfd-sp-lg)' }}>
        {/* Confidence Arc */}
        <MfdPanel title="Confidence Arc" icon={<Shield size={14} />}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-xl)' }}>
            <MfdRingProgress
              value={MOCK_OWNER.confidenceScore}
              size={80}
              strokeWidth={6}
              color={cfg.color}
              label={`${MOCK_OWNER.confidenceScore}`}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
              {(['PATIENT', 'RESTLESS', 'DEMANDING', 'ULTIMATUM'] as const).map((stage) => {
                const s = STAGE_CONFIG[stage];
                const active = MOCK_OWNER.stage === stage;
                return (
                  <div key={stage} style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-sm)',
                    opacity: active ? 1 : 0.4,
                  }}>
                    {s.icon}
                    <span style={{
                      fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem',
                      fontWeight: active ? 600 : 400,
                      color: active ? s.color : 'var(--mfd-text-dim)',
                    }}>
                      {s.label}
                    </span>
                    {active && <MfdBadge variant={stage === 'PATIENT' ? 'success' : stage === 'RESTLESS' ? 'info' : stage === 'DEMANDING' ? 'warning' : 'danger'}>ACTIVE</MfdBadge>}
                  </div>
                );
              })}
            </div>
          </div>
        </MfdPanel>

        {/* Approval Trend */}
        <MfdPanel title="Approval Trend" icon={<TrendingDown size={14} />}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 }}>
            {MOCK_OWNER.approvalHistory.map((val, i) => (
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
            Last 6 weeks — trending {MOCK_OWNER.approvalHistory[5]! < MOCK_OWNER.approvalHistory[0]! ? 'down' : 'up'}
          </div>
        </MfdPanel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--mfd-sp-lg)' }}>
        {/* Owner Goals */}
        <MfdPanel title="Owner Goals" icon={<Target size={14} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-md)' }}>
            {MOCK_GOALS.map((goal) => (
              <div key={goal.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: 'var(--mfd-sp-xs) 0',
                borderBottom: '1px solid var(--mfd-border)',
              }}>
                <span style={{ fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem' }}>
                  {goal.label}
                </span>
                <div style={{ display: 'flex', gap: 'var(--mfd-sp-sm)', alignItems: 'center' }}>
                  <span style={{
                    fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem',
                    color: 'var(--mfd-text-dim)',
                  }}>{goal.progress}</span>
                  <MfdBadge variant={goal.status === 'met' ? 'success' : goal.status === 'failing' ? 'danger' : 'warning'}>
                    {goal.status === 'met' ? 'Met' : goal.status === 'failing' ? 'Failing' : 'At Risk'}
                  </MfdBadge>
                </div>
              </div>
            ))}
          </div>
        </MfdPanel>

        {/* Active Ultimatums */}
        <MfdPanel title="Ultimatums" icon={<AlertTriangle size={14} />}>
          {MOCK_ULTIMATUMS.length === 0 ? (
            <p style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.8125rem', color: 'var(--mfd-text-dim)' }}>
              No active ultimatums.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-md)' }}>
              {MOCK_ULTIMATUMS.map((u) => (
                <div key={u.id} style={{
                  padding: 'var(--mfd-sp-sm)',
                  background: 'color-mix(in srgb, var(--mfd-red) 8%, transparent)',
                  border: '1px solid var(--mfd-border)',
                  borderRadius: 'var(--mfd-rad-md)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem', fontWeight: 600,
                    }}>{u.label}</span>
                    <MfdBadge variant="danger">{u.deadline}</MfdBadge>
                  </div>
                  <p style={{
                    fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem',
                    color: 'var(--mfd-text-dim)', margin: '4px 0 0',
                  }}>{u.desc}</p>
                </div>
              ))}
            </div>
          )}
        </MfdPanel>
      </div>
    </div>
  );
}
