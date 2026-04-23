export type StorylineArchetype =
  | 'hot-seat-coach'
  | 'qb-controversy'
  | 'rookie-of-year-chase'
  | 'records-chase'
  | 'comeback-player';

export type StorylineStatus = 'active' | 'closed';

export interface StorylineBeat {
  label: string;
  summary: string;
  weekNumber: number;
  year: number;
}

export type StorylineMetadataValue = string | number | boolean | null;
export type StorylineMetadata = Record<string, StorylineMetadataValue>;

export interface StorylineThread {
  id: string;
  key: string;
  archetype: StorylineArchetype;
  title: string;
  summary: string;
  teamIds: string[];
  playerIds: string[];
  startWeek: number;
  startYear: number;
  weeksActive: number;
  status: StorylineStatus;
  beats: StorylineBeat[];
  heat: number;
  nextBeatHint: string | null;
  beatIndex: number;
  updatedWeek: number;
  updatedYear: number;
  closeReason: string | null;
  metadata: StorylineMetadata;
}

export interface StorylineSeedCandidate {
  key: string;
  title: string;
  summary: string;
  teamIds: string[];
  playerIds: string[];
  heat: number;
  nextBeatHint: string | null;
  metadata: StorylineMetadata;
}
