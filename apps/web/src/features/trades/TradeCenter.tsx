import { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import {
  MfdBadge,
  MfdPanel,
} from '@mfd/design-system/components';
import {
  selectTradeOffers,
  useGameStore,
} from '../../app/store/game-store';

function actionButtonStyle(color: string) {
  return {
    padding: '6px 10px',
    borderRadius: 'var(--mfd-rad-md)',
    border: `1px solid ${color}`,
    background: 'transparent',
    color,
    cursor: 'pointer',
    fontFamily: 'var(--mfd-font-mono)',
    fontSize: '0.6875rem',
  } as const;
}

export function TradeCenter() {
  const offers = useGameStore(selectTradeOffers);
  const { acceptTradeOffer, rejectTradeOffer } = useGameStore((s) => s.actions);
  const [pending, setPending] = useState<string | null>(null);

  const handleAction = async (key: string, run: () => Promise<void>) => {
    setPending(key);
    try {
      await run();
    } finally {
      setPending(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-lg)' }}>
      <div>
        <h1 style={{
          fontFamily: 'var(--mfd-font-serif)',
          fontSize: '1.375rem',
          fontWeight: 700,
          color: 'var(--mfd-text)',
          margin: 0,
        }}>
          Trade Center
        </h1>
        <p style={{
          fontFamily: 'var(--mfd-font-mono)',
          fontSize: '0.75rem',
          color: 'var(--mfd-text-dim)',
          margin: '4px 0 0',
        }}>
          Deterministic offer board. No custom package builder in Phase 4B.
        </p>
      </div>

      <MfdPanel title="Trade Offers" icon={<ArrowLeftRight size={14} />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
          {offers.length === 0 && (
            <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)' }}>
              No active offers. Put veterans on the block or advance the market.
            </div>
          )}

          {offers.map((offer) => (
            <div key={offer.id} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--mfd-sp-sm)',
              padding: 'var(--mfd-sp-sm)',
              border: '1px solid var(--mfd-border)',
              borderRadius: 'var(--mfd-rad-md)',
              background: 'var(--mfd-bg-2)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--mfd-sp-md)', alignItems: 'center' }}>
                <div style={{ fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem', fontWeight: 600 }}>
                  {offer.summary}
                </div>
                <MfdBadge variant={offer.status === 'accepted' ? 'success' : offer.status === 'rejected' ? 'warning' : 'info'}>
                  {offer.status.toUpperCase()}
                </MfdBadge>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--mfd-sp-md)' }}>
                <div>
                  <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem', color: 'var(--mfd-text-dim)', marginBottom: 4 }}>
                    You send
                  </div>
                  {offer.send.map((asset) => (
                    <div key={`${offer.id}-${asset.description}-send`} style={{ fontFamily: 'var(--mfd-font-sans)', fontSize: '0.75rem' }}>
                      {asset.description}
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem', color: 'var(--mfd-text-dim)', marginBottom: 4 }}>
                    You receive
                  </div>
                  {offer.receive.map((asset) => (
                    <div key={`${offer.id}-${asset.description}-receive`} style={{ fontFamily: 'var(--mfd-font-sans)', fontSize: '0.75rem' }}>
                      {asset.description}
                    </div>
                  ))}
                </div>
              </div>

              {offer.status === 'pending' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--mfd-sp-xs)' }}>
                  <button
                    disabled={pending === `${offer.id}-reject`}
                    style={actionButtonStyle('var(--mfd-amber)')}
                    onClick={() => void handleAction(`${offer.id}-reject`, async () => {
                      await rejectTradeOffer(offer.id);
                    })}
                  >
                    Reject
                  </button>
                  <button
                    disabled={pending === `${offer.id}-accept`}
                    style={actionButtonStyle('var(--mfd-green)')}
                    onClick={() => void handleAction(`${offer.id}-accept`, async () => {
                      await acceptTradeOffer(offer.id);
                    })}
                  >
                    Accept
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </MfdPanel>
    </div>
  );
}
