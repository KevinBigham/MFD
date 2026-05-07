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

  it('preserves all nine marathon onboarding lines verbatim', () => {
    expect(onboardingDialogue.map((entry) => entry.text)).toEqual([
      "Welcome to the chair. I'm Chip. You do not need to master the whole building today. Start with the week in front of you.",
      'Your first loop is simple: briefing, roster, plan, advance, review the damage. Football gets clearer when you keep that rhythm.',
      ONBOARDING_ANCHOR_LINE,
      'This roster tells you what you can ask from Sunday. Check injuries and depth before you trust any plan.',
      'Goals are not decoration. They decide how hard ownership leans when the record starts talking.',
      "Culture is easy when you're winning. Pick the rule we follow when the room gets tense.",
      'The blueprint is your first set of consequences. Cap, depth, staff, and patience all start pointing somewhere.',
      'After setup, the briefing becomes home base. I will point at the next useful football decision, not every shiny hallway.',
      'When you are ready: read the briefing, check roster, set the plan, then advance and live with the result.',
    ]);
  });

  it('relocates cold-open exposition into Chip context details', () => {
    expect(onboardingDialogue[0]?.contextDetails).toEqual([
      'You are running a football franchise, not a menu.',
      'Chip will guide the first season without hiding the depth.',
    ]);
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
