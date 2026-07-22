/**
 * Franchise, game-day, cap tooling, scouting war-room,
 * coach retention, scheme install, weekly prep, training camp,
 * news, social, handshakes, GameState aggregate, commands, events.
 *
 * Catch-all for end-of-game and long-term franchise state types.
 */

import type {
  Player,
  Position,
  CareerStats,
  EndorsementDeal,
  PlayerSeasonStats,
} from './player.js';
import type { Contract } from './contract.js';
import type {
  CoachCareerHistory,
  ExpansionDraftState,
  FranchiseIdentity,
  StadiumDeal,
  StaffMember,
} from './team.js';
import type {
  CBAState,
  CommissionerRuling,
  CommissionerState,
  LaborState,
  LeagueRivalry,
  LeagueRules,
  OffFieldEvent,
  PressConference,
  PressConferenceTone,
  ReporterQuestion,
  RivalryGameContext,
  TimedEffect,
} from './governance.js';
import type {
  ConditionalPick,
  OffseasonState,
  TradeDeadlineState,
  TradeOfferAsset,
  WaiverClaim,
  WaiverRunResult,
  WaiverWireEntry,
} from './transactions.js';
import type {
  DraftProspect,
  MedicalStaff,
  ScoutingDepartment,
} from './draft.js';
import type {
  BroadcastNetwork,
  GamePlan,
  MatchupHighlight,
  OpponentReport,
  WeeklySummary,
} from './sim.js';
import type { ScheduleWeek, PlayoffBracket, WeatherCondition } from './schedule.js';
import type {
  Achievement,
  AgentProfile,
  Ceremony,
  DashboardState,
  DifficultyLevel,
  DifficultyState,
  DynastyEvent,
  FarewellTour,
  NarrativeIntensity,
  PlayerRivalry,
  PlayoffMomentum,
  SeasonPhase,
  TradeProposal,
  TutorialState,
} from './season.js';
import type {
  AwardsHistoryEntry,
  BrokenRecord,
  MilestoneReached,
  RecordBook,
  RecordChase,
  RecordEntry,
  YearProjection,
} from './records.js';
import type { MediaCycleState } from '../media-cycle/types.js';
import type { StorylineThread } from '../storyline-threads/types.js';

// ── Scenarios ───────────────────────────────────────────

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

// ── Game Day ────────────────────────────────────────────

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
  callYourShotResult?: import('../systems/call-your-shot').CallYourShotResult;
  namedGame?: import('../systems/named-games').NamedGameEvent;
}

export interface GameDayState {
  recentPackages: GameDayPackage[];
  latestPackageId: string | null;
}

// ── Apology Tour ────────────────────────────────────────

export type ApologyTourStatus = 'active' | 'resolved' | 'escalated';
export type ApologyTourBeatKey = 'fan_letter' | 'beat_column' | 'owner_email' | 'resolution';

export interface ApologyTourThread {
  id: string;
  gameId: string;
  teamId: string;
  opponentTeamId: string;
  namedGameName: string;
  archetype: Extract<import('../systems/named-games').NamedGameArchetype, 'collapse' | 'heartbreaker'>;
  startedYear: number;
  startedWeek: number;
  status: ApologyTourStatus;
  beatsDelivered: ApologyTourBeatKey[];
}

// ── Season Context ─────────────────────────────────────

export interface SeasonContext {
  year: number;
  week: number;
  phase: SeasonPhase;
}

// ── Cap Tools ───────────────────────────────────────────

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

// ── Player Value / Projection / Comparison ──────────────

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

// ── Franchise History / Dynasty Records ─────────────────

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

// ── Front Office / Narrative ────────────────────────────

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
  agmProfileId?: string | null;
  agmImpactLog?: Array<{
    id: string;
    year: number;
    week: number;
    agmProfileId: string;
    category: 'cap' | 'competitive' | 'personnel' | 'mandate';
    summary: string;
  }>;
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

export type LeagueStoryArcType =
  | 'rebuild'
  | 'contender_window'
  | 'collapse'
  | 'dynasty_run'
  | 'cinderella';

export interface StoryArcBeat {
  stage: string;
  year: number;
  note: string;
  narrativeText: string;
}

export interface LeagueStoryArc {
  id: string;
  type: LeagueStoryArcType;
  teamId: string;
  startYear: number;
  endYear: number | null;
  currentStage: string;
  stageHistory: StoryArcBeat[];
}

export interface NarrativeHook {
  id: string;
  type: string;
  description: string;
  resolved: boolean;
  deadline: number;   // week number
}

// ── Franchise Legends / Era / Doctrines / Dashboard ─────

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

export type DoctrineCategory = 'culture' | 'strategy' | 'reputation' | 'personnel';

