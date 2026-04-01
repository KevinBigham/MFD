/**
 * MFD Trust & Aging System
 *
 * Trust trend tracking for trade reputation and
 * position-aware aging multipliers for player ratings.
 */

import { cl, avg } from '../utils';
import type { TradeState, Team } from '../types';

// ── Trust Trends ───────────────────────────────────────

export type TrustArrow = 'big_gain' | 'small_gain' | 'flat' | 'small_loss' | 'big_loss';

export function getTrustArrow(current: number, lastAvg: number): TrustArrow {
  const diff = current - lastAvg;
  if (diff >= 5) return 'big_gain';
  if (diff >= 2) return 'small_gain';
  if (diff <= -5) return 'big_loss';
  if (diff <= -2) return 'small_loss';
  return 'flat';
}

export function getTrustArrowLabel(arrow: TrustArrow): string {
  switch (arrow) {
    case 'big_gain': return 'Rising Fast';
    case 'small_gain': return 'Trending Up';
    case 'flat': return 'Stable';
    case 'small_loss': return 'Trending Down';
    case 'big_loss': return 'Falling Fast';
  }
}

// ── League Trust Snapshot ──────────────────────────────

export type TrustReputation =
  | 'Legendary' | 'Respected' | 'Neutral' | 'Untrustworthy'
  | 'Blacklisted' | 'Shark' | 'Pushover' | 'Fair Dealer';

export interface LeagueTrustSnapshot {
  avgTrust: number;
  reputation: TrustReputation;
  tiers: { high: number; mid: number; low: number };
  friendliest: string | null;
  coldest: string | null;
  recentPattern: { fleeceCount: number; fairCount: number; overpayCount: number };
}

export function leagueSnapshot(
  tradeState: TradeState | null,
  teams: readonly Team[],
): LeagueTrustSnapshot {
  const result: LeagueTrustSnapshot = {
    avgTrust: 50,
    reputation: 'Neutral',
    tiers: { high: 0, mid: 0, low: 0 },
    friendliest: null,
    coldest: null,
    recentPattern: { fleeceCount: 0, fairCount: 0, overpayCount: 0 },
  };

  if (!tradeState?.gmTrustByTeam) return result;

  const trustEntries = Object.entries(tradeState.gmTrustByTeam);
  if (trustEntries.length === 0) return result;

  const values = trustEntries.map(([, v]) => v);
  result.avgTrust = Math.round(avg(values));

  let highest = -1;
  let lowest = 101;
  for (const [teamId, trust] of trustEntries) {
    if (trust >= 65) result.tiers.high++;
    else if (trust <= 35) result.tiers.low++;
    else result.tiers.mid++;

    if (trust > highest) { highest = trust; result.friendliest = teamId; }
    if (trust < lowest) { lowest = trust; result.coldest = teamId; }
  }

  const recent = tradeState.recentTrades ?? [];
  for (const t of recent) {
    if (t.classification === 'fleece') result.recentPattern.fleeceCount++;
    else if (t.classification === 'fair') result.recentPattern.fairCount++;
    else if (t.classification === 'overpay') result.recentPattern.overpayCount++;
  }

  const { avgTrust } = result;
  const { fleeceCount, fairCount, overpayCount } = result.recentPattern;

  if (avgTrust >= 75) result.reputation = 'Legendary';
  else if (avgTrust >= 60) result.reputation = 'Respected';
  else if (avgTrust <= 25) result.reputation = 'Blacklisted';
  else if (avgTrust <= 40) result.reputation = 'Untrustworthy';
  else if (fleeceCount >= 2) result.reputation = 'Shark';
  else if (overpayCount >= 2) result.reputation = 'Pushover';
  else if (fairCount >= 3) result.reputation = 'Fair Dealer';
  else result.reputation = 'Neutral';

  return result;
}

// ── Aging Multipliers ──────────────────────────────────

export type AgingPhase = 'peak' | 'prime' | 'decline' | 'twilight';
export type RatingCategory = 'physical' | 'mental' | 'technique';

const PHYSICAL_RATINGS = new Set([
  'speed', 'acceleration', 'agility', 'stamina', 'strength', 'power',
  'elusiveness', 'jumping', 'toughness', 'durability', 'changeOfDirection', 'catchup',
]);

const MENTAL_RATINGS = new Set([
  'awareness', 'playRecognition', 'fieldVision', 'decisionSpeed', 'leadership',
  'clutch', 'discipline', 'assignmentIQ', 'fieldGoalIQ', 'fieldSense', 'iceVeins', 'confidence',
]);

function getRatingCategory(ratingName: string): RatingCategory {
  if (PHYSICAL_RATINGS.has(ratingName)) return 'physical';
  if (MENTAL_RATINGS.has(ratingName)) return 'mental';
  return 'technique';
}

export function getAgingMultiplier(
  ratingName: string,
  phase: AgingPhase,
  posWeight = 1,
): number {
  const cat = getRatingCategory(ratingName);

  switch (cat) {
    case 'mental':
      if (phase === 'peak') return -0.5;
      if (phase === 'decline') return 0;
      return 0.3;

    case 'physical':
      if (phase === 'peak') return 0;
      if (phase === 'prime' || phase === 'decline')
        return posWeight > 5 ? 1.5 : 2.0;
      return 2.0;

    case 'technique':
      if (phase === 'peak' || phase === 'prime') return 0;
      return 0.5;

    default:
      return 1.0;
  }
}
