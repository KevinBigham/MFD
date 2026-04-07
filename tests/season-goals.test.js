import { describe, expect, it } from 'vitest';

import {
  evaluateGoals,
  generatePlayerGoals,
  generateSeasonGoals,
  OWNER_GOAL_TEMPLATES,
  updateGoalProgress,
} from '../src/systems/season-goals.js';

describe('season-goals.js', () => {
  it('generateSeasonGoals returns bounded owner/coach goal counts', () => {
    const goals = generateSeasonGoals({ ownerGoal: 'playoff' });
    expect(goals.ownerGoals.length).toBeGreaterThanOrEqual(1);
    expect(goals.ownerGoals.length).toBeLessThanOrEqual(2);
    expect(goals.coachGoals.length).toBeGreaterThanOrEqual(1);
    expect(goals.coachGoals.length).toBeLessThanOrEqual(2);
  });

  it('generateSeasonGoals owner goals come from selected owner pool', () => {
    const allowed = new Set(
      OWNER_GOAL_TEMPLATES.filter((g) => g.forGoal === 'rebuild').map((g) => g.id)
    );
    const goals = generateSeasonGoals({ ownerGoal: 'rebuild' });
    goals.ownerGoals.forEach((g) => {
      expect(allowed.has(g.id)).toBe(true);
    });
  });

  it('generatePlayerGoals filters by eligibility and attaches goal payloads', () => {
    const team = {
      roster: [
        { id: 'p1', name: 'QB A', pos: 'QB', ovr: 82, devTrait: 'normal' },
        { id: 'p2', name: 'RB A', pos: 'RB', ovr: 76, devTrait: 'star' },
        { id: 'p3', name: 'WR A', pos: 'WR', ovr: 79, devTrait: 'normal' },
        { id: 'p4', name: 'CB A', pos: 'CB', ovr: 70, devTrait: 'normal' },
      ],
    };
    const goals = generatePlayerGoals(team);
    expect(goals.length).toBe(3);
    goals.forEach((g) => {
      expect(g.goal).toBeTruthy();
      expect(g.goal.status).toBe('active');
    });
  });

  it('updateGoalProgress marks completed goals and returns newly completed list', () => {
    const team = {
      roster: [
        { id: 'p1', stats: { passYds: 3600 } },
        { id: 'p2', stats: { rushYds: 650 } },
      ],
    };
    const playerGoals = [
      { playerId: 'p1', playerName: 'QB A', goal: { id: '3500_pass', stat: 'passYds', target: 3500, compare: 'gte', status: 'active', current: 0 } },
      { playerId: 'p2', playerName: 'RB A', goal: { id: '800_rush', stat: 'rushYds', target: 800, compare: 'gte', status: 'active', current: 0 } },
    ];

    const newly = updateGoalProgress(team, playerGoals);
    expect(newly).toHaveLength(1);
    expect(newly[0].goalId).toBe('3500_pass');
    expect(playerGoals[0].goal.status).toBe('completed');
    expect(playerGoals[1].goal.status).toBe('active');
  });

  it('evaluateGoals returns completed/failed with summed rewards and penalties', () => {
    const team = {
      id: 'me',
      _divRank76: 2,
      cash: -1,
      attendance: 1000,
      facilities: { stad: 2 },
      roster: [{ isStarter: true, age: 22, ovr: 76 }],
      pf: 300,
      pa: 280,
    };
    const allTeams = [
      { id: 'me', pf: 300, pa: 280 },
      { id: 'x', pf: 250, pa: 260 },
    ];
    const ownerGoals = [
      { id: 'make_playoffs', label: 'Make playoffs', status: 'active', reward: { ownerMood: 10 }, penalty: { ownerMood: -15 } },
      { id: 'stay_solvent', label: 'Cash+', status: 'active', reward: { cash: 6 }, penalty: { ownerMood: -12 } },
    ];
    const coachGoals = [
      { id: 'top10_offense', label: 'Top offense', status: 'active', reward: { morale: 4 }, penalty: { coachDev: -2 } },
      { id: 'no_shutouts', label: 'No shutouts', status: 'active', reward: { morale: 3 }, penalty: { morale: -3 } },
    ];
    const playerGoals = [
      { playerName: 'QB A', goal: { id: '3500_pass', label: '3500 pass', status: 'completed', reward: { morale: 8 }, penalty: { morale: -3 }, current: 3600, target: 3500, compare: 'gte' } },
      { playerName: 'RB A', goal: { id: '800_rush', label: '800 rush', status: 'active', reward: { morale: 8 }, penalty: { morale: -3 }, current: 650, target: 800, compare: 'gte' } },
    ];

    const result = evaluateGoals(team, allTeams, ownerGoals, coachGoals, playerGoals, {
      madePlayoffs: true,
      isChamp: false,
      bestWinStreak: 3,
      shutoutLosses: 1,
      blowoutLosses: 0,
    });

    expect(result.completed.length).toBeGreaterThan(0);
    expect(result.failed.length).toBeGreaterThan(0);
    expect(typeof result.rewards).toBe('object');
    expect(typeof result.penalties).toBe('object');
  });
});
