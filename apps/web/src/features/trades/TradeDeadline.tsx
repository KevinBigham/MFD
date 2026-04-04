import { useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { selectTradeDeadlineState, useGameStore } from '../../app/store/game-store';
import { PixelScreenHeader, autoGrid, monoSm, screenStackStyle } from '../shared/pixelUi';

function urgencyAccent(level: string): 'green' | 'gold' | 'red' {
  if (level === 'calm') return 'green';
  if (level === 'heating_up') return 'gold';
  return 'red';
}

function formatCountdown(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return `${hours}:${String(minutes % 60).padStart(2, '0')}`;
}

export function TradeDeadline() {
  const deadlineState = useGameStore(selectTradeDeadlineState);
  const {
    acceptDeadlineOffer,
    advanceDeadlineClock,
    finalizeDeadline,
    rejectDeadlineOffer,
  } = useGameStore((state) => state.actions);
  const [pending, setPending] = useState<string | null>(null);

  const handleAction = async (key: string, run: () => Promise<void>) => {
    setPending(key);
    try {
      await run();
    } finally {
      setPending(null);
    }
  };

  if (!deadlineState) {
    return (
      <div style={screenStackStyle}>
        <PixelScreenHeader title="Trade Deadline" subtitle="No active trade deadline countdown is running." />
        <PixelPanel title="Deadline Idle" accent="default">
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            The trade market is quiet right now.
          </div>
        </PixelPanel>
      </div>
    );
  }

  return (
    <div style={screenStackStyle}>
      <style>{`
        @keyframes mfdDeadlinePulse {
          0% { opacity: 1; }
          50% { opacity: 0.55; }
          100% { opacity: 1; }
        }
      `}</style>

      <PixelScreenHeader
        title="Trade Deadline"
        subtitle="The market is live. Every step burns clock."
        badges={(
          <>
            <PixelBadge variant={urgencyAccent(deadlineState.urgencyLevel)}>
              {deadlineState.urgencyLevel.replace(/_/g, ' ').toUpperCase()}
            </PixelBadge>
            <PixelBadge variant="cyan">{deadlineState.completedDeals.length} deals</PixelBadge>
          </>
        )}
      />

      <div style={{
        padding: '18px',
        border: '3px solid var(--mfd-gold)',
        background: deadlineState.urgencyLevel === 'buzzer_beater' ? 'rgba(255, 80, 80, 0.14)' : 'rgba(255, 215, 0, 0.08)',
        animation: deadlineState.urgencyLevel === 'frantic' || deadlineState.urgencyLevel === 'buzzer_beater' ? 'mfdDeadlinePulse 1s infinite' : undefined,
      }}>
        <div style={{ fontFamily: 'var(--mfd-font-score, var(--mfd-font-display))', fontSize: '52px', color: 'var(--mfd-gold)', lineHeight: 1 }}>
          {formatCountdown(deadlineState.minutesRemaining)}
        </div>
      </div>

      <div style={{
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        padding: '10px 12px',
        background: 'var(--mfd-bg-2)',
        border: '2px solid var(--mfd-cyan)',
        color: 'var(--mfd-cyan)',
        fontFamily: 'var(--mfd-font-mono)',
        fontSize: '12px',
      }}>
        {deadlineState.tickerMessages.join(' // ')}
      </div>

      <div style={autoGrid(320)}>
        <PixelPanel title={`Completed Deals (${deadlineState.completedDeals.length})`} accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {deadlineState.completedDeals.length === 0 ? (
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Nothing has hit the wire yet.</div>
            ) : (
              deadlineState.completedDeals.map((deal) => (
                <div key={deal.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '10px', borderBottom: '1px solid var(--mfd-border)' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <PixelBadge variant={deal.splash ? 'gold' : 'cyan'}>{deal.teams.join(' -> ')}</PixelBadge>
                    <PixelBadge variant="default">{deal.grade}</PixelBadge>
                    <PixelBadge variant="red">{deal.timestamp} MIN</PixelBadge>
                  </div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{deal.narrative}</div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                    {deal.players.join(', ')} // {deal.picks.join(', ')}
                  </div>
                </div>
              ))
            )}
          </div>
        </PixelPanel>

        <PixelPanel title={`Pending Offers (${deadlineState.pendingOffers.length})`} accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {deadlineState.pendingOffers.length === 0 ? (
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No live offers are waiting on your call.</div>
            ) : (
              deadlineState.pendingOffers.map((offer) => (
                <div key={offer.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '12px', borderBottom: '1px solid var(--mfd-border)' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <PixelBadge variant="gold">YOU GET {offer.receive.map((asset) => asset.description).join(', ')}</PixelBadge>
                    <PixelBadge variant="red">YOU SEND {offer.send.map((asset) => asset.description).join(', ')}</PixelBadge>
                  </div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{offer.summary}</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <PixelButton
                      accent="green"
                      disabled={pending === offer.id}
                      onClick={() => void handleAction(offer.id, async () => acceptDeadlineOffer(offer.id))}
                    >
                      Accept
                    </PixelButton>
                    <PixelButton
                      accent="red"
                      disabled={pending === offer.id}
                      onClick={() => void handleAction(offer.id, async () => rejectDeadlineOffer(offer.id))}
                    >
                      Reject
                    </PixelButton>
                  </div>
                </div>
              ))
            )}
          </div>
        </PixelPanel>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <PixelButton
          accent="cyan"
          disabled={deadlineState.minutesRemaining <= 0 || pending === 'advance'}
          onClick={() => void handleAction('advance', async () => advanceDeadlineClock(30))}
        >
          Advance 30 Minutes
        </PixelButton>
        {deadlineState.minutesRemaining <= 0 ? (
          <PixelButton
            accent="red"
            disabled={pending === 'finalize'}
            onClick={() => void handleAction('finalize', async () => finalizeDeadline())}
          >
            Finalize Deadline
          </PixelButton>
        ) : null}
      </div>
    </div>
  );
}
