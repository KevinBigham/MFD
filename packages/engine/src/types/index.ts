/**
 * MFD Core Types
 *
 * Shared TypeScript type definitions for the engine layer.
 * These types define the shape of all game state.
 */

// ── Positions ───────────────────────────────────────────

export type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'DL' | 'LB' | 'CB' | 'S' | 'K' | 'P';
export type PositionSide = 'O' | 'D' | 'K';

// ── Player ──────────────────────────────────────────────

export interface PlayerRatings {
  [key: string]: number;
}

export type DevTrait = 'normal' | 'star' | 'superstar' | 'x-factor';
export type CliqueId = 0 | 1 | 2;

export interface Personality {
  workEthic: number;  // 1-10
  loyalty: number;    // 1-10
  greed: number;      // 1-10
  pressure: number;   // 1-10
  ambition: number;   // 1-10
}

export type TraitId =
  | 'loyal' | 'mercenary' | 'captain' | 'cancer' | 'clutch' | 'glass'
  | 'workhorse' | 'gym_rat' | 'mentor' | 'hothead' | 'showtime' | 'film_junkie'
  | 'vocal_leader' | 'holdout' | 'party_animal' | 'ego'
  | 'hometown_hero' | 'late_bloomer' | 'ironman' | 'chip'
  | 'media_darling' | 'streaky' | 'stat_padder' | 'comeback_kid';

export interface PlayerArchetype {
  archetype: string;
  label: string;
  description: string;
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  pos: Position;
  age: number;
  ovr: number;
  pot: number;
  ratings: PlayerRatings;
  devTrait: DevTrait;
  personality: Personality;
  traits: TraitId[];
  archetype: PlayerArchetype | null;
  contract: Contract | null;
  teamId: string | null;
  draftYear: number;
  draftRound: number;
  draftPick: number;
  college: string;
  yearsExp: number;
  careerStats: CareerStats;
  traitMilestones: Record<string, boolean>;
  traitPowerLevel: Record<string, number>;
  injury: Injury | null;
  morale: number;
  chemistry: number;
  systemFit: number;
  cliqueId: CliqueId | null;
  jerseyNumber: number;
  endorsements: EndorsementDeal[];
  isStarter: boolean;
  role: string | null;
  roleWeeks: number;
  tradeBlock: boolean;
  holdout: boolean;
  agentId: string | null;
  stats: PlayerSeasonStats;
}

export interface PlayerSeasonStats {
  gamesPlayed: number;
  passYds: number;
  passTD: number;
  passINT: number;
  passAtt: number;
  passComp: number;
  rushYds: number;
  rushAtt: number;
  rushTD: number;
  fumbles: number;
  rec: number;
  recYds: number;
  recTD: number;
  targets: number;
  sacks: number;
  defINT: number;
  tackles: number;
  fgMade: number;
  fgAtt: number;
  yacYds: number;
  [key: string]: number;
}

export interface CareerStats {
  seasons: number;
  gp: number;
  snaps: number;
  [key: string]: number;
}

export type InjuryType =
  | 'hamstring'
  | 'knee_sprain'
  | 'ankle_sprain'
  | 'concussion'
  | 'acl'
  | 'shoulder'
  | 'back'
  | 'foot'
  | 'hand'
  | 'ribs'
  | 'groin'
  | 'quad';

export type InjurySeverityTier = 'minor' | 'moderate' | 'severe' | 'season_ending';

export interface InjuryDetail {
  id: string;
  type: InjuryType | string;
  severity: 'questionable' | 'doubtful' | 'out' | 'ir';
  severityTier: InjurySeverityTier;
  gamesOut: number;
  gamesRecovered: number;
  reinjuryRisk: number;
  affectedRatings: string[];
  ratingPenalty: number;
  onIR: boolean;
}

export type Injury = InjuryDetail;

// ── Contracts ───────────────────────────────────────────

export type GuaranteeType = 'GAS' | 'RDG' | 'VT';

export interface BonusSlice {
  sourceOp: 'signing' | 'restructure' | 'backload' | 'extension';
  season: number;
  amount: number;
}

export interface GuaranteeEntry {
  year: number;
  type: GuaranteeType;
  amount: number;
  vestedAt?: string;
}

export interface RookieSlot {
  tier: number;
  salary: number;
  years: number;
  signingBonus: number;
  guaranteed: number;
  optionYear: boolean;
}

export interface Contract {
  playerId: string;
  teamId: string;
  years: number;
  totalValue: number;
  yearlyBreakdown: ContractYear[];
  baseSalary: number;
  guaranteed: number;
  signingBonus: number;
  prorated: number;
  originalYears: number;
  voidYears: number;
  restructured: boolean;
  franchiseTag: FranchiseTagType | null;
  incentives: Incentive[];
  slices?: BonusSlice[];
  guaranteeSchedule?: GuaranteeEntry[];
}

export interface ContractYear {
  year: number;
  baseSalary: number;
  capHit: number;
  deadCap: number;
  guaranteed: boolean;
  guaranteeType?: GuaranteeType;
}

export type FranchiseTagType = 'exclusive' | 'non-exclusive' | 'transition';

export interface Incentive {
  type: string;
  threshold: number;
  bonus: number;
  achieved: boolean;
}

// ── Teams ───────────────────────────────────────────────

export type MarketSize = 'small' | 'medium' | 'large' | 'mega';

export interface StadiumDeal {
  sponsorName: string;
  revenuePerYear: number;
  yearsTotal: number;
  yearsRemaining: number;
  prestigeBonus: number;
}

export interface RelocationRecord {
  fromCity: string;
  fromName: string;
  toCity: string;
  toName: string;
  year: number;
}

export interface FranchiseIdentity {
  fanbase: number;
  prestige: number;
  marketSize: MarketSize;
  marketModifier: number;
  stadiumName: string;
  stadiumDeal: StadiumDeal | null;
  stadiumLevel: 1 | 2 | 3;
  attendance: number;
  relocationHistory: RelocationRecord[];
}

export interface RelocationDestination {
  city: string;
  teamName: string;
  abbr: string;
  marketSize: MarketSize;
  marketModifier: number;
  fanbaseStart: number;
  prestigeBonus: number;
  cost: number;
  stadiumType: 'dome' | 'outdoor';
  description: string;
}

export interface StadiumSponsor {
  name: string;
  baseRevenue: number;
  baseDuration: number;
  prestigeBonus: number;
}

export interface ExpansionCity {
  city: string;
  name: string;
  abbr: string;
  marketSize: MarketSize;
  marketModifier: number;
  stadiumType: 'dome' | 'outdoor';
}

export interface ExpansionDraftState {
  expansionTeam: {
    city: string;
    name: string;
    abbr: string;
    conference: 'AFC' | 'NFC';
    division: string;
  };
  protectedPlayers: Record<string, string[]>;
  availablePlayers: Player[];
  selectedPlayers: Player[];
  picksRemaining: number;
  phase: 'protection' | 'drafting' | 'complete';
}

export interface OwnerState {
  archetypeId: OwnerArchetypeId;
  label: string;
  approval: number;
  history: OwnerHistoryEntry[];
}

export type OwnerArchetypeId =
  | 'win_now' | 'patient_builder' | 'profit_first'
  | 'fan_favorite' | 'legacy_builder';

export interface OwnerHistoryEntry {
  year: number;
  week: number;
  approval: number;
  delta: number;
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'HC' | 'OC' | 'DC';
  archetype: string;
  traits: string[];
  ratings: Record<string, number>;
  level: number;
  age?: number;
  specialty75?: CoordinatorSpecialty | null;
  term?: number;
  buyoutPenalty?: number;
  loyalty?: number;
  ambition?: number;
  schemeLean?: {
    offense: string;
    defense: string;
  };
  lastHiredYear?: number;
}

