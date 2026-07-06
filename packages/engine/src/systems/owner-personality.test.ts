import { afterEach, describe, expect, it, vi } from 'vitest';
import { RNG } from '../rng';
import type { OwnerArchetypeId } from '../types';
import { checkOwnerPersonality } from './owner-personality';
import { makeTeam } from './test-helpers';

describe('owner personality events', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('leaves owner mood and roster morale unchanged when the event gate does not trigger', () => {
    const team = makeTeam('afce1', 'AFC', 'East', true);
    team.ownerMood = 44;
    const moraleBefore = team.roster.map((player) => player.morale);
    vi.spyOn(RNG, 'ai').mockReturnValue(0.41);

    const result = checkOwnerPersonality('win_now', team);

    expect(result).toEqual({ triggered: false, event: null });
    expect(team.ownerMood).toBe(44);
    expect(team.roster.map((player) => player.morale)).toEqual(moraleBefore);
  });

  it('applies the selected archetype event to owner mood and every roster player morale', () => {
    const team = makeTeam('afce1', 'AFC', 'East', true);
    team.ownerMood = 7;
    team.roster[0]!.morale = 1;
    team.roster[1]!.morale = 99;
    const moraleBefore = team.roster.map((player) => player.morale);
    vi.spyOn(RNG, 'ai')
      .mockReturnValueOnce(0.4)
      .mockReturnValueOnce(0);

    const result = checkOwnerPersonality('win_now', team);

    expect(result.triggered).toBe(true);
    expect(result.event).toMatchObject({
      archetypeId: 'win_now',
      label: 'Owner demands trades',
      moodDelta: -5,
      moraleDelta: -3,
    });
    expect(team.ownerMood).toBe(5);
    expect(team.roster.map((player) => player.morale)).toEqual(
      moraleBefore.map((morale) => Math.max(0, Math.min(100, morale - 3))),
    );
  });

  it('does not mutate the team when a runtime archetype id has no matching events', () => {
    const team = makeTeam('afce1', 'AFC', 'East', true);
    team.ownerMood = 61;
    const moraleBefore = team.roster.map((player) => player.morale);
    vi.spyOn(RNG, 'ai').mockReturnValue(0);

    const result = checkOwnerPersonality('relocation_tycoon' as OwnerArchetypeId, team);

    expect(result).toEqual({ triggered: false, event: null });
    expect(team.ownerMood).toBe(61);
    expect(team.roster.map((player) => player.morale)).toEqual(moraleBefore);
  });
});
