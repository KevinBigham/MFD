import type { GameState } from '../types';
import { getStorylineArchetype } from './archetypes';
import type { StorylineThread } from './types';

export function advanceStorylineThreads(state: GameState, weekNumber: number): StorylineThread[] {
  return (state.storylineThreads ?? []).map((thread) => {
    if (thread.status === 'closed') return thread;
    if (thread.updatedYear === state.year && thread.updatedWeek === weekNumber) return thread;
    return getStorylineArchetype(thread.archetype).evolve(thread, state, weekNumber);
  });
}

export function closeCompletedThreads(state: GameState): StorylineThread[] {
  return (state.storylineThreads ?? []).map((thread) =>
    thread.status === 'closed'
      ? thread
      : getStorylineArchetype(thread.archetype).close(thread, state));
}