export interface CoordinatorSpecialty {
  id: string;
  label: string;
  icon: string;
  effect: Record<string, number>;
  desc: string;
}

export interface TeamStaff {
  hc: StaffMember | null;
  oc: StaffMember | null;
  dc: StaffMember | null;
}

export type GmStrategy = 'rebuild' | 'contend' | 'neutral';

export interface TradeState {
  gmTrustByTeam: Record<string, number>;
  recentTrades: { classification: 'fleece' | 'fair' | 'overpay' }[];
}

export interface TransactionLogEntry {
  type: string;
  year: number;
  week: number;
  playerId?: string;
  fromTeamId?: string;
  toTeamId?: string;
  notes?: string;
}

export interface ClinicState {
  xp: Record<string, number>;
  perks: string[];
}

export interface CliqueState {
  id: CliqueId;
  label: string;
  playerIds: string[];
  cohesion: number;
  influence: number;
}

export type CaptainPerk =
  | 'rally_cry'
  | 'mentor_boost'
  | 'hazing_shield'
  | 'clutch_aura'
  | 'media_shield';

export interface CaptainState {
  playerId: string;
  playerName: string;
  captainMoments: number;
  rallyCooldown: number;
  perks: CaptainPerk[];
}

export interface LockerRoomTension {
  id: string;
  type: 'clique_beef' | 'contract_envy' | 'playing_time' | 'rookie_hazing' | 'star_demands' | 'captain_challenge';
  involvedPlayerIds: string[];
  involvedCliqueIds: CliqueId[];
  severity: 'minor' | 'moderate' | 'serious';
  weekCreated: number;
  resolved: boolean;
  narrative: string;
}

export interface LockerRoomState {
  cliques: CliqueState[];
  captains: CaptainState[];
  culture: 'toxic' | 'fragile' | 'stable' | 'strong' | 'elite';
  cultureScore: number;
  tensions: LockerRoomTension[];
  lastMeetingWeek: number | null;
}

export interface CoachSkillSelection {
  branch: string;
  tier: number;
  archForLookup?: string;
}

export interface DeadCapByYear {
  [year: number]: number;
}

export interface Team {
  id: string;
  city: string;
  name: string;
  abbr: string;
  icon: string;
  conference: 'AFC' | 'NFC';
  division: string;
  roster: Player[];
  capSpace: number;
  capUsed: number;
  deadCap: number;
  deadCapByYear: DeadCapByYear;
  wins: number;
  losses: number;
  ties: number;
  streak: number;
  offScheme: string;
  defScheme: string;
  schemeOff: string;
  schemeDef: string;
  coachingStaff: CoachingStaff;
  staff: TeamStaff;
  ownerId: string;
  owner: OwnerState;
  ownerMood: number;
  ownerPatience80: number;
  gmStrategy: GmStrategy;
  draftPicks: DraftPick[];
  rivalries: Rivalry[];
  rivals: Record<string, { heat: number }>;
  franchiseTag973: FranchiseTagState | null;
  franchiseTags?: FranchiseTagState[];
  isUser: boolean;
  clinic: ClinicState;
  skillSelections: Record<string, CoachSkillSelection>;
  tradeState: TradeState;
  txLog: TransactionLogEntry[];
  seasonStats: TeamSeasonStats;
  mentoringPairs: MentoringPair[];
  trainingAssignments: Record<string, TrainingAssignment>;
  medicalStaff: MedicalStaff | null;
  fatigueState: Record<string, FatigueState>;
  facilityState: FacilityState;
  practiceSquad: PracticeSquadPlayer[];
  stadiumType: 'dome' | 'outdoor';
  franchiseIdentity: FranchiseIdentity;
  lockerRoom: LockerRoomState;
  retiredJerseys: JerseyRetirement[];
  specialTeams?: SpecialTeamsState;
  staffChemistry?: import('../systems/coordinator-chemistry').StaffChemistry;
  positionCoaches?: import('../systems/position-coaches').PositionCoachStaff;
}

export interface FranchiseTagState {
  playerId: string;
  playerName: string;
  pos: Position;
  salary: number;
  year: number;
  reaction: string;
}

export interface CoachingStaff {
  hc: Coach | null;
  oc: Coach | null;
  dc: Coach | null;
}

export interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  role: 'HC' | 'OC' | 'DC';
  archetype: string;
  traits: string[];
  skillTree: Record<string, number>;
  xp: number;
  reputation: number;
  tenure: number;
}

export interface Rivalry {
  teamId: string;
  heat: number;    // 0-100, higher = more intense
  trophyName: string | null;
  history: RivalryResult[];
}

export interface RivalryResult {
  year: number;
  week: number;
  winner: string;
  score: string;
}

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

export interface CoachCareerTeamHistory {
  teamId: string;
  startYear: number;
  endYear: number;
  wins: number;
  losses: number;
  championships: number;
}

export interface CoachCareerHistory {
  coachId: string;
  name: string;
  archetype: string;
  age: number;
  seasonsCoached: number;
  wins: number;
  losses: number;
  championships: number;
  awards: number;
  retired: boolean;
  teams: CoachCareerTeamHistory[];
}

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

// ── Draft ───────────────────────────────────────────────

export interface DraftPick {
  round: number;
  pick: number;
  originalTeamId: string;
  currentTeamId: string;
  year: number;
  isCompPick: boolean;
}

export interface Scout {
  id: string;
  name: string;
  tier: 'elite' | 'good' | 'average' | 'poor';
  specialty: Position | null;
  scope: 'national' | 'regional';
  region: 'east' | 'south' | 'midwest' | 'west' | null;
  salary: number;
  accuracy: number;
}

export interface ScoutingDepartment {
  scouts: Scout[];
  availableScouts: Scout[];
  budget: number;
  maxScouts: number;
  privateWorkoutsRemaining: number;
}

export type ScoutingRegion = 'east' | 'south' | 'midwest' | 'west';
export type ProspectRiskBand = 'unknown' | 'safe' | 'balanced' | 'volatile';
export type ProspectCeilingBand = 'unknown' | 'starter' | 'impact' | 'star';
export type ProspectCharacterRead = 'unknown' | 'leader' | 'steady' | 'mercurial' | 'red_flag';

export interface MedicalStaff {
  id: string;
  name: string;
  tier: 'elite' | 'good' | 'average' | 'poor';
  salary: number;
  recoveryBonus: number;
  preventionBonus: number;
}

export interface FatigueState {
  playerId: string;
  fatigue: number;
  weeklySnaps: number[];
  seasonSnaps: number;
  restWeeks: number;
  conditioningBonus: number;
}

export type FacilityType =
  | 'training_complex'
  | 'medical_center'
  | 'film_room'
  | 'weight_room'
  | 'recovery_suite';

export interface FacilityEffect {
  trainingXPBonus: number;
  recoveryBonus: number;
  injuryPreventionBonus: number;
  scoutingBonus: number;
  moraleBonus: number;
  fatigueGainBonus: number;
}

export interface Facility {
  type: FacilityType;
  level: 1 | 2 | 3;
  effect: FacilityEffect;
}

export interface FacilityState {
  facilities: Facility[];
  budget: number;
  maxFacilities: number;
  upgradeCosts: Record<FacilityType, number[]>;
}

export interface CombineMeasurables {
  fortyYard: number;
  benchPress: number;
  vertical: number;
  broadJump: number;
  threeCone: number;
  shuttle: number;
}

export interface DraftProspect {
  id: string;
  firstName: string;
  lastName: string;
  pos: Position;
  college: string;
  region: ScoutingRegion;
  ratings: PlayerRatings;
  projectedRound: number;
  scoutGrade: number;
  trueGrade: number;
  personality: Personality;
  traits: TraitId[];
  archetype: PlayerArchetype | null;
  characterArchetype: string;
  bustProbability: number;
  stealProbability: number;
  scoutingReports: ScoutingReport[];
  combine: CombineMeasurables | null;
}

