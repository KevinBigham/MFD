import { describe, expect, it } from 'vitest';
import { makeLeagueState } from './test-helpers';
import {
  applyGamePlan,
  generateAiGamePlan,
  generateOpponentScouting,
  resetGamePlan,
  setGamePlan,
} from './game-plan';

describe('game plan system', () => {
  it('generates a scouting report for a valid opponent', () => {
    const game = makeLeagueState('regular_season', 6);

    const report = generateOpponentScouting(game, 'afce1', 'afce2');

    expect(report.teamName).toContain('Club');
    expect(report.strengths.length + report.weaknesses.length).toBeGreaterThan(0);
    expect(report.schemeRecommendation.reasoning.length).toBeGreaterThan(0);
  });

  it('recommends a pass-heavy attack against a weak secondary', () => {
    const game = makeLeagueState('regular_season', 6);
    const opponent = game.teams.afce2;

    for (const player of opponent.roster) {
      if (player.pos === 'CB' || player.pos === 'S') {
        player.ovr = 60;
        player.ratings.awareness = 58;
      }
    }

    const report = generateOpponentScouting(game, 'afce1', 'afce2');

    expect(report.schemeRecommendation.offense).toBe('pass_heavy');
  });

  it('gives positive player bonuses for the recommended schemes', () => {
    const game = makeLeagueState('regular_season', 6);
    const report = generateOpponentScouting(game, 'afce1', 'afce2');
    const team = game.teams.afce1;
    const plan = {
      offensiveScheme: report.schemeRecommendation.offense,
      defensiveScheme: report.schemeRecommendation.defense,
      keyMatchup: null,
      gamePlanBonus: 0,
    } as const;

    const context = applyGamePlan(plan, report, team);

    expect(Object.values(context.playerOvrBonuses ?? {}).some((value) => value > 0)).toBe(true);
  });

  it('applies penalties for bad scheme choices', () => {
    const game = makeLeagueState('regular_season', 6);
    const team = game.teams.afce1;
    const report = {
      ...generateOpponentScouting(game, 'afce1', 'afce2'),
      schemeRecommendation: {
        offense: 'run_heavy' as const,
        defense: 'contain' as const,
        reasoning: 'Lean on the run and keep the edges clean.',
      },
    };

    const context = applyGamePlan({
      offensiveScheme: 'pass_heavy',
      defensiveScheme: 'aggressive',
      keyMatchup: null,
      gamePlanBonus: 0,
    }, report, team);

    expect(Object.values(context.playerOvrBonuses ?? {}).some((value) => value < 0)).toBe(true);
  });

  it('auto-generates AI game plans from opponent analysis', () => {
    const game = makeLeagueState('regular_season', 6);

    const plan = generateAiGamePlan(game, 'afce2', 'afce1');

    expect(plan.offensiveScheme).toBeTruthy();
    expect(plan.defensiveScheme).toBeTruthy();
  });

  it('resets the stored game plan after the week is cleared', () => {
    const game = makeLeagueState('regular_season', 6);

    setGamePlan(game, {
      offensiveScheme: 'balanced',
      defensiveScheme: 'base',
      keyMatchup: null,
      gamePlanBonus: 2,
    });
    expect(game.gamePlan).not.toBeNull();

    resetGamePlan(game);

    expect(game.gamePlan).toBeNull();
  });
});
