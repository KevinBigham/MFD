/**
 * Near-Miss Receipts — "What if" analysis after playoff elimination.
 *
 * Tracks declined trades, passed draft picks, and missed free agents,
 * then shows what would have happened if you'd made a different choice.
 */
import type { PrngFn } from '../rng';

// ── Types ──────────────────────────────────────────────

export type NearMissType = 'declined_trade' | 'passed_pick' | 'missed_fa';

export interface NearMissEntry {
  type: NearMissType;
  playerName: string;
  playerOvr: number;
  description: string;
  /** What happened to the player you passed on */
  outcome: string;
}

export interface DeclinedTrade {
  playerName: string;
  playerOvr: number;
  partnerTeamName: string;
  week: number;
}

export interface PassedPick {
  playerName: string;
  playerOvr: number;
  round: number;
  pickNumber: number;
  /** The team that actually drafted them */
  draftedByTeam: string;
}

export interface MissedFA {
  playerName: string;
  playerOvr: number;
  signedWithTeam: string;
  position: string;
}

export interface NearMissTracker {
  declinedTrades: DeclinedTrade[];
  passedPicks: PassedPick[];
  missedFAs: MissedFA[];
}

// ── Constants ──────────────────────────────────────────

const MAX_RECEIPTS = 5;

// ── Public API ─────────────────────────────────────────

/** Create an empty tracker for the season */
export function createNearMissTracker(): NearMissTracker {
  return {
    declinedTrades: [],
    passedPicks: [],
    missedFAs: [],
  };
}

/** Record a trade you declined */
export function recordDeclinedTrade(
  tracker: NearMissTracker,
  trade: DeclinedTrade,
): void {
  tracker.declinedTrades.push(trade);
}

/** Record a draft pick you passed on */
export function recordPassedPick(
  tracker: NearMissTracker,
  pick: PassedPick,
): void {
  tracker.passedPicks.push(pick);
}

/** Record a free agent you didn't sign */
export function recordMissedFA(
  tracker: NearMissTracker,
  fa: MissedFA,
): void {
  tracker.missedFAs.push(fa);
}

/** Generate near-miss receipts at season end */
export function generateNearMissReceipts(
  rng: PrngFn,
  tracker: NearMissTracker,
): NearMissEntry[] {
  const receipts: NearMissEntry[] = [];

  // Process declined trades — only show ones where the player performed well
  for (const trade of tracker.declinedTrades) {
    if (trade.playerOvr >= 80) {
      receipts.push({
        type: 'declined_trade',
        playerName: trade.playerName,
        playerOvr: trade.playerOvr,
        description: `You declined a trade for ${trade.playerName} (${trade.playerOvr} OVR) in Week ${trade.week}.`,
        outcome: `${trade.playerName} had a breakout season with ${trade.partnerTeamName}, posting an ${trade.playerOvr} OVR.`,
      });
    }
  }

  // Process passed picks
  for (const pick of tracker.passedPicks) {
    if (pick.playerOvr >= 75) {
      receipts.push({
        type: 'passed_pick',
        playerName: pick.playerName,
        playerOvr: pick.playerOvr,
        description: `You passed on ${pick.playerName} in Round ${pick.round}, Pick ${pick.pickNumber}.`,
        outcome: `${pick.playerName} was drafted by ${pick.draftedByTeam} and finished the season at ${pick.playerOvr} OVR.`,
      });
    }
  }

  // Process missed FAs
  for (const fa of tracker.missedFAs) {
    if (fa.playerOvr >= 78) {
      receipts.push({
        type: 'missed_fa',
        playerName: fa.playerName,
        playerOvr: fa.playerOvr,
        description: `You missed out on ${fa.playerName} (${fa.position}) in free agency.`,
        outcome: `${fa.playerName} signed with ${fa.signedWithTeam} and posted ${fa.playerOvr} OVR after the market closed.`,
      });
    }
  }

  // Sort by player OVR (most impactful misses first) and limit
  receipts.sort((a, b) => b.playerOvr - a.playerOvr);
  return receipts.slice(0, MAX_RECEIPTS);
}

/** Check if there are any notable near-misses worth showing */
export function hasNotableNearMisses(tracker: NearMissTracker): boolean {
  return (
    tracker.declinedTrades.some((t) => t.playerOvr >= 80) ||
    tracker.passedPicks.some((p) => p.playerOvr >= 75) ||
    tracker.missedFAs.some((f) => f.playerOvr >= 78)
  );
}
