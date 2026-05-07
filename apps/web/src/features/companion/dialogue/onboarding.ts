import type { DialogueCatalogEntry } from './types';
import { assertDialogueEntry } from './types';

export const ONBOARDING_ANCHOR_LINE =
  'I run your desk. The Assistant GM runs player evaluation. You make the calls.';

const onboardingDialogueEntries: DialogueCatalogEntry[] = [
  {
    id: 'chip.onboarding.beat-1',
    beat: 1,
    pose: 'wave',
    text: "Welcome to the chair. I'm Chip. You do not need to master the whole building today. Start with the week in front of you.",
    contextDetails: [
      'You are running a football franchise, not a menu.',
      'Chip will guide the first season without hiding the depth.',
    ],
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-2',
    beat: 2,
    pose: 'point-left',
    text: 'Your first loop is simple: briefing, roster, plan, advance, review the damage. Football gets clearer when you keep that rhythm.',
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
    text: 'This roster tells you what you can ask from Sunday. Check injuries and depth before you trust any plan.',
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-5',
    beat: 5,
    pose: 'concern',
    text: 'Goals are not decoration. They decide how hard ownership leans when the record starts talking.',
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
    text: 'The blueprint is your first set of consequences. Cap, depth, staff, and patience all start pointing somewhere.',
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-8',
    beat: 8,
    pose: 'celebrate',
    text: 'After setup, the briefing becomes home base. I will point at the next useful football decision, not every shiny hallway.',
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-9',
    beat: 9,
    pose: 'idle',
    text: 'When you are ready: read the briefing, check roster, set the plan, then advance and live with the result.',
    archetype: 'host',
  },
];

export const onboardingDialogue = onboardingDialogueEntries.map(assertDialogueEntry);
