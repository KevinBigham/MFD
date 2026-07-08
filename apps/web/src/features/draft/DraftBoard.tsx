import { useEffect, useMemo, useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel, PixelProgressBar, PixelSelect } from '@mfd/design-system/components';
import { calcPickValue, getActiveRule, getAgmDialogueLine, LEAGUE_RULE_DEFAULTS, mulberry32 } from '@mfd/engine';
import type { DraftOrderEntry, DraftProspect, DraftTradeOffer, ProspectScoutingState, TradeOfferAsset } from '@mfd/engine';
import {
  selectCurrentDraftEntry,
  selectDraftClass,
  selectDraftRecaps,
  selectLeagueRules,
  selectOffseasonState,
  selectPhase,
  selectScenarioState,
  selectUserTeam,
  selectUserTeamNeeds,
  selectWarRoomState,
  selectYear,
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
import { playSound } from '../audio/AudioManager';
import { DraftPickReveal } from './DraftPickReveal';

function needAccent(matchesNeed: boolean): 'gold' | 'default' {
  return matchesNeed ? 'gold' : 'default';
}

function offerSummary(assets: Array<{ description: string }>): string {
  return assets.map((asset) => asset.description).join(' + ');
}

export interface DraftPickForecast {
  label: string;
  accent: 'green' | 'gold' | 'cyan' | 'red' | 'default';
  boardFit: string;
  needFit: string;
  scoutConfidence: string;
  riskRead: string;
  source: string;
  warnings: string[];
}

export interface DraftPickReceipt {
  id: string;
  title: string;
  accent: DraftPickForecast['accent'];
  target: string;
  result: string;
  stateTouched: string;
  source: string;
  boundary: string;
  warnings: string[];
}

type DraftOfferConfidenceAccent = 'green' | 'gold' | 'cyan' | 'red' | 'default';

export interface DraftOfferConfidence {
  label: string;
  accent: DraftOfferConfidenceAccent;
  chartSummary: string;
  leverageRead: string;
  source: string;
  warnings: string[];
}

export interface DraftMarketReceipt {
  label: string;
  accent: DraftOfferConfidenceAccent;
  detail: string;
  boundary: string;
}

export interface DraftClosureCta {
  status: 'needs-recap' | 'recap-ready';
  accent: 'gold' | 'green';
  title: string;
  detail: string;
  source: string;
  action: 'finalize' | 'review';
  actionLabel: string;
}

interface OfferAssetChartRead {
  value: number;
  estimatedFuture: boolean;
}

function assetChartRead(asset: TradeOfferAsset): OfferAssetChartRead | null {
  if (asset.type !== 'pick') return null;

  const roundPick = asset.description.match(/round\s+(\d+),\s*pick\s+(\d+)/i);
  if (roundPick) {
    return {
      value: calcPickValue({ round: Number(roundPick[1]), pick: Number(roundPick[2]) }),
      estimatedFuture: false,
    };
  }

  const futureRound = asset.description.match(/future\s+round\s+(\d+)/i);
  if (futureRound) {
    return {
      value: calcPickValue({ round: Number(futureRound[1]), pick: 32 }),
      estimatedFuture: true,
    };
  }

  const parts = asset.pickId?.split('-') ?? [];
  const round = Number(parts[parts.length - 3]);
  const pick = Number(parts[parts.length - 2]);
  if (Number.isFinite(round) && Number.isFinite(pick)) {
    return { value: calcPickValue({ round, pick }), estimatedFuture: false };
  }

  return null;
}

function summarizeOfferAssets(assets: TradeOfferAsset[]): { value: number; priced: number; unpriced: number; estimatedFuture: number } {
  return assets.reduce((summary, asset) => {
    const read = assetChartRead(asset);
    if (!read) {
      return { ...summary, unpriced: summary.unpriced + 1 };
    }
    return {
      value: summary.value + read.value,
      priced: summary.priced + 1,
      unpriced: summary.unpriced,
      estimatedFuture: summary.estimatedFuture + (read.estimatedFuture ? 1 : 0),
    };
  }, { value: 0, priced: 0, unpriced: 0, estimatedFuture: 0 });
}

export function buildDraftClosureCta(args: {
  phase: string;
  year: number;
  currentYearRecapSaved: boolean;
}): DraftClosureCta | null {
  if (args.phase !== 'post_draft') return null;

  if (args.currentYearRecapSaved) {
    return {
      status: 'recap-ready',
      accent: 'green',
      title: 'Current-year draft recap is saved.',
      detail: `The ${args.year} class recap is archived. Review class grade, best value, reaches, steals, and league highlights before camp work takes over.`,
      source: 'Source: selectDraftRecaps found a saved recap for the current year; this panel only routes to /draft-recap.',
      action: 'review',
      actionLabel: 'Review Draft Recap',
    };
  }

  return {
    status: 'needs-recap',
    accent: 'gold',
    title: 'Draft board is complete.',
    detail: 'Advance Week runs the existing post-draft finalization path, archives the class recap through finalizePostDraft, and then sends you to the recap room.',
    source: 'Source: phase post_draft plus no current-year selectDraftRecaps row; this panel does not generate or repair recaps during render.',
    action: 'finalize',
    actionLabel: 'Finalize Recap',
  };
}

export function buildDraftOfferConfidence(
  offer: DraftTradeOffer,
  context: {
    currentEntry: DraftOrderEntry | null;
    criticalNeeds: string[];
    topProspect: DraftProspect | null;
  },
): DraftOfferConfidence {
  const offered = summarizeOfferAssets(offer.offer.offering);
  const requested = summarizeOfferAssets(offer.offer.requesting);
  const delta = offered.value - requested.value;
  const topNeedFit = Boolean(context.topProspect && context.criticalNeeds.includes(context.topProspect.pos));
  const targetMatchesClock = !context.currentEntry || offer.targetPick === context.currentEntry.overall;
  const warnings: string[] = [];
  let label = 'Needs context';
  let accent: DraftOfferConfidenceAccent = 'gold';

  if (requested.priced > 0 && offered.priced > 0) {
    if (delta >= 75 || (offer.urgency === 'desperate' && delta >= 0)) {
      label = 'Leverage-positive';
      accent = 'green';
    } else if (topNeedFit && delta < 75) {
      label = 'Hold leverage';
      accent = 'gold';
    } else if (delta >= -50) {
      label = 'Balanced discussion';
      accent = 'cyan';
    } else {
      label = 'Thin return';
      accent = 'red';
    }
  }

  if (offered.estimatedFuture > 0) {
    warnings.push(`${offered.estimatedFuture} future pick value uses a final-pick chart estimate.`);
  }
  if (offered.unpriced + requested.unpriced > 0) {
    warnings.push(`${offered.unpriced + requested.unpriced} non-pick or conditional asset is unpriced in this display read.`);
  }
  if (topNeedFit) {
    warnings.push(`Top visible prospect ${context.topProspect?.pos} matches a critical need.`);
  }
  if (!targetMatchesClock) {
    warnings.push('Offer target does not match the current pick context.');
  }

  const deltaLabel = delta === 0 ? 'even' : `${delta > 0 ? '+' : ''}${Math.round(delta)}`;
  const urgencyRead = offer.urgency === 'desperate'
    ? 'desperate urgency gives you deadline leverage'
    : offer.urgency === 'interested'
      ? 'interested urgency keeps both accept and reject live'
      : 'casual urgency lowers pressure to move';

  return {
    label,
    accent,
    chartSummary: requested.priced > 0 || offered.priced > 0
      ? `Offer chart ${deltaLabel}: offered ${Math.round(offered.value)} vs asking ${Math.round(requested.value)}.`
      : 'No draft-pick chart value was readable from this offer.',
    leverageRead: topNeedFit
      ? `${urgencyRead}; holding also protects a top-board need fit.`
      : `${urgencyRead}; compare the haul to your board before committing.`,
    source: 'Source: selectWarRoomState incomingOffers + calcPickValue pick-chart display read; accept/reject still commit only through acceptDraftTradeOffer/rejectDraftTradeOffer.',
    warnings,
  };
}

export function buildDraftMarketReceipt(offer: DraftTradeOffer, confidence: DraftOfferConfidence): DraftMarketReceipt {
  const offered = offerSummary(offer.offer.offering) || 'no listed assets';
  const requested = offerSummary(offer.offer.requesting) || 'no listed target';
  const urgencyRead = offer.urgency === 'desperate'
    ? 'Urgent jump'
    : offer.urgency === 'interested'
      ? 'Board jump'
      : 'Market probe';
  const label = confidence.accent === 'green'
    ? 'Leverage window'
    : urgencyRead;

  return {
    label,
    accent: confidence.accent,
    detail: `${offer.from} wants pick #${offer.targetPick}: ${offer.reasoning} They offer ${offered} for ${requested}. ${confidence.label}: ${confidence.chartSummary}`,
    boundary: 'Read-only until Accept or Reject. Movement, draft-order updates, autosave, and war-room refresh stay with acceptDraftTradeOffer/rejectDraftTradeOffer.',
  };
}

export function buildDraftPickForecast(
  prospect: DraftProspect,
  context: {
    currentEntry: DraftOrderEntry | null;
    scouting?: ProspectScoutingState;
    criticalNeeds: string[];
  },
): DraftPickForecast {
  const selectedRound = context.currentEntry?.round ?? prospect.projectedRound;
  const confidence = Number(context.scouting?.confidence ?? Math.round((context.scouting?.accuracy ?? 0) * 100));
  const isNeedFit = context.criticalNeeds.includes(prospect.pos);
  const actions = context.scouting?.actions ?? [];
  const warnings: string[] = [];
  let label: DraftPickForecast['label'] = 'Board-aligned';
  let accent: DraftPickForecast['accent'] = isNeedFit ? 'green' : 'cyan';
  let boardFit = `Projected Round ${prospect.projectedRound}; current Round ${selectedRound}.`;

  if (prospect.projectedRound > selectedRound) {
    label = 'Reach alert';
    accent = isNeedFit ? 'gold' : 'red';
    boardFit = `Projected Round ${prospect.projectedRound}; taking him in Round ${selectedRound} is a traits bet.`;
    warnings.push('Projected later than the current pick.');
  } else if (prospect.projectedRound < selectedRound) {
    label = 'Value pocket';
    accent = 'green';
    boardFit = `Projected Round ${prospect.projectedRound}; still available in Round ${selectedRound}.`;
  }

  if (!context.scouting || actions.length === 0) {
    warnings.push('No saved scouting action for this prospect yet.');
  }
  if (confidence < 45) {
    warnings.push('Low confidence grade.');
  }

  return {
    label,
    accent,
    boardFit,
    needFit: isNeedFit ? `${prospect.pos} matches a critical need.` : `${prospect.pos} is board value, not a critical need.`,
    scoutConfidence: context.scouting
      ? `${confidence}% confidence from saved scouting intel.`
      : 'Unverified board grade from the prospect scout-grade fallback.',
    riskRead: `Risk ${context.scouting?.riskBand ?? 'unknown'} // ceiling ${context.scouting?.ceilingBand ?? 'unknown'} // character ${context.scouting?.characterRead ?? 'unknown'}.`,
    source: actions.length > 0
      ? `Source: offseasonState.scoutingState via ${actions.join(' + ')}; pick still commits only through makeDraftPick.`
      : 'Source: saved game.draftClass fallback; pick still commits only through makeDraftPick.',
    warnings,
  };
}

export function buildDraftPickReceipt(args: {
  prospect: DraftProspect;
  forecast: DraftPickForecast;
  currentEntry: DraftOrderEntry | null;
  teamName: string;
  year: number;
}): DraftPickReceipt {
  const pickLabel = args.currentEntry
    ? `Round ${args.currentEntry.round}, Pick ${args.currentEntry.pick}, Overall #${args.currentEntry.overall}`
    : `Projected Round ${args.prospect.projectedRound}`;
  const prospectName = `${args.prospect.firstName} ${args.prospect.lastName}`;

  return {
    id: `draft-pick:${args.prospect.id}:${args.currentEntry?.overall ?? args.prospect.projectedRound}`,
    title: 'Draft Pick Submitted',
    accent: args.forecast.accent,
    target: `${prospectName} // ${args.prospect.pos} // ${args.prospect.college} // ${pickLabel} // ${args.teamName}`,
    result: `${args.teamName} selected ${prospectName} in ${args.year}. Pre-pick forecast was ${args.forecast.label}: ${args.forecast.boardFit} ${args.forecast.needFit} ${args.forecast.scoutConfidence}`,
    stateTouched: 'draftClass, user roster, GameState.players, team draft picks, offseasonState completed/current pick index, player archive, draft news, dynasty events, post-draft press conference queue, draft audio cue, and autosave through the existing store commit.',
    source: 'actions.makeDraftPick -> makeDraftPickEngine -> applyDraftSelection -> commitGame',
    boundary: 'This confirmation does not draft another prospect, advance CPU picks, accept or reject war-room trades, generate a second reveal, change draft order, change pick values, change scouting grades, play scheduled games, reroll saved outcomes, or save a separate confirmation log.',
    warnings: args.forecast.warnings,
  };
}

export function DraftPickReceiptPanel({ receipt }: { receipt: DraftPickReceipt }) {
  return (
    <PixelPanel title="Draft Pick Receipt" accent={receipt.accent}>
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
        {receipt.warnings.length > 0 ? (
          <div style={{ ...pixelSm, color: 'var(--mfd-gold)', lineHeight: 1.5 }}>
            Watch: {receipt.warnings.join(' ')}
          </div>
        ) : null}
      </div>
    </PixelPanel>
  );
}

export function DraftBoard() {
  const phase = useGameStore(selectPhase);
  const userTeam = useGameStore(selectUserTeam);
  const needsReport = useGameStore(selectUserTeamNeeds);
  const draftClass = useGameStore(selectDraftClass);
  const draftRecaps = useGameStore(selectDraftRecaps);
  const leagueRules = useGameStore(selectLeagueRules);
  const offseasonState = useGameStore(selectOffseasonState);
  const currentEntry = useGameStore(selectCurrentDraftEntry);
  const scenarioState = useGameStore(selectScenarioState);
  const warRoomState = useGameStore(selectWarRoomState);
  const year = useGameStore(selectYear);
  const { acceptDraftTradeOffer, advanceWeek, makeDraftPick, refreshWarRoom, rejectDraftTradeOffer } = useGameStore((state) => state.actions);
  const [pending, setPending] = useState<string | null>(null);
  const [tradeUpTarget, setTradeUpTarget] = useState('');
  const [draftReveal, setDraftReveal] = useState<{
    overall: number;
    round: number;
    pick: number;
    playerName: string;
    position: string;
    college: string;
    teamAbbrev: string;
    reaction: string;
  } | null>(null);
  const [draftReceipt, setDraftReceipt] = useState<DraftPickReceipt | null>(null);

  const userOnClock = Boolean(userTeam && currentEntry && currentEntry.teamId === userTeam.id);
  const visibleProspects = useMemo(() => draftClass.slice(0, 20), [draftClass]);
  const remainingUserPicks = useMemo(() => (
    (userTeam?.draftPicks ?? [])
      .filter((pick) => pick.year === (offseasonState?.draftOrder[0]?.id ? Number(offseasonState.draftOrder[0].id.split('-')[1]) || 0 : 0) || pick.year >= 0)
      .sort((a, b) => a.round - b.round || a.pick - b.pick)
  ), [offseasonState, userTeam]);
  const compPicks = useMemo(() => remainingUserPicks.filter((pick) => pick.isCompPick), [remainingUserPicks]);
  const compPickList = compPicks.map((pick) => `R${pick.round} P${pick.pick}`).join(' // ');
  const activeCompPickLimit = leagueRules
    ? Number(getActiveRule(leagueRules, 'comp_pick_limit', year))
    : Number(LEAGUE_RULE_DEFAULTS.comp_pick_limit);
  const projectedPickValue = remainingUserPicks.reduce((sum, pick) => sum + calcPickValue(pick), 0);
  const suggestedProspects = visibleProspects.filter((prospect) => needsReport.criticalNeeds.includes(prospect.pos)).slice(0, 5);
  const selectedTradeUp = warRoomState?.userCanTradeUp.find((entry) => String(entry.targetPick) === tradeUpTarget) ?? warRoomState?.userCanTradeUp[0] ?? null;
  const scenarioConstraints = scenarioState?.activeScenario?.constraints ?? null;
  const draftLockedByScenario = Boolean(scenarioConstraints?.blockDraft);
  const tradesLockedByScenario = Boolean(scenarioConstraints?.blockTrades);
  const currentYearDraftRecap = useMemo(() => (
    draftRecaps.find((recap) => recap.year === year) ?? null
  ), [draftRecaps, year]);
  const draftClosureCta = useMemo(() => buildDraftClosureCta({
    phase,
    year,
    currentYearRecapSaved: Boolean(currentYearDraftRecap),
  }), [currentYearDraftRecap, phase, year]);

  useEffect(() => {
    if (phase === 'draft' && !warRoomState) {
      void refreshWarRoom();
    }
  }, [phase, refreshWarRoom, warRoomState]);

  useEffect(() => {
    if (warRoomState?.userCanTradeUp.length) {
      setTradeUpTarget(String(warRoomState.userCanTradeUp[0]!.targetPick));
    }
  }, [warRoomState?.userCanTradeUp]);

  const handleAction = async (key: string, run: () => Promise<void>) => {
    setPending(key);
    try {
      await run();
    } finally {
      setPending(null);
    }
  };

  const buildDraftReaction = (projectedRound: number, selectedRound: number) => {
    const contextKey = projectedRound < selectedRound
      ? 'steal_pick'
      : projectedRound > selectedRound
        ? 'reach_pick'
        : 'first_round';

    try {
      return getAgmDialogueLine('marcus_webb', 'draftNight', contextKey, mulberry32(selectedRound * 97 + projectedRound * 13));
    } catch {
      return contextKey === 'steal_pick'
        ? 'Value held. The board came to us.'
        : contextKey === 'reach_pick'
          ? 'Traits bet. We trust the profile.'
          : 'We turned the card in without blinking.';
    }
  };

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Draft Board"
        subtitle={phase === 'draft' ? 'War room live: offers, grade, pick math, and needs-aware suggestions.' : `Current phase: ${phase}`}
        badges={(
          <>
            <PixelBadge variant={userOnClock ? 'gold' : 'cyan'}>{userOnClock ? 'On The Clock' : 'Waiting'}</PixelBadge>
            {warRoomState ? <PixelBadge variant="green">Class {warRoomState.draftGrade}</PixelBadge> : null}
            {currentEntry ? <PixelBadge variant="default">R{currentEntry.round} P{currentEntry.pick}</PixelBadge> : null}
          </>
        )}
      />

      <CommandCallout
        title={userOnClock ? 'Make the board pick' : phase === 'draft' ? 'Move to your next live slot' : 'Build the board before draft night'}
        body={userOnClock
          ? 'You are on the clock. Check needs-aware suggestions, then turn in the highest-conviction player.'
          : phase === 'draft'
            ? 'The league clock is moving. Advance through AI picks until your card is live.'
            : 'No live clock yet. Use scouting and needs fit so the first draft decision is not a panic read.'}
        accent={userOnClock ? 'gold' : phase === 'draft' ? 'cyan' : 'green'}
        meta={(
          <>
            <PixelBadge variant="cyan">{visibleProspects.length} prospects</PixelBadge>
            <PixelBadge variant="gold">{suggestedProspects.length} need fits</PixelBadge>
          </>
        )}
        actions={[
          phase === 'draft' && !userOnClock
            ? {
              label: 'Next Pick',
              accent: 'green' as const,
              onClick: () => void handleAction('advance-draft-callout', async () => {
                playSound('week_advance_start', { debounceMs: 0, debounceKey: `draft-callout:${currentEntry?.overall ?? 0}` });
                await advanceWeek();
              }),
            }
            : { label: 'Scouting', accent: 'cyan' as const, onClick: () => navigateTo('/scouting') },
          { label: 'Refresh Room', accent: 'gold', onClick: () => void refreshWarRoom() },
        ]}
      />

      <div style={autoGrid(210)}>
        <PixelMetricCard label="Board Size" value={visibleProspects.length} accent="cyan" detail="Visible prospects" />
        <PixelMetricCard label="Current Pick" value={currentEntry?.overall ?? '-'} accent={userOnClock ? 'gold' : 'default'} detail={userOnClock ? 'Your live slot' : 'League clock'} />
        <PixelMetricCard label="Timer" value={warRoomState?.timeRemaining ?? 90} accent={userOnClock ? 'red' : 'cyan'} detail="Cosmetic war room countdown" />
        <PixelMetricCard label="Remaining Picks" value={remainingUserPicks.length} accent="gold" detail={`${Math.round(projectedPickValue)} projected chart points`} />
      </div>

      <PixelPanel title="Draft Board Sources" accent="cyan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <PixelBadge variant="cyan">SAVED DRAFT CLASS</PixelBadge>
            <PixelBadge variant="gold">SCOUTING INTEL</PixelBadge>
            <PixelBadge variant="green">WAR ROOM READ MODEL</PixelBadge>
            <PixelBadge variant="default">STORE ACTIONS</PixelBadge>
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
            Big Board rows read saved game.draftClass prospects. Visible grade, confidence, risk, ceiling, and character badges use saved offseasonState.scoutingState when present, then fall back to the prospect scout grade.
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
            War-room grade, offers, and trade-up lanes come from selectWarRoomState: it uses saved game.warRoomState only for the current pick/team, otherwise it builds a deterministic preview.
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
            Offer Confidence and Draft Market Receipt are route-local reads over incomingOffers, current pick context, critical needs, CPU reasoning, and calcPickValue chart points. They do not change trade valuation or draft-pick movement.
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
            Drafting, CPU-pick advancement, and trade-offer decisions stay in makeDraftPick, advanceWeek, acceptDraftTradeOffer, rejectDraftTradeOffer, and refreshWarRoom. The reveal card and Draft Pick Receipt are route-local presentation, not durable pick history.
          </div>
        </div>
      </PixelPanel>

      {draftLockedByScenario || tradesLockedByScenario ? (
        <PixelPanel title="Scenario Lock" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="gold">{scenarioState?.activeScenario?.name ?? 'Active Scenario'}</PixelBadge>
              {draftLockedByScenario ? <PixelBadge variant="red">DRAFT PICKS BLOCKED</PixelBadge> : null}
              {tradesLockedByScenario ? <PixelBadge variant="red">TRADE ACCEPTS BLOCKED</PixelBadge> : null}
            </div>
            {draftLockedByScenario ? (
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                Draft Player buttons are disabled here because the active scenario blocks user draft-pick submissions. CPU pick advancement still stays with the existing advanceWeek draft flow.
              </div>
            ) : null}
            {tradesLockedByScenario ? (
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                Draft-night trade Accept buttons are disabled here because the active scenario blocks trades. Reject can still clear a stale displayed offer without moving picks.
              </div>
            ) : null}
            <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)', lineHeight: 1.5 }}>
              Source: saved scenarioState.activeScenario.constraints. Store actions already return without committing blocked draft picks or blocked draft-war-room accepts.
            </div>
          </div>
        </PixelPanel>
      ) : null}

      {draftClosureCta ? (
        <PixelPanel title="Draft Closure" accent={draftClosureCta.accent}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <PixelBadge variant={draftClosureCta.accent}>
                {draftClosureCta.status === 'recap-ready' ? 'RECAP READY' : 'NEEDS RECAP'}
              </PixelBadge>
              <PixelBadge variant="cyan">POST DRAFT</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.5 }}>
              {draftClosureCta.title} {draftClosureCta.detail}
            </div>
            <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)', lineHeight: 1.5 }}>
              {draftClosureCta.source}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <PixelButton
                accent={draftClosureCta.accent}
                disabled={pending === 'draft-closure'}
                onClick={() => void handleAction('draft-closure', async () => {
                  if (draftClosureCta.action === 'finalize') {
                    await advanceWeek();
                  }
                  navigateTo('/draft-recap');
                })}
              >
                {draftClosureCta.actionLabel}
              </PixelButton>
            </div>
          </div>
        </PixelPanel>
      ) : null}

      {draftReceipt ? <DraftPickReceiptPanel receipt={draftReceipt} /> : null}

      <div style={autoGrid(320)}>
        <PixelPanel title="Current Pick" accent={userOnClock ? 'gold' : 'cyan'}>
          {currentEntry ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ ...display, fontSize: '24px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                {`OVERALL #${currentEntry.overall}`.toUpperCase()}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <PixelBadge variant="default">Round {currentEntry.round}</PixelBadge>
                <PixelBadge variant="default">Pick {currentEntry.pick}</PixelBadge>
                <PixelBadge variant={userOnClock ? 'gold' : 'cyan'}>
                  {userOnClock ? 'YOU ARE ON THE CLOCK' : 'AI PICK'}
                </PixelBadge>
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                Team on clock: {currentEntry.teamId}
              </div>
              {phase === 'draft' && !userOnClock ? (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <PixelButton
                    accent="green"
                    disabled={pending === 'advance-draft'}
                    onClick={() => void handleAction('advance-draft', async () => {
                      playSound('week_advance_start', { debounceMs: 0, debounceKey: `draft-advance:${currentEntry.overall}` });
                      await advanceWeek();
                    })}
                  >
                    Advance To Next Pick
                  </PixelButton>
                </div>
              ) : null}
            </div>
          ) : (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Draft order not available.</div>
          )}
        </PixelPanel>

        <PixelPanel title="War Room" accent="red">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="gold">Grade {warRoomState?.draftGrade ?? 'B'}</PixelBadge>
              <PixelBadge variant="cyan">{needsReport.criticalNeeds.join(' / ') || 'No urgent need'}</PixelBadge>
            </div>
            {(warRoomState?.incomingOffers ?? []).length > 0 ? (
              warRoomState!.incomingOffers.map((offer) => {
                const offerConfidence = buildDraftOfferConfidence(offer, {
                  currentEntry,
                  criticalNeeds: needsReport.criticalNeeds,
                  topProspect: visibleProspects[0] ?? null,
                });
                const marketReceipt = buildDraftMarketReceipt(offer, offerConfidence);
                return (
                  <div key={`${offer.from}-${offer.targetPick}-${offer.reasoning}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', border: '3px solid var(--mfd-border)', background: 'var(--mfd-bg-3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{offer.from} wants pick #{offer.targetPick}</div>
                      <PixelBadge variant={offer.urgency === 'desperate' ? 'red' : offer.urgency === 'interested' ? 'gold' : 'cyan'}>
                        {offer.urgency}
                      </PixelBadge>
                    </div>
                    <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                      They offer: {offerSummary(offer.offer.offering)}
                    </div>
                    <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                      They want: {offerSummary(offer.offer.requesting)}
                    </div>
                    <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>{offer.reasoning}</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <PixelBadge variant={offerConfidence.accent}>Offer Confidence</PixelBadge>
                      <PixelBadge variant={offerConfidence.accent}>{offerConfidence.label}</PixelBadge>
                    </div>
                    <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{offerConfidence.chartSummary}</div>
                    <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{offerConfidence.leverageRead}</div>
                    <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)', lineHeight: 1.5 }}>{offerConfidence.source}</div>
                    {offerConfidence.warnings.length > 0 ? (
                      <div style={{ ...pixelSm, color: 'var(--mfd-gold)', lineHeight: 1.5 }}>
                        Watch: {offerConfidence.warnings.join(' ')}
                      </div>
                    ) : null}
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
                        <PixelBadge variant={marketReceipt.accent}>Draft Market Receipt</PixelBadge>
                        <PixelBadge variant="default">{marketReceipt.label}</PixelBadge>
                      </div>
                      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{marketReceipt.detail}</div>
                      <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)', lineHeight: 1.5 }}>{marketReceipt.boundary}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <PixelButton
                        accent="green"
                        disabled={pending === `accept-${offer.from}` || tradesLockedByScenario}
                        onClick={() => void handleAction(`accept-${offer.from}`, async () => {
                          await acceptDraftTradeOffer(offer);
                        })}
                      >
                        Accept
                      </PixelButton>
                      <PixelButton
                        accent="red"
                        disabled={pending === `reject-${offer.from}`}
                        onClick={() => void handleAction(`reject-${offer.from}`, async () => {
                          await rejectDraftTradeOffer(offer);
                        })}
                      >
                        Reject
                      </PixelButton>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No live offers on the board right now.</div>
            )}
          </div>
        </PixelPanel>
      </div>

      <div style={autoGrid(320)}>
        <PixelPanel title="Trade Up Calculator" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <PixelSelect
              aria-label="Trade up target"
              value={tradeUpTarget}
              onChange={(event) => setTradeUpTarget(event.target.value)}
              options={(warRoomState?.userCanTradeUp ?? []).map((entry) => ({
                value: String(entry.targetPick),
                label: `Target Pick #${entry.targetPick}`,
              }))}
              accent="gold"
            />
            {selectedTradeUp ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>Cost: {offerSummary(selectedTradeUp.cost.offering)}</div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Return: {offerSummary(selectedTradeUp.cost.requesting)}</div>
              </div>
            ) : (
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No move-up options from this slot.</div>
            )}
          </div>
        </PixelPanel>

        <div data-spotlight-target="chip.route.draft-board.beat-2">
          <PixelPanel title="Needs-Aware Suggestions" accent="green">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {suggestedProspects.length > 0 ? suggestedProspects.map((prospect) => (
                <div key={`suggested-${prospect.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{prospect.firstName} {prospect.lastName}</div>
                    <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{prospect.pos} // need fit // {prospect.college}</div>
                  </div>
                  <PixelBadge variant="green">{prospect.scoutGrade.toFixed(1)}</PixelBadge>
                </div>
              )) : <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No top-board player cleanly matches your biggest holes.</div>}
            </div>
          </PixelPanel>
        </div>

        <PixelPanel title="Your Remaining Picks" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {remainingUserPicks.slice(0, 6).map((pick) => (
              <div key={`${pick.year}-${pick.round}-${pick.pick}-${pick.originalTeamId}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <span style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>R{pick.round} // P{pick.pick}</span>
                  {pick.isCompPick ? <PixelBadge variant="gold">COMP</PixelBadge> : null}
                </span>
                <PixelBadge variant="cyan">{Math.round(calcPickValue(pick))}</PixelBadge>
              </div>
            ))}
          </div>
        </PixelPanel>

        <PixelPanel title="Comp Pick Context" accent={compPicks.length > 0 ? 'gold' : 'cyan'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant={compPicks.length > 0 ? 'gold' : 'default'}>
                {compPicks.length} COMP PICK{compPicks.length === 1 ? '' : 'S'}
              </PixelBadge>
              <PixelBadge variant="gold">ACTIVE LIMIT {activeCompPickLimit}</PixelBadge>
              <PixelBadge variant="cyan">NORMAL DRAFT PICKS</PixelBadge>
              <PixelBadge variant="green">FA ROUND 3 RECEIPT</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>
              {compPicks.length > 0
                ? `Awarded picks on this board: ${compPickList}.`
                : 'No compensatory selections are currently saved on this board.'}
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
              Source: saved team.draftPicks rows with isCompPick. Awards are calculated after Free Agency Round 3 from current-year LOSE_FA departures minus SIGN_FA additions, capped by the active comp_pick_limit rule ({activeCompPickLimit} for {year}).
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
              These picks flow through the normal draft order, League Office news, Inbox comp-pick notices, and the Comp Pick Master achievement. They are not a second draft board or a separate ledger.
            </div>
          </div>
        </PixelPanel>
      </div>

      <PixelPanel title="Big Board" accent="cyan">
        <div data-spotlight-target="chip.route.draft-board.beat-1">
        {visibleProspects.length === 0 ? (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No prospects remain on the board.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visibleProspects.map((prospect) => {
              const scouting = offseasonState?.scoutingState[prospect.id];
              const visibleGrade = scouting?.visibleScoutGrade ?? prospect.scoutGrade;
              const confidence = Number(scouting?.confidence ?? Math.round((scouting?.accuracy ?? 0) * 100));
              const matchesNeed = needsReport.criticalNeeds.includes(prospect.pos);
              const pickForecast = buildDraftPickForecast(prospect, {
                currentEntry,
                scouting,
                criticalNeeds: needsReport.criticalNeeds,
              });
              return (
                <div key={prospect.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', border: `3px solid ${matchesNeed ? 'var(--mfd-gold)' : 'var(--mfd-border)'}`, background: 'var(--mfd-bg-3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ ...display, fontSize: '22px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                        {`${prospect.firstName} ${prospect.lastName}`.toUpperCase()}
                      </div>
                      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '6px' }}>
                        {prospect.pos} // {prospect.college} // projected round {prospect.projectedRound}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <PixelBadge variant="cyan">{visibleGrade.toFixed(1)}</PixelBadge>
                      <PixelBadge variant="default">{confidence}%</PixelBadge>
                      <PixelBadge variant={needAccent(matchesNeed)}>{matchesNeed ? 'Need Fit' : 'Board'}</PixelBadge>
                      <PixelBadge variant="gold">{scouting?.riskBand ?? 'unknown'}</PixelBadge>
                      <PixelBadge variant="green">{scouting?.ceilingBand ?? 'unknown'}</PixelBadge>
                      <PixelBadge variant="default">{scouting?.characterRead ?? 'unknown'}</PixelBadge>
                      {prospect.bloodline ? <PixelBadge variant="gold">Bloodline</PixelBadge> : null}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', border: '2px solid var(--mfd-border)', background: 'var(--mfd-bg-2)' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <PixelBadge variant={pickForecast.accent}>Pick Forecast</PixelBadge>
                      <PixelBadge variant={pickForecast.accent}>{pickForecast.label}</PixelBadge>
                      {pickForecast.warnings.length > 0 ? <PixelBadge variant="gold">{pickForecast.warnings.length} watch</PixelBadge> : <PixelBadge variant="green">Clear read</PixelBadge>}
                    </div>
                    <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{pickForecast.boardFit}</div>
                    <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                      {pickForecast.needFit} {pickForecast.scoutConfidence} {pickForecast.riskRead}
                    </div>
                    <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)', lineHeight: 1.5 }}>
                      {pickForecast.source}
                    </div>
                    {pickForecast.warnings.length > 0 ? (
                      <div style={{ ...pixelSm, color: 'var(--mfd-gold)', lineHeight: 1.5 }}>
                        Watch: {pickForecast.warnings.join(' ')}
                      </div>
                    ) : null}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                    {userOnClock ? (
                      <PixelButton
                        accent={matchesNeed ? 'gold' : 'cyan'}
                        disabled={pending === prospect.id || draftLockedByScenario}
                        onClick={() => void handleAction(prospect.id, async () => {
                          const reaction = buildDraftReaction(prospect.projectedRound, currentEntry?.round ?? prospect.projectedRound);
                          await makeDraftPick(prospect.id);
                          setDraftReceipt(buildDraftPickReceipt({
                            prospect,
                            forecast: pickForecast,
                            currentEntry,
                            teamName: userTeam ? `${userTeam.city} ${userTeam.name}` : 'User Team',
                            year,
                          }));
                          setDraftReveal({
                            overall: currentEntry?.overall ?? prospect.projectedRound,
                            round: currentEntry?.round ?? prospect.projectedRound,
                            pick: currentEntry?.pick ?? 1,
                            playerName: `${prospect.firstName} ${prospect.lastName}`,
                            position: prospect.pos,
                            college: prospect.college,
                            teamAbbrev: userTeam?.icon ?? userTeam?.abbr ?? 'mfd',
                            reaction,
                          });
                        })}
                      >
                        Draft Player
                      </PixelButton>
                    ) : (
                      <PixelBadge variant="default">Waiting</PixelBadge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </PixelPanel>

      <DraftPickReveal
        open={!!draftReveal}
        overall={draftReveal?.overall ?? 0}
        round={draftReveal?.round ?? 0}
        pick={draftReveal?.pick ?? 0}
        playerName={draftReveal?.playerName ?? ''}
        position={draftReveal?.position ?? ''}
        college={draftReveal?.college ?? ''}
        teamAbbrev={draftReveal?.teamAbbrev ?? 'mfd'}
        reaction={draftReveal?.reaction ?? ''}
        onDismiss={() => setDraftReveal(null)}
      />
    </div>
  );
}
