import { describe, expect, it } from 'vitest';
import type { StaffMember } from '../types';
import { coachRetirementChance } from './coach-aging';

function makeCoach(overrides: Partial<StaffMember> = {}): StaffMember {
  return {
    id: overrides.id ?? 'coach-1',
    name: overrides.name ?? 'Coach Test',
    role: overrides.role ?? 'HC',
    archetype: overrides.archetype ?? 'balanced',
    traits: overrides.traits ?? [],
    ratings: overrides.ratings ?? {
      gameplan: 75,
      development: 75,
      motivation: 75,
      strategy: 75,
    },
    level: overrides.level ?? 4,
    age: overrides.age ?? 55,
    ...overrides,
  };
}

describe('coachRetirementChance', () => {
  it('returns a low retirement chance for a 55-year-old coach', () => {
    const chance = coachRetirementChance(makeCoach({ age: 55 }), 12, 0);

    expect(chance).toBeLessThan(0.1);
    expect(chance).toBeGreaterThanOrEqual(0);
  });

  it('returns a high retirement chance for a 70-year-old coach', () => {
    const chance = coachRetirementChance(makeCoach({ age: 70 }), 22, 0);

    expect(chance).toBeGreaterThan(0.4);
    expect(chance).toBeLessThanOrEqual(0.85);
  });

  it('raises retirement pressure for strategist coaches', () => {
    const baseline = coachRetirementChance(makeCoach({ age: 62, archetype: 'balanced' }), 18, 0);
    const strategist = coachRetirementChance(makeCoach({ age: 62, archetype: 'strategist' }), 18, 0);

    expect(strategist).toBeGreaterThan(baseline);
  });

  it('reduces retirement pressure for players-coach archetypes', () => {
    const baseline = coachRetirementChance(makeCoach({ age: 62, archetype: 'balanced' }), 18, 0);
    const playersCoach = coachRetirementChance(makeCoach({ age: 62, archetype: 'players_coach' }), 18, 0);

    expect(playersCoach).toBeLessThan(baseline);
  });

  it('increases retirement chance after three losing seasons', () => {
    const neutral = coachRetirementChance(makeCoach({ age: 62 }), 18, 1);
    const losing = coachRetirementChance(makeCoach({ age: 62 }), 18, 3);

    expect(losing).toBeGreaterThan(neutral);
  });

  it('clamps extreme cases to 0.85', () => {
    const chance = coachRetirementChance(makeCoach({ age: 85, archetype: 'strategist' }), 30, 3);

    expect(chance).toBeLessThanOrEqual(0.85);
    expect(chance).toBeGreaterThan(0.55);
  });
});
