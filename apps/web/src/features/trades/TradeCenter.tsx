import { useMemo, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import {
  PixelBadge, PixelButton, PixelConsequenceList, PixelNav, PixelPanel, PixelProgressBar, PixelSelect,
} from '@mfd/design-system/components';
import {
  buildTradeDecisionForecast,
  getActiveRule,
  getTradeTargets,
  getTradeableAssets,
  type ConditionalPick,
  type DraftPick,
  type Player,
  type TradeDecisionForecast,
  type TradeOffer,
  type TradeOfferAsset,
  type TradeProposal,
} from '@mfd/engine';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import {
  selectActiveProposals,
  selectPhase,
  selectScenarioState,
  selectTradeDeadlineState,
  selectTradeOffers,
  selectTradeSuggestions,
  selectUserTeam,
  selectWeek,
  useGameStore,
} from '../../app/store/game-store';
import {
  CommandCallout,
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  display,
  monoSm,
  navigateTo,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';
import { TradeFinder } from './TradeFinder';
import { buildTeamWindowInput, computeTeamWindow, type TeamWindow } from '../../lib/team-window';

function offerAccent(status: string): 'cyan' | 'green' | 'gold' | 'red' {
  if (status === 'accepted') return 'green';
  if (status === 'rejected') return 'red';
  if (status === 'countered') return 'gold';
  return 'cyan';
}

function assetKey(asset: TradeOfferAsset): string {
  if (asset.type === 'player') return `player:${asset.playerId}`;
  if (asset.type === 'conditional_pick') return `conditional:${asset.conditionalPickId}`;
  return `pick:${asset.pickId}`;
}

function pickIdFor(teamId: string, pick: DraftPick): string {
  return `${pick.currentTeamId}-${pick.year}-${pick.round}-${pick.pick}-${pick.originalTeamId}`;
}

function fromPlayer(teamId: string, player: Player): TradeOfferAsset {
  return {
    type: 'player',
    teamId,
    playerId: player.id,
    pickId: null,
    description: player.name,
  };
}

function fromPick(teamId: string, pick: DraftPick): TradeOfferAsset {
  return {
    type: 'pick',
    teamId,
    playerId: null,
    pickId: pickIdFor(teamId, pick),
    description: `Round ${pick.round} pick`,
  };
}

function fromConditionalPick(teamId: string, conditionalPick: ConditionalPick): TradeOfferAsset {
  const ceilingRound = Math.min(conditionalPick.basePick.round, conditionalPick.condition.upgradeRound);
  return {
    type: 'conditional_pick',
    teamId,
    playerId: null,
    pickId: null,
    conditionalPickId: conditionalPick.id,
    description: conditionalPick.description || `Conditional round ${conditionalPick.basePick.round}/ceiling ${ceilingRound} pick`,
  };
}

function offerPartnerId(userTeamId: string, offer: Pick<TradeOffer, 'fromTeamId' | 'toTeamId'>): string {
  return offer.fromTeamId === userTeamId ? offer.toTeamId : offer.fromTeamId;
}

function formatForecastValue(value: number): string {
  return value.toFixed(1);
}

type TradeCenterReceiptAccent = 'cyan' | 'green' | 'gold' | 'red' | 'default';
type TradeCenterReceiptAction =
  | 'accept_offer'
  | 'reject_offer'
  | 'submit_proposal'
  | 'accept_counter'
  | 'reject_counter';

export interface TradeCenterActionReceipt {
  id: string;
  title: string;
  accent: TradeCenterReceiptAccent;
  target: string;
  result: string;
  stateTouched: string;
  source: string;
  boundary: string;
}

function formatAssets(assets: TradeOfferAsset[]): string {
  if (assets.length === 0) return 'nothing';
  return assets.map((asset) => asset.description).join(' | ');
}

function forecastLine(forecast?: TradeDecisionForecast | null): string {
  if (!forecast) return 'Forecast unavailable; the existing store/engine action remains the source of truth.';
  return `${forecast.valueLabel}; ${forecast.acceptanceLabel}. ${forecast.headline}`;
}

function proposalReceiptSummary(proposal: TradeProposal, partnerName?: string): string {
  return `${partnerName ?? proposal.toTeamId} proposal ${proposal.id}`;
}

function receiptAccentForStatus(status?: string): TradeCenterReceiptAccent {
  if (status === 'accepted') return 'green';
  if (status === 'rejected') return 'red';
  if (status === 'countered') return 'gold';
  return 'cyan';
}

export function buildTradeCenterActionReceipt(args: {
  action: TradeCenterReceiptAction;
  id: string;
  summary: string;
  sendAssets: TradeOfferAsset[];
  receiveAssets: TradeOfferAsset[];
  forecast?: TradeDecisionForecast | null;
  resultStatus?: TradeProposal['status'] | TradeOffer['status'];
  partnerName?: string;
}): TradeCenterActionReceipt {
  if (args.action === 'accept_offer') {
    return {
      id: `trade-center:accept:${args.id}`,
      title: 'Generated Offer Accepted',
      accent: 'green',
      target: args.summary,
      result: `Accepted the generated package: you send ${formatAssets(args.sendAssets)}; you receive ${formatAssets(args.receiveAssets)}. ${forecastLine(args.forecast)}`,
      stateTouched: 'saved trade offer status, user and partner rosters, player map, draft picks or conditional picks, team cap totals, transaction logs, league/social/news feeds when user-involved, trade-complete audio cue, undo snapshot, and autosave.',
      source: 'actions.acceptTradeOffer -> acceptTradeOfferEngine -> commitGame',
      boundary: 'This confirmation does not accept another offer, rebuild generated offers, create a direct proposal, bypass scenario/deadline gates, change valuation or cap formulas, play scheduled games, reroll saved outcomes, or save a separate confirmation log.',
    };
  }

  if (args.action === 'reject_offer') {
    return {
      id: `trade-center:reject:${args.id}`,
      title: 'Generated Offer Rejected',
      accent: 'gold',
      target: args.summary,
      result: `Rejected the generated package: you would have sent ${formatAssets(args.sendAssets)}; you would have received ${formatAssets(args.receiveAssets)}. ${forecastLine(args.forecast)}`,
      stateTouched: 'saved trade offer status, trade-rejected audio cue, and autosave through the existing reject path.',
      source: 'actions.rejectTradeOffer -> rejectTradeOfferEngine -> commitGame',
      boundary: 'This confirmation does not move players or picks, change cap totals, rebuild generated offers, create a direct proposal, play scheduled games, reroll saved outcomes, save a separate confirmation log, or add nearMissTracker declined-trade inputs. Generated offer rejections are not season-end What-If receipt seeds.',
    };
  }

  if (args.action === 'submit_proposal') {
    const status = args.resultStatus ?? 'draft';
    const nearMissDetail = status === 'rejected'
      ? ' A rejected user proposal that requested at least one partner player can also add a nearMissTracker declined-trade input for season-end What-If receipts.'
      : '';
    return {
      id: `trade-center:proposal:${args.id}`,
      title: status === 'accepted' ? 'Direct Proposal Accepted' : status === 'countered' ? 'Direct Proposal Countered' : status === 'rejected' ? 'Direct Proposal Rejected' : 'Direct Proposal Submitted',
      accent: receiptAccentForStatus(status),
      target: `${args.partnerName ?? 'Trade partner'} // ${args.summary}`,
      result: `Submitted the direct package and received ${status} status: you offer ${formatAssets(args.sendAssets)}; you request ${formatAssets(args.receiveAssets)}. ${forecastLine(args.forecast)}`,
      stateTouched: `saved activeProposals row, proposal status/AI response/counter offer when present, rosters/picks/conditional picks/player map/cap totals when accepted, transaction/media/audio side effects from the existing helper, and autosave.${nearMissDetail}`,
      source: 'actions.createTradeProposal -> createTradeProposalEngine -> commitGame; actions.submitTradeProposal -> submitTradeProposalEngine -> commitGame',
      boundary: 'This confirmation does not create another proposal, resubmit the package, accept a counter, rebuild trade suggestions, bypass scenario/deadline gates, change valuation or cap formulas, play scheduled games, reroll saved outcomes, or save a separate confirmation log.',
    };
  }

  if (args.action === 'accept_counter') {
    return {
      id: `trade-center:accept-counter:${args.id}`,
      title: 'Counter Accepted',
      accent: 'green',
      target: args.summary,
      result: `Accepted the counter package: you send ${formatAssets(args.sendAssets)}; you receive ${formatAssets(args.receiveAssets)}. ${forecastLine(args.forecast)}`,
      stateTouched: 'saved activeProposals status, rosters, player map, draft picks or conditional picks, team cap totals, transaction logs, media side effects from the existing direct trade helper, and autosave.',
      source: 'actions.acceptCounter -> acceptCounterProposalEngine -> commitGame',
      boundary: 'This confirmation does not accept another counter, create another proposal, rebuild suggestions, bypass scenario/deadline gates, change valuation or cap formulas, play scheduled games, reroll saved outcomes, or save a separate confirmation log.',
    };
  }

  return {
    id: `trade-center:reject-counter:${args.id}`,
    title: 'Counter Rejected',
    accent: 'gold',
    target: args.summary,
      result: `Rejected the counter package: you would have sent ${formatAssets(args.sendAssets)}; you would have received ${formatAssets(args.receiveAssets)}.`,
    stateTouched: 'saved activeProposals status/counter fields, nearMissTracker declined-trade input when the user proposal requested at least one partner player, and autosave through the existing counter-reject path.',
    source: 'actions.rejectCounter -> rejectCounterProposalEngine -> commitGame',
    boundary: 'This confirmation does not move players or picks, change cap totals, create another proposal, accept a counter, play scheduled games, reroll saved outcomes, or save a separate confirmation log.',
  };
}

function conditionLabel(conditionalPick: ConditionalPick, playerName: string | null): string {
  const subject = playerName ?? 'Tracked player';
  if (conditionalPick.condition.type === 'games_played') {
    return `${subject} ${conditionalPick.condition.threshold}+ games played`;
  }
  if (conditionalPick.condition.type === 'starts') {
    return `${subject} ${conditionalPick.condition.threshold}+ starts`;
  }
  if (conditionalPick.condition.type === 'pro_bowl') {
    return `${subject} ${conditionalPick.condition.threshold}+ Pro Bowls`;
  }
  return `${subject} playoff-win condition ${conditionalPick.condition.threshold}+`;
}

function conditionalPickStatus(conditionalPick: ConditionalPick): string {
  const ceilingRound = Math.min(conditionalPick.basePick.round, conditionalPick.condition.upgradeRound);
  if (conditionalPick.resolved) {
    return `Resolved round ${conditionalPick.resolvedPick?.round ?? conditionalPick.basePick.round}`;
  }
  return `Base round ${conditionalPick.basePick.round} / ceiling round ${ceilingRound}`;
}

function ConditionalPickContextPanel({
  conditionalPicks,
  players,
  userTeamId,
}: {
  conditionalPicks: ConditionalPick[];
  players: Record<string, Player>;
  userTeamId: string;
}) {
  const incoming = conditionalPicks.filter((pick) => pick.toTeamId === userTeamId);
  const outgoing = conditionalPicks.filter((pick) => pick.fromTeamId === userTeamId);
  const unresolved = [...incoming, ...outgoing].filter((pick) => !pick.resolved).length;
  const displayPicks = [...incoming, ...outgoing].slice(0, 3);

  return (
    <PixelPanel title="Conditional Pick Context" accent={incoming.length + outgoing.length > 0 ? 'gold' : 'cyan'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={autoGrid(190)}>
          <PixelMetricCard
            label="Incoming"
            value={incoming.length}
            accent="green"
            detail="Saved conditional picks owed to you"
          />
          <PixelMetricCard
            label="Outgoing"
            value={outgoing.length}
            accent={outgoing.length > 0 ? 'gold' : 'cyan'}
            detail="Saved conditional picks you owe"
          />
          <PixelMetricCard
            label="Unresolved"
            value={unresolved}
            accent={unresolved > 0 ? 'gold' : 'cyan'}
            detail="Resolve during offseason advance"
          />
        </div>

        <div style={autoGrid(260)}>
          {[
            {
              label: 'Generated offers',
              body: 'Generated market offers can carry saved conditional-pick assets and transfer them through the engine trade-market path.',
              border: 'var(--mfd-green)',
            },
            {
              label: 'Direct proposals',
              body: 'Direct proposal builder rows can now include unresolved saved conditional-pick assets; submit and counter acceptance reuse the direct negotiation transfer path.',
              border: 'var(--mfd-green)',
            },
            {
              label: 'Receipts',
              body: 'Resolved incoming picks surface through Inbox and Conditional Victory progress after the offseason resolution pass.',
              border: 'var(--mfd-cyan)',
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '10px',
                border: `3px solid ${item.border}`,
                background: 'rgba(0, 0, 0, 0.18)',
              }}
            >
              <div style={{ ...pixelSm, color: item.border }}>{item.label}</div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                {item.body}
              </div>
            </div>
          ))}
        </div>

        {displayPicks.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {displayPicks.map((conditionalPick) => {
              const direction = conditionalPick.toTeamId === userTeamId ? 'Incoming' : 'Outgoing';
              const player = players[conditionalPick.condition.playerId] ?? players[conditionalPick.playerId] ?? null;
              return (
                <div
                  key={conditionalPick.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '12px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    padding: '10px',
                    border: '3px solid var(--mfd-border)',
                    background: 'var(--mfd-bg-3)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ ...monoSm, color: '#fff' }}>
                      {direction} // {conditionalPick.description}
                    </div>
                    <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                      {conditionalPick.basePick.year} pick // {conditionLabel(conditionalPick, player?.name ?? null)}
                    </div>
                  </div>
                  <PixelBadge variant={conditionalPick.resolved ? 'green' : 'gold'}>
                    {conditionalPickStatus(conditionalPick)}
                  </PixelBadge>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            No saved user-team conditional picks are on this trade desk. Generated offers may still show conditional assets when the league owns one.
          </div>
        )}
      </div>
    </PixelPanel>
  );
}

function TradeDecisionForecastPanel({ forecast }: { forecast: TradeDecisionForecast }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      padding: '10px',
      border: `3px solid var(--mfd-${forecast.valueAccent})`,
      background: 'rgba(0, 0, 0, 0.18)',
    }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ ...display, fontSize: '20px', color: '#fff', lineHeight: 1 }}>
          DECISION FORECAST
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <PixelBadge variant={forecast.valueAccent}>{forecast.valueLabel}</PixelBadge>
          <PixelBadge variant={forecast.acceptanceAccent}>{forecast.acceptanceLabel}</PixelBadge>
        </div>
      </div>
      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
        {forecast.headline}
      </div>
      <div style={autoGrid(190)}>
        <PixelMetricCard
          label="You Send"
          value={formatForecastValue(forecast.userSendsValue)}
          accent={forecast.userValueDelta < -5 ? 'red' : 'gold'}
          detail="User-side valuation"
        />
        <PixelMetricCard
          label="You Receive"
          value={formatForecastValue(forecast.userReceivesValue)}
          accent={forecast.userValueDelta > 5 ? 'green' : 'cyan'}
          detail="User-side valuation"
        />
        <PixelMetricCard
          label="AI Threshold"
          value={`${forecast.partnerAcceptanceRatio}%`}
          accent={forecast.acceptanceAccent}
          detail={`${formatForecastValue(forecast.partnerIncomingValue)} / ${formatForecastValue(forecast.partnerRequiredValue)}`}
        />
      </div>
      <PixelConsequenceList items={forecast.consequenceItems} />
      {forecast.warnings.length > 0 ? (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {forecast.warnings.map((warning) => (
            <PixelBadge key={warning} variant={forecast.acceptanceAccent === 'red' ? 'red' : 'gold'}>
              {warning}
            </PixelBadge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TradeCenterActionReceiptPanel({ receipt }: { receipt: TradeCenterActionReceipt }) {
  return (
    <PixelPanel title="Trade Action Receipt" accent={receipt.accent}>
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

function TradeCenterSourcesPanel({
  offerCount,
  proposalCount,
  suggestionCount,
  targetCount,
  userAssetCount,
  deadlineWeek,
  lockedByScenario,
  deadlineClosed,
}: {
  offerCount: number;
  proposalCount: number;
  suggestionCount: number;
  targetCount: number;
  userAssetCount: number;
  deadlineWeek: number;
  lockedByScenario: boolean;
  deadlineClosed: boolean;
}) {
  const rows = [
    {
      label: 'Offer desk',
      detail: `selectTradeOffers feeds ${offerCount} incoming market package${offerCount === 1 ? '' : 's'}; selectActiveProposals feeds ${proposalCount} user conversation${proposalCount === 1 ? '' : 's'} and partner counters.`,
    },
    {
      label: 'Trade finder',
      detail: `selectTradeSuggestions feeds ${suggestionCount} advisory package${suggestionCount === 1 ? '' : 's'}. Each visible row renders a Generated Offer Receipt from the saved suggestion fields. Loading one copies assets into route-local builder state; it does not submit or stage a trade.`,
    },
    {
      label: 'Builder inputs',
      detail: `getTradeTargets(game, userTeam.id) exposes ${targetCount} partner row${targetCount === 1 ? '' : 's'}, and getTradeableAssets(game, userTeam.id) exposes ${userAssetCount} user asset${userAssetCount === 1 ? '' : 's'}. selectedPartnerId, offeringKeys, and requestingKeys stay route-local until a commit button runs.`,
    },
    {
      label: 'Forecast read',
      detail: 'buildTradeDecisionForecast reads generated offers or selected proposal assets. Changing tabs, choosing a partner, adding assets, or viewing forecasts does not move players, picks, cap, saves, play scheduled games, reroll saved outcomes, or autosave.',
    },
    {
      label: 'Rules and locks',
      detail: `selectScenarioState, selectPhase, selectWeek, selectTradeDeadlineState, and getActiveRule(game.leagueRules, 'trade_deadline_week', game.year) drive disabled labels, the deadline badge, and the deadline handoff. Current read: Week ${deadlineWeek}, ${lockedByScenario ? 'scenario locked' : 'scenario open'}, ${deadlineClosed ? 'deadline closed' : 'deadline open'}.`,
    },
    {
      label: 'Commit buttons',
      detail: 'acceptTradeOffer, rejectTradeOffer, createTradeProposal then submitTradeProposal, acceptCounter, rejectCounter, and the /trade-deadline route are the explicit write paths.',
    },
    {
      label: 'What-if receipts',
      detail: 'Generated offer rejections only mark the saved market offer status and do not write nearMissTracker. Rejected direct proposals and counter declines can record nearMissTracker.declinedTrades when the user request includes at least one partner player; season-end What-If receipts are generated later from that tracker.',
    },
    {
      label: 'Conditional picks',
      detail: 'Saved game.conditionalPicks feed the context panel plus direct proposal asset rows when an unresolved conditional pick is owned by the selected side. Generated market offers and direct proposal commits both transfer conditional assets through engine trade paths.',
    },
  ];

  return (
    <PixelPanel title="Trade Center Sources" accent="cyan">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant="cyan">Read models</PixelBadge>
          <PixelBadge variant="gold">Route-local builder</PixelBadge>
          <PixelBadge variant={lockedByScenario || deadlineClosed ? 'red' : 'green'}>
            {lockedByScenario ? 'Scenario lock read' : deadlineClosed ? 'Deadline lock read' : 'Trade commits available'}
          </PixelBadge>
        </div>
        <div style={autoGrid(280)}>
          {rows.map((row) => (
            <div
              key={row.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '10px',
                border: '3px solid var(--mfd-border)',
                background: 'rgba(0, 0, 0, 0.18)',
              }}
            >
              <span style={{ ...pixelSm, color: 'var(--mfd-cyan)' }}>{row.label}</span>
              <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>{row.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </PixelPanel>
  );
}

function AssetPickerRow({
  asset,
  selected,
  onToggle,
}: {
  asset: TradeOfferAsset;
  selected: boolean;
  onToggle: (asset: TradeOfferAsset) => void;
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: '12px',
      alignItems: 'center',
      padding: '10px',
      border: `3px solid ${selected ? 'var(--mfd-gold)' : 'var(--mfd-border)'}`,
      background: selected ? 'rgba(255, 215, 0, 0.08)' : 'var(--mfd-bg-3)',
    }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ ...monoSm, color: '#fff' }}>{asset.description}</div>
        <div style={{ ...pixelSm, color: '#777' }}>
          {asset.type === 'player' ? 'PLAYER' : asset.type === 'conditional_pick' ? 'CONDITIONAL PICK' : 'PICK'}
        </div>
      </div>
      <PixelButton accent={selected ? 'gold' : 'cyan'} onClick={() => onToggle(asset)}>
        {selected ? 'Remove' : 'Add'}
      </PixelButton>
    </div>
  );
}

export function TradeCenter() {
  const game = useGameStore((state) => state.game);
  const userTeam = useGameStore(selectUserTeam);
  const offers = useGameStore(selectTradeOffers);
  const proposals = useGameStore(selectActiveProposals);
  const tradeSuggestions = useGameStore(selectTradeSuggestions);
  const scenarioState = useGameStore(selectScenarioState);
  const tradeDeadlineState = useGameStore(selectTradeDeadlineState);
  const week = useGameStore(selectWeek);
  const phase = useGameStore(selectPhase);
  const {
    acceptCounter,
    acceptTradeOffer,
    createTradeProposal,
    rejectCounter,
    rejectTradeOffer,
    submitTradeProposal,
  } = useGameStore((s) => s.actions);

  const [tab, setTab] = useState<'incoming' | 'propose'>('incoming');
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [offeringKeys, setOfferingKeys] = useState<string[]>([]);
  const [requestingKeys, setRequestingKeys] = useState<string[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [confirmTradeId, setConfirmTradeId] = useState<string | null>(null);
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionReceipt, setActionReceipt] = useState<TradeCenterActionReceipt | null>(null);

  const pendingOffers = offers.filter((offer) => offer.status === 'pending').length;
  const acceptedOffers = offers.filter((offer) => offer.status === 'accepted').length;
  const tradeDeadlineWeek = game?.leagueRules
    ? Number(getActiveRule(game.leagueRules, 'trade_deadline_week', game.year))
    : 9;
  const deadlineClosed = phase === 'regular_season' && week > tradeDeadlineWeek;
  const showDeadlineBadge = phase === 'regular_season' && week >= tradeDeadlineWeek - 1;
  const tradesLockedByScenario = Boolean(scenarioState?.activeScenario?.constraints.blockTrades);
  const tradeTeamWindows = useMemo<Record<string, TeamWindow>>(() => {
    if (!game) return {};
    return Object.fromEntries(
      Object.values(game.teams).map((team) => [
        team.id,
        computeTeamWindow(buildTeamWindowInput(team, {
          currentYear: game.year,
          franchiseHistory: game.franchiseHistory,
        })),
      ]),
    );
  }, [game]);

  const targets = useMemo(() => (
    game && userTeam ? getTradeTargets(game, userTeam.id) : []
  ), [game, userTeam]);
  const selectedTarget = targets.find((target) => target.teamId === selectedPartnerId) ?? null;

  const userAssets = useMemo(() => (
    game && userTeam ? getTradeableAssets(game, userTeam.id) : []
  ), [game, userTeam]);
  const partnerAssets = useMemo(() => {
    if (!selectedTarget) return [];
    return [
      ...selectedTarget.tradeBlock.map((player) => fromPlayer(selectedTarget.teamId, player)),
      ...selectedTarget.picks.map((pick) => fromPick(selectedTarget.teamId, pick)),
      ...(selectedTarget.conditionalPicks ?? []).map((pick) => fromConditionalPick(selectedTarget.teamId, pick)),
    ];
  }, [selectedTarget]);

  const userAssetMap = useMemo(() => new Map(userAssets.map((asset) => [assetKey(asset), asset])), [userAssets]);
  const partnerAssetMap = useMemo(() => new Map(partnerAssets.map((asset) => [assetKey(asset), asset])), [partnerAssets]);
  const selectedOffering = offeringKeys.map((key) => userAssetMap.get(key)).filter((asset): asset is TradeOfferAsset => Boolean(asset));
  const selectedRequesting = requestingKeys.map((key) => partnerAssetMap.get(key)).filter((asset): asset is TradeOfferAsset => Boolean(asset));

  const proposalForecast = game && userTeam && selectedTarget
    ? buildTradeDecisionForecast({
      game,
      userTeamId: userTeam.id,
      partnerTeamId: selectedTarget.teamId,
      offering: selectedOffering,
      requesting: selectedRequesting,
    })
    : null;
  const offeringValue = proposalForecast?.userSendsValue ?? 0;
  const requestingValue = proposalForecast?.userReceivesValue ?? 0;
  const fairness = proposalForecast?.fairnessScore ?? 0;
  const currentProposal = proposals.find((proposal) => proposal.id === activeProposalId)
    ?? proposals.filter((proposal) => proposal.fromTeamId === userTeam?.id).at(-1)
    ?? null;

  const toggleAsset = (
    asset: TradeOfferAsset,
    selectedKeys: string[],
    setKeys: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    const key = assetKey(asset);
    setKeys(selectedKeys.includes(key)
      ? selectedKeys.filter((entry) => entry !== key)
      : [...selectedKeys, key]);
  };

  const handleAction = async (key: string, run: () => Promise<void>) => {
    setPending(key);
    setError(null);
    try {
      await run();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Trade desk error.');
    } finally {
      setPending(null);
    }
  };

  const buildOfferForecast = (offer: TradeOffer): TradeDecisionForecast | null => (
    game && userTeam
      ? buildTradeDecisionForecast({
        game,
        userTeamId: userTeam.id,
        partnerTeamId: offerPartnerId(userTeam.id, offer),
        offering: offer.send,
        requesting: offer.receive,
        status: offer.status,
      })
      : null
  );

  const handleRejectOffer = async (offer: TradeOffer, forecast?: TradeDecisionForecast | null) => {
    await handleAction(`${offer.id}-reject`, async () => {
      await rejectTradeOffer(offer.id);
      setActionReceipt(buildTradeCenterActionReceipt({
        action: 'reject_offer',
        id: offer.id,
        summary: offer.summary,
        sendAssets: offer.send,
        receiveAssets: offer.receive,
        forecast,
      }));
    });
  };

  const handleAcceptOffer = async (offer: TradeOffer, forecast?: TradeDecisionForecast | null) => {
    await handleAction(`${offer.id}-accept`, async () => {
      await acceptTradeOffer(offer.id);
      setActionReceipt(buildTradeCenterActionReceipt({
        action: 'accept_offer',
        id: offer.id,
        summary: offer.summary,
        sendAssets: offer.send,
        receiveAssets: offer.receive,
        forecast,
      }));
    });
  };

  const handleSubmitProposal = async () => {
    if (!userTeam || !selectedTarget) return;
    await handleAction('submit-proposal', async () => {
      const proposal = await createTradeProposal(userTeam.id, selectedTarget.teamId, selectedOffering, selectedRequesting);
      if (!proposal) return;
      setActiveProposalId(proposal.id);
      const resolved = await submitTradeProposal(proposal.id);
      if (resolved) {
        setActionReceipt(buildTradeCenterActionReceipt({
          action: 'submit_proposal',
          id: proposal.id,
          summary: proposalReceiptSummary(proposal, selectedTarget.teamName),
          sendAssets: proposal.offering,
          receiveAssets: proposal.requesting,
          forecast: proposalForecast,
          resultStatus: resolved.status,
          partnerName: selectedTarget.teamName,
        }));
      }
      if (resolved?.status === 'accepted') {
        setOfferingKeys([]);
        setRequestingKeys([]);
      }
    });
  };

  const handleRejectCounter = async (proposal: TradeProposal) => {
    if (!proposal.counterOffer) return;
    const counter = proposal.counterOffer;
    await handleAction(`reject-counter-${proposal.id}`, async () => {
      await rejectCounter(proposal.id);
      setActionReceipt(buildTradeCenterActionReceipt({
        action: 'reject_counter',
        id: proposal.id,
        summary: proposal.aiResponse || proposalReceiptSummary(proposal),
        sendAssets: counter.offering,
        receiveAssets: counter.requesting,
      }));
    });
  };

  const handleAcceptCounter = async (proposal: TradeProposal) => {
    if (!proposal.counterOffer) return;
    const counter = proposal.counterOffer;
    await handleAction(`accept-counter-${proposal.id}`, async () => {
      if (tradesLockedByScenario) return;
      await acceptCounter(proposal.id);
      setActionReceipt(buildTradeCenterActionReceipt({
        action: 'accept_counter',
        id: proposal.id,
        summary: proposal.aiResponse || proposalReceiptSummary(proposal),
        sendAssets: counter.offering,
        receiveAssets: counter.requesting,
      }));
    });
  };

  const loadSuggestion = (suggestion: (typeof tradeSuggestions)[number]) => {
    setTab('propose');
    setSelectedPartnerId(suggestion.partner);
    setOfferingKeys(suggestion.offer.offering.map((asset) => assetKey(asset)));
    setRequestingKeys(suggestion.offer.requesting.map((asset) => assetKey(asset)));
    setError(null);
  };

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Trade Center"
        subtitle="Incoming offers remain intact. Direct negotiation lets you build and submit your own package."
        badges={(
          <>
            <PixelBadge variant="cyan">{pendingOffers} pending</PixelBadge>
            <PixelBadge variant="green">{acceptedOffers} accepted</PixelBadge>
            {tradesLockedByScenario ? <PixelBadge variant="red">TRADES LOCKED</PixelBadge> : null}
            {tradeDeadlineState ? (
              <PixelButton
                accent="red"
                onClick={() => navigateTo('/trade-deadline')}
              >
                Deadline Live
              </PixelButton>
            ) : null}
            {showDeadlineBadge ? (
              <PixelBadge variant={deadlineClosed ? 'red' : 'gold'}>
                {deadlineClosed ? 'Deadline Passed' : `Deadline W${tradeDeadlineWeek - week + 1}`}
              </PixelBadge>
            ) : null}
          </>
        )}
      />

      <CommandCallout
        title={pendingOffers > 0 ? 'Answer the live offers' : deadlineClosed ? 'Market is closed' : 'Choose build, block, or hold'}
        body={pendingOffers > 0
          ? `${pendingOffers} offer${pendingOffers === 1 ? '' : 's'} need an accept/reject call before you build another package.`
          : deadlineClosed
            ? 'The regular-season deadline has passed. Use this screen for receipts, not new market moves.'
            : 'No offer is forcing your hand. Build a targeted proposal, scan the league block, or leave the roster alone.'}
        accent={pendingOffers > 0 ? 'gold' : deadlineClosed ? 'red' : 'cyan'}
        meta={(
          <>
            <PixelBadge variant="cyan">{offers.length} offers</PixelBadge>
            <PixelBadge variant={deadlineClosed ? 'red' : 'green'}>{deadlineClosed ? 'Closed' : 'Open'}</PixelBadge>
          </>
        )}
        actions={[
          { label: 'Build Offer', accent: 'gold', disabled: deadlineClosed, onClick: () => setTab('propose') },
          { label: 'Scan Block', accent: 'cyan', onClick: () => navigateTo('/trade-block') },
        ]}
      />

      {tradesLockedByScenario ? (
        <PixelPanel title="Scenario Lock" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="gold">{scenarioState?.activeScenario?.name ?? 'Active Scenario'}</PixelBadge>
              <PixelBadge variant="red">TRADE ACCEPTS BLOCKED</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
              Accepting generated offers, submitting direct proposals, and accepting counters are disabled because the active scenario blocks trade actions. Rejecting stale offers, scanning the block, and building packages for review remain available.
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-faint)', lineHeight: 1.5 }}>
              Source: saved scenarioState.activeScenario.constraints.blockTrades. The store and engine already return before committing blocked trade accepts or proposals.
            </div>
          </div>
        </PixelPanel>
      ) : null}

      <div style={autoGrid(210)}>
        <PixelMetricCard label="Incoming Offers" value={offers.length} accent="cyan" detail="AI packages waiting for your call" />
        <PixelMetricCard label="Active Proposals" value={proposals.length} accent="gold" detail="User-initiated trade conversations" />
        <PixelMetricCard
          label="Trade Window"
          value={deadlineClosed ? 'CLOSED' : 'OPEN'}
          accent={deadlineClosed ? 'red' : 'green'}
          detail={phase === 'regular_season'
            ? `Regular season week ${week} // active deadline Week ${tradeDeadlineWeek}`
            : `Offseason trade market // active deadline Week ${tradeDeadlineWeek}`}
        />
      </div>

      <TradeCenterSourcesPanel
        offerCount={offers.length}
        proposalCount={proposals.length}
        suggestionCount={tradeSuggestions.length}
        targetCount={targets.length}
        userAssetCount={userAssets.length}
        deadlineWeek={tradeDeadlineWeek}
        lockedByScenario={tradesLockedByScenario}
        deadlineClosed={deadlineClosed}
      />

      {actionReceipt ? <TradeCenterActionReceiptPanel receipt={actionReceipt} /> : null}

      {game && userTeam ? (
        <ConditionalPickContextPanel
          conditionalPicks={game.conditionalPicks ?? []}
          players={game.players}
          userTeamId={userTeam.id}
        />
      ) : null}

      <PixelPanel title="League Trade Block" accent="cyan">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>
              League-wide target ticker for teams shopping players now.
            </span>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              Filter by conference or division before building a user-side offer.
            </span>
          </div>
          <PixelButton accent="gold" onClick={() => navigateTo('/trade-block')}>
            <ArrowLeftRight size={14} aria-hidden="true" />
            View League Trade Block
          </PixelButton>
        </div>
      </PixelPanel>

      <TradeFinder suggestions={tradeSuggestions} teamWindows={tradeTeamWindows} onLoadSuggestion={loadSuggestion} />

      <div data-spotlight-target="chip.route.trade-center.beat-1">
        <PixelNav
          activeKey={tab}
          items={[
            { key: 'incoming', label: `Incoming (${offers.length})` },
            { key: 'propose', label: 'Propose Trade' },
          ]}
          onSelect={(value) => setTab(value as typeof tab)}
        />
      </div>

      {tab === 'incoming' ? (
        <div data-spotlight-target="chip.route.trade-center.beat-2">
        <PixelPanel title="Incoming Offers" accent={pendingOffers > 0 ? 'gold' : 'cyan'}>
          {offers.length === 0 ? (
            <CommandCallout
              eyebrow="Incoming Offers"
              title={deadlineClosed ? 'Deadline room is closed' : 'No offers on the desk'}
              body={deadlineClosed
                ? 'Incoming packages are quiet and the regular-season deadline has passed. Review your block, then move the week from the command center.'
                : 'No AI packages are waiting. Build your own offer, scan the league block, or flag veterans so the market has a reason to call.'}
              accent={deadlineClosed ? 'red' : 'cyan'}
              framed={false}
              actions={[
                { label: 'Build Offer', accent: 'gold', disabled: deadlineClosed, onClick: () => setTab('propose') },
                { label: 'Scan Block', accent: 'cyan', onClick: () => navigateTo('/trade-block') },
              ]}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {offers.map((offer) => (
                (() => {
	                  const forecast = buildOfferForecast(offer);

                  return (
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

                      {forecast ? <TradeDecisionForecastPanel forecast={forecast} /> : null}

                      {offer.status === 'pending' ? (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                          <PixelButton
	                            accent="gold"
	                            disabled={pending === `${offer.id}-reject`}
	                            onClick={() => void handleRejectOffer(offer, forecast)}
	                          >
                            Reject
                          </PixelButton>
                          <PixelButton
                            accent="green"
                            disabled={tradesLockedByScenario || pending === `${offer.id}-accept`}
                            onClick={() => {
                              if (tradesLockedByScenario) return;
                              setConfirmTradeId(offer.id);
                            }}
                          >
                            {tradesLockedByScenario ? 'Scenario Locked' : 'Accept'}
                          </PixelButton>
                        </div>
                      ) : null}
                    </div>
                  );
                })()
              ))}
            </div>
          )}
        </PixelPanel>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <PixelPanel title="Step 1 // Trade Partner" accent="cyan">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <PixelSelect
                value={selectedPartnerId}
                onChange={(event) => {
                  setSelectedPartnerId(event.target.value);
                  setOfferingKeys([]);
                  setRequestingKeys([]);
                  setError(null);
                }}
                options={[
                  { value: '', label: 'Select Partner' },
                  ...targets.map((target) => ({ value: target.teamId, label: target.teamName })),
                ]}
                accent="cyan"
                style={{ maxWidth: '320px' }}
              />

              {selectedTarget ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ ...display, fontSize: '20px', color: '#fff', lineHeight: 1 }}>
                    {selectedTarget.teamName.toUpperCase()}
                  </div>
                  <div style={{ ...monoSm, color: '#999', lineHeight: 1.6 }}>
                    Trade block: {selectedTarget.tradeBlock.slice(0, 4).map((player) => player.name).join(', ') || 'No players flagged.'}
                  </div>
                </div>
              ) : (
                <div style={{ ...monoSm, color: '#888' }}>
                  Pick a partner to see their trade block and available picks.
                </div>
              )}
            </div>
          </PixelPanel>

          <div style={autoGrid(320)}>
            <PixelPanel title="Step 2 // You Offer" accent="cyan">
              {userAssets.length === 0 ? (
                <div style={{ ...monoSm, color: '#888' }}>No tradeable assets available.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflow: 'auto' }}>
                  {userAssets.map((asset) => (
                    <AssetPickerRow
                      key={assetKey(asset)}
                      asset={asset}
                      selected={offeringKeys.includes(assetKey(asset))}
                      onToggle={(nextAsset) => toggleAsset(nextAsset, offeringKeys, setOfferingKeys)}
                    />
                  ))}
                </div>
              )}
            </PixelPanel>

            <PixelPanel title="Step 2 // You Request" accent="gold">
              {!selectedTarget ? (
                <div style={{ ...monoSm, color: '#888' }}>Choose a partner first.</div>
              ) : partnerAssets.length === 0 ? (
                <div style={{ ...monoSm, color: '#888' }}>This partner has no trade-block assets exposed right now.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflow: 'auto' }}>
                  {partnerAssets.map((asset) => (
                    <AssetPickerRow
                      key={assetKey(asset)}
                      asset={asset}
                      selected={requestingKeys.includes(assetKey(asset))}
                      onToggle={(nextAsset) => toggleAsset(nextAsset, requestingKeys, setRequestingKeys)}
                    />
                  ))}
                </div>
              )}
            </PixelPanel>
          </div>

          <PixelPanel title="Step 3 // Review & Submit" accent={proposalForecast?.valueAccent ?? 'cyan'}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <PixelProgressBar
                value={fairness}
                accent={proposalForecast?.valueAccent ?? 'cyan'}
                label="Value Comparison"
                valueLabel={proposalForecast?.valueLabel ?? 'Idle'}
              />

              {proposalForecast ? <TradeDecisionForecastPanel forecast={proposalForecast} /> : null}

              <div style={autoGrid(220)}>
                <div>
                  <div style={{ ...pixelSm, color: '#666', marginBottom: '6px' }}>OFFERING</div>
                  <div style={{ ...display, fontSize: '22px', color: '#fff', lineHeight: 1 }}>{offeringValue.toFixed(1)}</div>
                  <div style={{ ...monoSm, color: '#999', marginTop: '6px' }}>
                    {selectedOffering.map((asset) => asset.description).join(' | ') || 'Nothing selected.'}
                  </div>
                </div>
                <div>
                  <div style={{ ...pixelSm, color: '#666', marginBottom: '6px' }}>REQUESTING</div>
                  <div style={{ ...display, fontSize: '22px', color: '#fff', lineHeight: 1 }}>{requestingValue.toFixed(1)}</div>
                  <div style={{ ...monoSm, color: '#999', marginTop: '6px' }}>
                    {selectedRequesting.map((asset) => asset.description).join(' | ') || 'Nothing selected.'}
                  </div>
                </div>
              </div>

              {error ? (
                <div style={{ ...monoSm, color: '#fca5a5' }}>{error}</div>
              ) : null}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                <PixelButton
                  accent="gold"
                  onClick={() => {
                    setOfferingKeys([]);
                    setRequestingKeys([]);
                    setError(null);
                  }}
                >
                  Reset Package
                </PixelButton>
                <PixelButton
                  accent="green"
                  disabled={!selectedTarget || selectedOffering.length === 0 || selectedRequesting.length === 0 || deadlineClosed || tradesLockedByScenario || pending === 'submit-proposal'}
                  onClick={() => {
                    if (tradesLockedByScenario) return;
                    void handleSubmitProposal();
                  }}
                >
                  {tradesLockedByScenario ? 'Scenario Locked' : deadlineClosed ? 'Deadline Closed' : 'Submit Proposal'}
                </PixelButton>
              </div>
            </div>
          </PixelPanel>

          {currentProposal ? (
            <PixelPanel title="AI Response" accent={offerAccent(currentProposal.status)}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ ...display, fontSize: '22px', color: '#fff', lineHeight: 1 }}>
                    {currentProposal.status.toUpperCase()}
                  </div>
                  <PixelBadge variant={offerAccent(currentProposal.status)}>{currentProposal.status}</PixelBadge>
                </div>
                <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.7 }}>
                  {currentProposal.aiResponse}
                </div>

                {currentProposal.counterOffer ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ ...pixelSm, color: '#666' }}>COUNTER PACKAGE</div>
                    <div style={{ ...monoSm, color: '#fff' }}>
                      You send: {currentProposal.counterOffer.offering.map((asset) => asset.description).join(' | ')}
                    </div>
                    <div style={{ ...monoSm, color: '#fff' }}>
                      You receive: {currentProposal.counterOffer.requesting.map((asset) => asset.description).join(' | ')}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
	                      <PixelButton
	                        accent="gold"
	                        disabled={pending === `reject-counter-${currentProposal.id}`}
	                        onClick={() => void handleRejectCounter(currentProposal)}
	                      >
                        Reject Counter
                      </PixelButton>
                      <PixelButton
	                        accent="green"
	                        disabled={deadlineClosed || tradesLockedByScenario || pending === `accept-counter-${currentProposal.id}`}
	                        onClick={() => void handleAcceptCounter(currentProposal)}
	                      >
                        {tradesLockedByScenario ? 'Scenario Locked' : 'Accept Counter'}
                      </PixelButton>
                    </div>
                  </div>
                ) : null}
              </div>
            </PixelPanel>
          ) : null}
        </div>
      )}

      <ConfirmDialog
        open={confirmTradeId !== null}
        title="Accept Trade"
        message="Accept this trade offer? This action will move players and picks between rosters."
        confirmLabel="Accept Trade"
        accent="green"
	        onConfirm={() => {
	          const offer = offers.find((entry) => entry.id === confirmTradeId);
	          if (offer && !tradesLockedByScenario) {
	            void handleAcceptOffer(offer, buildOfferForecast(offer));
	          }
	          setConfirmTradeId(null);
	        }}
        onCancel={() => setConfirmTradeId(null)}
      />
    </div>
  );
}
