import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  PixelBadge, PixelButton, PixelPanel,
} from '@mfd/design-system/components';
import {
  buildFreeAgencyDecisionForecast,
  type ContractOffer,
  type FreeAgencyBid,
  type FreeAgencyDecisionForecast,
  type FranchiseHistoryEntry,
  type GameState,
  type Player,
  type Team,
  type TeamNeedsReport,
} from '@mfd/engine';
import {
  selectFreeAgentPlayers,
  selectOffseasonCalendar,
  selectOffseasonState,
  selectPhase,
  selectRoster,
  selectScenarioState,
  selectUserTeamId,
  type OffseasonCalendarReadModel,
  type OffseasonCalendarStep,
  useGameStore,
} from '../../app/store/game-store';
import {
  CommandCallout,
  PixelMetricCard,
  PixelScreenHeader,
  PlayerNameLink,
  autoGrid,
  display,
  monoSm,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';
import { playSound } from '../audio/AudioManager';
import { buildBidCounterfactual, type BidCounterfactual } from '../../lib/fa-counterfactuals';

interface AgentSummary {
  id: string;
  name: string;
  style: 'hardball' | 'collaborative' | 'media_savvy' | 'old_school';
  demandMultiplier: number;
}

function scaleOffer(base: ContractOffer, multiplier: number): ContractOffer {
  return {
    years: base.years,
    salary: Math.round(base.salary * multiplier * 10) / 10,
    signingBonus: Math.round(base.signingBonus * multiplier * 10) / 10,
    guaranteed: Math.round(base.guaranteed * multiplier * 10) / 10,
  };
}

function agentStyleMultiplier(agent: AgentSummary | null): number {
  if (!agent) return 1;
  if (agent.style === 'hardball') return 1.18 * agent.demandMultiplier;
  if (agent.style === 'collaborative') return 0.95 * agent.demandMultiplier;
  if (agent.style === 'media_savvy') return 1.08 * agent.demandMultiplier;
  return agent.demandMultiplier;
}

function marketOffer(player: Player, multiplier: number): ContractOffer {
  const years = player.age <= 25 ? 4 : player.age <= 29 ? 3 : 2;
  const salary = Math.round(Math.max(1.5, (player.ovr / 8.5) * multiplier) * 10) / 10;
  return {
    years,
    salary,
    signingBonus: Math.round(salary * years * 0.25 * 10) / 10,
    guaranteed: Math.round(salary * Math.min(years, 2) * multiplier * 10) / 10,
  };
}

function boardLabel(phase: string): string {
  return phase === 'free_agency' ? 'Live' : 'Prep';
}

function forecastAccent(status: FreeAgencyDecisionForecast['status']): 'green' | 'cyan' | 'gold' | 'red' | 'default' {
  if (status === 'likely_accept' || status === 'strong_bid' || status === 'immediate_add') return 'green';
  if (status === 'likely_counter' || status === 'competitive_bid') return 'gold';
  if (status === 'blocked' || status === 'likely_decline' || status === 'long_shot') return 'red';
  return 'default';
}

type FreeAgencyReceiptAccent = 'green' | 'cyan' | 'gold' | 'red' | 'default';
type FreeAgencyReceiptAction = 're_sign_offer' | 'open_market_bid' | 'street_sign';

export interface FreeAgencyActionReceipt {
  id: string;
  title: string;
  accent: FreeAgencyReceiptAccent;
  target: string;
  result: string;
  stateTouched: string;
  source: string;
  boundary: string;
}

export interface FreeAgencyBidResolutionRow {
  id: string;
  label: string;
  accent: FreeAgencyReceiptAccent;
  detail: string;
  boundary: string;
  counterfactual: BidCounterfactual | null;
}

export interface FreeAgencyBidResolutionSummary {
  label: string;
  accent: FreeAgencyReceiptAccent;
  detail: string;
  source: string;
  rows: FreeAgencyBidResolutionRow[];
}

function money(value: number): string {
  return `$${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}M`;
}

function offerLabel(offer: ContractOffer): string {
  return `${offer.years}Y / ${money(offer.salary)} salary + ${money(offer.signingBonus)} SB / ${money(offer.guaranteed)} GTD`;
}

function playerDisplayName(player: Player): string {
  const legacyName = typeof (player as { name?: unknown }).name === 'string'
    ? (player as { name: string }).name.trim()
    : '';
  if (legacyName) return legacyName;
  return [player.firstName, player.lastName].filter(Boolean).join(' ').trim() || player.id;
}

function playerReceiptLabel(player: Player): string {
  return `${playerDisplayName(player)} // ${player.pos} // ${player.ovr} OVR`;
}

function scoreLabel(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function forecastReceiptLine(forecast?: FreeAgencyDecisionForecast): string {
  if (!forecast) return 'Forecast unavailable; the existing store/engine action remains the source of truth.';
  return `${forecast.statusLabel} forecast, ${forecast.confidence} confidence. ${forecast.resolution}`;
}

export function buildFreeAgencyBidResolutionSummary(args: {
  bidsByPlayer: Record<string, FreeAgencyBid[]>;
  players: Record<string, Player>;
  teams?: Record<string, Team>;
  userTeamId: string | null;
  currentYear?: number | null;
  teamNeedsByTeam?: Record<string, TeamNeedsReport | undefined>;
  franchiseHistory?: FranchiseHistoryEntry[];
}): FreeAgencyBidResolutionSummary {
  const rows = Object.entries(args.bidsByPlayer).flatMap(([playerId, bids]) => {
    const resolved = bids.filter((bid) => bid.status !== 'pending');
    if (resolved.length === 0) return [];

    const winner = resolved.find((bid) => bid.status === 'won')
      ?? [...resolved].sort((a, b) => b.score - a.score || a.teamId.localeCompare(b.teamId))[0];
    if (!winner) return [];

    const userBid = args.userTeamId ? resolved.find((bid) => bid.teamId === args.userTeamId) : undefined;
    const player = args.players[playerId];
    const playerLabel = player ? playerReceiptLabel(player) : playerId;
    const winningTeam = args.teams?.[winner.teamId];
    const counterfactual = buildBidCounterfactual({
      player,
      playerName: player ? playerDisplayName(player) : playerId,
      bids: resolved,
      winnerBid: winner,
      userBid: userBid ?? null,
      userTeamId: args.userTeamId,
      winningTeam: winningTeam ?? null,
      currentYear: args.currentYear,
      teamNeeds: winningTeam ? args.teamNeedsByTeam?.[winningTeam.id] ?? null : null,
      franchiseHistory: args.franchiseHistory ?? [],
    });
    const userLine = userBid
      ? `User bid ${userBid.status} at ${scoreLabel(userBid.score)} score.`
      : 'No saved user bid in this resolved row.';
    const label = userBid?.status === 'won'
      ? 'User won'
      : userBid?.status === 'lost'
        ? 'Outbid'
        : 'CPU signing';
    const accent: FreeAgencyReceiptAccent = userBid?.status === 'won'
      ? 'green'
      : userBid?.status === 'lost'
        ? 'red'
        : 'cyan';

    return [{
      id: `fa-bid-resolution:${playerId}:${winner.round}:${winner.teamId}`,
      label,
      accent,
      detail: `${playerLabel} // Round ${winner.round}: ${winner.teamId} won at ${scoreLabel(winner.score)} score from ${resolved.length} saved bid(s). ${userLine}`,
      boundary: 'Saved bid-resolution row only; display does not re-score bids, resolve the round, move players, change cap totals, autosave, or reroll outcomes.',
      counterfactual,
    }];
  });

  const userWins = rows.filter((row) => row.label === 'User won').length;
  const userLosses = rows.filter((row) => row.label === 'Outbid').length;
  const label = rows.length === 0
    ? 'No resolved bids'
    : userLosses > 0
      ? 'Market losses saved'
      : userWins > 0
        ? 'User wins saved'
        : 'CPU market results';

  return {
    label,
    accent: userLosses > 0 ? 'red' : userWins > 0 ? 'green' : rows.length > 0 ? 'cyan' : 'default',
    detail: rows.length > 0
      ? `${rows.length} resolved free-agency bid row(s): ${userWins} user win(s), ${userLosses} user loss(es), ${rows.length - userWins - userLosses} CPU-only result(s).`
      : 'No saved won/lost bid rows are available yet. Resolve a free-agency round to create bid result rows.',
    source: 'Source: offseasonState.freeAgencyBids rows after resolveFreeAgencyRound marks bids won/lost. This summary is read-only.',
    rows,
  };
}

function FreeAgencyCounterfactualReceipt({ counterfactual }: { counterfactual: BidCounterfactual }) {
  return (
    <details
      data-fa-counterfactual="why-they-won"
      style={{
        padding: '8px',
        border: '1px solid rgba(244, 211, 94, 0.35)',
        background: 'rgba(244, 211, 94, 0.06)',
      }}
    >
      <summary style={{ ...pixelSm, color: 'var(--mfd-gold)', cursor: 'pointer' }}>
        Why they won
      </summary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
        <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.5 }}>{counterfactual.winnerLine}</div>
        {counterfactual.whyDrivers.map((driver) => (
          <div key={`${driver.label}:${driver.sourceRef}`} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <PixelBadge variant="gold">{driver.label}</PixelBadge>
              <PixelBadge variant="default">{driver.sourceRef}</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{driver.detail}</div>
          </div>
        ))}
        {counterfactual.userComparisonLine ? (
          <div style={{ ...monoSm, color: 'var(--mfd-red)', lineHeight: 1.5 }}>{counterfactual.userComparisonLine}</div>
        ) : null}
        <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)', lineHeight: 1.5 }}>
          Sources: {counterfactual.sourceRefs.join(' | ')}
        </div>
      </div>
    </details>
  );
}

