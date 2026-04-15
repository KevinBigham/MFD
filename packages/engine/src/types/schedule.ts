/**
 * Schedule, playoff bracket, and weather types.
 */

import type { GameResult, BroadcastNetwork } from './sim.js';

// ── Weather ─────────────────────────────────────────────

export type WeatherCondition = 'dome' | 'clear' | 'rain' | 'snow' | 'wind';

// ── Schedule ────────────────────────────────────────────

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

// ── Playoffs ────────────────────────────────────────────

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
