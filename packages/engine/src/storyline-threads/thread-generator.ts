import type { GameState } from '../types';
import { STORYLINE_ARCHETYPES, getStorylineArchetype } from './archetypes';
import type { StorylineSeedCandidate, StorylineThread } from './types';

function buildThread(state: GameState, weekNumber: number, candidate: StorylineSeedCandidate, archetype: StorylineThread['archetype']): StorylineThread {
  const handler = getStorylineArchetype(archetype);
  return {
    id: `storyline|${candidate.key}`,
    key: candidate.key,
    archetype,
    title: candidate.title,
    summary: candidate.summary,
    teamIds: candidate.teamIds,
    playerIds: candidate.playerIds,
    startWeek: weekNumber,
    startYear: state.year,
    weeksActive: 1,
    status: 'active',
    beats: [{
      label: handler.beats[0] ?? 'opening beat',
      summary: candidate.summary,
      weekNumber,
      year: state.year,
    }],
    heat: candidate.heat,
    nextBeatHint: candidate.nextBeatHint,
    beatIndex: 0,
    updatedWeek: weekNumber,
    updatedYear: state.year,
    closeReason: null,
    metadata: candidate.metadata,
  };
}

export function seedThreadsForWeek(state: GameState, weekNumber: number): StorylineThread[] {
  const existing = state.storylineThreads ?? [];
  const existingKeys = new Set(existing.map((thread) => thread.key));
  const seeded = STORYLINE_ARCHETYPES
    .flatMap((handler) => handler.seed(state, weekNumber).map((candidate) => ({ handler, candidate })))
    .sort((left, right) =>
      left.handler.archetype.localeCompare(right.handler.archetype)
      || left.candidate.key.localeCompare(right.candidate.key))
    .flatMap(({ handler, candidate }) => {
      if (existingKeys.has(candidate.key)) return [];
      existingKeys.add(candidate.key);
      return [buildThread(state, weekNumber, candidate, handler.archetype)];
    });

  return [...existing, ...seeded];
}
