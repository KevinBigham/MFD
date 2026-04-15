/**
 * Transaction types — free agency, trades, waivers,
 * practice squad, offseason loop.
 */

import type { DraftPick, ProspectScoutingState } from './draft.js';

// ── Free Agency / Re-sign ───────────────────────────────

export interface ContractOffer {
  years: number;
  salary: number;
  signingBonus: number;
  guaranteed: number;
}

export interface ReSignDecision {
  playerId: string;
  teamId: string;
  askingPrice: ContractOffer;
  agentDemand: ContractOffer;
  lastOffer: ContractOffer | null;
  counterOffer: ContractOffer | null;
  agentResponse: string;
  patienceWeeksRemaining: number;
  status: 'pending' | 'countered' | 'accepted' | 'declined' | 'walked';
}

export interface FreeAgencyBid extends ContractOffer {
  playerId: string;
  teamId: string;
  round: number;
  score: number;
  status: 'pending' | 'won' | 'lost';
}

// ── Trades ──────────────────────────────────────────────

export interface TradeOfferAsset {
  type: 'player' | 'pick' | 'conditional_pick';
  teamId: string;
  playerId: string | null;
  pickId: string | null;
  conditionalPickId?: string | null;
  description: string;
}

export interface PickCondition {
  type: 'games_played' | 'pro_bowl' | 'playoff_win' | 'starts';
  playerId: string;
  threshold: number;
  upgradeRound: number;
}

export interface ConditionalPick {
  id: string;
  fromTeamId: string;
  toTeamId: string;
  playerId: string;
  basePick: DraftPick;
  condition: PickCondition;
  resolvedPick: DraftPick | null;
  resolved: boolean;
  description: string;
}

// ── Practice Squad ──────────────────────────────────────

export interface PracticeSquadPlayer {
  playerId: string;
  elevationsUsed: number;
  maxElevations: number;
  isElevated?: boolean;
  elevatedWeek?: number;
}

// ── Waivers ─────────────────────────────────────────────

export interface WaiverWireEntry {
  playerId: string;
  releasedByTeamId: string | null;
  createdYear: number;
  createdWeek: number;
  expiresYear: number;
  expiresWeek: number;
}

export interface WaiverClaim {
  teamId: string;
  playerId: string;
  claimYear: number;
  claimWeek: number;
}

export interface WaiverResultEntry {
  playerId: string;
  releasedByTeamId: string | null;
  winningTeamId: string | null;
  losingTeamIds: string[];
  clearedToFreeAgency: boolean;
}

export interface WaiverRunResult {
  id: string;
  year: number;
  week: number;
  entries: WaiverResultEntry[];
}

// ── Trade Offers / Deadline ─────────────────────────────

export interface TradeOffer {
  id: string;
  fromTeamId: string;
  toTeamId: string;
  direction: 'inbound' | 'outbound';
  summary: string;
  status: 'pending' | 'accepted' | 'rejected';
  send: TradeOfferAsset[];
  receive: TradeOfferAsset[];
}

export interface DeadlineDeal {
  id: string;
  teams: [string, string];
  players: string[];
  picks: string[];
  pickIds?: string[];
  timestamp: number;
  grade: string;
  splash: boolean;
  narrative: string;
}

export interface TradeDeadlineState {
  isDeadlineWeek: boolean;
  minutesRemaining: number;
  completedDeals: DeadlineDeal[];
  scheduledDeals?: DeadlineDeal[];
  pendingOffers: TradeOffer[];
  urgencyLevel: 'calm' | 'heating_up' | 'frantic' | 'buzzer_beater';
  tickerMessages: string[];
}

// ── Draft Order / Offseason ─────────────────────────────

export interface DraftOrderEntry {
  id: string;
  teamId: string;
  round: number;
  pick: number;
  overall: number;
  originalTeamId: string;
}

export interface OffseasonState {
  round: number;
  expiringPlayerIds: string[];
  reSignDecisions: Record<string, ReSignDecision>;
  freeAgencyBids: Record<string, FreeAgencyBid[]>;
  scoutingState: Record<string, ProspectScoutingState>;
  scoutingWatchlist: string[];
  tradeOffers: TradeOffer[];
  draftOrder: DraftOrderEntry[];
  currentDraftPickIndex: number;
  completedDraftPickIds: string[];
}
