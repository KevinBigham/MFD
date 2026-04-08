import { describe, expect, it } from 'vitest';
import { setSeed } from '../rng';
import type { GamePlan } from '../types';
import { advanceFranchiseWeek } from './franchise-week';
import { simGame } from './game-sim';
import { makeLeagueState, makeTeam } from './test-helpers';

function makePlan(overrides: Partial<GamePlan> = {}): GamePlan {
  return {
    offensiveScheme: 'balanced',
    defensiveScheme: 'base',
    keyMatchup: null,
    gamePlanBonus: 0,
    contingencyRules: [],
    ...overrides,
  };
}

describe('contingency wiring', () => {
  it('fires contingencies at quarter breaks and carries activations into game results', () => {
    const game = makeLeagueState('regular_season', 1);
    game.gamePlan = makePlan({
      contingencyRules: [{
        id: 'wind-home',
        trigger: 'wind_over_15',
        action: { type: 'switch_offense', scheme: 'run_heavy' },
        label: 'Lean on the run',
        description: 'Use the run game in wind.',
      }],
    });
    game.schedule[0]!.games[0]!.weather = 'wind';

    const result = advanceFranchiseWeek(game);
    const activation = result.nextState.schedule[0]!.games[0]!.result?.contingencyActivations?.[0];

    expect(activation).toEqual(expect.objectContaining({
      teamId: 'afce1',
      ruleId: 'wind-home',
      quarter: 2,
    }));
  });

  it('builds halftime score-diff context so trailing rules can fire after the break', () => {
    const home = makeTeam('home', 'AFC', 'East', true, 66);
    const away = makeTeam('away', 'NFC', 'West', false, 86);
    const homePlan = makePlan({
      contingencyRules: [{
        id: 'trail-half',
        trigger: 'trailing_7_at_half',
        action: { type: 'go_aggressive' },
        label: 'Open it up',
        description: 'Push the ball if trailing at the half.',
      }],
    });

    let foundQuarter: number | null = null;
    for (let seed = 1; seed <= 250; seed += 1) {
      setSeed(seed);
      const result = simGame(home, away, {
        home: { gamePlan: homePlan },
      });
      const activation = result.contingencyActivations?.find((entry) => entry.ruleId === 'trail-half');
      if (activation) {
        foundQuarter = activation.quarter;
        break;
      }
    }

    expect(foundQuarter).not.toBeNull();
    expect(foundQuarter).toBeGreaterThanOrEqual(3);
  });

  it('applies the contingency action so mid-game play selection changes', () => {
    const home = makeTeam('home', 'AFC', 'East', true, 78);
    const away = makeTeam('away', 'NFC', 'West', false, 78);
    const contingentPlan = makePlan({
      contingencyRules: [{
        id: 'run-in-wind',
        trigger: 'wind_over_15',
        action: { type: 'switch_offense', scheme: 'run_heavy' },
        label: 'Run into the wind',
        description: 'Shift into the run game when the wind picks up.',
      }],
    });

    let changedByContingency = false;
    for (let seed = 1; seed <= 250; seed += 1) {
      setSeed(seed);
      const baseline = simGame(home, away, {
        home: { gamePlan: makePlan() },
        weather: 'wind',
      });
      setSeed(seed);
      const contingent = simGame(home, away, {
        home: { gamePlan: contingentPlan },
        weather: 'wind',
      });

      const activated = contingent.contingencyActivations?.some((entry) => entry.ruleId === 'run-in-wind');
      const changed = contingent.homeStats.rushAttempts !== baseline.homeStats.rushAttempts
        || contingent.homeStats.passAttempts !== baseline.homeStats.passAttempts
        || contingent.homeStats.rushingYards !== baseline.homeStats.rushingYards
        || contingent.homeStats.passingYards !== baseline.homeStats.passingYards;

      if (activated && changed) {
        changedByContingency = true;
        break;
      }
    }

    expect(changedByContingency).toBe(true);
  });

  it('does not activate anything when no contingency rules are set', () => {
    const home = makeTeam('home', 'AFC', 'East', true, 76);
    const away = makeTeam('away', 'NFC', 'West', false, 76);

    setSeed(18);
    const result = simGame(home, away, {
      home: { gamePlan: makePlan() },
    });

    expect(result.contingencyActivations ?? []).toEqual([]);
  });

  it('does not fire the same contingency rule more than once', () => {
    const home = makeTeam('home', 'AFC', 'East', true, 80);
    const away = makeTeam('away', 'NFC', 'West', false, 80);
    const homePlan = makePlan({
      contingencyRules: [{
        id: 'single-fire',
        trigger: 'wind_over_15',
        action: { type: 'switch_offense', scheme: 'run_heavy' },
        label: 'One-shot wind plan',
        description: 'Adjust once when the wind is high.',
      }],
    });

    setSeed(44);
    const result = simGame(home, away, {
      home: { gamePlan: homePlan },
      weather: 'wind',
    });

    expect(result.contingencyActivations.filter((entry) => entry.ruleId === 'single-fire')).toHaveLength(1);
  });

  it('allows multiple contingencies to fire in the same game', () => {
    const home = makeTeam('home', 'AFC', 'East', true, 79);
    const away = makeTeam('away', 'NFC', 'West', false, 79);
    const homePlan = makePlan({
      contingencyRules: [{
        id: 'home-wind',
        trigger: 'wind_over_15',
        action: { type: 'switch_offense', scheme: 'run_heavy' },
        label: 'Home wind plan',
        description: 'Home switches on wind.',
      }],
    });
    const awayPlan = makePlan({
      contingencyRules: [{
        id: 'away-wind',
        trigger: 'wind_over_15',
        action: { type: 'switch_defense', scheme: 'coverage' },
        label: 'Away wind plan',
        description: 'Away switches on wind.',
      }],
    });

    setSeed(61);
    const result = simGame(home, away, {
      home: { gamePlan: homePlan },
      away: { gamePlan: awayPlan },
      weather: 'wind',
    });

    expect(result.contingencyActivations).toEqual(expect.arrayContaining([
      expect.objectContaining({ teamId: 'home', ruleId: 'home-wind' }),
      expect.objectContaining({ teamId: 'away', ruleId: 'away-wind' }),
    ]));
  });
});
