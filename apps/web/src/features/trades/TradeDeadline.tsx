import { useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import type { DeadlineDeal } from '@mfd/engine';
import { selectScenarioState, selectTradeDeadlineState, useGameStore } from '../../app/store/game-store';
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

type DeadlineReceiptAccent = 'green' | 'gold' | 'cyan' | 'red' | 'default';
type DeadlineReceiptAction = 'accept_offer' | 'reject_offer' | 'advance_clock';
type DeadlineDealReceiptAccent = 'green' | 'gold' | 'cyan';

export interface TradeDeadlineActionReceipt {
  id: string;
  title: string;
  accent: DeadlineReceiptAccent;
  target: string;
  result: string;
  stateTouched: string;
  source: string;
  boundary: string;
}

export interface DeadlineDealReceipt {
  label: string;
  detail: string;
  accent: DeadlineDealReceiptAccent;
}

function formatAssets(assets: Array<{ description?: string }>): string {
  return assets.map((asset) => asset.description ?? 'asset').join(', ') || 'no listed assets';
}

export function buildDeadlineDealReceipt(deal: DeadlineDeal): DeadlineDealReceipt {
  const buyer = deal.teams[0] ?? 'buyer';
  const seller = deal.teams[1] ?? 'seller';
  const players = deal.players.length > 0 ? deal.players.join(', ') : 'listed player';
  const picks = deal.picks.length > 0 ? deal.picks.join(', ') : 'listed pick compensation';
  const base = `${buyer} buying from ${seller}: ${players} for ${picks}. ${deal.grade} grade, ${deal.timestamp} minutes left.`;

  if (deal.splash) {
    return {
      label: 'Splash buy',
      detail: `${base} This saved completed-deal receipt stays pending movement until Finalize Deadline applies completed deals.`,
      accent: 'gold',
    };
  }

  if (deal.grade.startsWith('A') || deal.grade.startsWith('B')) {
    return {
      label: 'Value buy',
      detail: `${base} Strong saved grade marks a buyer-favorable market move, but it still waits for Finalize Deadline before rosters or picks change.`,
      accent: 'green',
    };
  }

  return {
    label: 'Market churn',
    detail: `${base} This is deadline feed context only until the finalizer commits completed deals.`,
    accent: 'cyan',
  };
}

export function buildTradeDeadlineActionReceipt(args: {
  action: DeadlineReceiptAction;
  offerId?: string;
  offerSummary?: string;
  sendAssets?: Array<{ description?: string }>;
  receiveAssets?: Array<{ description?: string }>;
  minutesBefore?: number;
  minutesAdvanced?: number;
  urgencyBefore?: string;
  completedDealsBefore?: number;
}): TradeDeadlineActionReceipt {
  if (args.action === 'accept_offer') {
    return {
      id: `trade-deadline:accept:${args.offerId ?? 'offer'}`,
      title: 'Deadline Offer Accepted',
      accent: 'green',
      target: args.offerSummary ?? 'Pending deadline offer',
      result: `Accepted the live package: you send ${formatAssets(args.sendAssets ?? [])}; you receive ${formatAssets(args.receiveAssets ?? [])}.`,
      stateTouched: 'deadline pending offers/ticker, rosters or picks moved by the existing trade-offer helper, player map, cap totals, transaction logs, press conference, league news, social feed when user-involved, audio cue queue, and autosave.',
      source: 'actions.acceptDeadlineOffer -> staged acceptTradeOfferEngine -> commitGame',
      boundary: 'This confirmation does not accept another offer, advance the clock, finalize completed AI deals, generate new offers, change trade valuation or cap formulas, play scheduled games, or save a separate confirmation log.',
    };
  }

  if (args.action === 'reject_offer') {
    return {
      id: `trade-deadline:reject:${args.offerId ?? 'offer'}`,
      title: 'Deadline Offer Rejected',
      accent: 'red',
      target: args.offerSummary ?? 'Pending deadline offer',
      result: `Rejected the live package: you would have sent ${formatAssets(args.sendAssets ?? [])}; you would have received ${formatAssets(args.receiveAssets ?? [])}.`,
      stateTouched: 'deadline pending offers, ticker message, and autosave through the existing store commit.',
      source: 'actions.rejectDeadlineOffer -> commitGame',
      boundary: 'This confirmation does not move players or picks, change cap totals, alter trade valuation, advance the clock, finalize completed deals, reroll saved outcomes, or save a separate confirmation log.',
    };
  }

  const minutesBefore = args.minutesBefore ?? 0;
  const minutesAdvanced = args.minutesAdvanced ?? 0;
  const minutesAfter = Math.max(0, minutesBefore - minutesAdvanced);
  return {
    id: `trade-deadline:advance:${minutesBefore}:${minutesAdvanced}`,
    title: 'Deadline Clock Advanced',
    accent: minutesAfter <= 0 ? 'red' : 'cyan',
    target: `${formatCountdown(minutesBefore)} -> ${formatCountdown(minutesAfter)} // ${args.urgencyBefore ?? 'current'} urgency before commit`,
    result: `Advanced the saved countdown by ${minutesAdvanced} minutes. Completed-deal feed before commit: ${args.completedDealsBefore ?? 0}; newly revealed scheduled deals, urgency, and ticker copy are resolved by the engine clock helper.`,
    stateTouched: 'game.tradeDeadlineState minutesRemaining, urgencyLevel, completedDeals, tickerMessages, and autosave through the existing store commit.',
    source: 'actions.advanceDeadlineClock -> advanceDeadlineClockEngine -> commitGame',
    boundary: 'This confirmation does not move players or picks, accept or reject pending offers, finalize completed deals, generate new offers, play scheduled games, or save a separate confirmation log.',
  };
}

export function TradeDeadlineActionReceiptPanel({ receipt }: { receipt: TradeDeadlineActionReceipt }) {
  return (
    <PixelPanel title="Deadline Action Receipt" accent={receipt.accent}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant={receipt.accent}>{receipt.title}</PixelBadge>
          <PixelBadge variant="default">On-screen confirmation</PixelBadge>
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.5 }}>{receipt.target}</div>
        <div style={autoGrid(220)}>
          {[
            { label: 'Result', detail: receipt.result, accent: receipt.accent },
            { label: 'Changed now', detail: receipt.stateTouched, accent: 'gold' as const },
            { label: 'Action used', detail: receipt.source, accent: 'cyan' as const },
            { label: 'Did not also', detail: receipt.boundary, accent: 'green' as const },
          ].map((row) => (
            <div
              key={row.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '8px',
                border: '1px solid var(--mfd-border)',
                background: 'var(--mfd-bg-elevated)',
              }}
            >
              <PixelBadge variant={row.accent}>{row.label}</PixelBadge>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{row.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </PixelPanel>
  );
}

function DeadlineSourcesPanel({ active }: { active: boolean }) {
  return (
    <PixelPanel title="Deadline Sources" accent="cyan">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant={active ? 'gold' : 'default'}>{active ? 'Saved deadline state' : 'No active state'}</PixelBadge>
          <PixelBadge variant="cyan">Store commit buttons</PixelBadge>
          <PixelBadge variant="default">Engine finalizer</PixelBadge>
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
          Source: `selectTradeDeadlineState` reads saved `game.tradeDeadlineState`. The route displays that countdown, pending offers, completed-deal feed, and ticker without generating new offers during render.
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
          Commit boundary: Accept stages the pending deadline offer through the existing trade-offer path, Reject only removes that saved pending offer, Advance Clock calls the store deadline-clock action, and Finalize calls the engine deadline finalizer before the same week resumes.
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-faint)', lineHeight: 1.5 }}>
          Completed-deal rows render Deadline Deal Receipt copy from the saved deadline countdown. They do not move players or picks until the Finalize Deadline action applies completed deals and clears the deadline state.
        </div>
      </div>
    </PixelPanel>
  );
}

export function TradeDeadline() {
  const deadlineState = useGameStore(selectTradeDeadlineState);
  const scenarioState = useGameStore(selectScenarioState);
  const {
    acceptDeadlineOffer,
    advanceDeadlineClock,
    finalizeDeadline,
    rejectDeadlineOffer,
  } = useGameStore((state) => state.actions);
  const [pending, setPending] = useState<string | null>(null);
  const [actionReceipt, setActionReceipt] = useState<TradeDeadlineActionReceipt | null>(null);

  const handleAction = async (key: string, run: () => Promise<void>) => {
    setPending(key);
    try {
      await run();
    } finally {
      setPending(null);
    }
  };

  const tradesLockedByScenario = Boolean(scenarioState?.activeScenario?.constraints.blockTrades);
  const handleAcceptOffer = async (offer: { id: string; summary: string; send: Array<{ description?: string }>; receive: Array<{ description?: string }> }) => {
    await handleAction(offer.id, async () => {
      if (tradesLockedByScenario) return;
      await acceptDeadlineOffer(offer.id);
      setActionReceipt(buildTradeDeadlineActionReceipt({
        action: 'accept_offer',
        offerId: offer.id,
        offerSummary: offer.summary,
        sendAssets: offer.send,
        receiveAssets: offer.receive,
      }));
    });
  };

  const handleRejectOffer = async (offer: { id: string; summary: string; send: Array<{ description?: string }>; receive: Array<{ description?: string }> }) => {
    await handleAction(offer.id, async () => {
      await rejectDeadlineOffer(offer.id);
      setActionReceipt(buildTradeDeadlineActionReceipt({
        action: 'reject_offer',
        offerId: offer.id,
        offerSummary: offer.summary,
        sendAssets: offer.send,
        receiveAssets: offer.receive,
      }));
    });
  };

  const handleAdvanceClock = async () => {
    if (!deadlineState) return;
    await handleAction('advance', async () => {
      await advanceDeadlineClock(30);
      setActionReceipt(buildTradeDeadlineActionReceipt({
        action: 'advance_clock',
        minutesBefore: deadlineState.minutesRemaining,
        minutesAdvanced: 30,
        urgencyBefore: deadlineState.urgencyLevel,
        completedDealsBefore: deadlineState.completedDeals.length,
      }));
    });
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
        <DeadlineSourcesPanel active={false} />
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
            {tradesLockedByScenario ? <PixelBadge variant="red">TRADES LOCKED</PixelBadge> : null}
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

      <DeadlineSourcesPanel active />

      {actionReceipt ? <TradeDeadlineActionReceiptPanel receipt={actionReceipt} /> : null}

      {tradesLockedByScenario ? (
        <PixelPanel title="Scenario Lock" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="gold">{scenarioState?.activeScenario?.name ?? 'Active Scenario'}</PixelBadge>
              <PixelBadge variant="red">DEADLINE ACCEPTS BLOCKED</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
              Accepting pending deadline offers is disabled because the active scenario blocks trade actions. Rejecting stale offers, advancing the clock, and finalizing the deadline remain available.
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-faint)', lineHeight: 1.5 }}>
              Source: saved scenarioState.activeScenario.constraints.blockTrades. The store action already returns without staging or committing blocked deadline accepts.
            </div>
          </div>
        </PixelPanel>
      ) : null}

      <div style={autoGrid(320)}>
        <PixelPanel title={`Completed Deals (${deadlineState.completedDeals.length})`} accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {deadlineState.completedDeals.length === 0 ? (
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Nothing has hit the wire yet.</div>
            ) : (
              deadlineState.completedDeals.map((deal) => {
                const receipt = buildDeadlineDealReceipt(deal);

                return (
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
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      padding: '8px',
                      border: '1px solid var(--mfd-border)',
                      background: 'var(--mfd-bg-elevated)',
                    }}
                    >
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <PixelBadge variant={receipt.accent}>Deadline Deal Receipt</PixelBadge>
                        <PixelBadge variant="default">{receipt.label}</PixelBadge>
                      </div>
                      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{receipt.detail}</div>
                    </div>
                  </div>
                );
              })
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
                      disabled={tradesLockedByScenario || pending === offer.id}
                      onClick={() => { void handleAcceptOffer(offer); }}
                    >
                      {tradesLockedByScenario ? 'Scenario Locked' : 'Accept'}
                    </PixelButton>
                    <PixelButton
                      accent="red"
                      disabled={pending === offer.id}
                      onClick={() => { void handleRejectOffer(offer); }}
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
          onClick={() => { void handleAdvanceClock(); }}
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
