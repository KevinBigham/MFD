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
  pos: Position;
  age: number;
  ovr: number;
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
  guaranteed: number;
  signingBonus: number;
  voidYears: number;
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

export interface Team {
  id: string;
  city: string;
  name: string;
  abbr: string;
  conference: 'AFC' | 'NFC';
  division: string;
  roster: string[];       // player IDs
  capSpace: number;
  deadCap: number;
  wins: number;
  losses: number;
  ties: number;
  offScheme: string;
  defScheme: string;
  coachingStaff: CoachingStaff;
  ownerId: string;
  draftPicks: DraftPick[];
  rivalries: Rivalry[];
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

export interface StoryArc {
  id: string;
  template: string;
  playerId: string | null;
  teamId: string | null;
  stage: number;
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
