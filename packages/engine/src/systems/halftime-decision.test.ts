import { describe, expect, it } from 'vitest';
import { reseedSeason, reseedWeek, setSeed } from '../rng';
import { generateAiGamePlan } from './game-plan';
import { simGame } from './game-sim';
import { makeLeagueState } from './test-helpers';
import {
  applyHalftimeDecision,
  previewHalftimeDecision,
  shouldOfferHalftimeDecision,
  suggestHalftimeSwitch,
} from './halftime-decision';

const baseSuggestion = {
  direction: 'more_pass' as const,
  responseLabel: 'Open the throttle',
  summary: 'Shift into a faster, pass-first second half.',
  reason: 'The offense needs chunk plays to erase the halftime deficit.',
};

describe('halftime-decision', () => {
  it('returns a deterministic switch suggestion from the same halftime input', () => {
    const input = {
      scoreMargin: -10,
      teamYardsPerPlay: 4.9,
      opponentYardsPerPlay: 6.2,
      turnoverDelta: -1,
    };

    expect(suggestHalftimeSwitch(input)).toEqual(suggestHalftimeSwitch(input));
  });

  it('explains the pass switch without abstract script language', () => {
    const suggestion = suggestHalftimeSwitch({
      scoreMargin: 0,
      teamYardsPerPlay: 4.4,
      opponentYardsPerPlay: 5.0,
      turnoverDelta: 0,
    });

    expect(suggestion.summary).toContain('Attack outside routes');
    expect(suggestion.summary).not.toMatch(/chase|script/i);
    expect(suggestion.reason).toContain('vertical answer');
  });

  it('returns the same context when the coach sticks with the plan', () => {
    const context = {
      home: {
        teamOvrBonus: 1,
      },
    };

    expect(applyHalftimeDecision(context, {
      side: 'home',
      choice: 'stick',
      suggestion: baseSuggestion,
    })).toBe(context);
  });

  it('attaches the switch modifier with a sustained bonus and first-drive tax', () => {
    const context = applyHalftimeDecision({}, {
      side: 'home',
      choice: 'switch',
      suggestion: baseSuggestion,
    });

    expect(context.home?.halftimeModifier).toMatchObject({
      choice: 'switch',
      direction: 'more_pass',
      sustainedBonus: 1,
      firstDriveDelta: -1,
    });
  });

  it('attaches the gamble modifier with one-drive juice and a second-half tax', () => {
    const context = applyHalftimeDecision({}, {
      side: 'away',
      choice: 'gamble',
      suggestion: {
        ...baseSuggestion,
        direction: 'more_aggressive',
      },
    });

    expect(context.away?.halftimeModifier).toMatchObject({
      choice: 'gamble',
      direction: 'more_aggressive',
      gambleDriveDelta: 3,
      gambleOtherDriveDelta: -2,
    });
  });

  it('skips halftime decisions on rookie difficulty', () => {
    const game = makeLeagueState('regular_season', 1);
    game.difficulty = 'rookie';
    game.settings.halftimeDecisions = 'on';

    expect(shouldOfferHalftimeDecision(game)).toBe(false);
    expect(previewHalftimeDecision(game)).toBeNull();
  });

  it('skips halftime decisions when no user team matchup is scheduled', () => {
    const game = makeLeagueState('regular_season', 2);

    expect(shouldOfferHalftimeDecision(game)).toBe(false);
    expect(previewHalftimeDecision(game)).toBeNull();
  });

  it('previews the same halftime prompt from the same save state', () => {
    const game = makeLeagueState('regular_season', 1);

    expect(previewHalftimeDecision(game)).toEqual(previewHalftimeDecision(game));
  });

  it('changes the simulated outcome when a halftime switch is applied', () => {
    const game = makeLeagueState('regular_season', 1);
    const home = structuredClone(game.teams['afce1']!);
    const away = structuredClone(game.teams['afce2']!);
    const baseContext = {
      home: {
        gamePlan: generateAiGamePlan(game, home.id, away.id),
      },
      away: {
        gamePlan: generateAiGamePlan(game, away.id, home.id),
      },
      weather: 'clear' as const,
    };

    setSeed(game.seed);
    reseedSeason(game.year);
    reseedWeek(game.year, game.week);
    const baseline = simGame(structuredClone(home), structuredClone(away), baseContext);

    setSeed(game.seed);
    reseedSeason(game.year);
    reseedWeek(game.year, game.week);
    const adjusted = simGame(
      structuredClone(home),
      structuredClone(away),
      applyHalftimeDecision(baseContext, {
        side: 'home',
        choice: 'switch',
        suggestion: baseSuggestion,
      }),
    );

    expect(
      adjusted.homeStats.passAttempts !== baseline.homeStats.passAttempts
      || adjusted.homeScore !== baseline.homeScore
      || adjusted.awayScore !== baseline.awayScore,
    ).toBe(true);
  });
});
