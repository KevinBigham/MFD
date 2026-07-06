import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AttractModeFrame,
  buildAttractMoments,
  reduceAttractModeState,
} from './AttractMode';

const teams = [
  { abbr: 'BUF', fullName: 'Buffalo Bills', city: 'Buffalo' },
  { abbr: 'PHI', fullName: 'Philadelphia Eagles', city: 'Philadelphia' },
  { abbr: 'DAL', fullName: 'Dallas Cowboys', city: 'Dallas' },
];

const scenarios = [
  { name: 'Rebuild', tagline: 'Start over and stack picks.', seasonLimit: 5 },
  { name: 'Dynasty', tagline: 'Protect the crown.', seasonLimit: 3 },
];

describe('AttractMode', () => {
  it('builds a deterministic set of demo moments', () => {
    const firstRun = buildAttractMoments(teams, scenarios, 'Convention headline');
    const secondRun = buildAttractMoments(teams, scenarios, 'Convention headline');

    expect(firstRun).toEqual(secondRun);
    expect(firstRun).toHaveLength(3);
  });

  it('activates once the idle timeout fires', () => {
    const nextState = reduceAttractModeState(
      { active: false, dismissed: false, frameIndex: 0 },
      { type: 'idle-timeout' },
    );

    expect(nextState.active).toBe(true);
    expect(nextState.dismissed).toBe(false);
    expect(nextState.frameIndex).toBe(0);
  });

  it('advances frames while the reel is active', () => {
    const nextState = reduceAttractModeState(
      { active: true, dismissed: false, frameIndex: 1 },
      { type: 'advance', totalFrames: 3 },
    );

    expect(nextState.frameIndex).toBe(2);
  });

  it('wraps frame advancement back to zero', () => {
    const nextState = reduceAttractModeState(
      { active: true, dismissed: false, frameIndex: 2 },
      { type: 'advance', totalFrames: 3 },
    );

    expect(nextState.frameIndex).toBe(0);
  });

  it('dismisses and skips the reel after user input', () => {
    const dismissedState = reduceAttractModeState(
      { active: true, dismissed: false, frameIndex: 1 },
      { type: 'user-input' },
    );
    const afterIdle = reduceAttractModeState(dismissedState, { type: 'idle-timeout' });

    expect(dismissedState.active).toBe(false);
    expect(dismissedState.dismissed).toBe(true);
    expect(afterIdle).toEqual(dismissedState);
  });

  it('labels the source inputs, seeded picker, and no-write boundary', () => {
    const currentMoment = buildAttractMoments(teams, scenarios, 'Convention headline')[0];
    if (!currentMoment) throw new Error('Expected seeded attract mode frame');
    const markup = renderToStaticMarkup(createElement(AttractModeFrame, {
      currentMoment,
      momentCount: 3,
    }));

    expect(markup).toContain('NewGameScreen inputs');
    expect(markup).toContain('mulberry32 seed');
    expect(markup).toContain('Render-only reel');
    expect(markup).toContain('3 seeded demo frames from team catalog, scenario catalog, and the convention headline');
    expect(markup).toContain('Idle timers and player input only activate, advance, or dismiss this mount');
    expect(markup).toContain('does not create a dynasty, start setup, write');
    expect(markup).toContain('GameState, autosave, play scheduled games, or reroll random outcomes');
  });
});
