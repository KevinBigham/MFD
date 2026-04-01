import {
  MfdPanel, MfdBadge,
} from '@mfd/design-system/components';
import {
  Handshake, CheckCircle, Clock, XCircle,
  AlertTriangle, User, Calendar,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────

type PromiseStatus = 'active' | 'fulfilled' | 'broken' | 'expired';

interface HandshakePromise {
  id: string;
  to: string;
  promise: string;
  madeWeek: number;
  deadline: string;
  status: PromiseStatus;
  consequence?: string;
}

// ── Mock Promises ─────────────────────────────────────

const MOCK_PROMISES: HandshakePromise[] = [
  {
    id: 'h1', to: 'Justin Fields', promise: 'Negotiate extension before Week 10',
    madeWeek: 5, deadline: 'Week 10', status: 'active',
    consequence: 'Holdout escalation, -8 team morale',
  },
  {
    id: 'h2', to: 'Owner Harmon', promise: 'Improve record to .500 by Week 12',
    madeWeek: 6, deadline: 'Week 12', status: 'active',
    consequence: 'Hot seat escalation, possible firing',
  },
  {
    id: 'h3', to: 'Marcus Williams', promise: 'Increase target share in passing game',
    madeWeek: 4, deadline: 'Week 8', status: 'broken',
    consequence: 'Player morale -15, trade request possible',
  },
  {
    id: 'h4', to: 'James Wilson (OC)', promise: 'Keep OC through the season',
    madeWeek: 3, deadline: 'End of Season', status: 'active',
    consequence: 'Staff trust -20 if broken',
  },
  {
    id: 'h5', to: 'CB Jaylon Roberts', promise: 'Starter role upon return from IR',
    madeWeek: 6, deadline: 'Week 12', status: 'active',
  },
  {
    id: 'h6', to: 'Packers GM', promise: 'Send trade counter-offer by Week 9',
    madeWeek: 7, deadline: 'Week 9', status: 'active',
    consequence: 'Trade trust -5 with Packers',
  },
  {
    id: 'h7', to: 'Rookie CB (Rd 2)', promise: 'Guaranteed playing time if performing',
    madeWeek: 1, deadline: 'Midseason', status: 'fulfilled',
  },
];

const STATUS_CONFIG: Record<PromiseStatus, { icon: React.ReactNode; color: string; label: string; variant: 'warning' | 'success' | 'danger' | 'default' }> = {
  active: { icon: <Clock size={14} />, color: 'var(--mfd-amber)', label: 'Active', variant: 'warning' },
  fulfilled: { icon: <CheckCircle size={14} />, color: 'var(--mfd-green)', label: 'Fulfilled', variant: 'success' },
  broken: { icon: <XCircle size={14} />, color: 'var(--mfd-red)', label: 'Broken', variant: 'danger' },
  expired: { icon: <AlertTriangle size={14} />, color: 'var(--mfd-text-dim)', label: 'Expired', variant: 'default' },
};

export function HandshakeLedger() {
  const active = MOCK_PROMISES.filter((p) => p.status === 'active');
  const fulfilled = MOCK_PROMISES.filter((p) => p.status === 'fulfilled');
  const broken = MOCK_PROMISES.filter((p) => p.status === 'broken');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-lg)' }}>
      <div>
        <h1 style={{
          fontFamily: 'var(--mfd-font-serif)', fontSize: '1.375rem',
          fontWeight: 700, color: 'var(--mfd-text)', margin: 0,
        }}>Handshake Ledger</h1>
        <p style={{
          fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem',
          color: 'var(--mfd-text-dim)', margin: '4px 0 0',
        }}>
          {active.length} active // {fulfilled.length} fulfilled // {broken.length} broken
        </p>
      </div>

      {/* Broken Promises Warning */}
      {broken.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-md)',
          padding: 'var(--mfd-sp-md)',
          background: 'color-mix(in srgb, var(--mfd-red) 10%, transparent)',
          border: '1px solid var(--mfd-red)',
          borderRadius: 'var(--mfd-rad-md)',
        }}>
          <XCircle size={16} style={{ color: 'var(--mfd-red)', flexShrink: 0 }} />
          <div>
            <div style={{
              fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem',
              fontWeight: 600, color: 'var(--mfd-red)',
            }}>
              {broken.length} Broken Promise{broken.length > 1 ? 's' : ''}
            </div>
            <div style={{
              fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem',
              color: 'var(--mfd-text-dim)',
            }}>
              Broken promises erode trust and morale. Reputation impact is cumulative.
            </div>
          </div>
        </div>
      )}

      {/* Active Promises */}
      <MfdPanel title={`Active Promises (${active.length})`} icon={<Handshake size={14} />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
          {active.map((p) => (
            <PromiseCard key={p.id} promise={p} />
          ))}
        </div>
      </MfdPanel>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--mfd-sp-lg)' }}>
        {/* Fulfilled */}
        <MfdPanel title={`Fulfilled (${fulfilled.length})`} icon={<CheckCircle size={14} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
            {fulfilled.length === 0 ? (
              <p style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)' }}>
                No fulfilled promises yet.
              </p>
            ) : fulfilled.map((p) => (
              <PromiseCard key={p.id} promise={p} />
            ))}
          </div>
        </MfdPanel>

        {/* Broken */}
        <MfdPanel title={`Broken (${broken.length})`} icon={<XCircle size={14} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
            {broken.length === 0 ? (
              <p style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)' }}>
                Clean record. Keep it up.
              </p>
            ) : broken.map((p) => (
              <PromiseCard key={p.id} promise={p} />
            ))}
          </div>
        </MfdPanel>
      </div>
    </div>
  );
}

function PromiseCard({ promise }: { promise: HandshakePromise }) {
  const cfg = STATUS_CONFIG[promise.status];
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-xs)',
      padding: 'var(--mfd-sp-sm)',
      background: promise.status === 'broken'
        ? 'color-mix(in srgb, var(--mfd-red) 6%, transparent)'
        : 'var(--mfd-bg-2)',
      border: `1px solid ${promise.status === 'broken' ? 'var(--mfd-red)' : 'var(--mfd-border)'}`,
      borderRadius: 'var(--mfd-rad-md)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-sm)' }}>
          <User size={12} style={{ color: 'var(--mfd-text-dim)' }} />
          <span style={{
            fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem', fontWeight: 600,
          }}>{promise.to}</span>
        </div>
        <MfdBadge variant={cfg.variant}>{cfg.label}</MfdBadge>
      </div>
      <p style={{
        fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem',
        color: 'var(--mfd-text)', margin: 0,
      }}>{promise.promise}</p>
      <div style={{ display: 'flex', gap: 'var(--mfd-sp-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Calendar size={10} style={{ color: 'var(--mfd-text-dim)' }} />
          <span style={{
            fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem',
            color: 'var(--mfd-text-dim)',
          }}>Made: Wk {promise.madeWeek} // Due: {promise.deadline}</span>
        </div>
      </div>
      {promise.consequence && (
        <div style={{
          fontFamily: 'var(--mfd-font-mono)', fontSize: '0.625rem',
          color: promise.status === 'broken' ? 'var(--mfd-red)' : 'var(--mfd-amber)',
          fontStyle: 'italic',
        }}>
          ⚠ {promise.consequence}
        </div>
      )}
    </div>
  );
}
