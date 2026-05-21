import type { DialogueCatalogEntry } from './types';
import { assertDialogueEntry } from './types';

export const ONBOARDING_ANCHOR_LINE =
  'Board stays clean. Personnel grades stay separate. Final call stays yours.';

const onboardingDialogueEntries: DialogueCatalogEntry[] = [
  {
    id: 'chip.onboarding.beat-1',
    beat: 1,
    pose: 'reviewing-tablet',
    text: "Doors closed. Board's yours.",
    contextDetails: [
      'First morning is a diagnosis.',
      'Every reveal should change the board.',
    ],
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-2',
    beat: 2,
    pose: 'pointing-at-tape',
    text: 'Start with the damage report. Then the leverage.',
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-3',
    beat: 3,
    pose: 'reviewing-tablet',
    text: 'This is who you have. Not who you wish.',
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-4',
    beat: 4,
    pose: 'calling-play',
    text: 'Coach sets Sundays. Choose the install you can defend.',
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-5',
    beat: 5,
    pose: 'note-taking',
    text: 'Scouts buy certainty. Spend it where the board is dark.',
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-6',
    beat: 6,
    pose: 'think',
    text: 'Scheme fit beats big name. Every time.',
    contextDetails: [ONBOARDING_ANCHOR_LINE],
    anchor: true,
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-7',
    beat: 7,
    pose: 'point-left',
    text: 'Depth chart tells the truth before injuries do.',
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-8',
    beat: 8,
    pose: 'skeptical',
    text: 'Cap is strategy, not accounting.',
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-9',
    beat: 9,
    pose: 'concern',
    text: 'Owner wants wins. Locker room wants proof.',
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-10',
    beat: 10,
    pose: 'mic-check',
    text: 'Franchise saved. Timestamped.',
    archetype: 'host',
  },
];

export const onboardingDialogue = onboardingDialogueEntries.map(assertDialogueEntry);
