export type HeadlineCategory =
  | 'UPSET'
  | 'BLOWOUT'
  | 'COMEBACK'
  | 'RIVALRY_WIN'
  | 'INDIVIDUAL_PERFORMANCE'
  | 'MILESTONE'
  | 'ROOKIE_BREAKOUT';

export interface MediaPowerRanking {
  teamId: string;
  teamName: string;
  rank: number;
  rankDelta: number;
  score: number;
  blurb: string;
  record: string;
  weekNumber: number;
}

export interface PowerRankingSnapshot {
  weekNumber: number;
  rankings: MediaPowerRanking[];
}

export interface Headline {
  id: string;
  category: HeadlineCategory;
  weekNumber: number;
  title: string;
  summary: string;
  teamIds: string[];
  playerId: string | null;
  gameId: string | null;
  importance: number;
}

export interface HotTake {
  id: string;
  weekNumber: number;
  headlineId: string;
  analyst: string;
  angle: string;
  quote: string;
  sentiment: 'supportive' | 'skeptical' | 'combative';
}

export interface WeeklyDigest {
  weekNumber: number;
  powerRankings: MediaPowerRanking[];
  headlines: Headline[];
  hotTakes: HotTake[];
}

export interface MediaCycleState {
  weeklyDigests: WeeklyDigest[];
  powerRankingHistory: PowerRankingSnapshot[];
}
