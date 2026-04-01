import { useState } from 'react';
import {
  MfdPanel, MfdBadge, MfdDialog,
  MfdConsequenceRibbon,
} from '@mfd/design-system/components';
import {
  AlertTriangle, Lightbulb, Inbox,
  ChevronRight, Clock, CheckCircle,
} from 'lucide-react';

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

const MOCK_MESSAGES: InboxMessage[] = [
  {
    id: 'm1', type: 'URGENT', title: 'Star QB Holdout Escalating',
    body: 'Justin Fields is threatening to sit out if a new deal is not reached by Week 10. His agent called this morning. The locker room is watching.',
    from: 'Agent Relations', week: 8, read: false, actionRequired: true,
    consequences: [
      { id: 'c1', label: 'Team Morale', delta: '-8 if unresolved', direction: 'negative' },
      { id: 'c2', label: 'Chemistry', delta: '-5 per week', direction: 'warning' },
    ],
  },
  {
    id: 'm2', type: 'URGENT', title: 'Owner Demands Meeting',
    body: 'Owner wants to discuss the losing streak and coaching staff changes. You have until Week 12 to improve the record or face consequences.',
    from: 'Front Office', week: 8, read: false, actionRequired: true,
    consequences: [
      { id: 'c3', label: 'Job Security', delta: 'At Risk', direction: 'negative' },
    ],
  },
  {
    id: 'm3', type: 'DECISION', title: 'Trade Offer: WR for 2nd Round Pick',
    body: 'The Packers are offering their 2027 2nd round pick for Marcus Williams (WR, 78 OVR). Williams has 2 years left on his deal at $6.2M/yr.',
    from: 'Trade Desk', week: 8, read: false, actionRequired: true,
    consequences: [
      { id: 'c4', label: 'Cap Savings', delta: '+$6.2M/yr', direction: 'positive' },
      { id: 'c5', label: 'WR Depth', delta: '-1 starter', direction: 'negative' },
    ],
  },
  {
    id: 'm4', type: 'DECISION', title: 'Injured Reserve Decision',
    body: 'CB Jaylon Roberts (torn ACL) must be placed on IR or kept on the active roster. IR frees a roster spot but he cannot return for 4 weeks.',
    from: 'Medical Staff', week: 8, read: true, actionRequired: true,
  },
  {
    id: 'm5', type: 'INTEL', title: 'Scouting Report: Generational QB Prospect',
    body: 'MFSN reports that Marcus Carter, a HS junior from Texas, is the consensus #1 prospect for the 2029 draft. Start tanking early.',
    from: 'Scouting Dept', week: 8, read: true, actionRequired: false,
  },
  {
    id: 'm6', type: 'INTEL', title: 'Rival Weakness Identified',
    body: 'Division rival Lions have lost 3 offensive linemen to injury. Their pass protection is grading at bottom-5 in the league.',
    from: 'Film Room', week: 8, read: true, actionRequired: false,
  },
  {
    id: 'm7', type: 'INTEL', title: 'Free Agent Market Update',
    body: 'Several quality defensive linemen expected to hit the market this offseason. Start planning cap space allocation.',
    from: 'Player Personnel', week: 8, read: true, actionRequired: false,
  },
];

export function InboxTriage() {
  const [selectedMsg, setSelectedMsg] = useState<InboxMessage | null>(null);
  const [filter, setFilter] = useState<MessageType | 'ALL'>('ALL');

  const filtered = filter === 'ALL' ? MOCK_MESSAGES : MOCK_MESSAGES.filter((m) => m.type === filter);
  const urgentCount = MOCK_MESSAGES.filter((m) => m.type === 'URGENT' && !m.read).length;
  const decisionCount = MOCK_MESSAGES.filter((m) => m.type === 'DECISION' && m.actionRequired).length;

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
        {filtered.map((msg) => {
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
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'border-color var(--mfd-motion-fast)',
              }}
            >
              <div style={{ color: cfg.color, flexShrink: 0 }}>{cfg.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-sm)',
                }}>
                  <MfdBadge variant={cfg.variant}>{cfg.label}</MfdBadge>
                  <span style={{
                    fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem',
                    fontWeight: msg.read ? 400 : 600, color: 'var(--mfd-text)',
                  }}>
                    {msg.title}
                  </span>
                </div>
                <div style={{
                  fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem',
                  color: 'var(--mfd-text-dim)', marginTop: 2,
                }}>
                  From: {msg.from} // Week {msg.week}
                </div>
              </div>
              {msg.actionRequired && (
                <MfdBadge variant="warning">Action Required</MfdBadge>
              )}
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
              color: 'var(--mfd-text)', lineHeight: 1.5, margin: 0,
            }}>
              {selectedMsg.body}
            </p>
            {selectedMsg.consequences && (
              <MfdConsequenceRibbon consequences={selectedMsg.consequences} />
            )}
            {selectedMsg.actionRequired && (
              <div style={{ display: 'flex', gap: 'var(--mfd-sp-sm)' }}>
                <button style={{
                  flex: 1, padding: '8px', fontSize: '0.8125rem',
                  fontFamily: 'var(--mfd-font-sans)', fontWeight: 600,
                  color: 'var(--mfd-bg)', background: 'var(--mfd-green)',
                  border: 'none', borderRadius: 'var(--mfd-rad-md)',
                  cursor: 'pointer',
                }}>
                  Take Action
                </button>
                <button style={{
                  flex: 1, padding: '8px', fontSize: '0.8125rem',
                  fontFamily: 'var(--mfd-font-sans)', fontWeight: 500,
                  color: 'var(--mfd-text)',
                  background: 'var(--mfd-bg-2)',
                  border: '1px solid var(--mfd-border)',
                  borderRadius: 'var(--mfd-rad-md)',
                  cursor: 'pointer',
                }}>
                  Defer
                </button>
              </div>
            )}
          </div>
        )}
      </MfdDialog>
    </div>
  );
}