export type EndorsementRequirement =
  | { type: 'min_ovr'; value: number }
  | { type: 'min_games'; value: number }
  | { type: 'no_suspension'; value: true }
  | { type: 'team_wins'; value: number };

export interface EndorsementDeal {
  id: string;
  playerId: string;
  brandName: string;
  revenuePerYear: number;
  yearsTotal: number;
  yearsRemaining: number;
  tier: 'local' | 'regional' | 'national' | 'global';
  moraleBonus: number;
  requirement: EndorsementRequirement;
  active: boolean;
}

export interface EndorsementBrand {
  name: string;
  tier: 'local' | 'regional' | 'national' | 'global';
  baseRevenue: number;
  baseDuration: number;
  positionPreference: Position[] | null;
  ovrThreshold: number;
}

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

export interface ScoutingReport {
  type: 'film' | 'combine' | 'interview';
  accuracy: number;
  grade: number;
  notes: string;
}

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

export type ScoutingAction = 'film' | 'combine' | 'interview' | 'private_workout';

export interface ProspectScoutingState {
  prospectId: string;
  actions: ScoutingAction[];
  accuracy: number;
  confidence: number;
  visibleScoutGrade: number;
  notes: string[];
  proDayRating: string | null;
  assignedScoutId: string | null;
  riskBand: ProspectRiskBand;
  ceilingBand: ProspectCeilingBand;
  characterRead: ProspectCharacterRead;
  privateWorkoutRatings: string[];
}

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

export interface PracticeSquadPlayer {
  playerId: string;
  elevationsUsed: number;
  maxElevations: number;
  isElevated?: boolean;
  elevatedWeek?: number;
}

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

export type NewsType =
  | 'trade'
  | 'signing'
  | 'cut'
  | 'injury'
  | 'record'
  | 'coaching'
  | 'rivalry'
  | 'milestone'
  | 'draft'
  | 'waiver'
  | 'governance'
  | 'labor';

export interface NewsItem {
  id: string;
  year: number;
  week: number;
  type: NewsType;
  headline: string;
  body: string;
  teamIds: string[];
  playerIds: string[];
  importance: 'breaking' | 'major' | 'minor';
}

export type SocialPostSource = 'player' | 'fan' | 'analyst' | 'reporter' | 'team';

export type SocialTrigger =
  | 'big_play'
  | 'record'
  | 'trade'
  | 'signing'
  | 'injury'
  | 'draft_pick'
  | 'achievement'
  | 'upset'
  | 'rivalry'
  | 'milestone'
  | 'weekly'
  | 'governance'
  | 'labor';

export interface SocialPost {
  id: string;
  source: SocialPostSource;
  authorName: string;
  authorPlayerId?: string;
  content: string;
  trigger: SocialTrigger;
  sentiment: 'positive' | 'negative' | 'neutral' | 'hype' | 'sarcastic';
  likes: number;
  timestamp: number;
  replyTo?: string;
}

export type TrainingFocus = 'film_study' | 'position_drills' | 'conditioning' | 'mentorship' | 'rest';

export interface TrainingAssignment {
  playerId: string;
  focus: TrainingFocus;
  weeksAssigned: number;
  xpGained: number;
  focusXp: Record<TrainingFocus, number>;
}

export interface DifficultyAdjustment {
  week: number;
  delta: number;
  reason: string;
}

export interface DifficultyState {
  enabled: boolean;
  adaptiveSlider: number;
  recentUserResults: { week: number; result: 'win' | 'loss' }[];
  currentStreak: number;
  adjustmentHistory: DifficultyAdjustment[];
}

export interface AdvancedStats {
  qbr: number;
  epa: number;
  successRate: number;
  yac: number;
  pressureRate: number;
  thirdDownRate: number;
  redZoneRate: number;
  turnoverRate: number;
}

export interface PlayoffMomentum {
  teamId: string;
  momentum: number;
  narrativeTag: 'cinderella' | 'dynasty' | 'revenge' | 'hot_streak' | 'defending_champ' | 'underdog' | null;
  winStreak: number;
}

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetScreen: string;
  targetElement: string | null;
  action: string | null;
  completed: boolean;
}

export interface TutorialState {
  active: boolean;
  currentStepIndex: number;
  steps: TutorialStep[];
  completedSteps: string[];
  dismissed: boolean;
}

export interface AchievementCondition {
  type: string;
  threshold: number | string | boolean;
}

export type AchievementCategory =
  | 'dynasty'
  | 'roster'
  | 'draft'
  | 'financial'
  | 'coaching'
  | 'narrative'
  | 'records'
  | 'milestones'
  | 'hidden';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  condition: AchievementCondition;
  unlockedYear: number | null;
  unlockedWeek: number | null;
  icon: string;
}

export interface AchievementProgress {
  achievementId: string;
  current: number;
  target: number;
  percentage: number;
  label: string;
  hidden: boolean;
  complete: boolean;
}

export type DashboardWidget =
  | 'team_record'
  | 'next_game'
  | 'injury_report'
  | 'fatigue_watch'
  | 'cap_snapshot'
  | 'power_ranking'
  | 'promise_tracker'
  | 'training_report'
  | 'league_headlines'
  | 'record_watch'
  | 'rivalry_watch'
  | 'coaching_news'
  | 'waiver_wire'
  | 'weather_forecast'
  | 'achievement_progress'
  | 'dynasty_score'
  | 'dynasty_window'
  | 'playoff_picture'
  | 'stat_leaders';

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  columns: 2 | 3;
}

export interface DashboardState {
  activeLayoutId: string;
  layouts: DashboardLayout[];
  pinnedWidgets: DashboardWidget[];
}

export interface AgentProfile {
  id: string;
  name: string;
  style: 'hardball' | 'collaborative' | 'media_savvy' | 'old_school';
  demandMultiplier: number;
  patienceModifier: number;
  clients: string[];
}

export interface NarrativeBeat {
  week: number;
  type: 'positive' | 'negative' | 'neutral';
  intensity: number;
  source: string;
}

export interface NarrativeIntensity {
  current: number;
  recentBeats: NarrativeBeat[];
  cooldownWeeks: number;
}

export type CeremonyType =
  | 'championship'
  | 'awards_night'
  | 'hall_of_fame_induction'
  | 'ring_ceremony'
  | 'jersey_retirement';

export interface CeremonyHighlight {
  label: string;
  value: string;
  playerIds: string[];
}

export interface Ceremony {
  id: string;
  type: CeremonyType;
  year: number;
  headline: string;
  description: string;
  highlights: CeremonyHighlight[];
  mvp: string | null;
}

export interface PlayerRivalryEvent {
  year: number;
  week: number;
  description: string;
  intensityDelta: number;
}

export interface PlayerRivalry {
  id: string;
  playerAId: string;
  playerBId: string;
  playerAName: string;
  playerBName: string;
  teamAId: string;
  teamBId: string;
  intensity: number;
  tier: 'budding' | 'heated' | 'nemesis';
  origin: string;
  history: PlayerRivalryEvent[];
  seasonStarted: number;
}

export interface FarewellMoment {
  week: number;
  type: 'standing_ovation' | 'gift_exchange' | 'emotional_speech' | 'final_home_game' | 'final_game';
  narrative: string;
  opponent: string;
}

export interface FarewellTour {
  playerId: string;
  playerName: string;
  teamId: string;
  finalSeason: boolean;
  announcedWeek: number;
  moments: FarewellMoment[];
}

export interface JerseyRetirement {
  id: string;
  playerId: string;
  playerName: string;
  pos: Position;
  jerseyNumber: number;
  teamId: string;
  year: number;
  peakOvr: number;
  seasonsWithTeam: number;
  championships: number;
  headline: string;
  ceremony: string;
  legacyScore: number;
}

