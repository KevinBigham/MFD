import type { Position } from './player.js';

export interface SeasonWeekRef {
  year: number;
  week: number;
}

export type LeagueEventType =
  | 'signing'
  | 'trade'
  | 'cut'
  | 'draft_pick'
  | 'injury'
  | 'firing'
  | 'hiring'
  | 'award'
  | 'record'
  | 'press_conference'
  | 'game'
  | 'trick_play'
  | 'snap'
  | 'legacy';

export interface LeagueEventActors {
  teamIds: string[];
  playerIds: string[];
  staffIds: string[];
}

/** Append-only causal fact. Existing logs remain compatibility read models. */
export interface LeagueEvent {
  id: string;
  seasonWeek: SeasonWeekRef;
  type: LeagueEventType;
  actors: LeagueEventActors;
  payload: Record<string, unknown>;
  causeIds: string[];
}

export interface DecisionDriver {
  label: string;
  value: number | string | boolean;
  detail: string;
}

export interface DecisionReceipt {
  id: string;
  seasonWeek: SeasonWeekRef;
  teamId: string | null;
  decision: string;
  drivers: DecisionDriver[];
  outcome: string;
  counterfactual: string;
  eventRefs: string[];
}

export type FranchiseCapPosture = 'preserve' | 'balanced' | 'spend';
export type DraftCapitalStrategy = 'accumulate' | 'balanced' | 'trade_up';

export interface FranchisePlanHistoryEntry {
  year: number;
  week: number;
  trigger: string;
  summary: string;
}

export interface FranchisePlan {
  teamId: string;
  windowYears: [number, number];
  ownerMandate: string;
  capPosture: FranchiseCapPosture;
  priorityPositions: Position[];
  protectedAssets: string[];
  expendableAssets: string[];
  draftCapitalStrategy: DraftCapitalStrategy;
  riskTolerance: number;
  changeTriggers: string[];
  publicNarrative: string;
  planHistory: FranchisePlanHistoryEntry[];
  lastUpdatedYear: number;
}

export interface PressMemoryTag {
  id: string;
  teamId: string;
  year: number;
  week: number;
  tag: 'bold' | 'measured' | 'deflecting';
  quote: string;
  receiptId: string;
}

export interface PossessionState {
  possessionTeamId: string;
  defenseTeamId: string;
  quarter: number;
  clockSeconds: number;
  down: 1 | 2 | 3 | 4;
  distance: number;
  fieldPosition: number;
  homeTimeouts: number;
  awayTimeouts: number;
  personnel: string;
  homeScore: number;
  awayScore: number;
}

export interface SnapEvent {
  id: string;
  gameId: string;
  sequence: number;
  before: PossessionState;
  after: PossessionState;
  offenseTeamId: string;
  defenseTeamId: string;
  playType: 'run' | 'pass' | 'punt' | 'field_goal' | 'kickoff' | 'trick';
  yards: number;
  points: number;
  turnover: boolean;
  elapsedSeconds: number;
  description: string;
  causeIds: string[];
  decisionRefs?: string[];
}

export interface GameCapsule {
  id: string;
  gameId: string;
  year: number;
  week: number;
  teamIds: [string, string];
  score: [number, number];
  turningPoint: string;
  keyPlayEventIds: string[];
  receiptIds: string[];
  starPlayerIds: string[];
  summary: string;
}

export interface MemoryGraphNode {
  id: string;
  kind: 'person' | 'game' | 'decision' | 'rivalry' | 'team';
  label: string;
  eventRefs: string[];
}

export interface MemoryGraphEdge {
  id: string;
  fromId: string;
  toId: string;
  kind: 'played' | 'decided' | 'affected' | 'rivaled' | 'remembered';
  weight: number;
}

export interface DynastyMemoryGraph {
  nodes: MemoryGraphNode[];
  edges: MemoryGraphEdge[];
}

export interface DynastyMemoryDigest {
  previouslyOn: string | null;
  anniversary: string | null;
  retrospective: string | null;
  seasonDocumentary: string | null;
  sourceNodeIds: string[];
}
