import { describe, expect, it } from 'vitest';
import { setSeed } from '../rng';
import { chemistryMod, resetSystemFit, systemFitMod, updateSystemFit } from './chemistry';
import { makePlayer, makeTeam } from './test-helpers';

describe('chemistry direct coverage', () => {
  it.each([
    ['elite chemistry', 82, 3],
    ['strong chemistry', 72, 1.5],
    ['neutral chemistry', 60, 0],
    ['weak chemistry', 45, -1],
    ['toxic chemistry', 30, -2],
  ] as const)('returns %s modifier tiers', (_label, chemistry, expected) => {
    const team = makeTeam('chem', 'AFC', 'East', true, 80);
    team.roster = [makePlayer('chem-player', team.id, 'QB', 80)];
    team.roster[0]!.chemistry = chemistry;

    expect(chemistryMod(team)).toBe(expected);
  });

  it.each([
    ['high fit', 80, 0.02],
    ['good fit', 60, 0.01],
    ['neutral fit', 40, 0],
    ['poor fit', 20, -0.01],
  ] as const)('returns %s system-fit modifiers', (_label, fit, expected) => {
    const team = makeTeam('fit', 'NFC', 'North', false, 78);
    team.roster = [makePlayer('fit-player', team.id, 'QB', 80)];
    team.roster[0]!.systemFit = fit;

    expect(systemFitMod(team)).toBe(expected);
  });

  it('updates system fit deterministically with strategist and ambition bonuses', () => {
    const team = makeTeam('grow', 'AFC', 'South', false, 80);
    const player = makePlayer('grow-player', team.id, 'QB', 80);
    player.systemFit = 30;
    player.personality.workEthic = 9;
    player.personality.ambition = 9;
    team.roster = [player];
    team.staff.hc = {
      id: 'hc-grow',
      name: 'Coach Growth',
      role: 'HC',
      archetype: 'Strategist',
      traits: [],
      ratings: { strategy: 80 },
      level: 6,
    };

    setSeed(42);
    updateSystemFit(team);

    expect(team.roster[0]?.systemFit).toBe(35);
  });

  it('applies holdout greed penalties during system-fit growth', () => {
    const team = makeTeam('holdout', 'AFC', 'West', false, 80);
    const player = makePlayer('holdout-player', team.id, 'WR', 78);
    player.systemFit = 30;
    player.holdout = true;
    player.personality.greed = 9;
    team.roster = [player];

    setSeed(42);
    updateSystemFit(team);

    expect(team.roster[0]?.systemFit).toBe(30);
  });

  it('lets high-work-ethic and loyal players retain more fit after a scheme reset', () => {
    const team = makeTeam('reset-good', 'NFC', 'East', false, 80);
    const player = makePlayer('reset-good-player', team.id, 'TE', 77);
    player.systemFit = 80;
    player.personality.workEthic = 9;
    player.personality.loyalty = 9;
    team.roster = [player];

    resetSystemFit(team);

    expect(team.roster[0]?.systemFit).toBe(56);
  });

  it('cuts system fit harder for greedy holdouts after a scheme change', () => {
    const team = makeTeam('reset-bad', 'NFC', 'West', false, 80);
    const player = makePlayer('reset-bad-player', team.id, 'RB', 77);
    player.systemFit = 80;
    player.holdout = true;
    player.personality.greed = 9;
    team.roster = [player];

    resetSystemFit(team);

    expect(team.roster[0]?.systemFit).toBe(42);
  });
});
