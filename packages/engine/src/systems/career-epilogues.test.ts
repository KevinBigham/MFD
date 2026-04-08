import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../rng';
import type { Player } from '../types';
import { generateCareerEpilogue, isEpilogueWorthy } from './career-epilogues';

function seededRng(seed = 42) {
  return mulberry32(seed);
}

function makePlayer(traits: string[] = [], ovr = 85, yearsExp = 10): Player {
  return {
    id: 'player-1',
    name: 'John Legend',
    traits,
    ovr,
    yearsExp,
  } as unknown as Player;
}

describe('Career Epilogues', () => {
  it('generates an epilogue for a film_junkie player', () => {
    const player = makePlayer(['film_junkie']);
    const epilogue = generateCareerEpilogue(seededRng(), player);
    expect(epilogue.playerName).toBe('John Legend');
    expect(epilogue.category).toBe('broadcasting');
    expect(epilogue.headline).toContain('John Legend');
    expect(epilogue.story).toContain('John Legend');
  });

  it('generates a coaching epilogue for captains', () => {
    const player = makePlayer(['captain', 'vocal_leader']);
    const epilogue = generateCareerEpilogue(seededRng(), player);
    expect(epilogue.category).toBe('coaching');
  });

  it('generates an entertainment epilogue for showboats', () => {
    const player = makePlayer(['showtime', 'ego']);
    const epilogue = generateCareerEpilogue(seededRng(), player);
    expect(epilogue.category).toBe('entertainment');
  });

  it('generates a fallback for players with no matching traits', () => {
    const player = makePlayer([]);
    const epilogue = generateCareerEpilogue(seededRng(), player);
    expect(epilogue.headline.length).toBeGreaterThan(0);
    expect(epilogue.story.length).toBeGreaterThan(0);
  });

  it('is deterministic with same seed', () => {
    const player = makePlayer(['film_junkie', 'captain']);
    const e1 = generateCareerEpilogue(seededRng(99), player);
    const e2 = generateCareerEpilogue(seededRng(99), player);
    expect(e1.headline).toBe(e2.headline);
    expect(e1.story).toBe(e2.story);
  });

  it('isEpilogueWorthy checks OVR and experience', () => {
    expect(isEpilogueWorthy(makePlayer([], 85, 10))).toBe(true);
    expect(isEpilogueWorthy(makePlayer([], 75, 10))).toBe(false);
    expect(isEpilogueWorthy(makePlayer([], 85, 5))).toBe(false);
  });
});
