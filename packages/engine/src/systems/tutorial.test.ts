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
  it('starts with twelve active steps on a new tutorial state', () => {
    const tutorial = createDefaultTutorialState();

    expect(tutorial.active).toBe(true);
    expect(tutorial.currentStepIndex).toBe(0);
    expect(tutorial.steps).toHaveLength(12);
    expect(tutorial.steps[0]?.title).toBe('Welcome');
    expect(tutorial.steps[11]?.title).toBe("You're Ready!");
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