export function buildFreeAgencyActionReceipt(args: {
  action: FreeAgencyReceiptAction;
  player: Player;
  offer: ContractOffer;
  actionLabel: string;
  phase: string;
  round?: number;
  replacingExistingBid?: boolean;
  forecast?: FreeAgencyDecisionForecast;
}): FreeAgencyActionReceipt {
  const accent = args.forecast ? forecastAccent(args.forecast.status) : 'default';
  const target = `${playerReceiptLabel(args.player)} // ${args.actionLabel} // ${offerLabel(args.offer)}`;

  if (args.action === 're_sign_offer') {
    return {
      id: `free-agency:re-sign:${args.player.id}:${args.actionLabel}`,
      title: 'Re-Sign Offer Sent',
      accent,
      target,
      result: `Sent the ${args.actionLabel} offer through the existing negotiation action. ${forecastReceiptLine(args.forecast)}`,
      stateTouched: 'saved offseasonState.reSignDecisions[playerId] response/status/lastOffer/counterOffer, team cap fields when an offer is accepted by the helper, and autosave through commitGame.',
      source: 'actions.negotiateContract -> submitReSignOfferEngine -> negotiateOffer -> commitGame',
      boundary: 'This confirmation does not advance the offseason, resolve free agency, move unsigned players to the market, change negotiation formulas, change cap formulas, play scheduled games, reroll saved outcomes, or save a separate confirmation log.',
    };
  }

  if (args.action === 'open_market_bid') {
    const roundLabel = `Round ${args.round ?? 1}`;
    return {
      id: `free-agency:bid:${args.player.id}:${args.round ?? 1}:${args.actionLabel}`,
      title: args.replacingExistingBid ? 'Open-Market Bid Replaced' : 'Open-Market Bid Stored',
      accent,
      target: `${target} // ${roundLabel}`,
      result: `${args.replacingExistingBid ? 'Replaced' : 'Stored'} the user ${roundLabel} bid; signing still waits for Resolve Round. ${forecastReceiptLine(args.forecast)}`,
      stateTouched: 'saved offseasonState.freeAgencyBids[playerId] for the current user team and round, plus autosave through commitGame.',
      source: 'actions.submitFreeAgentBid -> submitFreeAgentBidEngine -> commitGame',
      boundary: 'This confirmation does not resolve the bid, compare CPU bids, sign the player, advance the calendar, change bid scoring formulas, change cap formulas, play scheduled games, reroll saved outcomes, or save a separate confirmation log.',
    };
  }

  const blocked = args.forecast?.status === 'blocked';
  return {
    id: `free-agency:street:${args.player.id}:${args.actionLabel}`,
    title: blocked ? 'Street Signing Blocked' : 'Street Signing Submitted',
    accent: blocked ? 'red' : accent || 'green',
    target: `${target} // ${args.phase.replace(/_/g, ' ')}`,
    result: blocked
      ? `The existing street-sign gate handled the click without a durable add. ${forecastReceiptLine(args.forecast)}`
      : `Submitted an immediate street signing through the existing store action. ${forecastReceiptLine(args.forecast)}`,
    stateTouched: blocked
      ? 'No durable roster/cap/autosave write is expected when the existing street-sign gate returns without a committed user roster add.'
      : 'saved user roster, player teamId/contract, game.freeAgents, team cap totals, roster archive, free-agent-signed audio cue, and autosave when the existing gate confirms the add.',
    source: 'actions.signStreetFreeAgent -> signStreetFreeAgentEngine -> source-list/roster-limit gates -> commitGame when committed',
    boundary: 'This confirmation does not sign another player, bypass scenario/source-list/roster-limit gates, resolve offseason bids, advance the calendar, change cap formulas, play scheduled games, reroll saved outcomes, or save a separate confirmation log.',
  };
}

