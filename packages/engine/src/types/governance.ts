/**
 * Governance, rules, CBA, commissioner, and labor types.
 *
 * League-wide structural state that applies across teams/players
 * but carries no direct roster references.
 */

import type { FranchiseTagType } from './contract.js';

// ── Timed Effects / Off-Field Events ────────────────────

export type TimedEffectSourceType = 'off_field_event' | 'press_conference' | 'rivalry';
export type TimedEffectTargetType = 'team' | 'player';
export type TimedEffectStat = 'chemistry' | 'morale' | 'ovr' | 'ownerApproval';

export interface TimedEffect {
  id: string;
  sourceType: TimedEffectSourceType;
  sourceId: string;
  teamId: string;
  targetType: TimedEffectTargetType;
  targetId: string | null;
  stat: TimedEffectStat;
  delta: number;
  appliesToGame: boolean;
  startStamp: number;
  endStamp: number;
  summary: string;
}

export interface OffFieldEvent {
  id: string;
  type: string;
  category: 'locker_room' | 'media' | 'personal';
  week: number;
  year: number;
  playerIds: string[];
  teamId: string;
  headline: string;
  description: string;
  effects: TimedEffect[];
}

// ── Press Conferences ───────────────────────────────────

export type PressConferenceType = 'postgame' | 'midweek' | 'post_trade' | 'post_draft' | 'coaching_change';
export type PressConferenceTone = 'confident' | 'deflecting' | 'fired_up' | 'somber';
export type PressConferenceSpeakerRole = 'HC' | 'GM' | 'PLAYER';

export interface ReporterQuestion {
  id: string;
  prompt: string;
  topic: string;
  response: string;
}

export interface PressConference {
  id: string;
  type: PressConferenceType;
  year: number;
  week: number;
  teamId: string | null;
  speaker: string;
  speakerRole: PressConferenceSpeakerRole;
  topic: string;
  tone: PressConferenceTone;
  headline: string;
  opener: string;
  quotes: string[];
  reporterQuestions: ReporterQuestion[];
  effects: TimedEffect[];
}

// ── League Rivalries ────────────────────────────────────

export interface LeagueRivalry {
  id: string;
  teamA: string;
  teamB: string;
  intensity: number;
  isDivision: boolean;
  history: string[];
  lastMetYear: number | null;
  lastMetWeek: number | null;
}

export interface RivalryGameContext {
  rivalryId: string;
  intensity: number;
  tier: 'budding' | 'heated' | 'blood_feud';
  ovrBoost: number;
  headline: string;
}

// ── League Rules ────────────────────────────────────────

export type LeagueRuleCategory = 'financial' | 'roster' | 'competition' | 'tags';
export type LeagueRuleSource = 'initial' | 'cba' | 'commissioner_vote' | 'owners_vote';
export type LeagueRuleInputKind = 'number' | 'boolean' | 'enum' | 'multi_enum' | 'number_array';
export type LeagueRuleKey =
  | 'salary_cap_growth'
  | 'cap_floor_pct'
  | 'franchise_tag_limit'
  | 'roster_limit'
  | 'practice_squad_size'
  | 'playoff_seeds_per_conf'
  | 'schedule_weeks'
  | 'trade_deadline_week'
  | 'ir_return_limit'
  | 'overtime_format'
  | 'min_salary_scale'
  | 'revenue_split'
  | 'draft_rounds'
  | 'comp_pick_limit'
  | 'tag_types_allowed';

export type LeagueRuleValue =
  | number
  | string
  | boolean
  | number[]
  | FranchiseTagType[];

export interface RuleChange {
  key: LeagueRuleKey;
  newValue: LeagueRuleValue;
  source: LeagueRuleSource;
  proposedBy: string;
  effectiveYear: number;
  rationale: string;
}

export interface RuleChangeRecord extends RuleChange {
  previousValue: LeagueRuleValue;
}

export interface RuleDiff {
  key: LeagueRuleKey;
  label: string;
  category: LeagueRuleCategory;
  before: string;
  after: string;
  changed: boolean;
  source: LeagueRuleSource;
  effectiveYear: number;
}

export interface LeagueRule {
  key: LeagueRuleKey;
  value: LeagueRuleValue;
  effectiveYear: number;
  source: LeagueRuleSource;
  previousValue: LeagueRuleValue;
}

export interface LeagueRuleDefinition {
  key: LeagueRuleKey;
  label: string;
  category: LeagueRuleCategory;
  inputKind: LeagueRuleInputKind;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string | number; label: string }>;
  petitionable: boolean;
}

export interface LeagueRules {
  initializedYear: number;
  entries: Record<LeagueRuleKey, LeagueRule>;
  history: RuleChangeRecord[];
}

// ── CBA ─────────────────────────────────────────────────

export type CBAStatus = 'active' | 'expiring' | 'expired' | 'negotiating' | 'awaiting_owner_vote' | 'lockout';

