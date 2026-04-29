import { describe, expect, it } from 'vitest';
import { ONBOARDING_ANCHOR_LINE, onboardingDialogue } from './onboarding';
import { MAX_CHIP_DIALOGUE_CHARS, assertDialogueEntry } from './types';

describe('onboardingDialogue', () => {
  it('contains exactly nine stable onboarding beats', () => {
    expect(onboardingDialogue).toHaveLength(9);
    expect(onboardingDialogue.map((entry) => entry.id)).toEqual([
      'chip.onboarding.beat-1',
      'chip.onboarding.beat-2',
      'chip.onboarding.beat-3',
      'chip.onboarding.beat-4',
      'chip.onboarding.beat-5',
      'chip.onboarding.beat-6',
      'chip.onboarding.beat-7',
      'chip.onboarding.beat-8',
      'chip.onboarding.beat-9',
    ]);
  });

  it('uses one-based beat numbers in order', () => {
    expect(onboardingDialogue.map((entry) => entry.beat)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('introduces the companion as Chip', () => {
    expect(onboardingDialogue[0]?.text).toContain("I'm Chip");
  });

  it('contains the locked architectural anchor line on Beat 3', () => {
    const beat3 = onboardingDialogue[2];

    expect(beat3?.anchor).toBe(true);
    expect(beat3?.text).toContain(ONBOARDING_ANCHOR_LINE);
    expect(ONBOARDING_ANCHOR_LINE).toBe(
      'I run your desk. The Assistant GM runs player evaluation. You make the calls.',
    );
  });

  it('keeps every onboarding line within the 240-character bubble limit', () => {
    expect(onboardingDialogue.every((entry) => entry.text.length <= MAX_CHIP_DIALOGUE_CHARS)).toBe(true);
    expect(() => onboardingDialogue.forEach(assertDialogueEntry)).not.toThrow();
  });

  it('uses the Mic Check signature at least once in the onboarding catalog', () => {
    expect(onboardingDialogue.some((entry) => entry.pose === 'mic-check')).toBe(true);
  });
});
