import type { ChipPose } from '@mfd/design-system/components';

export type OnboardingRevealPhase = 'hidden' | 'fading-in' | 'waving' | 'mic-checking' | 'idle';

export interface OnboardingRevealFrame {
  phase: OnboardingRevealPhase;
  pose: ChipPose;
  opacity: number;
  complete: boolean;
}

export interface OnboardingRevealOptions {
  elapsedMs: number;
  reducedMotion?: boolean;
}

export const ONBOARDING_REVEAL_TOTAL_MS = 4000;
export const ONBOARDING_REVEAL_FADE_MS = 1000;
export const ONBOARDING_REVEAL_WAVE_END_MS = 2500;
export const ONBOARDING_REVEAL_MIC_END_MS = 4000;

function clampElapsed(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs)) return 0;
  return Math.max(0, Math.trunc(elapsedMs));
}

export function getOnboardingRevealFrame({
  elapsedMs,
  reducedMotion = false,
}: OnboardingRevealOptions): OnboardingRevealFrame {
  if (reducedMotion) {
    return {
      phase: 'idle',
      pose: 'idle',
      opacity: 1,
      complete: true,
    };
  }

  const elapsed = clampElapsed(elapsedMs);

  if (elapsed <= 0) {
    return {
      phase: 'hidden',
      pose: 'wave',
      opacity: 0,
      complete: false,
    };
  }

  if (elapsed < ONBOARDING_REVEAL_FADE_MS) {
    return {
      phase: 'fading-in',
      pose: 'wave',
      opacity: elapsed / ONBOARDING_REVEAL_FADE_MS,
      complete: false,
    };
  }

  if (elapsed < ONBOARDING_REVEAL_WAVE_END_MS) {
    return {
      phase: 'waving',
      pose: 'wave',
      opacity: 1,
      complete: false,
    };
  }

  if (elapsed < ONBOARDING_REVEAL_MIC_END_MS) {
    return {
      phase: 'mic-checking',
      pose: 'mic-check',
      opacity: 1,
      complete: false,
    };
  }

  return {
    phase: 'idle',
    pose: 'idle',
    opacity: 1,
    complete: true,
  };
}
