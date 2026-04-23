import type { GameState } from '../../types';
import type { StorylineArchetype, StorylineSeedCandidate, StorylineThread } from '../types';
import {
  closeComebackPlayerThread,
  evolveComebackPlayerThread,
  seedComebackPlayerThreads,
} from './comeback-player';
import {
  closeHotSeatCoachThread,
  evolveHotSeatCoachThread,
  seedHotSeatCoachThreads,
} from './hot-seat-coach';
import {
  closeQbControversyThread,
  evolveQbControversyThread,
  seedQbControversyThreads,
} from './qb-controversy';
import {
  closeRecordsChaseThread,
  evolveRecordsChaseThread,
  seedRecordsChaseThreads,
} from './records-chase';
import {
  closeRookieOfYearThread,
  evolveRookieOfYearThread,
  seedRookieOfYearThreads,
} from './rookie-of-year-chase';

export interface StorylineArchetypeHandler {
  archetype: StorylineArchetype;
  beats: readonly string[];
  seed: (state: GameState, weekNumber: number) => StorylineSeedCandidate[];
  evolve: (thread: StorylineThread, state: GameState, weekNumber: number) => StorylineThread;
  close: (thread: StorylineThread, state: GameState) => StorylineThread;
}

export const STORYLINE_ARCHETYPES: StorylineArchetypeHandler[] = [
  {
    archetype: 'hot-seat-coach',
    beats: ['reported pressure', 'GM meeting', 'bye-week ultimatum', 'win-or-fired game', 'fired OR extension'],
    seed: seedHotSeatCoachThreads,
    evolve: evolveHotSeatCoachThread,
    close: closeHotSeatCoachThread,
  },
  {
    archetype: 'qb-controversy',
    beats: ['media questions', 'coach defends starter', 'backup takes snaps in practice', 'midweek starter change', 'permanent switch OR benching'],
    seed: seedQbControversyThreads,
    evolve: evolveQbControversyThread,
    close: closeQbControversyThread,
  },
  {
    archetype: 'rookie-of-year-chase',
    beats: ['rookie of the week', 'power ranking spotlight', 'mid-season ROY favorite', 'closing argument'],
    seed: seedRookieOfYearThreads,
    evolve: evolveRookieOfYearThread,
    close: closeRookieOfYearThread,
  },
  {
    archetype: 'records-chase',
    beats: ['record projected', 'gaining ground', 'one game away', 'record night'],
    seed: seedRecordsChaseThreads,
    evolve: evolveRecordsChaseThread,
    close: closeRecordsChaseThread,
  },
  {
    archetype: 'comeback-player',
    beats: ['first game back', 'midseason resurgence', 'statement performance'],
    seed: seedComebackPlayerThreads,
    evolve: evolveComebackPlayerThread,
    close: closeComebackPlayerThread,
  },
];

export function getStorylineArchetype(archetype: StorylineArchetype): StorylineArchetypeHandler {
  const handler = STORYLINE_ARCHETYPES.find((entry) => entry.archetype === archetype);
  if (!handler) {
    throw new Error(`Unknown storyline archetype: ${archetype}`);
  }
  return handler;
}
