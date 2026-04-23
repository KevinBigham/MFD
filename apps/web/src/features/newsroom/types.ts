/**
 * Local newsroom types — shape-compatible with the engine's Sprint 67 media module.
 *
 * Codex is building `packages/engine/src/media/storyline-threads.ts` on a parallel branch.
 * Until that lands, the UI consumes these local shapes so the web track can build, test,
 * and ship independently. When the engine module merges, replace the imports in the
 * consuming components with `import type { StorylineThread } from '@mfd/engine'` and
 * delete this file.
 *
 * Keep this file in sync with the Codex handoff spec — any deviation means the swap
 * will not be a one-liner.
 */

export type StorylineArchetype =
  | 'qb_controversy'
  | 'coach_hot_seat'
  | 'contract_year_push'
  | 'rookie_breakout'
  | 'rivalry_revenge'
  | 'dynasty_defense'
  | 'rebuild_milestone'
  | 'locker_room_fracture';

export type StorylineStatus = 'active' | 'resolved' | 'abandoned';

export interface StorylineBeat {
  week: number;
  year: number;
  headline: string;
  body: string;
  newsItemId?: string;
}

export interface StorylineThread {
  id: string;
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
  nextBeatHint: string | null;
  heat: number; // 0..100 — editorial weight
}
