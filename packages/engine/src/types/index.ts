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
  isStarter: boolean;
  role: string | null;
  roleWeeks: number;
  tradeBlock: boolean;
  holdout: boolean;
  stats: PlayerSeasonStats;
}

export interface PlayerSeasonStats {
  passYds: number;
  rushYds: number;
  recYds: number;
  sacks: number;
  defINT: number;
  [key: string]: number;
}

export interface CareerStats {
  seasons: number;
  gp: number;
  snaps: number;
  [key: string]: number;
}

export interface Injury {
  type: string;
  severity: 'questionable' | 'doubtful' | 'out' | 'ir';
  gamesOut: number;
}

// ── Contracts ───────────────────────────────────────────

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
}

export interface ContractYear {
  year: number;
  baseSalary: number;
  capHit: number;
  deadCap: number;
  guaranteed: boolean;
}

export type FranchiseTagType = 'exclusive' | 'non-exclusive' | 'transition';

export interface Incentive {
  type: string;
  threshold: number;
  bonus: number;
  achieved: boolean;
}

// ── Teams ───────────────────────────────────────────────

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
  specialty75?: CoordinatorSpecialty | null;
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
}

export interface ClinicState {
  xp: Record<string, number>;
  perks: string[];
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
  isUser: boolean;
  clinic: ClinicState;
  skillSelections: Record<string, CoachSkillSelection>;
  tradeState: TradeState;
  txLog: TransactionLogEntry[];
  seasonStats: TeamSeasonStats;
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

// ── Draft ───────────────────────────────────────────────

export interface DraftPick {
  round: number;
  pick: number;
  originalTeamId: string;
  currentTeamId: string;
  year: number;
  isCompPick: boolean;
}

export interface DraftProspect {
  id: string;
  firstName: string;
  lastName: string;
  pos: Position;
  college: string;
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
  lastOffer: ContractOffer | null;
  status: 'pending' | 'accepted' | 'declined' | 'walked';
}

export interface FreeAgencyBid extends ContractOffer {
  playerId: string;
  teamId: string;
  round: number;
  score: number;
  status: 'pending' | 'won' | 'lost';
}

export type ScoutingAction = 'film' | 'combine' | 'interview';

export interface ProspectScoutingState {
  prospectId: string;
  actions: ScoutingAction[];
  accuracy: number;
  visibleScoutGrade: number;
  notes: string[];
}

export interface TradeOfferAsset {
  type: 'player' | 'pick';
  teamId: string;
  playerId: string | null;
  pickId: string | null;
  description: string;
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
  tradeOffers: TradeOffer[];
  draftOrder: DraftOrderEntry[];
  currentDraftPickIndex: number;
  completedDraftPickIds: string[];
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
}

export interface GameStats {
  [teamId: string]: TeamGameStats;
}

export interface TeamGameStats {
  totalYards: number;
  passingYards: number;
  rushingYards: number;
  turnovers: number;
  sacks: number;
  thirdDownConversions: number;
  thirdDownAttempts: number;
  timeOfPossession: number;
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
  autopsy: GameDayAutopsy;
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

export interface ScheduleWeek {
  week: number;
  games: ScheduledGame[];
}

export interface ScheduledGame {
  homeTeamId: string;
  awayTeamId: string;
  result: GameResult | null;
}

// ── Dynasty & Legacy ────────────────────────────────────

export interface DynastyRecord {
  category: string;
  holder: string;
  value: number;
  year: number;
}

export interface HallOfFamer {
  playerId: string;
  inductionYear: number;
  careerHighlights: string[];
}

// ── Season Context ─────────────────────────────────────

export interface SeasonContext {
  year: number;
  week: number;
  phase: SeasonPhase;
}

// ── Difficulty ──────────────────────────────────────────

export type DifficultyLevel = 'rookie' | 'pro' | 'allpro' | 'legend';

// ── Game State ──────────────────────────────────────────

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
  records: DynastyRecord[];
  hallOfFame: HallOfFamer[];
  frontOffice: FrontOffice;
  eventLog: GameEvent[];
  narrativeState: NarrativeState;
  gameDayState: GameDayState;
  weekSummaries: WeeklySummary[];
  playoffBracket: PlayoffBracket | null;
  offseasonState: OffseasonState | null;
}

export type SeasonPhase =
  | 'preseason'
  | 'regular_season'
  | 'playoffs'
  | 'offseason'
  | 'free_agency'
  | 'draft'
  | 'post_draft';

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