export interface LeagueRuleHistoryGroup {
  key: LeagueRuleKey;
  label: string;
  changes: RuleChangeRecord[];
}

export interface DynastyEvent {
  id: string;
  year: number;
  week: number | null;
  type: 'championship' | 'draft_pick' | 'trade' | 'signing' | 'firing' | 'record' | 'award' | 'hof' | 'milestone';
  headline: string;
  importance: 'landmark' | 'major' | 'minor';
  playerIds: string[];
  teamIds: string[];
}

export type TradeProposalStatus = 'draft' | 'sent' | 'countered' | 'accepted' | 'rejected';

export interface TradeProposal {
  id: string;
  fromTeamId: string;
  toTeamId: string;
  offering: TradeOfferAsset[];
  requesting: TradeOfferAsset[];
  status: TradeProposalStatus;
  counterOffer: TradeProposal | null;
  aiResponse: string;
  valueDiff: number;
}

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

export type OffensiveGamePlan = 'balanced' | 'pass_heavy' | 'run_heavy' | 'spread' | 'power';
export type DefensiveGamePlan = 'base' | 'blitz_heavy' | 'coverage' | 'contain' | 'aggressive';

export interface GamePlan {
  offensiveScheme: OffensiveGamePlan;
  defensiveScheme: DefensiveGamePlan;
  keyMatchup: { playerA: string; playerB: string } | null;
  gamePlanBonus: number;
}

export interface OpponentReport {
  teamId: string;
  teamName: string;
  record: string;
  year: number;
  week: number;
  offenseRank: number;
  defenseRank: number;
  strengths: string[];
  weaknesses: string[];
  keyPlayers: Player[];
  vulnerabilityRatings: Record<'passing' | 'rushing' | 'pass_rush' | 'coverage', number>;
  schemeRecommendation: {
    offense: OffensiveGamePlan;
    defense: DefensiveGamePlan;
    reasoning: string;
  };
}

export interface DraftRecapPick {
  playerId: string;
  teamId: string;
  playerName: string;
  position: Position;
  ovr: number;
  round: number;
  pick: number;
  projectedPick: number;
  valueDelta: number;
  verdict: 'steal' | 'reach' | 'fair';
}

export interface DraftRecap {
  year: number;
  teamId: string;
  picks: DraftRecapPick[];
  classGrade: string;
  bestValue: DraftRecapPick;
  biggestReach: DraftRecapPick;
  steals: DraftRecapPick[];
  leagueHighlights: DraftRecapPick[];
}

export type ReportCardGrade = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
export type PositionGroup = 'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'DL' | 'LB' | 'CB' | 'S' | 'K' | 'P';

export interface PositionGroupGrade {
  group: PositionGroup;
  grade: ReportCardGrade;
  avgOvr: number;
  starterOvr: number;
  depth: number;
  ageRisk: 'low' | 'medium' | 'high';
  topPlayer: Player | null;
  weakestStarter: Player | null;
}

export interface TeamNeedsReport {
  overall: string;
  positionGrades: PositionGroupGrade[];
  criticalNeeds: string[];
  strengths: string[];
  draftTargets: string[];
  faTargets: string[];
  capFlexibility: 'tight' | 'moderate' | 'abundant';
}

export interface TeamNeedsComparisonEntry {
  group: PositionGroup;
  teamAGrade: ReportCardGrade;
  teamBGrade: ReportCardGrade;
  edge: 'teamA' | 'teamB' | 'even';
  differential: number;
}

export interface FATarget {
  player: Player;
  projectedSalary: number;
  marketDemand: 'high' | 'medium' | 'low';
  fitScore: number;
  signProbability: number;
  competingTeams: string[];
}

export interface FATargetBoard {
  watchlist: string[];
  targets: FATarget[];
  topAvailable: FATarget[];
  bestFits: FATarget[];
  bargains: FATarget[];
}

export interface FATargetBoardState {
  teamId: string | null;
  watchlist: string[];
  targets: FATarget[];
}

export interface TradePackage {
  offering: TradeOfferAsset[];
  requesting: TradeOfferAsset[];
  type: 'pick_for_player' | 'player_for_player' | 'mixed';
}

export interface TradeSuggestion {
  partner: string;
  offer: TradePackage;
  reasoning: string;
  valueGap: number;
  acceptanceLikelihood: number;
  need: Position | null;
}

export interface DraftTradeOffer {
  from: string;
  targetPick: number;
  offer: TradePackage;
  urgency: 'desperate' | 'interested' | 'casual';
  reasoning: string;
}

export interface TradeUpEvaluation {
  cost: TradePackage;
  worthIt: boolean;
  reasoning: string;
}

export interface TradeDownEvaluation {
  haul: TradePackage;
  bestAvailableAfter: Player[];
}

export interface WarRoomState {
  currentPick: number;
  onTheClock: string;
  timeRemaining: number;
  incomingOffers: DraftTradeOffer[];
  userCanTradeUp: Array<{ targetPick: number; cost: TradePackage }>;
  draftGrade: string;
}

export interface ExtensionOffer {
  playerId: string;
  newYears: number;
  newAvgSalary: number;
  guaranteedAmount: number;
  signingBonus: number;
  capHitByYear: number[];
}

export interface ExtensionEvaluation {
  playerAccepts: boolean;
  counterOffer?: ExtensionOffer;
  reasoning: string;
}

export interface ContractExtensionRecord {
  playerId: string;
  teamId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'countered';
  offer: ExtensionOffer;
  counterOffer: ExtensionOffer | null;
  reasoning: string;
  year: number;
  week: number;
}

export interface CapProjectionYear {
  year: number;
  totalCap: number;
  committedCap: number;
  deadCap: number;
  freeSpace: number;
}

// ── Owner ───────────────────────────────────────────────

export interface Owner {
  id: string;
  name: string;
  archetype: string;
  patience: number;       // 0-100
  goals: SeasonGoals;
  personality: OwnerPersonality;
}

export interface SeasonGoals {
  floor: string;
  target: string;
  ceiling: string;
}

export interface OwnerPersonality {
  spending: number;       // 1-10
  patience: number;       // 1-10
  mediaAwareness: number; // 1-10
}

export type PlayDescriptionType =
  | 'run'
  | 'pass'
  | 'sack'
  | 'turnover'
  | 'penalty'
  | 'fieldGoal'
  | 'punt'
  | 'kickoff'
  | 'touchdown'
  | 'safety';

export interface PlayDescription {
  type: PlayDescriptionType;
  yardsGained: number;
  playerIds: string[];
  commentary: string;
  excitement: number;
  isBigPlay: boolean;
  isClutch: boolean;
}

export interface DriveNarrative {
  plays: PlayDescription[];
  startYardLine: number;
  endResult: 'touchdown' | 'fieldGoal' | 'punt' | 'turnover' | 'endOfHalf' | 'turnoverOnDowns';
  yardsTotal: number;
  timeElapsed: number;
  narrative: string;
  teamId?: string;
}

export interface BroadcastOutput {
  gameId: string;
  quarters: DriveNarrative[][];
  highlights: PlayDescription[];
  mvpPlayerIds: string[];
  momentumSwings: Array<{
    quarter: number;
    play: number;
    description: string;
  }>;
  broadcastNetwork: string;
  finalNarrative: string;
  ghostLines?: Array<{ commentatorName: string; commentary: string; trigger: string }>;
}

// ── Game Simulation ─────────────────────────────────────

export interface GameResult {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  week: number;
  year: number;
  overtime: boolean;
  mvpPlayerId: string | null;
  stats: GameStats;
  weather?: WeatherCondition | null;
  matchupHighlight?: MatchupHighlight | null;
  broadcastNetwork?: BroadcastNetwork | null;
  broadcast?: BroadcastOutput;
  primetime?: boolean;
  flexed?: boolean;
  specialTeams?: Record<string, SpecialTeamsGameSummary>;
  playerMatchupEvents: PlayerMatchupEvent[];
}

