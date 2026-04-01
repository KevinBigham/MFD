import { useState, useMemo } from 'react';
import {
  MfdPanel, MfdBadge, MfdDialog, MfdConsequenceRibbon,
} from '@mfd/design-system/components';
import {
  AlertTriangle, Lightbulb, Inbox,
  ChevronRight,
} from 'lucide-react';
import {
  useGameStore, selectUserTeam, selectRoster, selectWeek, selectNarrative,
} from '../../app/store/game-store';

// ── Message Types ──────────────────────────────────────

type MessageType = 'URGENT' | 'DECISION' | 'INTEL';

interface InboxMessage {
  id: string;
  type: MessageType;
  title: string;
  body: string;
  from: string;
  week: number;
  read: boolean;
  actionRequired: boolean;
  consequences?: { id: string; label: string; delta: string; direction: 'positive' | 'negative' | 'neutral' | 'warning' }[];
}

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

  const [selectedMsg, setSelectedMsg] = useState<InboxMessage | null>(null);
  const [filter, setFilter] = useState<MessageType | 'ALL'>('ALL');

  // Generate messages from live game state
  const messages = useMemo((): InboxMessage[] => {
    const msgs: InboxMessage[] = [];
    if (!team) return msgs;

    // Owner mood messages
    if (team.owner.approval < 40) {
      msgs.push({
        id: 'owner-unhappy',
        type: 'URGENT',
        title: 'Owner Demands Improvement',
        body: `Owner approval has dropped to ${team.owner.approval}. Results must improve soon or there will be consequences.`,
        from: 'Front Office',
        week,
        read: false,
        actionRequired: true,
        consequences: [
          { id: 'c1', label: 'Job Security', delta: 'At Risk', direction: 'negative' },
        ],
      });
    }

    // Holdout messages
    const holdouts = roster.filter((p) => p.holdout);
    for (const p of holdouts) {
      msgs.push({
        id: `holdout-${p.id}`,
        type: 'URGENT',
        title: `${p.name} Holdout`,
        body: `${p.name} is holding out for a new contract. Morale is dropping.`,
        from: 'Agent Relations',
        week,
        read: false,
        actionRequired: true,
        consequences: [
          { id: `h1-${p.id}`, label: 'Team Morale', delta: '-5 per week', direction: 'warning' },
        ],
      });
    }

    // Trade block activity
    const tradeBlockPlayers = roster.filter((p) => p.tradeBlock);
    if (tradeBlockPlayers.length > 0) {
      msgs.push({
        id: 'trade-block',
        type: 'DECISION',
        title: `${tradeBlockPlayers.length} Player(s) on Trade Block`,
        body: `Players on the block: ${tradeBlockPlayers.map((p) => p.name).join(', ')}. Watch for incoming offers.`,
        from: 'Trade Desk',
        week,
        read: false,
        actionRequired: false,
      });
    }

    // Injured players intel
    const injured = roster.filter((p) => p.injury);
    if (injured.length > 0) {
      msgs.push({
        id: 'injury-report',
        type: 'INTEL',
        title: `${injured.length} Player(s) Injured`,
        body: injured.map((p) => `${p.name} (${p.pos}): ${p.injury!.type} — ${p.injury!.severity}, ${p.injury!.gamesOut} games`).join('\n'),
        from: 'Medical Staff',
        week,
        read: true,
        actionRequired: false,
      });
    }

    // Narrative headlines as intel
    if (narrative?.recentHeadlines) {
      for (let i = 0; i < narrative.recentHeadlines.length; i++) {
        msgs.push({
          id: `headline-${i}`,
          type: 'INTEL',
          title: narrative.recentHeadlines[i]!,
          body: 'League-wide news from around the football world.',
          from: 'Media',
          week,
          read: true,
          actionRequired: false,
        });
      }
    }

    // Cap warning
    if (team.capSpace < 10 && team.capSpace >= 0) {
      msgs.push({
        id: 'cap-tight',
        type: 'DECISION',
        title: 'Cap Space Running Low',
        body: `Only $${Math.round(team.capSpace * 10) / 10}M in cap space remaining. Consider restructuring contracts.`,
        from: 'Finance',
        week,
        read: false,
        actionRequired: true,
      });
    }

    return msgs;
  }, [team, roster, week, narrative]);

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
