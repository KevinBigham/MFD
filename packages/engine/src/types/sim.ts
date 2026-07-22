/**
 * Game simulation types — game plans, opponent reports,
 * play-by-play, broadcasts, game/team stat lines, weekly summaries.
 */

import type { Player, Position, Injury } from './player.js';
import type { SeasonPhase } from './season.js';
import type { WeatherCondition } from './schedule.js';

// ── Game Plan ───────────────────────────────────────────

export type OffensiveGamePlan = 'balanced' | 'pass_heavy' | 'run_heavy' | 'spread' | 'power';
export type DefensiveGamePlan = 'base' | 'blitz_heavy' | 'coverage' | 'contain' | 'aggressive';

export interface GamePlan {
  offensiveScheme: OffensiveGamePlan;
  defensiveScheme: DefensiveGamePlan;
  keyMatchup: { playerA: string; playerB: string } | null;
  gamePlanBonus: number;
  contingencyRules?: import('../systems/contingency-plans').ContingencyRule[];
  trickPlays?: string[];
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

// ── Play-by-Play / Drives / Broadcasts ──────────────────

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
  offensivePlayId?: string;
  offensivePlayName?: string;
  defensivePlayId?: string;
  defensivePlayName?: string;
  leverageIndex?: number;
  leverageTier?: string;
  winProbabilityNote?: string;
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
  ghostLines?: Array<{ commentatorName: string; commentary: string; trigger: string; source?: 'hof' | 'callout' }>;
}

export type BroadcastNetwork = 'MFN' | 'ESPN8' | 'FOX8' | 'CBS8' | 'NBC8';

// ── Special Teams ───────────────────────────────────────

export interface SpecialTeamsState {
  kickReturner: string | null;
  puntReturner: string | null;
  longSnapper: string | null;
  kickCoverageUnit: string[];
  puntCoverageUnit: string[];
}

export interface MatchupHighlight {
  label: string;
  detail: string;
  teamId: string;
  playerId: string | null;
  opponentPlayerId: string | null;
  advantage: number;
}

// ── Game Results ────────────────────────────────────────

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
  /** Canonical Snap Core ledger retained for user games; CPU ledgers reduce to derived views. */
  snapEvents?: import('./causal.js').SnapEvent[];
  snapLedgerMode?: 'shadow' | 'canonical';
  /** Positive counts only; empty means every required healthy starter slot was certified pre-kickoff. */
  healthyStarterShortages?: Partial<Record<Position, number>>;
  healthyStarterShortagesByTeam?: Record<string, Partial<Record<Position, number>>>;
  callYourShotResult?: import('../systems/call-your-shot').CallYourShotResult;
  namedGame?: import('../systems/named-games').NamedGameEvent;
  contingencyActivations?: Array<{
    teamId: string;
    ruleId: string;
    label: string;
    triggerLabel?: string;
    responseLabel?: string;
    quarter: number;
    callout?: string | null;
  }>;
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

// ── Team Season Stats ───────────────────────────────────

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

// ── Weekly Summaries ────────────────────────────────────

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