export interface GameStats {
  [teamId: string]: TeamGameStats;
}

export interface PlayerGameLine {
  playerId: string;
  name: string;
  pos: Position;
  passAtt?: number;
  passComp?: number;
  passYds?: number;
  passTD?: number;
  passINT?: number;
  sacked?: number;
  rushAtt?: number;
  rushYds?: number;
  rushTD?: number;
  fumbles?: number;
  targets?: number;
  rec?: number;
  recYds?: number;
  recTD?: number;
  tackles?: number;
  sacks?: number;
  defINT?: number;
  fgAtt?: number;
  fgMade?: number;
  snaps?: number;
}

export interface TeamGameStats {
  totalYards: number;
  passingYards: number;
  rushingYards: number;
  turnovers: number;
  sacks: number;
  pressuresAllowed: number;
  thirdDownConversions: number;
  thirdDownAttempts: number;
  timeOfPossession: number;
  // Full box score fields
  passAttempts: number;
  passCompletions: number;
  passTDs: number;
  interceptions: number;
  rushAttempts: number;
  rushTDs: number;
  fumbles: number;
  penalties: number;
  penaltyYards: number;
  fgMade: number;
  fgAttempted: number;
  punts: number;
  drives: number;
  yacYards: number;
  redZoneTrips: number;
  redZoneScores: number;
  quarterScores: [number, number, number, number, ...number[]];
  playerLines: PlayerGameLine[];
}

export interface SpecialTeamsGameSummary {
  kickReturnYards: number;
  puntReturnYards: number;
  returnTouchdowns: number;
  returnFumbles: number;
  touchbacks: number;
  netPuntAverage: number;
  highlights: string[];
}

export interface PlayerMatchupEvent {
  type: 'interception' | 'sack' | 'fumble';
  offensePlayerId: string;
  defensePlayerId: string;
  quarter: number;
}

export interface TeamSeasonStats {
  gamesPlayed: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  totalYards: number;
  passingYards: number;
  rushingYards: number;
  turnoversLost: number;
  turnoversForced: number;
  sacksFor: number;
  sacksAgainst: number;
  drives: number;
  thirdDownConversions: number;
  thirdDownAttempts: number;
  timeOfPossession: number;
  fgMade: number;
  fgAttempted: number;
  punts: number;
  pressuresAllowed: number;
  yacYards: number;
  redZoneTrips: number;
  redZoneScores: number;
}

export interface WeeklyInjurySummary {
  playerId: string;
  playerName: string;
  severity: Injury['severity'];
  gamesOut: number;
  type: string;
}

export interface WeeklySummary {
  id: string;
  year: number;
  week: number;
  phase: SeasonPhase;
  teamId: string;
  opponentTeamId: string | null;
  opponentName: string;
  result: 'win' | 'loss' | 'tie' | 'pending';
  teamScore: number | null;
  opponentScore: number | null;
  record: string;
  headline: string;
  ownerDelta: number;
  injuries: WeeklyInjurySummary[];
  mvpPlayerId: string | null;
  notes: string[];
}

export interface ScenarioObjective {
  id: string;
  description: string;
  type: 'wins' | 'championship' | 'cap_space' | 'roster_ovr' | 'draft_pick' | 'record' | 'playoffs' | 'custom';
  target: number;
  completed: boolean;
}

export type ScenarioDifficulty = 'rookie' | 'pro' | 'all_pro' | 'hall_of_fame';

export interface ScenarioConstraints {
  blockTrades: boolean;
  blockFreeAgency: boolean;
  blockDraft: boolean;
  forcedDifficulty?: DifficultyLevel;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  tagline: string;
  description: string;
  difficulty: ScenarioDifficulty;
  seasonLimit: number;
  objectives: ScenarioObjective[];
  bonusObjectives: ScenarioObjective[];
  constraints: ScenarioConstraints;
}

export interface ScenarioState {
  activeScenario?: ScenarioDefinition;
  scenarioSeason: number;
  completedScenarios: Array<{
    id: string;
    score: number;
    grade: string;
  }>;
}

export interface GameDayNote {
  label: string;
  detail: string;
}

export interface GameDayTurningPoint extends GameDayNote {
  impact: 'positive' | 'negative' | 'neutral';
}

export interface GameDayTopPerformer {
  playerId: string | null;
  label: string;
  statLine: string;
}

export interface GameDayCeremony {
  title: string;
  subtitle: string;
}

export interface GameDayPressConference {
  theme: string;
  opener: string;
  quotes: string[];
  speaker: string;
  tone: PressConferenceTone;
  topic: string;
  reporterQuestions: ReporterQuestion[];
}

export interface GameDayAutopsy {
  diagnosis: string;
  leverage: string;
  nextFocus: string[];
}

export interface GameDayPackage {
  id: string;
  year: number;
  week: number;
  phase: SeasonPhase;
  teamId: string;
  opponentTeamId: string | null;
  headline: string;
  result: WeeklySummary['result'];
  finalScore: string;
  stakes: GameDayNote[];
  turningPoints: GameDayTurningPoint[];
  topPerformers: GameDayTopPerformer[];
  injuryNotes: string[];
  ceremony: GameDayCeremony | null;
  pressConference: GameDayPressConference;
  rivalry: RivalryGameContext | null;
  activeEffectSummaries: string[];
  autopsy: GameDayAutopsy;
  weather?: WeatherCondition | null;
  matchupHighlight?: MatchupHighlight | null;
  broadcastNetwork?: BroadcastNetwork | null;
  primetime?: boolean;
  flexed?: boolean;
  specialTeamsHighlights?: string[];
  prepGrade?: string | null;
  coachingNotes?: string[];
  carryForwardRecommendations?: string[];
  recordsMoments: BrokenRecord[];
  milestoneMoments: MilestoneReached[];
}

export type StaffRole = StaffMember['role'];

export interface StaffCandidate extends StaffMember {
  desiredRole: StaffRole;
  fitScore: number;
  continuityTag: 'ideal' | 'strong' | 'transition' | 'risky';
  reasoning: string[];
}

export interface CoachingMarketState {
  teamId: string | null;
  updatedYear: number;
  updatedWeek: number;
  hotSeat: boolean;
  candidates: Record<StaffRole, StaffCandidate[]>;
}

export interface TeamIdentityRoom {
  group: string;
  fitScore: number;
  topPlayerId: string | null;
  topPlayerName: string;
}

export interface TeamIdentitySnapshot {
  teamId: string;
  offenseScheme: string;
  defenseScheme: string;
  overallFit: number;
  continuity: number;
  rooms: TeamIdentityRoom[];
}

export interface SchemeInstallLane {
  from: string;
  to: string;
  installProgress: number;
  continuityBonus: number;
  transitionPenalty: number;
}

export interface SchemeInstallState {
  teamId: string;
  overallContinuity: number;
  offense: SchemeInstallLane;
  defense: SchemeInstallLane;
  snapshot: TeamIdentitySnapshot;
}

export interface OpponentIntel {
  teamId: string;
  opponentTeamId: string;
  baseReport: OpponentReport;
  dangerPlayers: Player[];
  weakLinks: Player[];
  attackLane: 'passing' | 'rushing';
  defendLane: 'passing' | 'rushing';
  tendencies: string[];
  recommendations: {
    offense: string[];
    defense: string[];
  };
}

export type WeeklyPrepOffensiveFocus = 'balanced' | 'attack_secondary' | 'attack_front' | 'feed_star' | 'protect_qb';
export type WeeklyPrepDefensiveFocus = 'balanced' | 'stop_run' | 'limit_explosive' | 'heat_qb' | 'erase_wr1';
export type WeeklyPracticeIntensity = 'light' | 'normal' | 'full_pads';
export type WeeklyPrepSnapManagement = 'normal' | 'protect_starters' | 'ride_stars';
export type WeeklyPrepSpecialSituation = 'balanced' | 'red_zone' | 'third_down' | 'two_minute' | 'field_position';