function buildForecastItem(
  game: GameState | null | undefined,
  action: string,
  playerId: string,
  offer: ContractOffer,
  mode: Parameters<typeof buildFreeAgencyDecisionForecast>[3],
): { action: string; forecast: FreeAgencyDecisionForecast } | null {
  if (!game) return null;
  return {
    action,
    forecast: buildFreeAgencyDecisionForecast(game, playerId, offer, mode),
  };
}

function FreeAgencySourcesPanel({
  phase,
  expiringCount,
  freeAgentCount,
  round,
  lockedByScenario,
}: {
  phase: string;
  expiringCount: number;
  freeAgentCount: number;
  round: number;
  lockedByScenario: boolean;
}) {
  return (
    <PixelPanel title="Free Agency Sources" accent="cyan">
      <div style={autoGrid(220)}>
        <PixelMetricCard
          label="Re-Sign Rows"
          value={expiringCount}
          accent="gold"
          detail="selectOffseasonState plus selectRoster feed saved reSignDecisions, agent demand, counters, patience, and holdout labels."
        />
        <PixelMetricCard
          label="Market Board"
          value={freeAgentCount}
          accent="cyan"
          detail="selectFreeAgentPlayers, saved game.agents, and route-local marketOffer estimates feed open-market and street rows."
        />
        <PixelMetricCard
          label="Forecast Engine"
          value="buildFreeAgencyDecisionForecast"
          accent="green"
          detail="Forecast rows are read-only previews of re-sign, open-market bid, and street-sign outcomes."
        />
        <PixelMetricCard
          label="Bid Results"
          value="Bid Resolution Summary"
          accent="cyan"
          detail="Reads saved freeAgencyBids won/lost rows after round resolution; it does not resolve or re-score the market."
        />
        <PixelMetricCard
          label="Scenario Gate"
          value={lockedByScenario ? 'Locked' : 'Open'}
          accent={lockedByScenario ? 'red' : 'default'}
          detail="selectScenarioState reads blockFreeAgency; market bids and street signings stay disabled while the lock is active."
        />
        <PixelMetricCard
          label="Commit Buttons"
          value={`${phase} R${round}`}
          accent="gold"
          detail="negotiateContract, submitFreeAgentBid, signStreetFreeAgent, and advanceWeek are the only live write paths on this route."
        />
      </div>
      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7, marginTop: '10px' }}>
        Opening /free-agency, viewing forecasts, navigating to the target board, and reading market estimates do not write bids,
        sign players, resolve rounds, change cap totals, change saves, play scheduled games, reroll saved outcomes, or move players.
      </div>
    </PixelPanel>
  );
}

