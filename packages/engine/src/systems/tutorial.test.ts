import { describe, expect, it } from 'vitest';
import {
  advanceTutorial,
  completeTutorialAction,
  createDefaultTutorialState,
  dismissTutorial,
  getTutorialHint,
  isTutorialActive,
} from './tutorial';
import { makeLeagueState } from './test-helpers';

describe('tutorial', () => {
  it('starts with sixteen active steps on a new tutorial state', () => {
    const tutorial = createDefaultTutorialState();

    expect(tutorial.active).toBe(true);
    expect(tutorial.currentStepIndex).toBe(0);
    expect(tutorial.steps).toHaveLength(16);
    expect(tutorial.steps[0]?.title).toBe('Welcome');
    expect(tutorial.steps[15]?.title).toBe("You're Ready!");
  });

  it('advanceTutorial progresses correctly', () => {
    const game = makeLeagueState('preseason');
    game.tutorialState = createDefaultTutorialState();

    advanceTutorial(game);

    expect(game.tutorialState.completedSteps).toEqual(['welcome']);
    expect(game.tutorialState.currentStepIndex).toBe(1);
    expect(game.tutorialState.steps[0]?.completed).toBe(true);
  });

  it('dismissTutorial hides tutorial permanently', () => {
    const game = makeLeagueState('preseason');
    game.tutorialState = createDefaultTutorialState();

    dismissTutorial(game);

    expect(game.tutorialState.dismissed).toBe(true);
    expect(game.tutorialState.active).toBe(false);
    expect(isTutorialActive(game)).toBe(false);
  });

  it('getTutorialHint returns the targeted screen hint and action completion advances the step', () => {
    const game = makeLeagueState('preseason');
    game.tutorialState = createDefaultTutorialState();

    advanceTutorial(game); // roster step

    const hint = getTutorialHint(game, '/roster');
    expect(hint?.title).toBe('Check Roster');

    completeTutorialAction(game, 'screen:/roster');

    expect(game.tutorialState.completedSteps).toContain('check_roster');
    expect(game.tutorialState.currentStepIndex).toBe(2);
  });

  it('assigns navigation selectors to route-driven steps and keeps you are ready last', () => {
    const tutorial = createDefaultTutorialState();
    const rosterStep = tutorial.steps.find((step) => step.id === 'check_roster');
    const advanceWeekStep = tutorial.steps.find((step) => step.id === 'advance_week');
    const finalStep = tutorial.steps.at(-1);

    expect(rosterStep?.targetElement).toBe('[data-nav="/roster"]');
    expect(advanceWeekStep?.targetElement).toBe('[data-nav="/week-advance"]');
    expect(finalStep?.id).toBe('you_are_ready');
  });

  it('includes the convention demo steps before the final tutorial step', () => {
    const tutorial = createDefaultTutorialState();
    const ids = tutorial.steps.map((step) => step.id);

    expect(ids).toContain('check_game_plan');
    expect(ids).toContain('review_broadcast');
    expect(ids).toContain('explore_trades');
    expect(ids).toContain('check_franchise');
    expect(ids.indexOf('check_franchise')).toBeLessThan(ids.indexOf('you_are_ready'));
  });

  it('updates the final readiness copy and demo-step selectors', () => {
    const tutorial = createDefaultTutorialState();
    const gamePlanStep = tutorial.steps.find((step) => step.id === 'check_game_plan');
    const finalStep = tutorial.steps.at(-1);

    expect(gamePlanStep?.targetElement).toBe('[data-nav="/game-plan"]');
    expect(finalStep?.description).toBe('You have the tools to build a dynasty. Play your way — there are no wrong answers, only your story. Good luck, Coach.');
  });

  it('mutating steps require their explicit action instead of just visiting the screen', () => {
    const game = makeLeagueState('preseason');
    game.tutorialState = createDefaultTutorialState();

    advanceTutorial(game); // roster
    completeTutorialAction(game, 'screen:/roster');
    advanceTutorial(game); // cap
    completeTutorialAction(game, 'screen:/contracts');

    expect(game.tutorialState.currentStepIndex).toBe(3);

    completeTutorialAction(game, 'screen:/depth-chart');
    expect(game.tutorialState.currentStepIndex).toBe(3);

    completeTutorialAction(game, 'depth_chart:update');
    expect(game.tutorialState.currentStepIndex).toBe(4);
  });
});
