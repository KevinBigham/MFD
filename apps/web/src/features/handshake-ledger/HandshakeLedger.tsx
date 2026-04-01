import { useMemo } from 'react';
import {
  MfdPanel, MfdBadge,
} from '@mfd/design-system/components';
import {
  Handshake, CheckCircle, Clock, XCircle,
  User, Calendar,
} from 'lucide-react';
import {
  useGameStore, selectUserTeam, selectWeek, selectNarrative,
} from '../../app/store/game-store';

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

const STATUS_CONFIG: Record<PromiseStatus, { icon: React.ReactNode; label: string; variant: 'warning' | 'success' | 'danger' | 'default' }> = {
  active: { icon: <Clock size={14} />, label: 'Active', variant: 'warning' },
  fulfilled: { icon: <CheckCircle size={14} />, label: 'Fulfilled', variant: 'success' },
  broken: { icon: <XCircle size={14} />, label: 'Broken', variant: 'danger' },
  expired: { icon: <Clock size={14} />, label: 'Expired', variant: 'default' },
};

export function HandshakeLedger() {
  const team = useGameStore(selectUserTeam);
  const week = useGameStore(selectWeek);
  const narrative = useGameStore(selectNarrative);

  // Generate promises from narrative hooks (live data)
  const promises = useMemo((): HandshakePromise[] => {
    if (!narrative) return [];

    return narrative.hooks
      .filter((h) => !h.resolved)
      .map((h): HandshakePromise => ({
        id: h.id,
        to: h.type,
        promise: h.description,
        madeWeek: Math.max(1, week - 2),
        deadline: `Week ${h.deadline}`,
        status: h.deadline < week ? 'broken' : 'active',
      }));
  }, [narrative, week]);

  const active = promises.filter((p) => p.status === 'active');
  const fulfilled = promises.filter((p) => p.status === 'fulfilled');
  const broken = promises.filter((p) => p.status === 'broken');

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
        {active.length === 0 ? (
          <p style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)' }}>
            No active promises. Promises are made during negotiations, trades, and owner interactions.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
            {active.map((p) => <PromiseCard key={p.id} promise={p} />)}
          </div>
        )}
      </MfdPanel>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--mfd-sp-lg)' }}>
        <MfdPanel title={`Fulfilled (${fulfilled.length})`} icon={<CheckCircle size={14} />}>
          {fulfilled.length === 0 ? (
            <p style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)' }}>
              No fulfilled promises yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
              {fulfilled.map((p) => <PromiseCard key={p.id} promise={p} />)}
            </div>
          )}
        </MfdPanel>

        <MfdPanel title={`Broken (${broken.length})`} icon={<XCircle size={14} />}>
          {broken.length === 0 ? (
            <p style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)' }}>
              Clean record. Keep it up.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
              {broken.map((p) => <PromiseCard key={p.id} promise={p} />)}
            </div>
          )}
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
      background: promise.status === 'broken' ? 'color-mix(in srgb, var(--mfd-red) 6%, transparent)' : 'var(--mfd-bg-2)',
      border: `1px solid ${promise.status === 'broken' ? 'var(--mfd-red)' : 'var(--mfd-border)'}`,
      borderRadius: 'var(--mfd-rad-md)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-sm)' }}>
          <User size={12} style={{ color: 'var(--mfd-text-dim)' }} />
          <span style={{ fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem', fontWeight: 600 }}>
            {promise.to}
          </span>
        </div>
        <MfdBadge variant={cfg.variant}>{cfg.label}</MfdBadge>
      </div>
      <p style={{
        fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem',
        color: 'var(--mfd-text)', margin: 0,
      }}>{promise.promise}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Calendar size={10} style={{ color: 'var(--mfd-text-dim)' }} />
        <span style={{
          fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem',
          color: 'var(--mfd-text-dim)',
        }}>Made: Wk {promise.madeWeek} // Due: {promise.deadline}</span>
      </div>
      {promise.consequence && (
        <div style={{
          fontFamily: 'var(--mfd-font-mono)', fontSize: '0.625rem',
          color: promise.status === 'broken' ? 'var(--mfd-red)' : 'var(--mfd-amber)',
          fontStyle: 'italic',
        }}>
          {promise.consequence}
        </div>
      )}
    </div>
  );
}
