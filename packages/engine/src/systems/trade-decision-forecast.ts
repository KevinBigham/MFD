import { evaluateTradeOffer } from './trade-value';
import type { GameState, TradeOffer, TradeOfferAsset, TradeProposalStatus } from '../types';

export type TradeDecisionForecastAccent = 'green' | 'gold' | 'red' | 'cyan';

export interface TradeDecisionForecastInput {
  game: GameState;
  userTeamId: string;
  partnerTeamId: string;
  offering: TradeOfferAsset[];
  requesting: TradeOfferAsset[];
  status?: TradeOffer['status'] | TradeProposalStatus;
}

export interface TradeDecisionForecastItem {
  id: string;
  label: string;
  delta: string;
  accent: TradeDecisionForecastAccent;
}

export interface TradeDecisionForecast {
  userSendsValue: number;
  userReceivesValue: number;
  userValueDelta: number;
  fairnessScore: number;
  partnerIncomingValue: number;
  partnerOutgoingValue: number;
  partnerRequiredValue: number;
  partnerAcceptanceRatio: number;
  partnerAccepted: boolean;
  acceptanceLabel: string;
  acceptanceAccent: TradeDecisionForecastAccent;
  valueLabel: string;
  valueAccent: TradeDecisionForecastAccent;
  headline: string;
  consequenceItems: TradeDecisionForecastItem[];
  warnings: string[];
}

function round1(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10) / 10;
}

function ratioPercent(value: number, required: number): number {
  if (required <= 0) return value > 0 ? 100 : 0;
  return Math.max(0, Math.round((value / required) * 100));
}

function assetCounts(assets: TradeOfferAsset[]): {
  players: number;
  picks: number;
  conditionalPicks: number;
} {
  return assets.reduce((counts, asset) => {
    if (asset.type === 'player') counts.players += 1;
    else if (asset.type === 'conditional_pick') counts.conditionalPicks += 1;
    else counts.picks += 1;
    return counts;
  }, { players: 0, picks: 0, conditionalPicks: 0 });
}

function assetCountLabel(assets: TradeOfferAsset[]): string {
  const counts = assetCounts(assets);
  const parts = [
    counts.players > 0 ? `${counts.players} player${counts.players === 1 ? '' : 's'}` : null,
    counts.picks > 0 ? `${counts.picks} pick${counts.picks === 1 ? '' : 's'}` : null,
    counts.conditionalPicks > 0 ? `${counts.conditionalPicks} conditional pick${counts.conditionalPicks === 1 ? '' : 's'}` : null,
  ].filter((part): part is string => Boolean(part));
  return parts.join(', ') || 'no assets';
}

function hasRosterMovement(offering: TradeOfferAsset[], requesting: TradeOfferAsset[]): boolean {
  return [...offering, ...requesting].some((asset) => asset.type === 'player');
}

function hasConditionalPick(offering: TradeOfferAsset[], requesting: TradeOfferAsset[]): boolean {
  return [...offering, ...requesting].some((asset) => asset.type === 'conditional_pick');
}

function valueLabel(delta: number, hasAssets: boolean): string {
  if (!hasAssets) return 'No package';
  if (delta >= 25) return 'Big value gain';
  if (delta >= 5) return 'Value gain';
  if (delta <= -25) return 'Major overpay';
  if (delta <= -5) return 'Premium paid';
  return 'Balanced value';
}

function valueAccent(delta: number, hasAssets: boolean): TradeDecisionForecastAccent {
  if (!hasAssets) return 'cyan';
  if (delta >= 5) return 'green';
  if (delta <= -5) return 'red';
  return 'gold';
}

function acceptanceLabel(accepted: boolean, acceptanceRatio: number, hasAssets: boolean): string {
  if (!hasAssets) return 'No trade built';
  if (accepted && acceptanceRatio >= 125) return 'Partner accepts';
  if (accepted) return 'Partner likely accepts';
  if (acceptanceRatio >= 90) return 'Counter likely';
  if (acceptanceRatio >= 70) return 'Offer is light';
  return 'Likely rejected';
}

function acceptanceAccent(
  accepted: boolean,
  acceptanceRatio: number,
  hasAssets: boolean,
): TradeDecisionForecastAccent {
  if (!hasAssets) return 'cyan';
  if (accepted) return 'green';
  if (acceptanceRatio >= 80) return 'gold';
  return 'red';
}

function marketDeltaSentence(valueGap: number, accepted: boolean): string {
  if (accepted) {
    return valueGap >= 0
      ? `Partner valuation clears its acceptance line by ${round1(valueGap)} value points.`
      : 'Partner accepts only when its roster or cap pressure covers the value gap.';
  }

  return `Package is ${round1(Math.abs(valueGap))} value points below the partner acceptance line.`;
}

function seasonImpact(offering: TradeOfferAsset[], requesting: TradeOfferAsset[]): string {
  const outgoing = assetCounts(offering);
  const incoming = assetCounts(requesting);
  if (incoming.players > outgoing.players) {
    return 'Depth-chart help arrives now, but assign roles and practice snaps before Advance Week.';
  }
  if (outgoing.players > incoming.players) {
    return 'Open Depth Chart before Advance Week; traded players leave starter, backup, or rotation jobs unfilled until replacements are assigned.';
  }
  if (incoming.players > 0 || outgoing.players > 0) {
    return 'Player movement changes roles immediately even when the asset count looks balanced.';
  }
  return 'No players move today; the trade is mostly a future-capital decision.';
}

