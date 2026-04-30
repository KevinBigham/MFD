import { describe, expect, it } from 'vitest';
import {
  ONBOARDING_REVEAL_TOTAL_MS,
  getOnboardingRevealFrame,
} from './onboardingReveal';

describe('onboarding reveal timeline', () => {
  it('starts hidden on the wave pose', () => {
    expect(getOnboardingRevealFrame({ elapsedMs: 0 })).toEqual({
      phase: 'hidden',
      pose: 'wave',
      opacity: 0,
      complete: false,
    });
  });

  it('fades in during the first second', () => {
    expect(getOnboardingRevealFrame({ elapsedMs: 500 })).toEqual({
      phase: 'fading-in',
      pose: 'wave',
      opacity: 0.5,
      complete: false,
    });
  });

  it('holds the wave pose after fade-in', () => {
    expect(getOnboardingRevealFrame({ elapsedMs: 1500 })).toMatchObject({
      phase: 'waving',
      pose: 'wave',
      opacity: 1,
      complete: false,
    });
  });

  it('moves to mic-check before settling', () => {
    expect(getOnboardingRevealFrame({ elapsedMs: 3000 })).toMatchObject({
      phase: 'mic-checking',
      pose: 'mic-check',
      opacity: 1,
      complete: false,
    });
  });

  it('settles into idle at the end of the reveal', () => {
    expect(getOnboardingRevealFrame({ elapsedMs: ONBOARDING_REVEAL_TOTAL_MS })).toEqual({
      phase: 'idle',
      pose: 'idle',
      opacity: 1,
      complete: true,
    });
  });

  it('stays idle beyond the reveal window', () => {
    expect(getOnboardingRevealFrame({ elapsedMs: 9000 })).toMatchObject({
      phase: 'idle',
      pose: 'idle',
      complete: true,
    });
  });

  it('skips to idle immediately under reduced motion', () => {
    expect(getOnboardingRevealFrame({ elapsedMs: 500, reducedMotion: true })).toEqual({
      phase: 'idle',
      pose: 'idle',
      opacity: 1,
      complete: true,
    });
  });
});
