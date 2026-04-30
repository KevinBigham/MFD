import type { DialogueCatalogEntry } from './types';
import { assertDialogueEntry } from './types';

export const ONBOARDING_ANCHOR_LINE =
  'I run your desk. The Assistant GM runs player evaluation. You make the calls.';

const onboardingDialogueEntries: DialogueCatalogEntry[] = [
  {
    id: 'chip.onboarding.beat-1',
    beat: 1,
    pose: 'wave',
    text: "Okay. Good. You're here. I'm Chip. Personal assistant, schedule defender, bad-contract spotter, and the guy who keeps the coffee away from the draft board.",
    contextDetails: [
      'Your first morning is not a tutorial. It is a diagnosis.',
      'Each reveal should make the franchise problem clearer before you walk into the war room.',
    ],
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-2',
    beat: 2,
    pose: 'point-left',
    text: "You're not just picking colors. You're picking your first problem.",
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-3',
    beat: 3,
    pose: 'talk',
    text: ONBOARDING_ANCHOR_LINE,
    archetype: 'host',
    anchor: true,
  },
  {
    id: 'chip.onboarding.beat-4',
    beat: 4,
    pose: 'think',
    text: "This is the part nobody sees on Sunday until it's too late. Depth is where a plan becomes a roster.",
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-5',
    beat: 5,
    pose: 'concern',
    text: 'A dynasty needs ambition. It also needs a definition of not panicking.',
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-6',
    beat: 6,
    pose: 'point-right',
    text: "Culture is easy when you're winning. Pick the rule we follow when the room gets tense.",
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-7',
    beat: 7,
    pose: 'mic-check',
    text: 'There it is. Not a form. A blueprint. Let me run a quick mic check before we put it on the board.',
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-8',
    beat: 8,
    pose: 'celebrate',
    text: "After this, the game stops asking who you are and starts testing it. I'll check in when something deserves your attention.",
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-9',
    beat: 9,
    pose: 'idle',
    text: "Three places matter right now: the briefing, the roster, and the big button that makes consequences happen. I'm going quiet.",
    archetype: 'host',
  },
];

export const onboardingDialogue = onboardingDialogueEntries.map(assertDialogueEntry);
