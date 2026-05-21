import { describe, expect, it } from 'vitest';
import { ONBOARDING_ANCHOR_LINE, onboardingDialogue } from './onboarding';
import { MAX_CHIP_DIALOGUE_CHARS, assertDialogueEntry } from './types';

describe('onboardingDialogue', () => {
  it('contains exactly ten stable onboarding beats', () => {
    expect(onboardingDialogue).toHaveLength(10);
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
      'chip.onboarding.beat-10',
    ]);
  });

  it('uses one-based beat numbers in order', () => {
    expect(onboardingDialogue.map((entry) => entry.beat)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('opens with a restrained operations-chief line', () => {
    expect(onboardingDialogue[0]?.text).toBe("Doors closed. Board's yours.");
  });

  it('preserves the ten phase-mapped onboarding lines verbatim', () => {
    expect(onboardingDialogue.map((entry) => entry.text)).toEqual([
      "Doors closed. Board's yours.",
      'Start with the damage report. Then the leverage.',
      'This is who you have. Not who you wish.',
      'Coach sets Sundays. Choose the install you can defend.',
      'Scouts buy certainty. Spend it where the board is dark.',
      'Scheme fit beats big name. Every time.',
      'Depth chart tells the truth before injuries do.',
      'Cap is strategy, not accounting.',
      'Owner wants wins. Locker room wants proof.',
      'Franchise saved. Timestamped.',
    ]);
  });

  it('relocates cold-open exposition into Chip context details', () => {
    expect(onboardingDialogue[0]?.contextDetails).toEqual([
      'First morning is a diagnosis.',
      'Every reveal should change the board.',
    ]);
  });

  it('contains the locked architectural anchor line on the identity beat', () => {
    const beat6 = onboardingDialogue[5];

    expect(beat6?.anchor).toBe(true);
    expect(beat6?.contextDetails).toContain(ONBOARDING_ANCHOR_LINE);
    expect(ONBOARDING_ANCHOR_LINE).toBe(
      'Board stays clean. Personnel grades stay separate. Final call stays yours.',
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