export interface WeeklyPrepPlan {
  teamId: string;
  opponentTeamId: string;
  year: number;
  week: number;
  offensiveFocus: WeeklyPrepOffensiveFocus;
  defensiveFocus: WeeklyPrepDefensiveFocus;
  practiceIntensity: WeeklyPracticeIntensity;
  keyMatchupPlayerId: string | null;
  snapManagement: WeeklyPrepSnapManagement;
  specialSituation: WeeklyPrepSpecialSituation;
}

export interface WeeklyPrepEffects {
  teamOvrBonus: number;
  playerBonuses: Record<string, number>;
  fatigueDelta: number;
  injuryRiskDelta: number;
  moraleDelta: number;
  chemistryDelta: number;
}

export interface WeeklyPrepOutcome {
  teamId: string;
  opponentTeamId: string;
  year: number;
  week: number;
  plan: WeeklyPrepPlan;
  readiness: number;
  reasoning: string[];
  effects: WeeklyPrepEffects;
}

export interface CoachRetentionDecision {
  teamId: string;
  role: StaffRole;
  staffId: string;
  poachRisk: number;
  acceptsExtension: boolean;
  askingTerm: number;
  buyoutPenalty: number;
  reasoning: string;
}

export interface CoachDevelopmentDelta {
  teamId: string;
  role: StaffRole;
  staffId: string;
  xpGain: number;
  levelUps: number;
  ratingGrowth: Record<string, number>;
  summary: string;
}

export interface PoachingDeparture {
  teamId: string;
  role: StaffRole;
  staffId: string;
  staffName: string;
  poachRisk: number;
  reason: string;
}

export interface GamePlanExecutionGrade {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  score: number;
  alignedCalls: string[];
  missedCalls: string[];
}

export interface FilmRoomReport {
  id: string;
  teamId: string;
  opponentTeamId: string | null;
  year: number;
  week: number;
  grade: GamePlanExecutionGrade['grade'];
  score: number;
  headline: string;
  planSummary: string;
  alignedCalls: string[];
  missedCalls: string[];
  executionNotes: string[];
  recommendations: string[];
  carryForward: string[];
}

export interface GameDayState {
  recentPackages: GameDayPackage[];
  latestPackageId: string | null;
}

export type PlayoffRound = 'wild_card' | 'divisional' | 'conference' | 'super_bowl';

export interface PlayoffSeed {
  seed: number;
  teamId: string;
  conference: 'AFC' | 'NFC';
  division: string;
  divisionWinner: boolean;
  wins: number;
  losses: number;
  ties: number;
  pointDifferential: number;
}

export interface PlayoffMatchup {
  id: string;
  round: PlayoffRound;
  conference: 'AFC' | 'NFC' | 'NFL';
  week: number;
  homeTeamId: string;
  awayTeamId: string;
  winnerTeamId: string | null;
  result: GameResult | null;
}

export interface PlayoffBracket {
  season: number;
  afc: PlayoffSeed[];
  nfc: PlayoffSeed[];
  matchups: PlayoffMatchup[];
  championTeamId: string | null;
}

// ── Schedule ────────────────────────────────────────────

export type BroadcastNetwork = 'MFN' | 'ESPN8' | 'FOX8' | 'CBS8' | 'NBC8';

export interface SpecialTeamsState {
  kickReturner: string | null;
  puntReturner: string | null;
  longSnapper: string | null;
  kickCoverageUnit: string[];
  puntCoverageUnit: string[];
}

export interface ScheduleWeek {
  week: number;
  games: ScheduledGame[];
}

export interface ScheduledGame {
  homeTeamId: string;
  awayTeamId: string;
  result: GameResult | null;
  weather?: WeatherCondition | null;
  flexed?: boolean;
  primetime?: boolean;
  broadcastNetwork?: BroadcastNetwork | null;
}

// ── Dynasty & Legacy ────────────────────────────────────

export interface RecordEntry {
  category: 'singleGame' | 'singleSeason' | 'career' | 'franchise';
  stat: string;
  value: number;
  teamId: string;
  teamName: string;
  year: number;
  week?: number | null;
  playerId?: string | null;
  playerName?: string | null;
  note?: string;
}

export interface RecordBucket {
  [stat: string]: RecordEntry[];
}

export interface RecordBook {
  singleGame: RecordBucket;
  singleSeason: RecordBucket;
  career: RecordBucket;
  franchise: RecordBucket;
}

export type RecordCategory = keyof RecordBook;

export interface RecordChase {
  playerId: string;
  playerName: string;
  teamId: string;
  stat: string;
  currentValue: number;
  recordValue: number;
  recordHolder: string;
  pace: number;
  category: RecordCategory;
  weeksRemaining: number;
  projected: number;
}

export interface BrokenRecord {
  playerId: string;
  playerName: string;
  teamId: string;
  stat: string;
  newValue: number;
  previousValue: number;
  previousHolder: string;
  category: 'singleGame' | 'singleSeason';
  year: number;
  week: number;
  narrative: string;
}

export interface MilestoneChase {
  playerId: string;
  playerName: string;
  stat: string;
  currentValue: number;
  milestoneValue: number;
  milestoneLabel: string;
  remaining: number;
  pace: number;
}

export interface MilestoneReached {
  playerId: string;
  playerName: string;
  stat: string;
  value: number;
  milestoneLabel: string;
  narrative: string;
  year: number;
  week: number;
}

export interface LeagueLeader {
  playerId: string;
  playerName: string;
  teamId: string;
  teamAbbr: string;
  pos: Position;
  value: number;
  rank: number;
}

export interface CareerLeader {
  playerId: string;
  playerName: string;
  pos: Position;
  value: number;
  rank: number;
  isActive: boolean;
  years: number;
}

export interface PaceProjection {
  stat: string;
  currentValue: number;
  projected: number;
  gamesRemaining: number;
  onRecordPace: boolean;
  recordValue: number;
  recordHolder: string;
  pacePct: number;
}

export interface YearProjection {
  year: number;
  capTotal: number;
  committed: number;
  deadCap: number;
  available: number;
  expiringContracts: string[];
  notes: string[];
}

export interface CapMove {
  type: 'restructure' | 'backload' | 'cut' | 'post_june_1_cut' | 'extend' | 'trade';
  playerId: string;
  params?: {
    voidYears?: number;
    years?: number;
    avgSalary?: number;
  };
}

export interface CapScenario {
  teamId: string;
  originalCapSpace: number;
  originalCapUsed: number;
  originalDeadCap: number;
  contracts: Contract[];
  appliedMoves: CapMove[];
  currentCapSpace: number;
  currentCapUsed: number;
  currentDeadCap: number;
  projections: YearProjection[];
}

export interface CapScenarioResult {
  success: boolean;
  capSpaceBefore: number;
  capSpaceAfter: number;
  capSaved: number;
  deadCapAdded: number;
  yearlyImpact: YearProjection[];
  warnings: string[];
  details: string;
  scenario: CapScenario;
}

export interface CapHealthReport {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  capSpace: number;
  capUsed: number;
  deadCapPct: number;
  topHeavyScore: number;
  flexibilityScore: number;
  futureRisk: number;
  recommendations: string[];
}

export interface CapCandidate {
  playerId: string;
  playerName: string;
  pos: Position;
  capHit: number;
  deadIfCut: number;
  deadIfTraded: number;
  savingsIfCut: number;
  savingsIfTraded: number;
  restructureSavings: number;
  backloadSavings: number;
  recommendation: 'restructure' | 'backload' | 'cut' | 'trade' | 'hold';
}

