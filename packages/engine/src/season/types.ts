import type { SeasonPhase } from '../types';

export type GradingAwardKey = 'MVP' | 'OPOY' | 'DPOY' | 'OROY' | 'DROY' | 'COY';

export type StatLeaderKey =
  | 'passingYards'
  | 'passingTds'
  | 'interceptions'
  | 'rushingYards'
  | 'rushingTds'
  | 'receivingYards'
  | 'receivingTds'
  | 'sacks'
  | 'tackles'
  | 'defensiveInterceptions';

export interface GenerateSeasonReportOptions {
  releaseTag: string;
}

export interface SeasonReport {
  seed: number;
  releaseTag: string;
  generatedAtSeason: {
    year: number;
    week: number;
    phase: SeasonPhase;
    completedSeasonYear: number;
  };
  finalStandings: DivisionStandingReport[];
  playoffs: PlayoffReport;
  superBowl: SuperBowlReport;
  awards: Record<GradingAwardKey, AwardReport>;
  statLeaders: Record<StatLeaderKey, StatLeaderEntry[]>;
  trades: TradeReportEntry[];
  injuries: InjuryReport;
  storylines: StorylineReportEntry[];
}

export interface DivisionStandingReport {
  division: string;
  teams: StandingTeamReport[];
}

export interface StandingTeamReport {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  pointDifferential: number;
}

export interface PlayoffReport {
  rounds: PlayoffRoundReport[];
}

export interface PlayoffRoundReport {
  round: string;
  games: PlayoffGameReport[];
}

export interface PlayoffGameReport {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  winnerTeamId: string | null;
}

export interface SuperBowlReport {
  winnerTeamId: string | null;
  winnerName: string | null;
  mvp: {
    playerId: string;
    playerName: string;
    teamId: string | null;
    stats: Record<string, number>;
  } | null;
  score: string | null;
}

export interface AwardReport {
  winnerName: string | null;
  winnerTeamId: string | null;
  keyStats: Record<string, number | string>;
  teamRecord: string | null;
}

export interface StatLeaderEntry {
  playerId: string;
  playerName: string;
  teamId: string | null;
  value: number;
}

export interface TradeReportEntry {
  week: number | null;
  teams: string[];
  players: string[];
  picks: string[];
  summary: string;
}

export interface InjuryReport {
  bySeverity: Record<'questionable' | 'doubtful' | 'out' | 'ir', number>;
  mostImpactful: InjuryImpactEntry[];
}

export interface InjuryImpactEntry {
  playerId: string;
  playerName: string;
  teamId: string | null;
  injuryType: string;
  severity: string;
  gamesOut: number;
  impactScore: number;
}

export interface StorylineReportEntry {
  type: string;
  week: number | null;
  year: number;
  headline: string;
  summary: string;
  teamIds: string[];
  playerIds: string[];
}