function futureImpact(offering: TradeOfferAsset[], requesting: TradeOfferAsset[]): string {
  const outgoing = assetCounts(offering);
  const incoming = assetCounts(requesting);
  const sentPicks = outgoing.picks + outgoing.conditionalPicks;
  const receivedPicks = incoming.picks + incoming.conditionalPicks;

  if (sentPicks > receivedPicks) {
    return 'Draft capital is being spent; the next draft has fewer cheap starter or depth answers.';
  }
  if (receivedPicks > sentPicks) {
    return 'Extra picks improve the next draft by creating cheaper starter or depth options.';
  }
  if (sentPicks > 0 || receivedPicks > 0) {
    return 'Pick movement is balanced by count; value still depends on round, slot, and timing.';
  }
  return 'Future impact comes from player age, contract years, and development snaps.';
}

function uncertainty(offering: TradeOfferAsset[], requesting: TradeOfferAsset[]): string {
  const conditional = hasConditionalPick(offering, requesting)
    ? ' Conditional pick value is projected, not a guaranteed final pick.'
    : '';
  return `Forecast compares trade values, but it does not include hidden role fallout or post-trade cap-total recalculation.${conditional}`;
}

function buildWarnings(input: TradeDecisionForecastInput): string[] {
  const warnings: string[] = [];
  if (input.offering.length === 0 || input.requesting.length === 0) {
    warnings.push('Build both sides first');
  }
  if (hasConditionalPick(input.offering, input.requesting)) {
    warnings.push('Read conditional-pick terms before accepting; the final pick changes when the condition resolves.');
  }
  if (hasRosterMovement(input.offering, input.requesting)) {
    warnings.push('Open Depth Chart and Cap Lab after commit; roster movement changes backup order and cap space.');
  }
  return warnings;
}

export function buildTradeDecisionForecast(input: TradeDecisionForecastInput): TradeDecisionForecast | null {
  const userTeam = input.game.teams[input.userTeamId];
  const partnerTeam = input.game.teams[input.partnerTeamId];
  if (!userTeam || !partnerTeam) return null;

  const hasAssets = input.offering.length > 0 || input.requesting.length > 0;
  const userEvaluation = evaluateTradeOffer(input.game, userTeam, input.requesting, input.offering);
  const partnerEvaluation = evaluateTradeOffer(input.game, partnerTeam, input.offering, input.requesting);
  const userSendsValue = round1(userEvaluation.outgoingValue);
  const userReceivesValue = round1(userEvaluation.incomingValue);
  const userValueDelta = round1(userReceivesValue - userSendsValue);
  const partnerRequiredValue = round1(partnerEvaluation.outgoingValue * partnerEvaluation.threshold);
  const partnerAcceptanceRatio = ratioPercent(partnerEvaluation.incomingValue, partnerEvaluation.outgoingValue * partnerEvaluation.threshold);
  const maxUserValue = Math.max(userSendsValue, userReceivesValue, 1);
  const fairnessScore = hasAssets ? Math.round((Math.min(userSendsValue, userReceivesValue) / maxUserValue) * 100) : 0;
  const marketGap = round1(partnerEvaluation.incomingValue - partnerEvaluation.outgoingValue * partnerEvaluation.threshold);
  const nextValueLabel = valueLabel(userValueDelta, hasAssets);
  const nextValueAccent = valueAccent(userValueDelta, hasAssets);
  const nextAcceptanceLabel = acceptanceLabel(partnerEvaluation.accepted, partnerAcceptanceRatio, hasAssets);
  const nextAcceptanceAccent = acceptanceAccent(partnerEvaluation.accepted, partnerAcceptanceRatio, hasAssets);

  return {
    userSendsValue,
    userReceivesValue,
    userValueDelta,
    fairnessScore,
    partnerIncomingValue: round1(partnerEvaluation.incomingValue),
    partnerOutgoingValue: round1(partnerEvaluation.outgoingValue),
    partnerRequiredValue,
    partnerAcceptanceRatio,
    partnerAccepted: partnerEvaluation.accepted,
    acceptanceLabel: nextAcceptanceLabel,
    acceptanceAccent: nextAcceptanceAccent,
    valueLabel: nextValueLabel,
    valueAccent: nextValueAccent,
    headline: `${nextValueLabel}; ${nextAcceptanceLabel.toLowerCase()}.`,
    consequenceItems: [
      {
        id: 'trade-immediate',
        label: 'Immediate',
        delta: `You send ${assetCountLabel(input.offering)} and receive ${assetCountLabel(input.requesting)}.`,
        accent: nextValueAccent,
      },
      {
        id: 'trade-market',
        label: 'Partner response',
        delta: marketDeltaSentence(marketGap, partnerEvaluation.accepted),
        accent: nextAcceptanceAccent,
      },
      {
        id: 'trade-season',
        label: 'This season',
        delta: seasonImpact(input.offering, input.requesting),
        accent: hasRosterMovement(input.offering, input.requesting) ? 'gold' : 'cyan',
      },
      {
        id: 'trade-future',
        label: 'Future',
        delta: futureImpact(input.offering, input.requesting),
        accent: 'cyan',
      },
      {
        id: 'trade-uncertainty',
        label: 'Uncertainty',
        delta: uncertainty(input.offering, input.requesting),
        accent: hasConditionalPick(input.offering, input.requesting) ? 'gold' : 'cyan',
      },
    ],
    warnings: buildWarnings(input),
  };
}