export interface CBATerms {
  revenueSplit: number;
  capGrowthRate: number;
  capFloorPct: number;
  minSalaryScale: number[];
  franchiseTagLimit: number;
  tagTypesAllowed: FranchiseTagType[];
  rosterLimit: number;
  practiceSquadSize: number;
  irReturnLimit: number;
  playoffSeeds: number;
  draftRounds: number;
}

export interface CBAAmendment {
  id: string;
  year: number;
  rationale: string;
  termChanges: Partial<CBATerms>;
}

export interface CBADeal {
  id: string;
  startYear: number;
  endYear: number;
  duration: number;
  terms: CBATerms;
  ratifiedBy: 'owners' | 'players' | 'both';
  amendments: CBAAmendment[];
}

export interface CBAProposal {
  id: string;
  side: 'owners' | 'players';
  year: number;
  round: number;
  terms: CBATerms;
  rationale: string;
}

export interface CBAEvaluation {
  side: 'owners' | 'players';
  score: number;
  concessions: string[];
  painPoints: string[];
}

export interface NegotiationState {
  round: number;
  ownersProposal: CBAProposal | null;
  playersProposal: CBAProposal | null;
  currentProposal: CBAProposal | null;
  gap: number;
  mediator: boolean;
  publicPressure: number;
  ownerVotes: Record<string, 'approve' | 'reject' | 'abstain'>;
  userVote: 'approve' | 'reject' | 'abstain' | null;
}

export interface CBANegotiationResult {
  cba: CBAState;
  proposal: CBAProposal | null;
  dealReached: boolean;
  lockout: boolean;
  ownerApprovalThreshold: number;
  ownerYesVotes: number;
  summary: string;
}

export interface LockoutResolution {
  cba: CBAState;
  laborState?: LaborState;
  resolved: boolean;
  summary: string;
}

export interface CBAState {
  status: CBAStatus;
  currentDeal: CBADeal | null;
  negotiationState: NegotiationState | null;
  history: CBADeal[];
  lockoutRisk: number;
  lastNegotiationYear: number | null;
}

// ── Commissioner / Rule Proposals ───────────────────────

export type RuleProposalVote = 'yes' | 'no' | 'abstain';
export type RuleProposalSource = 'commissioner' | 'owner_petition';
export type CommissionerPersonality = 'progressive' | 'traditionalist' | 'populist';
export type CommissionerRulingType = 'warning' | 'fine' | 'suspension';

export interface RuleProposal {
  id: string;
  ruleKey: LeagueRuleKey;
  currentValue: LeagueRuleValue;
  proposedValue: LeagueRuleValue;
  rationale: string;
  source: RuleProposalSource;
  votes: Record<string, RuleProposalVote>;
  requiredMajority: number;
  deadline: number;
  effectiveYear: number;
  proposedByTeamId: string | null;
}

export interface VoteResult {
  proposalId: string;
  passed: boolean;
  yesVotes: number;
  noVotes: number;
  abstains: number;
  effectiveYear: number;
  ruleKey: LeagueRuleKey;
  proposedValue: LeagueRuleValue;
}

export interface CommissionerRuling {
  id: string;
  year: number;
  week: number;
  type: CommissionerRulingType;
  playerId: string | null;
  playerName: string;
  teamId: string | null;
  headline: string;
  rationale: string;
  moraleImpact: number;
  chemistryImpact: number;
  ownerApprovalImpact: number;
}

export interface CommissionerState {
  name: string;
  personality: CommissionerPersonality;
  tenure: number;
  approval: number;
  activeProposals: RuleProposal[];
  history: VoteResult[];
  rulings: CommissionerRuling[];
  lowApprovalYears: number;
}

// ── Labor ───────────────────────────────────────────────

export type GrievanceType = 'tag_dispute' | 'salary_grievance' | 'discipline_appeal';
export type GrievanceOutcome = 'upheld' | 'denied' | 'settled';
export type WorkStoppageType = 'holdout_wave' | 'practice_boycott' | 'lockout';
export type LaborEventType = 'union_statement' | 'owner_response' | 'media_leak' | 'mediation_call';

export interface Grievance {
  playerId: string;
  type: GrievanceType;
  filed: number;
  resolved: number | null;
  outcome: GrievanceOutcome | null;
}

export interface WorkStoppage {
  type: WorkStoppageType;
  severity: 1 | 2 | 3;
  startWeek: number;
  resolvedWeek: number | null;
  affectedTeams: string[];
  moralePenalty: number;
}

export interface WorkStoppageCheck {
  triggered: boolean;
  stoppage: WorkStoppage | null;
  playerOvrPenalty: number;
  summary: string;
}

export interface WorkStoppageResolution {
  labor: LaborState;
  resolved: boolean;
  summary: string;
}

export interface LaborEvent {
  type: LaborEventType;
  description: string;
  impact: {
    satisfaction?: number;
    morale?: number;
  };
}

export interface LaborState {
  unionSatisfaction: number;
  playerRepId: string | null;
  grievances: Grievance[];
  activeStoppage: WorkStoppage | null;
  laborEvents: LaborEvent[];
}