function FreeAgencyBidResolutionPanel({ summary }: { summary: FreeAgencyBidResolutionSummary }) {
  return (
    <PixelPanel title="Bid Resolution Summary" accent={summary.accent}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant={summary.accent}>{summary.label}</PixelBadge>
          <PixelBadge variant="cyan">Saved freeAgencyBids</PixelBadge>
          <PixelBadge variant="default">Read-only</PixelBadge>
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.5 }}>{summary.detail}</div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{summary.source}</div>
        {summary.rows.length > 0 ? (
          <div style={autoGrid(260)}>
            {summary.rows.slice(0, 6).map((row) => (
              <div
                key={row.id}
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
                <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)', lineHeight: 1.5 }}>{row.boundary}</div>
                {row.counterfactual ? <FreeAgencyCounterfactualReceipt counterfactual={row.counterfactual} /> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </PixelPanel>
  );
}

function calendarStepAccent(status: OffseasonCalendarStep['status']): 'green' | 'cyan' | 'gold' | 'red' | 'default' {
  if (status === 'complete') return 'green';
  if (status === 'active') return 'gold';
  if (status === 'blocked') return 'red';
  if (status === 'upcoming') return 'cyan';
  return 'default';
}

function OffseasonCalendarPanel({ calendar }: { calendar: OffseasonCalendarReadModel }) {
  if (!calendar.visible) return null;

  return (
    <PixelPanel title="Offseason Calendar" accent={calendar.blocked ? 'red' : 'gold'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant="cyan">selectOffseasonCalendar</PixelBadge>
          <PixelBadge variant="gold">Saved phase/round</PixelBadge>
          <PixelBadge variant="default">Shared read model</PixelBadge>
        </div>
        <div style={{ ...pixelSm, color: calendar.blocked ? 'var(--mfd-red)' : 'var(--mfd-gold)' }}>
          {calendar.headline.toUpperCase()}
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
          {calendar.summary}
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
          This route mirrors the same selector used by Week Advance. Opening /free-agency and reading this panel do
          not click Advance Week, resolve bids, generate draft state, move players, change saves, reroll saved outcomes, or play scheduled games.
        </div>
        <div style={autoGrid(210)}>
          {calendar.steps.map((step) => (
            <div
              key={step.id}
              data-offseason-calendar-step={step.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                minHeight: '150px',
                padding: '10px',
                border: `2px solid ${step.id === calendar.activeStepId ? 'var(--mfd-gold)' : 'var(--mfd-border)'}`,
                background: 'var(--mfd-bg-3)',
              }}
            >
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ ...pixelSm, color: 'var(--mfd-text)' }}>{step.label}</div>
                <PixelBadge variant={calendarStepAccent(step.status)}>{step.status}</PixelBadge>
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                {step.detail}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PixelPanel>
  );
}

function DecisionForecastList({
  items,
}: {
  items: Array<{ action: string; forecast: FreeAgencyDecisionForecast } | null>;
}) {
  const forecasts = items.filter((item): item is { action: string; forecast: FreeAgencyDecisionForecast } => item !== null);
  if (forecasts.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      padding: '10px',
      border: '2px solid rgba(244, 211, 94, 0.3)',
      background: 'rgba(244, 211, 94, 0.06)',
    }}>
      <div style={{ ...monoSm, color: '#f4d35e', textTransform: 'uppercase' }}>Decision Forecast</div>
      {forecasts.map(({ action, forecast }) => (
        <div key={action} style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '6px', borderTop: '1px solid rgba(244, 211, 94, 0.18)' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <PixelBadge variant="default">{action}</PixelBadge>
            <PixelBadge variant={forecastAccent(forecast.status)}>{forecast.statusLabel}</PixelBadge>
            <PixelBadge variant="cyan">{forecast.confidence} confidence</PixelBadge>
          </div>
          <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.5 }}>{forecast.immediateImpact}</div>
          <div style={{ display: 'grid', gap: '6px' }}>
            <div style={{ ...monoSm, color: '#aaa', lineHeight: 1.5 }}>
              <PixelBadge variant="cyan">Season</PixelBadge> {forecast.seasonImpact}
            </div>
            <div style={{ ...monoSm, color: '#f4d35e', lineHeight: 1.5 }}>
              <PixelBadge variant="gold">Future</PixelBadge> {forecast.futureRisk}
            </div>
            <div style={{ ...monoSm, color: '#aaa', lineHeight: 1.5 }}>
              <PixelBadge variant="default">Resolution</PixelBadge> {forecast.resolution}
            </div>
          </div>
          {forecast.warnings.length > 0 ? (
            <div style={{ ...monoSm, color: '#f4a261', lineHeight: 1.5 }}>
              {forecast.warnings.join(' ')}
            </div>
          ) : null}
          <div style={{ ...monoSm, color: '#777', lineHeight: 1.5 }}>Source: {forecast.source}</div>
        </div>
      ))}
    </div>
  );
}

