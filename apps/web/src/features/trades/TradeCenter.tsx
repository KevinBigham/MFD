import { useState } from 'react';
import {
  PixelBadge, PixelButton, PixelPanel,
} from '@mfd/design-system/components';
import {
  selectTradeOffers,
  useGameStore,
} from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  display,
  monoSm,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';

function offerAccent(status: string): 'cyan' | 'green' | 'gold' {
  if (status === 'accepted') return 'green';
  if (status === 'rejected') return 'gold';
  return 'cyan';
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

  const pendingOffers = offers.filter((offer) => offer.status === 'pending').length;
  const acceptedOffers = offers.filter((offer) => offer.status === 'accepted').length;

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Trade Center"
        subtitle="Deterministic offer board. No custom package builder in this phase."
        badges={(
          <>
            <PixelBadge variant="cyan">{pendingOffers} pending</PixelBadge>
            <PixelBadge variant="green">{acceptedOffers} accepted</PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(210)}>
        <PixelMetricCard label="Offers" value={offers.length} accent="cyan" detail="Active conversations" />
        <PixelMetricCard label="Pending" value={pendingOffers} accent={pendingOffers > 0 ? 'gold' : 'green'} detail="Require a decision" />
        <PixelMetricCard label="Accepted" value={acceptedOffers} accent="green" detail="Deals already processed" />
      </div>

      <PixelPanel title="Trade Offers" accent={pendingOffers > 0 ? 'gold' : 'cyan'}>
        {offers.length === 0 ? (
          <div style={{ ...monoSm, color: '#999' }}>
            No active offers. Put veterans on the block or advance the market.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {offers.map((offer) => (
              <div key={offer.id} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '10px',
                border: `3px solid ${offer.status === 'accepted' ? 'var(--mfd-green)' : offer.status === 'rejected' ? 'var(--mfd-gold)' : 'var(--mfd-cyan)'}`,
                background: 'var(--mfd-bg-3)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '22px', color: '#fff', lineHeight: 1 }}>
                    {offer.summary.toUpperCase()}
                  </div>
                  <PixelBadge variant={offerAccent(offer.status)}>
                    {offer.status}
                  </PixelBadge>
                </div>

                <div style={autoGrid(220)}>
                  <div>
                    <div style={{ ...pixelSm, color: '#666', marginBottom: '6px' }}>YOU SEND</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {offer.send.map((asset) => (
                        <div key={`${offer.id}-${asset.description}-send`} style={{ ...monoSm, color: '#ddd' }}>
                          {asset.description}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ ...pixelSm, color: '#666', marginBottom: '6px' }}>YOU RECEIVE</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {offer.receive.map((asset) => (
                        <div key={`${offer.id}-${asset.description}-receive`} style={{ ...monoSm, color: '#ddd' }}>
                          {asset.description}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {offer.status === 'pending' ? (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                    <PixelButton
                      accent="gold"
                      disabled={pending === `${offer.id}-reject`}
                      onClick={() => void handleAction(`${offer.id}-reject`, async () => {
                        await rejectTradeOffer(offer.id);
                      })}
                    >
                      Reject
                    </PixelButton>
                    <PixelButton
                      accent="green"
                      disabled={pending === `${offer.id}-accept`}
                      onClick={() => void handleAction(`${offer.id}-accept`, async () => {
                        await acceptTradeOffer(offer.id);
                      })}
                    >
                      Accept
                    </PixelButton>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </PixelPanel>
    </div>
  );
}
