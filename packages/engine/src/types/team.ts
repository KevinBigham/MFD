/**
 * Team-related types.
 *
 * Team org, staff, coaching, locker room, cliques, captains,
 * rivalries, and owner basics used by Team.
 */

import type { Player, Position, CliqueId } from './player.js';
import type { FranchiseTagType } from './contract.js';
import type { DraftPick, MedicalStaff, FatigueState, FacilityState } from './draft.js';
import type { PracticeSquadPlayer } from './transactions.js';
import type { TeamSeasonStats, SpecialTeamsState } from './sim.js';
import type { JerseyRetirement } from './season.js';
import type { TrainingAssignment, MentoringPair } from './franchise.js';

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
  // Sprint 45 "The Family Tree" — coaching lineage (optional so old
  // saves load cleanly; migration v31→v32 fills defaults).
  mentorCoachId?: string | null;
  disciples?: string[];
  yearsUnderMentor?: number;
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
export type TeamPhilosophy = 'rebuild' | 'contend' | 'maintain' | 'fire_sale';

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
  fanConfidence: number;
  ownerPatience80: number;
  gmStrategy: GmStrategy;
  philosophy?: TeamPhilosophy;
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
  era?: string | null;
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
