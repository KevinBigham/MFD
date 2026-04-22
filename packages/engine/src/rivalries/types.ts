export const RIVALRIES_SCHEMA_VERSION = 1 as const;

export type RivalryIntensity = number;

export type DramaTag =
  | 'last-second'
  | 'comeback-win'
  | 'blowout-revenge-pending'
  | 'streak-breaker'
  | 'divisional-implications';

export type RivalryRelationship = 'division' | 'conference' | 'interconference';

export interface RivalryLastMatchup {
  season: number;
  week: number;
  result: 'win' | 'loss' | 'tie';
  margin: number;
}

export interface RivalryHeadToHeadRecent {
  wins: number;
  losses: number;
  ties: number;
}

export interface RivalryRecord {
  opponentId: string;
  intensity: RivalryIntensity;
  dramaTags: DramaTag[];
  lastMatchup: RivalryLastMatchup | null;
  headToHeadRecent: RivalryHeadToHeadRecent;
}

export interface RivalryPayload {
  schemaVersion: typeof RIVALRIES_SCHEMA_VERSION;
  generatedAt: number;
  teams: Record<string, RivalryRecord[]>;
}

export interface RivalryScoreInput {
  relationship: RivalryRelationship;
  currentSeason: number;
  lastMeetingSeason: number | null;
  closeGamesInLastFive: number;
  hasPlayoffHistory: boolean;
  activeStreakLength: number;
}

export interface TaggedRivalryMatchup {
  season: number;
  week: number;
  margin: number;
  overtime: boolean;
  namedGameArchetype: string | null;
  isDivisional: boolean;
  isRegularSeason: boolean;
  endedOpponentStreakLength: number;
}
