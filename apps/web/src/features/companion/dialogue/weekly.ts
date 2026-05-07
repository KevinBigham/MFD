import type { DialogueCatalogEntry } from './types';
import { assertDialogueEntry } from './types';
import { selectVariant } from '../hash';

export const WEEKLY_DIALOGUE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export const WEEKLY_DIALOGUE_VARIANTS = [
  'cleanWin',
  'uglyWin',
  'loss',
  'blowoutLoss',
  'threeLossStreak',
  'midseason',
  'preseason',
  'playoffs',
  'championship',
  'darkMoment',
] as const;

export type WeeklyDialogueVariant = (typeof WEEKLY_DIALOGUE_VARIANTS)[number];

export interface WeeklyContext {
  gameOutcome: WeeklyDialogueVariant;
  currentWeek: number;
  dynastySeed: number;
}

const weeklyDialogueEntries: Record<WeeklyDialogueVariant, DialogueCatalogEntry[]> = {
  cleanWin: [
    {
      id: 'chip.weekly.cleanWin',
      beat: 0,
      pose: 'proud',
      reducedMotionPose: 'talk',
      text: 'That was a grown-up win. Not perfect. Better than perfect, actually — repeatable.',
      archetype: 'weekly',
      cooldownMs: WEEKLY_DIALOGUE_COOLDOWN_MS,
      priority: 3,
    },
  ],
  uglyWin: [
    {
      id: 'chip.weekly.uglyWin',
      beat: 0,
      pose: 'pointing-at-tape',
      reducedMotionPose: 'talk',
      text: "Win column says yes. Film room says please don't make me watch the third quarter twice.",
      archetype: 'weekly',
      cooldownMs: WEEKLY_DIALOGUE_COOLDOWN_MS,
      priority: 3,
    },
  ],
  loss: [
    {
      id: 'chip.weekly.loss',
      beat: 0,
      pose: 'frustrated',
      reducedMotionPose: 'idle',
      text: 'Bad tape, useful tape. The scoreboard gets one sentence. The correction gets the week.',
      archetype: 'weekly',
      cooldownMs: WEEKLY_DIALOGUE_COOLDOWN_MS,
      priority: 3,
    },
  ],
  blowoutLoss: [
    {
      id: 'chip.weekly.blowoutLoss',
      beat: 0,
      pose: 'head-in-hands',
      reducedMotionPose: 'idle',
      text: 'That one changed the room temperature. Start with the position group that had no answers after halftime.',
      archetype: 'weekly',
      cooldownMs: WEEKLY_DIALOGUE_COOLDOWN_MS,
      priority: 4,
    },
  ],
  threeLossStreak: [
    {
      id: 'chip.weekly.threeLossStreak',
      beat: 0,
      pose: 'head-in-hands',
      reducedMotionPose: 'idle',
      text: "Three straight. We don't need a miracle today. We need one clean decision.",
      archetype: 'weekly',
      cooldownMs: WEEKLY_DIALOGUE_COOLDOWN_MS,
      priority: 5,
    },
  ],
  midseason: [
    {
      id: 'chip.weekly.midseason',
      beat: 0,
      pose: 'reviewing-tablet',
      reducedMotionPose: 'talk',
      text: 'Midseason checkpoint. The standings are talking, but the roster health is using the indoor voice.',
      archetype: 'weekly',
      cooldownMs: WEEKLY_DIALOGUE_COOLDOWN_MS,
      priority: 2,
    },
  ],
  preseason: [
    {
      id: 'chip.weekly.preseason',
      beat: 0,
      pose: 'coffee-sip',
      reducedMotionPose: 'idle',
      text: 'Preseason desk is live. Everybody looks undefeated until the depth chart starts asking follow-up questions.',
      archetype: 'weekly',
      cooldownMs: WEEKLY_DIALOGUE_COOLDOWN_MS,
      priority: 2,
    },
  ],
  playoffs: [
    {
      id: 'chip.weekly.playoffs',
      beat: 0,
      pose: 'rallying',
      reducedMotionPose: 'talk',
      text: 'Different room now. Mistakes echo. Let us make the boring checks before the big lights find us.',
      archetype: 'weekly',
      cooldownMs: WEEKLY_DIALOGUE_COOLDOWN_MS,
      priority: 4,
    },
  ],
  championship: [
    {
      id: 'chip.weekly.championship',
      beat: 0,
      pose: 'proud',
      reducedMotionPose: 'talk',
      text: 'The trophy changes the questions. Good. Dynasties are supposed to get heavier after the parade.',
      archetype: 'weekly',
      cooldownMs: WEEKLY_DIALOGUE_COOLDOWN_MS,
      priority: 5,
    },
  ],
  darkMoment: [
    {
      id: 'chip.weekly.darkMoment',
      beat: 0,
      pose: 'facepalm',
      reducedMotionPose: 'idle',
      text: 'Bad night. Do not make a permanent decision while the scoreboard is still yelling.',
      archetype: 'weekly',
      cooldownMs: WEEKLY_DIALOGUE_COOLDOWN_MS,
      priority: 5,
    },
  ],
};

export const weeklyDialogue = WEEKLY_DIALOGUE_VARIANTS.flatMap((variant) =>
  weeklyDialogueEntries[variant].map(assertDialogueEntry),
);

function isWeeklyDialogueVariant(value: string): value is WeeklyDialogueVariant {
  return WEEKLY_DIALOGUE_VARIANTS.includes(value as WeeklyDialogueVariant);
}

export function selectWeeklyDialogue(input: WeeklyContext): DialogueCatalogEntry {
  if (!isWeeklyDialogueVariant(input.gameOutcome)) {
    throw new Error(`Unsupported weekly dialogue variant: ${String(input.gameOutcome)}`);
  }

  return selectVariant(weeklyDialogueEntries[input.gameOutcome], {
    eventId: `chip.weekly.${input.gameOutcome}`,
    dynastySeed: input.dynastySeed,
    weekIndex: input.currentWeek,
  });
}
