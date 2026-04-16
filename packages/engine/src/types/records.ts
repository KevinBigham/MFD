/**
 * Records, leaderboards, awards, and career/league stat summaries.
 */

import type { Position, PlayerSeasonStats } from './player.js';

// ── Record Book ─────────────────────────────────────────

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

// ── Milestones ──────────────────────────────────────────

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

// ── Leaders / Projections ───────────────────────────────

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

// ── Stat Leader / Career Timelines ──────────────────────

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

// ── Awards ──────────────────────────────────────────────

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

// ── Team/League Summaries ───────────────────────────────

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
