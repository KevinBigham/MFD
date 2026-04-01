import { useState, useMemo } from 'react';
import {
  MfdPanel, MfdBadge, MfdDialog, MfdConsequenceRibbon,
} from '@mfd/design-system/components';
import {
  AlertTriangle, Lightbulb, Inbox,
  ChevronRight,
} from 'lucide-react';
import {
  useGameStore, selectUserTeam, selectRoster, selectWeek, selectNarrative, selectLatestSummary, selectPhase, selectLatestGameDayPackage, selectActiveStoryArcs,
} from '../../app/store/game-store';
import { buildInboxMessages, type InboxMessage, type MessageType } from './buildInboxMessages';

const TYPE_CONFIG: Record<MessageType, { icon: React.ReactNode; color: string; label: string; variant: 'danger' | 'warning' | 'info' }> = {
  URGENT: { icon: <AlertTriangle size={14} />, color: 'var(--mfd-red)', label: 'URGENT', variant: 'danger' },
  DECISION: { icon: <Lightbulb size={14} />, color: 'var(--mfd-amber)', label: 'DECISION', variant: 'warning' },
  INTEL: { icon: <Inbox size={14} />, color: 'var(--mfd-cyan)', label: 'INTEL', variant: 'info' },
};

export function InboxTriage() {
  const team = useGameStore(selectUserTeam);
  const roster = useGameStore(selectRoster);
  const week = useGameStore(selectWeek);
  const narrative = useGameStore(selectNarrative);
  const latestSummary = useGameStore(selectLatestSummary);
  const phase = useGameStore(selectPhase);
  const latestPackage = useGameStore(selectLatestGameDayPackage);
  const activeArcs = useGameStore(selectActiveStoryArcs);

  const [selectedMsg, setSelectedMsg] = useState<InboxMessage | null>(null);
  const [filter, setFilter] = useState<MessageType | 'ALL'>('ALL');

  const messages = useMemo(() => buildInboxMessages({
    team,
    roster,
    week,
    narrative,
    latestSummary,
    phase,
    latestPackage,
    activeArcs,
  }), [activeArcs, latestPackage, latestSummary, narrative, phase, roster, team, week]);

  const filtered = filter === 'ALL' ? messages : messages.filter((m) => m.type === filter);
  const urgentCount = messages.filter((m) => m.type === 'URGENT' && !m.read).length;
  const decisionCount = messages.filter((m) => m.type === 'DECISION' && m.actionRequired).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--mfd-font-serif)', fontSize: '1.375rem',
            fontWeight: 700, color: 'var(--mfd-text)', margin: 0,
          }}>Inbox</h1>
          <p style={{
            fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem',
            color: 'var(--mfd-text-dim)', margin: '4px 0 0',
          }}>
            {urgentCount} urgent // {decisionCount} decisions pending
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {(['ALL', 'URGENT', 'DECISION', 'INTEL'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', fontSize: '0.75rem',
              fontFamily: 'var(--mfd-font-mono)',
              color: filter === t ? 'var(--mfd-bg)' : 'var(--mfd-text-dim)',
              background: filter === t ? (t === 'ALL' ? 'var(--mfd-gold)' : TYPE_CONFIG[t as MessageType]?.color ?? 'var(--mfd-gold)') : 'var(--mfd-bg-2)',
              border: '1px solid var(--mfd-border)',
              borderRadius: 'var(--mfd-rad-md)',
              cursor: 'pointer',
            }}
          >
            {t !== 'ALL' && TYPE_CONFIG[t as MessageType]?.icon}
            {t}
            {t === 'URGENT' && urgentCount > 0 && (
              <span style={{
                background: 'var(--mfd-red)', color: 'white',
                borderRadius: '50%', width: 16, height: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.5625rem', fontWeight: 700,
              }}>
                {urgentCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Message List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
        {filtered.length === 0 ? (
          <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.8125rem', color: 'var(--mfd-text-dim)', padding: 'var(--mfd-sp-lg)', textAlign: 'center' }}>
            No messages
          </div>
        ) : filtered.map((msg) => {
          const cfg = TYPE_CONFIG[msg.type];
          return (
            <button
              key={msg.id}
              onClick={() => setSelectedMsg(msg)}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-md)',
                padding: 'var(--mfd-sp-md)',
                background: msg.read ? 'var(--mfd-bg-2)' : 'var(--mfd-bg-3)',
                border: `1px solid ${msg.type === 'URGENT' && !msg.read ? 'var(--mfd-red)' : 'var(--mfd-border)'}`,
                borderRadius: 'var(--mfd-rad-md)',
                cursor: 'pointer', textAlign: 'left', width: '100%',
              }}
            >
              <div style={{ color: cfg.color, flexShrink: 0 }}>{cfg.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-sm)' }}>
                  <MfdBadge variant={cfg.variant}>{cfg.label}</MfdBadge>
                  <span style={{
                    fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem',
                    fontWeight: msg.read ? 400 : 600, color: 'var(--mfd-text)',
                  }}>{msg.title}</span>
                </div>
                <div style={{
                  fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem',
                  color: 'var(--mfd-text-dim)', marginTop: 2,
                }}>From: {msg.from} // Week {msg.week}</div>
              </div>
              {msg.actionRequired && <MfdBadge variant="warning">Action Required</MfdBadge>}
              <ChevronRight size={14} style={{ color: 'var(--mfd-text-faint)' }} />
            </button>
          );
        })}
      </div>

      {/* Message Detail Dialog */}
      <MfdDialog
        open={!!selectedMsg}
        onOpenChange={(open) => { if (!open) setSelectedMsg(null); }}
        title={selectedMsg?.title ?? ''}
      >
        {selectedMsg && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-md)' }}>
            <div style={{ display: 'flex', gap: 'var(--mfd-sp-sm)' }}>
              <MfdBadge variant={TYPE_CONFIG[selectedMsg.type].variant}>
                {TYPE_CONFIG[selectedMsg.type].label}
              </MfdBadge>
              <MfdBadge variant="default">From: {selectedMsg.from}</MfdBadge>
            </div>
            <p style={{
              fontFamily: 'var(--mfd-font-sans)', fontSize: '0.875rem',
              color: 'var(--mfd-text)', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap',
            }}>
              {selectedMsg.body}
            </p>
            {selectedMsg.consequences && (
              <MfdConsequenceRibbon consequences={selectedMsg.consequences} />
            )}
          </div>
        )}
      </MfdDialog>
    </div>
  );
}
