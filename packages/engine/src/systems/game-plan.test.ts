import { describe, expect, it } from 'vitest';
import { makeLeagueState } from './test-helpers';
import {
  applyGamePlan,
  generateAiGamePlan,
  generateOpponentScouting,
  resetGamePlan,
  setGamePlan,
} from './game-plan';
import { buildOpponentIntel } from './weekly-prep';

const STALE_SCOUTING_COPY = /\b(?:can stress the secondary|can control tempo|can muddy|Front can be moved|Execution will matter more than leverage|Attack the weak secondary|Stress the secondary|control tempo|leverage|run fits?|run-fit jobs|missed fits|gap jobs|gashing us|calls starters cannot handle)\b/i;

describe('game plan system', () => {
  it('generates a scouting report for a valid opponent', () => {
    const game = makeLeagueState('regular_season', 6);

    const report = generateOpponentScouting(game, 'afce1', 'afce2');

    expect(report.teamName).toContain('Club');
    expect(report.strengths.length + report.weaknesses.length).toBeGreaterThan(0);
    expect(report.schemeRecommendation.reasoning.length).toBeGreaterThan(0);
    expect(JSON.stringify(report)).not.toMatch(STALE_SCOUTING_COPY);
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
    expect(report.weaknesses.join(' ')).toContain('assign QB, WR, and TE timing reps before kickoff');
    expect(JSON.stringify(report)).not.toMatch(STALE_SCOUTING_COPY);
  });

  it('names run-defense assignments when the opponent run game is the threat', () => {
    const game = makeLeagueState('regular_season', 6);
    const opponent = game.teams.afce2;

    for (const player of opponent.roster) {
      if (player.pos === 'RB' || player.pos === 'OL') {
        player.ovr = 88;
      }
    }

    const report = generateOpponentScouting(game, 'afce1', 'afce2');

    expect(report.strengths).toContain('RB and OL group shortens drives; assign run-defense jobs and defensive rotation before kickoff.');
    expect(JSON.stringify(report)).not.toMatch(STALE_SCOUTING_COPY);
  });

  it('explains opponent intel recommendations with concrete assignments and consequences', () => {
    const game = makeLeagueState('regular_season', 6);
    const opponent = game.teams.afce2;

    for (const player of opponent.roster) {
      if (player.pos === 'CB' || player.pos === 'S') {
        player.ovr = 60;
        player.ratings.awareness = 58;
      }
      if (player.pos === 'QB' || player.pos === 'WR' || player.pos === 'TE') {
        player.ovr = 86;
      }
    }

    const intel = buildOpponentIntel(game, 'afce1', 'afce2');

    expect(intel.recommendations.offense.join(' ')).toContain('missed timing turns those calls into punts');
    expect(intel.recommendations.defense.join(' ')).toContain('missed pressure leaves explosive throws open');
    expect(intel.tendencies.join(' ')).toContain('safeties and corners need help rules before kickoff');
    expect(JSON.stringify(intel)).not.toMatch(STALE_SCOUTING_COPY);
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