export function FreeAgencyActionReceiptPanel({ receipt }: { receipt: FreeAgencyActionReceipt }) {
  return (
    <PixelPanel title="Free Agency Action Receipt" accent={receipt.accent}>
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

export function FreeAgencyHub() {
  const navigate = useNavigate();
  const game = useGameStore((state) => state.game);
  const phase = useGameStore(selectPhase);
  const roster = useGameStore(selectRoster);
  const offseasonState = useGameStore(selectOffseasonState);
  const freeAgents = useGameStore(selectFreeAgentPlayers);
  const scenarioState = useGameStore(selectScenarioState);
  const userTeamId = useGameStore(selectUserTeamId);
  const offseasonCalendar = useGameStore(selectOffseasonCalendar);
  const agents = useGameStore((state) => state.game?.agents ?? []);
  const { advanceWeek, submitFreeAgentBid, signStreetFreeAgent, negotiateContract } = useGameStore((s) => s.actions);
  const [pending, setPending] = useState<string | null>(null);
  const [actionReceipt, setActionReceipt] = useState<FreeAgencyActionReceipt | null>(null);
  const agentById = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);
  const bidResolutionSummary = useMemo(() => buildFreeAgencyBidResolutionSummary({
    bidsByPlayer: offseasonState?.freeAgencyBids ?? {},
    players: game?.players ?? {},
    teams: game?.teams ?? {},
    userTeamId: userTeamId ?? null,
    currentYear: game?.year ?? null,
    teamNeedsByTeam: game?.teamNeedsCache ?? {},
    franchiseHistory: game?.franchiseHistory ?? [],
  }), [game?.franchiseHistory, game?.players, game?.teamNeedsCache, game?.teams, game?.year, offseasonState?.freeAgencyBids, userTeamId]);

  const expiringPlayers = useMemo(() => {
    if (!offseasonState) return [];
    const ids = new Set(offseasonState.expiringPlayerIds);
    return roster.filter((player) => ids.has(player.id));
  }, [offseasonState, roster]);

  const handleOffer = async (key: string, run: () => Promise<void>) => {
    setPending(key);
    try {
      await run();
    } finally {
      setPending(null);
    }
  };

  const freeAgencyRound = offseasonState?.round ?? 1;
  const freeAgencyLockedByScenario = Boolean(scenarioState?.activeScenario?.constraints.blockFreeAgency);

  const handleReSignOffer = async (
    key: string,
    player: Player,
    actionLabel: string,
    offer: ContractOffer,
    forecast?: FreeAgencyDecisionForecast,
  ) => {
    await handleOffer(key, async () => {
      await negotiateContract(player.id, offer);
      setActionReceipt(buildFreeAgencyActionReceipt({
        action: 're_sign_offer',
        player,
        offer,
        actionLabel,
        phase,
        round: freeAgencyRound,
        forecast,
      }));
    });
  };

  const handleMarketBid = async (
    key: string,
    player: Player,
    actionLabel: string,
    offer: ContractOffer,
    replacingExistingBid: boolean,
    forecast?: FreeAgencyDecisionForecast,
  ) => {
    await handleOffer(key, async () => {
      if (freeAgencyLockedByScenario) return;
      await submitFreeAgentBid(player.id, offer);
      setActionReceipt(buildFreeAgencyActionReceipt({
        action: 'open_market_bid',
        player,
        offer,
        actionLabel,
        phase,
        round: freeAgencyRound,
        replacingExistingBid,
        forecast,
      }));
    });
  };

  const handleStreetSign = async (
    key: string,
    player: Player,
    actionLabel: string,
    offer: ContractOffer,
    forecast?: FreeAgencyDecisionForecast,
  ) => {
    await handleOffer(key, async () => {
      if (freeAgencyLockedByScenario) return;
      await signStreetFreeAgent(player.id, offer);
      setActionReceipt(buildFreeAgencyActionReceipt({
        action: 'street_sign',
        player,
        offer,
        actionLabel,
        phase,
        round: freeAgencyRound,
        forecast,
      }));
    });
  };

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Free Agency Hub"
        subtitle={phase === 'offseason' ? 'Re-sign your expiring core before they walk.' : `Round ${freeAgencyRound} of 3`}
        badges={(
          <>
            <PixelBadge variant={phase === 'offseason' ? 'gold' : 'cyan'}>{phase.replace(/_/g, ' ')}</PixelBadge>
            <PixelBadge variant="green">Round {freeAgencyRound}</PixelBadge>
            {freeAgencyLockedByScenario ? <PixelBadge variant="red">MARKET LOCKED</PixelBadge> : null}
          </>
        )}
      />

      <div style={autoGrid(210)}>
        <PixelMetricCard label="Expiring Deals" value={expiringPlayers.length} accent="gold" detail="Players up for renewal" />
        <PixelMetricCard label="Open Market" value={freeAgents.length} accent="cyan" detail="Unsigned players available" />
        <PixelMetricCard label="Round" value={freeAgencyRound} accent="green" detail="Current market cycle" />
        <PixelMetricCard label="Target Board" value={boardLabel(phase)} accent="gold" detail="Use the FA targets route for watchlist intel" />
      </div>

      <FreeAgencySourcesPanel
        phase={phase}
        expiringCount={expiringPlayers.length}
        freeAgentCount={freeAgents.length}
        round={freeAgencyRound}
        lockedByScenario={freeAgencyLockedByScenario}
      />

      <OffseasonCalendarPanel calendar={offseasonCalendar} />

      <FreeAgencyBidResolutionPanel summary={bidResolutionSummary} />

      {actionReceipt ? <FreeAgencyActionReceiptPanel receipt={actionReceipt} /> : null}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <PixelButton accent="cyan" onClick={() => { void navigate({ to: '/fa-targets' }); }}>
          Open FA Target Board
        </PixelButton>
      </div>

      {freeAgencyLockedByScenario ? (
        <PixelPanel title="Scenario Lock" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="gold">{scenarioState?.activeScenario?.name ?? 'Active Scenario'}</PixelBadge>
              <PixelBadge variant="red">FREE-AGENT ADDS BLOCKED</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
              Open-market bids and street signings are disabled here because the active scenario blocks external free-agent acquisitions. In-house re-sign negotiation and market advancement remain available.
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-faint)', lineHeight: 1.5 }}>
              Source: saved scenarioState.activeScenario.constraints.blockFreeAgency. The store actions already return without committing blocked market bids or street signings.
            </div>
          </div>
        </PixelPanel>
      ) : null}

      {expiringPlayers.length === 0 && freeAgents.length === 0 ? (
        <CommandCallout
          eyebrow="Market Read"
          title={phase === 'regular_season' ? 'Street market is quiet' : 'No free agents on the board'}
          body={phase === 'regular_season'
            ? 'No unsigned players are clear this week. Use the target board to stage names before the next market window, or check team needs before spending cap.'
            : 'The board is empty right now. Keep your cap plan warm and use the target board to mark fits before the next cycle opens.'}
          accent="cyan"
          actions={[
            { label: 'Target Board', accent: 'cyan', onClick: () => { void navigate({ to: '/fa-targets' }); } },
            { label: 'Team Needs', accent: 'gold', onClick: () => { void navigate({ to: '/team-needs' }); } },
          ]}
        />
      ) : null}

      {phase === 'offseason' ? (
        <PixelPanel title="Re-Sign Window" accent="gold">
          {expiringPlayers.length === 0 ? (
            <CommandCallout
              eyebrow="Re-Sign Window"
              title="No in-house deadlines"
              body="Your own expiring list is clean. Keep the cap sheet ready and use the target board to avoid panic spending when the market opens."
              accent="gold"
              framed={false}
              actions={[
                { label: 'Cap Sheet', accent: 'cyan', onClick: () => { void navigate({ to: '/contracts' }); } },
                { label: 'Target Board', accent: 'gold', onClick: () => { void navigate({ to: '/fa-targets' }); } },
              ]}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {expiringPlayers.map((player) => {
                const decision = offseasonState?.reSignDecisions[player.id];
                if (!decision) return null;
                const valueOffer = scaleOffer(decision.agentDemand, 0.88);
                const matchOffer = decision.agentDemand;
                const valueForecast = buildForecastItem(game, 'Open at 88%', player.id, valueOffer, 're_sign');
                const matchForecast = buildForecastItem(game, 'Meet Demand', player.id, matchOffer, 're_sign');
                const counterForecast = decision.counterOffer ? buildForecastItem(game, 'Accept Counter', player.id, decision.counterOffer, 're_sign') : null;

                return (
                  <div key={player.id} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '10px',
                    border: '3px solid var(--mfd-gold)',
                    background: 'var(--mfd-bg-3)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ ...display, fontSize: '22px', color: '#fff', lineHeight: 1 }}>
                          <PlayerNameLink
                            playerId={player.id}
                            name={playerDisplayName(player).toUpperCase()}
                            ovr={player.ovr}
                            style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '22px', lineHeight: 1 }}
                          />
                        </div>
                        <div style={{ ...monoSm, color: '#888', marginTop: '6px' }}>
                          {player.pos} // {player.ovr} OVR
                        </div>
                        <div style={{ ...monoSm, color: '#bbb', marginTop: '6px' }}>
                          Agent demand: {decision.agentDemand.years}Y / ${decision.agentDemand.salary}M + ${decision.agentDemand.signingBonus}M SB
                        </div>
                        <div style={{ ...monoSm, color: '#888', marginTop: '6px' }}>
                          Agent: {(player.agentId ? agentById.get(player.agentId)?.name : null) ?? 'Unassigned'} // {(player.agentId ? agentById.get(player.agentId)?.style : 'old_school')?.replaceAll('_', ' ')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <PixelBadge variant={decision.status === 'accepted' ? 'green' : decision.status === 'countered' ? 'gold' : decision.status === 'declined' ? 'red' : 'default'}>
                          {decision.status}
                        </PixelBadge>
                        {player.holdout ? <PixelBadge variant="red">Holdout</PixelBadge> : null}
                        {decision.patienceWeeksRemaining > 0 ? (
                          <PixelBadge variant="cyan">{`${decision.patienceWeeksRemaining}w patience`}</PixelBadge>
                        ) : null}
                        {decision.lastOffer ? (
                          <PixelBadge variant="cyan">
                            {decision.lastOffer.years}Y / ${decision.lastOffer.salary}M
                          </PixelBadge>
                        ) : null}
                      </div>
                    </div>

                    {decision.agentResponse ? (
                      <div style={{
                        padding: '10px',
                        border: '2px solid rgba(0, 229, 255, 0.28)',
                        background: 'rgba(0, 229, 255, 0.06)',
                        ...monoSm,
                        color: '#cfefff',
                        lineHeight: 1.6,
                      }}
                      >
                        {decision.agentResponse}
                      </div>
                    ) : null}

                    {decision.counterOffer ? (
                      <div style={{ ...monoSm, color: '#f4d35e' }}>
                        Counter: {decision.counterOffer.years}Y / ${decision.counterOffer.salary}M + ${decision.counterOffer.signingBonus}M SB
                      </div>
                    ) : null}

                    <DecisionForecastList
                      items={[
                        valueForecast,
                        matchForecast,
                        counterForecast,
                      ]}
                    />

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <PixelButton
                        accent="cyan"
                        disabled={pending === `${player.id}-value`}
                        onClick={() => void handleReSignOffer(`${player.id}-value`, player, 'Open at 88%', valueOffer, valueForecast?.forecast)}
                      >
                        Open at 88%
                      </PixelButton>
                      <PixelButton
                        accent="gold"
                        disabled={pending === `${player.id}-match`}
                        onClick={() => void handleReSignOffer(`${player.id}-match`, player, 'Meet Demand', matchOffer, matchForecast?.forecast)}
                      >
                        Meet Demand
                      </PixelButton>
                      {decision.counterOffer ? (
                        <PixelButton
                          accent="green"
                          disabled={pending === `${player.id}-counter`}
                          onClick={() => void handleReSignOffer(`${player.id}-counter`, player, 'Accept Counter', decision.counterOffer!, counterForecast?.forecast)}
                        >
                          Accept Counter
                        </PixelButton>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <PixelButton
              accent="green"
              disabled={pending === 'advance-offseason'}
              onClick={() => void handleOffer('advance-offseason', async () => {
                playSound('week_advance_start', { debounceMs: 0, debounceKey: `free-agency:${phase}:market` });
                await advanceWeek();
              })}
            >
              Advance To Market
            </PixelButton>
          </div>
        </PixelPanel>
      ) : null}

      {phase === 'free_agency' ? (
        <PixelPanel title="Open Market" accent="cyan">
          {freeAgents.length === 0 ? (
            <CommandCallout
              eyebrow="Open Market"
              title="Round is picked clean"
              body="No unsigned players remain in this round. Resolve the market or pivot to trades and waiver depth before the next roster squeeze."
              accent="cyan"
              framed={false}
              actions={[
                { label: `Resolve R${freeAgencyRound}`, accent: 'green', disabled: pending === 'resolve-fa', onClick: () => void handleOffer('resolve-fa', async () => { await advanceWeek(); }) },
                { label: 'Waivers', accent: 'gold', onClick: () => { void navigate({ to: '/waivers' }); } },
              ]}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {freeAgents.slice(0, 18).map((player) => {
                const currentBid = offseasonState?.freeAgencyBids[player.id]?.find((bid) => bid.teamId === userTeamId && bid.round === freeAgencyRound);
                const agent = player.agentId ? agentById.get(player.agentId) as AgentSummary | undefined : undefined;
                const demand = marketOffer(player, agentStyleMultiplier(agent ?? null));
                const marketBid = scaleOffer(demand, 0.95);
                const aggressiveBid = scaleOffer(demand, 1.08);
                const marketForecast = buildForecastItem(game, 'Market', player.id, marketBid, 'open_market_bid');
                const aggressiveForecast = buildForecastItem(game, 'Aggressive', player.id, aggressiveBid, 'open_market_bid');
                return (
                  <div key={player.id} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '10px',
                    border: '3px solid var(--mfd-cyan)',
                    background: 'var(--mfd-bg-3)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ ...display, fontSize: '22px', color: '#fff', lineHeight: 1 }}>
                          <PlayerNameLink
                            playerId={player.id}
                            name={playerDisplayName(player).toUpperCase()}
                            ovr={player.ovr}
                            style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '22px', lineHeight: 1 }}
                          />
                        </div>
                        <div style={{ ...monoSm, color: '#888', marginTop: '6px' }}>
                          {player.pos} // {player.ovr} OVR // Age {player.age}
                        </div>
                        <div style={{ ...monoSm, color: '#bbb', marginTop: '6px' }}>
                          {agent?.name ?? 'Market rep'} // {agent?.style.replaceAll('_', ' ') ?? 'open market'} // Demand {demand.years}Y / ${demand.salary}M
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <PixelBadge variant={currentBid ? 'cyan' : 'default'}>
                          {currentBid ? 'Bid Placed' : 'Open'}
                        </PixelBadge>
                        {currentBid ? <PixelBadge variant="gold">{currentBid.years}Y / ${currentBid.salary}M</PixelBadge> : null}
                      </div>
                    </div>

                    <DecisionForecastList
                      items={[
                        marketForecast,
                        aggressiveForecast,
                      ]}
                    />

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <PixelButton
                        accent="cyan"
                        disabled={freeAgencyLockedByScenario || pending === `${player.id}-market`}
                        onClick={() => void handleMarketBid(`${player.id}-market`, player, 'Market', marketBid, Boolean(currentBid), marketForecast?.forecast)}
                      >
                        {freeAgencyLockedByScenario ? 'Scenario Locked' : 'Market'}
                      </PixelButton>
                      <PixelButton
                        accent="gold"
                        disabled={freeAgencyLockedByScenario || pending === `${player.id}-aggressive`}
                        onClick={() => void handleMarketBid(`${player.id}-aggressive`, player, 'Aggressive', aggressiveBid, Boolean(currentBid), aggressiveForecast?.forecast)}
                      >
                        {freeAgencyLockedByScenario ? 'Scenario Locked' : 'Aggressive'}
                      </PixelButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <PixelButton
              accent="green"
              disabled={pending === 'resolve-fa'}
              onClick={() => void handleOffer('resolve-fa', async () => {
                playSound('week_advance_start', { debounceMs: 0, debounceKey: `free-agency:${phase}:resolve` });
                await advanceWeek();
              })}
            >
              Resolve Round {freeAgencyRound}
            </PixelButton>
          </div>
        </PixelPanel>
      ) : null}

      {phase !== 'offseason' && phase !== 'free_agency' ? (
        <PixelPanel title="Street Free Agents" accent="cyan">
          {freeAgents.length === 0 ? (
            <CommandCallout
              eyebrow="Street Free Agents"
              title="No emergency signings"
              body="The street list is empty. If a room feels thin, scan team needs, prep waiver claims, or build a trade offer before advancing."
              accent="cyan"
              framed={false}
              actions={[
                { label: 'Team Needs', accent: 'gold', onClick: () => { void navigate({ to: '/team-needs' }); } },
                { label: 'Waiver Wire', accent: 'cyan', onClick: () => { void navigate({ to: '/waivers' }); } },
              ]}
            />
          ) : (
            <>
              <div style={{ ...monoSm, color: '#bbb', marginBottom: '12px' }}>
                Sign available free agents directly to your roster. No bidding — immediate signings.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {freeAgents
                  .sort((a, b) => b.ovr - a.ovr)
                  .slice(0, 20)
                  .map((player) => {
                    const demand = marketOffer(player, 1);
                    const overpayOffer = scaleOffer(demand, 1.15);
                    const signForecast = buildForecastItem(game, 'Sign', player.id, demand, 'street_sign');
                    const overpayForecast = buildForecastItem(game, 'Overpay', player.id, overpayOffer, 'street_sign');
                    return (
                      <div key={player.id} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        padding: '10px',
                        border: '3px solid var(--mfd-border)',
                        background: 'var(--mfd-bg-3)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: '180px' }}>
                            <div style={{ ...display, fontSize: '18px', color: '#fff', lineHeight: 1 }}>
                              <PlayerNameLink
                                playerId={player.id}
                                name={playerDisplayName(player).toUpperCase()}
                                ovr={player.ovr}
                                style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '18px', lineHeight: 1 }}
                              />
                            </div>
                            <div style={{ ...monoSm, color: '#888', marginTop: '4px' }}>
                              {player.pos} // {player.ovr} OVR // Age {player.age}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <PixelBadge variant="default">{demand.years}Y / ${demand.salary}M</PixelBadge>
                            <PixelButton
                              accent="cyan"
                              disabled={freeAgencyLockedByScenario || pending === `${player.id}-street`}
                              onClick={() => void handleStreetSign(`${player.id}-street`, player, 'Sign', demand, signForecast?.forecast)}
                            >
                              {freeAgencyLockedByScenario ? 'Scenario Locked' : 'Sign'}
                            </PixelButton>
                            <PixelButton
                              accent="gold"
                              disabled={freeAgencyLockedByScenario || pending === `${player.id}-street-overpay`}
                              onClick={() => void handleStreetSign(`${player.id}-street-overpay`, player, 'Overpay', overpayOffer, overpayForecast?.forecast)}
                            >
                              {freeAgencyLockedByScenario ? 'Scenario Locked' : 'Overpay'}
                            </PixelButton>
                          </div>
                        </div>
                        <DecisionForecastList
                          items={[
                            signForecast,
                            overpayForecast,
                          ]}
                        />
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </PixelPanel>
      ) : null}
    </div>
  );
}