export interface MultiYearProjection {
  years: YearProjection[];
}

export interface CapDelta {
  year: number;
  currentCommitted: number;
  projectedCommitted: number;
  delta: number;
}

export interface StatLeaderEntry {
  rank: number;
  playerId: string;
  playerName: string;
  teamId: string | null;
  teamAbbr: string;
  pos: Position;
  value: number;
  gamesPlayed: number;
  perGame: number;
}

export interface CareerSeasonEntry {
  year: number;
  teamId: string | null;
  teamAbbr: string;
  age: number;
  ovr: number;
  stats: PlayerSeasonStats;
  awards: string[];
  highlights: string[];
}

export interface CareerTimeline {
  playerId: string;
  playerName: string;
  pos: Position;
  seasons: CareerSeasonEntry[];
}

export interface ComparedPlayer {
  playerId: string;
  playerName: string;
  pos: Position;
  peakOvr: number;
  careerLength: number;
  championships: number;
  mvps: number;
  allPros: number;
  seasons: Array<{
    year: number;
    ovr: number;
    keyStats: Record<string, number>;
  }>;
}

export interface PlayerComparison {
  players: ComparedPlayer[];
  statColumns: string[];
  peakComparison: Record<string, {
    leader: string;
    values: Record<string, number>;
  }>;
}

export interface TeamSeasonSummary {
  year: number;
  wins: number;
  losses: number;
  ties: number;
  playoffResult: string;
  mvpName: string | null;
  keyStats: {
    totalYards: number;
    pointsFor: number;
    pointsAgainst: number;
  };
  era: string | null;
}

export interface LeagueAverageEntry {
  year: number;
  average: number;
  median: number;
  top10Avg: number;
}

export interface PositionRanking {
  rank: number;
  playerId: string;
  playerName: string;
  teamId: string | null;
  ovr: number;
  keyStats: Record<string, number>;
  contractValue: number;
  surplus: number;
}

export interface LeagueStatSnapshot {
  year: number;
  week: number;
  leaders: Record<string, {
    playerId: string;
    playerName: string;
    value: number;
  }>;
  totals: Record<string, number>;
  averages: Record<string, number>;
}

export interface AwardEntity {
  entityId: string;
  entityType: 'player' | 'coach';
  name: string;
  teamId: string | null;
  teamName: string;
  position: Position | 'HC' | 'OC' | 'DC' | null;
  ovr: number;
  stats: Record<string, number | string>;
  score: number;
}

export interface AwardNominee {
  entityId: string;
  entityType: AwardEntity['entityType'];
  name: string;
  teamId: string | null;
  teamName: string;
  position: AwardEntity['position'];
  ovr: number;
  score: number;
  stats: Record<string, number | string>;
}

export interface AwardResult {
  awardId: string;
  label: string;
  winnerId: string;
  winnerName: string;
  winnerTeamId: string | null;
  winnerTeam: string;
  winnerPosition: AwardEntity['position'];
  winnerStats: Record<string, number | string>;
  score: number;
  runnersUp: AwardNominee[];
  narrative: string;
}

export interface AwardsCeremony {
  headline: string;
  intro: string;
  blurbs: string[];
}

export interface AwardsHistoryEntry {
  year: number;
  awards: AwardResult[];
  ceremony: AwardsCeremony;
}

export interface HallOfFameEntry {
  playerId: string;
  name: string;
  position: Position;
  inductionYear: number;
  peakOvr: number;
  careerYears: number;
  score: number;
  awards: {
    mvps: number;
    allPros: number;
    proBowls: number;
    championships: number;
  };
  highlights: string[];
  teams: string[];
}

export interface AllDecadeTeamEntry {
  playerId: string;
  playerName: string;
  pos: Position;
  peakOvr: number;
  seasonsWithTeam: number;
  highlights: string[];
}

export interface AllDecadeTeam {
  id: string;
  decade: string;
  startYear: number;
  endYear: number;
  teamId: string;
  roster: AllDecadeTeamEntry[];
  headline: string;
}

export interface FranchiseLegend {
  playerId: string;
  playerName: string;
  pos: Position;
  legacyScore: number;
  tenureYears: number;
  peakOvr: number;
  championships: number;
  mvps: number;
  allPros: number;
  proBowls: number;
  hallOfFame: boolean;
  careerHighlights: string[];
}

export interface FranchiseEra {
  name: string;
  startYear: number;
  endYear: number | null;
  description: string;
}

export interface FranchiseDashboard {
  identity: FranchiseIdentity;
  allTimeRecord: { wins: number; losses: number; ties: number; winPct: number };
  championships: number;
  playoffAppearances: number;
  activeStreaks: { winningSeasons: number; playoffStreak: number; losingSeasons: number };
  topLegends: FranchiseLegend[];
  currentDecadeTeam: AllDecadeTeam | null;
  stadiumDealStatus: 'active' | 'expiring' | 'none';
  fanbaseTrend: number[];
  prestigeTrend: number[];
  currentEra: { name: string; startYear: number; description: string };
}

export interface ReportSection {
  title: string;
  grade: string;
  summary: string;
  highlights: string[];
  stats: Record<string, string | number>;
}

export interface SeasonReport {
  year: number;
  teamId: string;
  overallGrade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  sections: ReportSection[];
}

export interface PowerRanking {
  rank: number;
  teamId: string;
  teamName: string;
  score: number;
  previousRank: number | null;
  delta: number;
  blurb: string;
  record: string;
}

export interface MentoringPair {
  mentorId: string;
  mentorName: string;
  menteeId: string;
  menteeName: string;
  teamId: string;
  positionGroup: string;
  year: number;
  bonus: number;
}

export interface PlayerArchiveTeamStint {
  teamId: string;
  firstYear: number;
  lastYear: number;
}

export interface PlayerArchiveEntry {
  playerId: string;
  firstName: string;
  lastName: string;
  name: string;
  positions: Position[];
  jerseyNumber: number | null;
  peakOvr: number;
  peakYear: number;
  firstYear: number;
  lastYear: number;
  retirementYear: number | null;
  teamHistory: PlayerArchiveTeamStint[];
  careerStats?: CareerStats;
}

export interface PlayerSeasonHistoryEntry {
  playerId: string;
  season: number;
  age: number;
  ovr: number;
  teamId: string | null;
  gamesPlayed: number;
  gamesStarted: number;
  keyStats: Record<string, number>;
}

export interface PlayerContractDetailYear {
  year: number;
  baseSalary: number;
  capHit: number;
  deadCap: number;
}

export interface PlayerCareerStatLine {
  season: number;
  team: string;
  gamesPlayed: number;
  gamesStarted: number;
  keyStats: Record<string, number>;
}

export interface PlayerPersonalityReport {
  traits: string[];
  agentStyle: string;
  mediaPresence: 'high' | 'medium' | 'low';
  lockerRoomImpact: 'positive' | 'neutral' | 'negative';
}

export interface PlayerProfile {
  player: Player;
  contractDetails: {
    yearByYear: PlayerContractDetailYear[];
    totalValue: number;
    guaranteedRemaining: number;
  };
  developmentArc: Array<{ ovr: number; age: number }>;
  careerStats: PlayerCareerStatLine[];
  personalityReport: PlayerPersonalityReport;
  awardsWon: string[];
  mentorHistory: Array<{ mentorName: string; bonus: number }>;
  injuryHistory: Array<{ type: string; weeksOut: number; season: number }>;
  legacyHistoryPartial: boolean;
}

export interface PlayerValue {
  tradeValue: number;
  marketValue: number;
  surplus: number;
}

export interface PlayerProjection {
  nextYearOvr: number;
  peakOvr: number;
  peakAge: number;
  retirementAge: number;
}

