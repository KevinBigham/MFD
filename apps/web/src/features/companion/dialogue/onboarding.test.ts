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

  it('preserves all nine Slice A onboarding lines verbatim', () => {
    expect(onboardingDialogue.map((entry) => entry.text)).toEqual([
      "Okay. Good. You're here. I'm Chip. Personal assistant, schedule defender, bad-contract spotter, and the guy who keeps the coffee away from the draft board.",
      "You're not just picking colors. You're picking your first problem.",
      ONBOARDING_ANCHOR_LINE,
      "This is the part nobody sees on Sunday until it's too late. Depth is where a plan becomes a roster.",
      'A dynasty needs ambition. It also needs a definition of not panicking.',
      "Culture is easy when you're winning. Pick the rule we follow when the room gets tense.",
      'There it is. Not a form. A blueprint. Let me run a quick mic check before we put it on the board.',
      "After this, the game stops asking who you are and starts testing it. I'll check in when something deserves your attention.",
      "Three places matter right now: the briefing, the roster, and the big button that makes consequences happen. I'm going quiet.",
    ]);
  });

  it('relocates cold-open exposition into Chip context details', () => {
    expect(onboardingDialogue[0]?.contextDetails).toEqual([
      'Your first morning is not a tutorial. It is a diagnosis.',
      'Each reveal should make the franchise problem clearer before you walk into the war room.',
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
