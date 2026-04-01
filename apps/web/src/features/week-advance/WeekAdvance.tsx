import { useState } from 'react';
import {
  MfdPanel, MfdBadge, MfdStepper, MfdConsequenceRibbon,
} from '@mfd/design-system/components';
import {
  Play, CheckCircle, Clock, AlertTriangle,
  Users, DollarSign, Shield, Zap,
} from 'lucide-react';

// ── Checklist State ───────────────────────────────────

interface ChecklistItem {
  id: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  status: 'done' | 'warn' | 'pending';
  detail?: string;
}

const MOCK_CHECKLIST: ChecklistItem[] = [
  {
    id: 'depth', label: 'Depth Chart Set', desc: 'All positions have starters assigned',
    icon: <Users size={14} />, status: 'done',
  },
  {
    id: 'injuries', label: 'Injury Review', desc: 'Review injured players and set replacements',
    icon: <AlertTriangle size={14} />, status: 'warn',
    detail: 'CB1 questionable — backup auto-promoted',
  },
  {
    id: 'cap', label: 'Cap Compliant', desc: 'Team is under the salary cap',
    icon: <DollarSign size={14} />, status: 'done',
  },
  {
    id: 'gameplan', label: 'Game Plan', desc: 'Offensive and defensive schemes locked in',
    icon: <Shield size={14} />, status: 'done',
  },
  {
    id: 'trades', label: 'Pending Trades', desc: 'No unresolved trade offers',
    icon: <Zap size={14} />, status: 'warn',
    detail: 'Trade offer from GB expires after this week',
  },
  {
    id: 'inbox', label: 'Inbox Clear', desc: 'All urgent messages addressed',
    icon: <Clock size={14} />, status: 'pending',
    detail: '2 urgent messages unread',
  },
];

const MOCK_MATCHUP = {
  opponent: 'Detroit Lions',
  record: '7-5',
  spread: '-3.5',
  overUnder: '44.5',
  keyMatchup: 'Their weakened O-line vs your pass rush',
};

const MOCK_CONSEQUENCES = [
  { id: 'c1', label: 'Owner Patience', delta: '-4 if loss', direction: 'warning' as const },
  { id: 'c2', label: 'Playoff Odds', delta: '-12% if loss', direction: 'negative' as const },
  { id: 'c3', label: 'Chemistry', delta: '+2 if win', direction: 'positive' as const },
];

export function WeekAdvance() {
  const [confirmed, setConfirmed] = useState(false);
  const allClear = MOCK_CHECKLIST.every((c) => c.status === 'done');
  const warnCount = MOCK_CHECKLIST.filter((c) => c.status === 'warn').length;
  const pendingCount = MOCK_CHECKLIST.filter((c) => c.status === 'pending').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-lg)' }}>
      <div>
        <h1 style={{
          fontFamily: 'var(--mfd-font-serif)', fontSize: '1.375rem',
          fontWeight: 700, color: 'var(--mfd-text)', margin: 0,
        }}>Advance to Week 9</h1>
        <p style={{
          fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem',
          color: 'var(--mfd-text-dim)', margin: '4px 0 0',
        }}>
          Pre-game checklist // {allClear ? 'All clear' : `${warnCount} warnings, ${pendingCount} pending`}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--mfd-sp-lg)' }}>
        {/* Pre-Advance Checklist */}
        <MfdPanel title="Pre-Advance Checklist" icon={<CheckCircle size={14} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
            {MOCK_CHECKLIST.map((item) => (
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
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-sm)',
                  }}>
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
                  }}>
                    {item.detail ?? item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </MfdPanel>

        {/* Matchup Preview + Consequences */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-lg)' }}>
          <MfdPanel title="Week 9 Matchup" icon={<Shield size={14} />}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-md)' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{
                  fontFamily: 'var(--mfd-font-serif)', fontSize: '1.125rem',
                  fontWeight: 700,
                }}>vs {MOCK_MATCHUP.opponent}</span>
                <MfdBadge variant="default">{MOCK_MATCHUP.record}</MfdBadge>
              </div>
              <div style={{ display: 'flex', gap: 'var(--mfd-sp-md)' }}>
                <div>
                  <span style={{
                    fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem',
                    color: 'var(--mfd-text-dim)',
                  }}>Spread</span>
                  <div style={{
                    fontFamily: 'var(--mfd-font-mono)', fontSize: '1rem', fontWeight: 600,
                  }}>{MOCK_MATCHUP.spread}</div>
                </div>
                <div>
                  <span style={{
                    fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem',
                    color: 'var(--mfd-text-dim)',
                  }}>O/U</span>
                  <div style={{
                    fontFamily: 'var(--mfd-font-mono)', fontSize: '1rem', fontWeight: 600,
                  }}>{MOCK_MATCHUP.overUnder}</div>
                </div>
              </div>
              <p style={{
                fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem',
                color: 'var(--mfd-text-dim)', margin: 0,
              }}>
                Key: {MOCK_MATCHUP.keyMatchup}
              </p>
            </div>
          </MfdPanel>

          <MfdPanel title="Stakes" icon={<AlertTriangle size={14} />}>
            <MfdConsequenceRibbon consequences={MOCK_CONSEQUENCES} />
          </MfdPanel>

          {/* Advance Button */}
          <button
            onClick={() => setConfirmed(true)}
            disabled={confirmed}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--mfd-sp-sm)',
              padding: 'var(--mfd-sp-md)',
              fontSize: '0.875rem', fontWeight: 700,
              fontFamily: 'var(--mfd-font-sans)',
              color: confirmed ? 'var(--mfd-text-dim)' : 'var(--mfd-bg)',
              background: confirmed ? 'var(--mfd-bg-3)' : allClear ? 'var(--mfd-green)' : 'var(--mfd-amber)',
              border: 'none',
              borderRadius: 'var(--mfd-rad-md)',
              cursor: confirmed ? 'default' : 'pointer',
              transition: 'all var(--mfd-motion-fast)',
            }}
          >
            {confirmed ? (
              <>
                <CheckCircle size={16} />
                Simulating Week 9...
              </>
            ) : (
              <>
                <Play size={16} />
                {allClear ? 'Advance Week' : 'Advance Anyway'}
                {!allClear && (
                  <MfdBadge variant="danger">{warnCount + pendingCount} issues</MfdBadge>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