export interface FranchiseHistoryEntry {
  year: number;
  teamId: string;
  wins: number;
  losses: number;
  ties: number;
  record: string;
  pointDifferential: number;
  playoffFinish: string;
  majorEvents: string[];
  awardsWon: string[];
  recordsBroken: string[];
  fanbase?: number;
  prestige?: number;
  attendance?: number;
  stadiumName?: string;
  keyStats?: {
    totalYards: number;
    pointsFor: number;
    pointsAgainst: number;
  };
}

export type DynastyRecord = RecordEntry;
export type HallOfFamer = HallOfFameEntry;

// ── Season Context ─────────────────────────────────────

export interface SeasonContext {
  year: number;
  week: number;
  phase: SeasonPhase;
}

// ── Difficulty ──────────────────────────────────────────

export type DifficultyLevel = 'rookie' | 'pro' | 'allpro' | 'legend';

export type WeatherCondition = 'dome' | 'clear' | 'rain' | 'snow' | 'wind';

export interface MatchupHighlight {
  label: string;
  detail: string;
  teamId: string;
  playerId: string | null;
  opponentPlayerId: string | null;
  advantage: number;
}

export interface HandshakeCondition {
  metric: 'wins' | 'playoff' | 'starter' | 'trade_block' | 'spending' | 'draft_position' | 'on_roster' | 'restructure';
  target: number | string | boolean;
}

export interface Handshake {
  id: string;
  type: 'owner' | 'player' | 'media';
  promiseText: string;
  targetId: string;
  teamId: string;
  madeYear: number;
  madeWeek: number;
  deadline: { year: number; week: number };
  condition: HandshakeCondition;
  status: 'active' | 'fulfilled' | 'broken' | 'expired';
  consequence: string | null;
}

// ── Game State ──────────────────────────────────────────

export interface TrainingCampStandout {
  playerId: string;
  playerName: string;
  pos: Position;
  ovrBefore: number;
  ovrAfter: number;
  reason: 'rookie_standout' | 'breakout' | 'battle_winner';
}

export interface TrainingCampReport {
  teamId: string;
  standouts: TrainingCampStandout[];
  injuries: Array<{ playerId: string; playerName: string; pos: Position; weeksOut: number }>;
  battles: Array<{ pos: Position; winnerId: string; winnerName: string; loserId: string; loserName: string; winnerOvr: number; loserOvr: number }>;
  headlines: string[];
}

export interface GameState {
  version: number;
  seed: number;
  year: number;
  week: number;
  phase: SeasonPhase;
  difficulty: DifficultyLevel;
  players: Record<string, Player>;
  teams: Record<string, Team>;
  owners: Record<string, Owner>;
  schedule: ScheduleWeek[];
  draftClass: DraftProspect[];
  freeAgents: string[];    // player IDs
  records: RecordBook;
  activeRecordChases: RecordChase[];
  recentBrokenRecords: BrokenRecord[];
  recentMilestones: MilestoneReached[];
  awardsHistory: AwardsHistoryEntry[];
  hallOfFame: HallOfFameEntry[];
  allDecadeTeams: AllDecadeTeam[];
  powerRankings: PowerRanking[];
  franchiseHistory: FranchiseHistoryEntry[];
  playerArchive: PlayerArchiveEntry[];
  playerSeasonHistory: Record<string, PlayerSeasonHistoryEntry[]>;
  playerRivalries: PlayerRivalry[];
  farewellTours: FarewellTour[];
  endorsementOffers: EndorsementDeal[];
  leagueRules: LeagueRules;
  cbaState: CBAState;
  commissionerState: CommissionerState;
  laborState: LaborState;
  frontOffice: FrontOffice;
  eventLog: GameEvent[];
  narrativeState: NarrativeState;
  offFieldEvents: OffFieldEvent[];
  recentPressConferences: PressConference[];
  coachingHistory: CoachCareerHistory[];
  leagueRivalries: LeagueRivalry[];
  activeEffects: TimedEffect[];
  gameDayState: GameDayState;
  weekSummaries: WeeklySummary[];
  playoffBracket: PlayoffBracket | null;
  offseasonState: OffseasonState | null;
  expansionDraftState?: ExpansionDraftState;
  stadiumDealOffers: StadiumDeal[];
  leagueNews: NewsItem[];
  socialFeed: SocialPost[];
  activeProposals: TradeProposal[];
  tradeDeadlineState?: TradeDeadlineState;
  faTargetBoard: FATargetBoardState;
  teamNeedsCache: Record<string, TeamNeedsReport>;
  scenarioState?: ScenarioState;
  warRoomState: WarRoomState | null;
  contractExtensions: ContractExtensionRecord[];
  difficultyState: DifficultyState;
  availableMedicalStaff: MedicalStaff[];
  playoffMomentum: Record<string, PlayoffMomentum>;
  scoutingDepartment: ScoutingDepartment;
  conditionalPicks: ConditionalPick[];
  waiverOrder: string[];
  waiverWire: WaiverWireEntry[];
  waiverClaims: WaiverClaim[];
  handshakes: Handshake[];
  tutorialState: TutorialState;
  agents: AgentProfile[];
  narrativeIntensity: NarrativeIntensity;
  ceremonies: Ceremony[];
  dynastyTimeline: DynastyEvent[];
  coachingMarket?: CoachingMarketState;
  weeklyPrepPlans?: Record<string, WeeklyPrepPlan>;
  weeklyPrepHistory?: WeeklyPrepOutcome[];
  filmRoomHistory?: FilmRoomReport[];
  achievements?: Achievement[];
  dashboardState?: DashboardState;
  seasonReports?: SeasonReport[];
  waiverResults?: WaiverRunResult[];
  gamePlan?: GamePlan | null;
  opponentReports?: OpponentReport[];
  draftRecaps?: DraftRecap[];
  tradeSuggestions?: TradeSuggestion[];
  trainingCampResults?: TrainingCampReport[];
  earnedDoctrines?: Array<{
    id: string;
    name: string;
    description: string;
    origin: string;
    bonus: string;
    category: 'culture' | 'strategy' | 'reputation' | 'personnel';
    earnedYear: number;
    earnedWeek: number;
  }>;
}

export type SeasonPhase =
  | 'preseason'
  | 'regular_season'
  | 'playoffs'
  | 'offseason'
  | 'free_agency'
  | 'draft'
  | 'post_draft'
  | 'training_camp';

export interface FrontOffice {
  xp: number;
  level: number;
  achievements: string[];
  perks: string[];
  reputation: {
    players: number;
    media: number;
    owner: number;
  };
}

export interface NarrativeState {
  activeArcs: StoryArc[];
  hooks: NarrativeHook[];
  recentHeadlines: string[];
}

export type StoryArcTemplate =
  | 'win_streak'
  | 'hot_seat'
  | 'breakout_player'
  | 'revenge_game'
  | 'injury_crisis';

export interface StoryArc {
  id: string;
  template: StoryArcTemplate;
  playerId: string | null;
  teamId: string | null;
  stage: number;
  title: string;
  summary: string;
  startedYear: number;
  startedWeek: number;
  updatedYear: number;
  updatedWeek: number;
  expiresAfterWeek: number | null;
  data: Record<string, unknown>;
}

export interface NarrativeHook {
  id: string;
  type: string;
  description: string;
  resolved: boolean;
  deadline: number;   // week number
}

// ── Commands ────────────────────────────────────────────

export interface Command<T extends string = string, P = unknown> {
  type: T;
  payload: P;
}

// ── Engine Output ───────────────────────────────────────

export interface Consequence {
  label: string;
  before: number | string;
  after: number | string;
  delta: number;
  severity: 'positive' | 'negative' | 'neutral';
}

export interface GameEvent {
  id: string;
  type: string;
  timestamp: number;
  description: string;
  data: Record<string, unknown>;
}

export interface EngineOutput {
  nextState: GameState;
  events: GameEvent[];
  consequences: Consequence[];
}
