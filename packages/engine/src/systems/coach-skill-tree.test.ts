import { describe, expect, it } from 'vitest';
import type { CoachSkillSelection } from '../types';
import { getActiveBonus, getTreeKey, SKILL_TREES } from './coach-skill-tree';

describe('coach-skill-tree direct coverage', () => {
  it('defines three trees with three branches and three tiers each', () => {
    expect(Object.keys(SKILL_TREES)).toEqual(['Strategist', 'Motivator', 'Disciplinarian']);
    expect(SKILL_TREES.Strategist.branches).toHaveLength(3);
    expect(SKILL_TREES.Motivator.branches.every((branch) => branch.tiers.length === 3)).toBe(true);
    expect(SKILL_TREES.Disciplinarian.branches.every((branch) => branch.tiers.length === 3)).toBe(true);
  });

  it('maps known archetypes onto their tree families', () => {
    expect(getTreeKey('Strategist')).toBe('Strategist');
    expect(getTreeKey('QB Guru')).toBe('Strategist');
    expect(getTreeKey('DB Whisperer')).toBe('Motivator');
    expect(getTreeKey('Run Stuffer')).toBe('Disciplinarian');
  });

  it('defaults unknown archetypes to the disciplinarian tree', () => {
    expect(getTreeKey('Mystery Coach')).toBe('Disciplinarian');
  });

  it('returns no active bonus when the coach has no skill selection', () => {
    expect(getActiveBonus({}, 'coach-1', 6, 'Strategist')).toEqual({});
  });

  it('returns no active bonus when the selected branch is invalid', () => {
    const selections: Record<string, CoachSkillSelection> = {
      'coach-1': { branch: 'not-real', tier: 2 },
    };

    expect(getActiveBonus(selections, 'coach-1', 6, 'Strategist')).toEqual({});
  });

  it('aggregates unlocked tier bonuses when level and tier both qualify', () => {
    const selections: Record<string, CoachSkillSelection> = {
      'coach-1': { branch: 'air_raid', tier: 2 },
    };

    expect(getActiveBonus(selections, 'coach-1', 6, 'Strategist')).toEqual({
      passMod: 5,
    });
  });

  it('stops bonus progression at the highest tier allowed by coach level', () => {
    const selections: Record<string, CoachSkillSelection> = {
      'coach-1': { branch: 'analytics', tier: 3 },
    };

    expect(getActiveBonus(selections, 'coach-1', 5, 'Strategist')).toEqual({
      stallReduction: 0.02,
    });
  });

  it('can aggregate multiple motivator bonuses from later tiers', () => {
    const selections: Record<string, CoachSkillSelection> = {
      'coach-1': { branch: 'clutch_coach', tier: 3 },
    };

    expect(getActiveBonus(selections, 'coach-1', 9, 'Motivator')).toEqual({
      clutchBoost: 16,
      playoffMod: 2.1500000000000004,
    });
  });
});
