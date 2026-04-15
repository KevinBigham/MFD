/**
 * Player-related types.
 *
 * Positions, ratings, personalities, archetypes, player stats,
 * injuries, and endorsements.
 */

import type { Contract } from './contract.js';

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

// ── Endorsements ────────────────────────────────────────

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