export interface FranchiseDoctrine {
  id: string;
  name: string;
  description: string;
  origin: string;
  bonus: string;
  category: DoctrineCategory;
  earnedYear: number;
  earnedWeek: number;
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
  earnedDoctrines: FranchiseDoctrine[];
  doctrineGroups: Record<DoctrineCategory, FranchiseDoctrine[]>;
}

// ── Reports / Rankings ──────────────────────────────────

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

// ── Owner Mandates ─────────────────────────────────────

export type OwnerMandateSlot = 'floor' | 'target' | 'ceiling';
export type OwnerMandateStatus = 'active' | 'met' | 'exceeded' | 'missed';
export type OwnerMandateProgressStatus = 'on_track' | 'at_risk' | 'complete' | 'failed';

export interface OwnerMandateProgress {
  value: number;
  target: number;
  percent: number;
  label: string;
  detail: string;
  status: OwnerMandateProgressStatus;
  agmNote?: string | null;
}

export interface OwnerMandateEvaluation {
  evaluatedYear: number;
  met: boolean;
  exceeded: boolean;
  outcomeLabel: string;
  summary: string;
  approvalDelta: number;
  patienceDelta: number;
  ownerReputationDelta: number;
  applied: boolean;
  agmAdjustment?: string | null;
}

export interface OwnerMandate {
  id: string;
  teamId: string;
  year: number;
  goalId: string;
  label: string;
  description: string;
  slot: OwnerMandateSlot;
  selectedIndex: number;
  createdWeek: number;
  createdByAGMProfileId?: string | null;
  status: OwnerMandateStatus;
  progress: OwnerMandateProgress;
  evaluation?: OwnerMandateEvaluation | null;
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

// ── Training / Mentoring ───────────────────────────────

export type TrainingFocus = 'film_study' | 'position_drills' | 'conditioning' | 'mentorship' | 'rest';

export interface TrainingAssignment {
  playerId: string;
  focus: TrainingFocus;
  weeksAssigned: number;
  xpGained: number;
  focusXp: Record<TrainingFocus, number>;
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

// ── Player Archive ──────────────────────────────────────

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

// ── Team Needs / Draft Recap ────────────────────────────

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
  /** Deterministic 0-40 urgency used by CPU roster-building systems. */
  needScore?: number;
  /** Human-readable, source-backed reasons for the urgency score. */
  reasonCodes?: string[];
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

// ── FA Targets / Trade Packages / War Room ──────────────

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

// ── Extensions ──────────────────────────────────────────

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

// ── Hall of Fame / All Decade ───────────────────────────

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
  epilogue?: import('../systems/career-epilogues').CareerEpilogue;
}

export interface PendingPassedPickTarget {
  prospectId: string;
  playerName: string;
  playerOvr: number;
  round: number;
  pickNumber: number;
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

// ── Game Settings / Post-Game UI ────────────────────────

export interface GameSettings {
  halftimeDecisions: HalftimeDecisionSetting;
  coachMode?: boolean;
}

export type PressConferenceResponseTier = 'high' | 'mid' | 'low';

export interface PressConferenceQueueEntry {
  conferenceId: string;
  teamId: string | null;
  year: number;
  week: number;
  speaker: string;
  topic: string;
  scenario: string;
  responses: {
    high: string[];
    mid: string[];
    low: string[];
  };
  selectedTier?: PressConferenceResponseTier;
  selectedResponse?: string;
}

export interface PostGameUiState {
  pressConferenceQueue: PressConferenceQueueEntry[];
  audioCueQueue: import('../systems/audio-events').AudioCue[];
  pendingHalftimeDecision: PendingHalftimeDecision | null;
}

// ── Halftime Decisions ──────────────────────────────────

export type HalftimeDecisionSetting = 'on' | 'off';
export type HalftimeDecisionChoice = 'stick' | 'switch' | 'gamble';
export type HalftimeSwitchDirection = 'more_pass' | 'more_run' | 'more_aggressive' | 'slow_down';

export interface SwitchSuggestion {
  direction: HalftimeSwitchDirection;
  responseLabel: string;
  summary: string;
  reason: string;
}

export interface HalftimeDecisionModifier {
  choice: HalftimeDecisionChoice;
  direction: HalftimeSwitchDirection;
  responseLabel: string;
  summary: string;
  sustainedBonus: number;
  firstDriveDelta: number;
  gambleDriveDelta: number;
  gambleOtherDriveDelta: number;
}

export interface PendingHalftimeDecision {
  teamId: string;
  year: number;
  week: number;
  phase: SeasonPhase;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  suggestion: SwitchSuggestion;
}

// ── Staff Roles / Coaching Market ───────────────────────

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

// ── Team Identity / Scheme Install ──────────────────────

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

// ── Weekly Prep ─────────────────────────────────────────

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
  contingencyRules?: import('../systems/contingency-plans').ContingencyRule[];
  trickPlays?: string[];
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

// ── Coach Retention / Development ───────────────────────

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

// ── Game Plan Execution / Film Room ─────────────────────

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

// ── News / Social ───────────────────────────────────────

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

export interface AlumniUpdate {
  subjectId: string;
  subjectName: string;
  text: string;
  year: number;
  category: 'coaching' | 'broadcasting' | 'hof' | 'milestone' | 'legacy';
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

// ── Handshakes ──────────────────────────────────────────

export interface HandshakeCondition {
  metric: 'wins' | 'playoff' | 'starter' | 'trade_block' | 'spending' | 'draft_position' | 'on_roster' | 'restructure' | 'owner_mandate';
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

// ── Training Camp ───────────────────────────────────────

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

// ── Game State ──────────────────────────────────────────

export interface GameState {
  version: number;
  seed: number;
  year: number;
  week: number;
  phase: SeasonPhase;
  difficulty: DifficultyLevel;
  settings: GameSettings;
  players: Record<string, Player>;
  teams: Record<string, import('./team.js').Team>;
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
  ballotWaitlist?: import('../systems/hall-of-fame').HOFBallotEntry[];
  ballotEliminatedIds?: string[];
  allDecadeTeams: AllDecadeTeam[];
  powerRankings: PowerRanking[];
  mediaCycle?: MediaCycleState;
  franchiseHistory: FranchiseHistoryEntry[];
  userDynastyEras?: import('../systems/dynasty-era').DynastyEra[];
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
  activeMentors?: import('../systems/alumni-mentors').AlumniMentor[];
  mentorBudget?: number;
  availableMedicalStaff: MedicalStaff[];
  playoffMomentum: Record<string, PlayoffMomentum>;
  scoutingDepartment: ScoutingDepartment;
  conditionalPicks: ConditionalPick[];
  waiverOrder: string[];
  waiverWire: WaiverWireEntry[];
  waiverClaims: WaiverClaim[];
  handshakes: Handshake[];
  ownerMandates?: OwnerMandate[];
  tutorialState: TutorialState;
  agents: AgentProfile[];
  narrativeIntensity: NarrativeIntensity;
  ceremonies: Ceremony[];
  dynastyTimeline: DynastyEvent[];
  storylineThreads?: StorylineThread[];
  storyArcs?: LeagueStoryArc[];
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
  postGameUi?: PostGameUiState;
  breakingNewsQueue?: import('../systems/narrative-director').BreakingNewsEvent[];
  ownerPersonalityInbox?: import('../systems/owner-personality').OwnerPersonalityEvent[];
  commissionerDisciplineLog?: CommissionerRuling[];
  earnedDoctrines?: FranchiseDoctrine[];
  nearMissTracker?: import('../systems/near-miss-receipts').NearMissTracker;
  seasonNearMissReceipts?: import('../systems/near-miss-receipts').NearMissEntry[];
  pendingPassedPickTargets?: PendingPassedPickTarget[];
  activeCallYourShot?: import('../systems/call-your-shot').ShotDeclaration;
  apologyTourThreads: ApologyTourThread[];
  lastPortableExportYear?: number | null;
  setupState?: import('../systems/franchise-setup').SetupState;
  franchiseBlueprint?: import('../systems/franchise-setup').FranchiseBlueprint;
  // Sprint 45 "The Family Tree" — league-wide relationship graph.
  // Stores coaching lineage, rivalries, and family ties in one flat list.
  relationships?: import('../systems/relationship-graph').RelationshipEdge[];
  /** v37 causal-spine and compression state. Defaults are added by migration. */
  leagueEvents?: import('./causal.js').LeagueEvent[];
  decisionReceipts?: import('./causal.js').DecisionReceipt[];
  franchisePlans?: Record<string, import('./causal.js').FranchisePlan>;
  pressMemoryTags?: import('./causal.js').PressMemoryTag[];
  gameCapsules?: import('./causal.js').GameCapsule[];
  memoryGraph?: import('./causal.js').DynastyMemoryGraph;
  navigationMode?: 'gm' | 'nerd';
  onboardingMode?: 'instant' | 'guided' | 'full_gm';
}

// ── Commands / Engine Output ───────────────────────────

export interface Command<T extends string = string, P = unknown> {
  type: T;
  payload: P;
}

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
  milestones?: MilestoneReached[];
  callYourShotResult?: import('../systems/call-your-shot').CallYourShotResult;
  nearMissReceipts?: import('../systems/near-miss-receipts').NearMissEntry[];
  showSaveReminder?: boolean;
}
