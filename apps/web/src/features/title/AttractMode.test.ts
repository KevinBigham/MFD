import { describe, expect, it } from 'vitest';
import {
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
});
