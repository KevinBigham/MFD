import { describe, expect, it } from 'vitest';

import { COACH_SKILL_TREE } from '../src/systems/coach-skill-tree.js';

describe('coach-skill-tree.js', () => {
  it('defines three trees with three branches each', () => {
    expect(Object.keys(COACH_SKILL_TREE.trees).sort()).toEqual([
      'Disciplinarian',
      'Motivator',
      'Strategist',
    ]);

    Object.values(COACH_SKILL_TREE.trees).forEach((tree) => {
      expect(tree.branches).toHaveLength(3);
      tree.branches.forEach((branch) => {
        expect(branch.tiers).toHaveLength(3);
      });
    });
  });

  it('maps archetypes to tree keys', () => {
    expect(COACH_SKILL_TREE.getTreeKey('Strategist')).toBe('Strategist');
    expect(COACH_SKILL_TREE.getTreeKey('QB Guru')).toBe('Strategist');
    expect(COACH_SKILL_TREE.getTreeKey("Player's Coach")).toBe('Motivator');
    expect(COACH_SKILL_TREE.getTreeKey('AnythingElse')).toBe('Disciplinarian');
  });

  it('returns empty bonus when selection/branch/tree is missing', () => {
    expect(COACH_SKILL_TREE.getActiveBonus({}, 'c1', 10, 'Strategist')).toEqual({});

    const badBranch = { c1: { branch: 'nope', tier: 3 } };
    expect(COACH_SKILL_TREE.getActiveBonus(badBranch, 'c1', 10, 'Strategist')).toEqual({});
  });

  it('aggregates unlocked tier bonuses for selected branch', () => {
    const selections = { c1: { branch: 'air_raid', tier: 3 } };
    const b = COACH_SKILL_TREE.getActiveBonus(selections, 'c1', 10, 'Strategist');

    expect(b.passMod).toBe(10); // 2 + 3 + 5
    expect(b.rzBoost).toBe(3);
  });

  it('respects coach level and selected tier gate', () => {
    const selections = { c1: { branch: 'analytics', tier: 2 } };
    const lowLevel = COACH_SKILL_TREE.getActiveBonus(selections, 'c1', 5, 'Strategist');
    const highLevel = COACH_SKILL_TREE.getActiveBonus(selections, 'c1', 7, 'Strategist');

    expect(lowLevel).toEqual({ stallReduction: 0.02 });
    expect(highLevel).toEqual({ stallReduction: 0.02, counterBoost: 2 });
  });
});
