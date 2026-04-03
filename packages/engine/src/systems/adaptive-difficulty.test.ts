import { describe, expect, it } from 'vitest';
import {
  getAdaptiveModifier,
  updateAdaptiveDifficulty,
} from './adaptive-difficulty';
import { makeLeagueState } from './test-helpers';

describe('adaptive difficulty', () => {
  it('raises the slider after a four-game win streak', () => {
    const game = makeLeagueState('regular_season');
    game.difficultyState.recentUserResults = [
      { week: 1, result: 'win' },
      { week: 2, result: 'win' },
      { week: 3, result: 'win' },
    ];
    game.difficultyState.currentStreak = 3;

    updateAdaptiveDifficulty(game, 'win');

    expect(game.difficultyState.adaptiveSlider).toBe(53);
  });

  it('drops the slider after a three-game losing streak', () => {
    const game = makeLeagueState('regular_season');
    game.difficultyState.recentUserResults = [
      { week: 1, result: 'loss' },
      { week: 2, result: 'loss' },
    ];
    game.difficultyState.currentStreak = -2;

    updateAdaptiveDifficulty(game, 'loss');

    expect(game.difficultyState.adaptiveSlider).toBe(48);
  });

  it('clamps the slider to the 0-100 range', () => {
    const game = makeLeagueState('regular_season');
    game.difficultyState.adaptiveSlider = 99;
    game.difficultyState.currentStreak = 6;
    updateAdaptiveDifficulty(game, 'win');
    expect(game.difficultyState.adaptiveSlider).toBe(100);

    game.difficultyState.adaptiveSlider = 1;
    game.difficultyState.currentStreak = -4;
    updateAdaptiveDifficulty(game, 'loss');
    expect(game.difficultyState.adaptiveSlider).toBe(0);
  });

  it('caps the effective modifier at plus or minus five overall', () => {
    const game = makeLeagueState('regular_season');
    game.difficultyState.adaptiveSlider = 100;
    expect(getAdaptiveModifier(game)).toBe(5);

    game.difficultyState.adaptiveSlider = 0;
    expect(getAdaptiveModifier(game)).toBe(-5);
  });

  it('returns a neutral modifier when disabled', () => {
    const game = makeLeagueState('regular_season');
    game.difficultyState.enabled = false;
    game.difficultyState.adaptiveSlider = 80;

    expect(getAdaptiveModifier(game)).toBe(0);
  });
});
