import type { ChipPose } from '@mfd/design-system/components';
import type { DialogueCatalogEntry } from './types';
import { assertDialogueEntry } from './types';
import { fnv1a, selectVariant } from '../hash';

export const WEEKLY_DIALOGUE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/** Shared outcome thresholds: a win by this margin or less is an ugly win. */
export const UGLY_WIN_MAX_MARGIN = 3;
/** Shared outcome thresholds: a loss by this margin or more is a blowout loss. */
export const BLOWOUT_LOSS_MIN_MARGIN = 21;

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
      text: 'Recommended: open Roster and Depth Chart after the win; cover injury flags and first backups before changing starters. Where: Roster, Depth Chart. Consequence: unassigned backup puts a player without that role on the field.',
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
      text: 'Must Do: open Postgame Recap, then fix the named Game Plan or Depth Chart miss first. Where: Postgame Recap, Game Plan, Depth Chart. Consequence: the same protection, coverage, or run-defense failure repeats next week.',
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
      text: 'Must Do: open Recap to name the failed position or call before cuts, trades, or contract moves. Where: Postgame Recap. Consequence: rushed moves damage cap, morale, or depth.',
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
      text: 'Must Do: open Recap, Roster, and Game Plan. Where: Postgame Recap, Roster, Game Plan. Consequence: leaving that miss uncovered exposes the same starter or call next week.',
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
      text: 'Must Do: choose one fix now: lineup, plan, or roster. Where: Depth Chart, Game Plan, or Roster. Consequence: trying all three leaves none solved by kickoff.',
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
      text: 'Recommended: open Standings, Roster injury status, and Cap Lab before buying, selling, or holding. Where: Standings, Roster, Cap Lab. Consequence: waiting misses deadline offers or loses division/wild-card ground.',
      archetype: 'weekly',
      cooldownMs: WEEKLY_DIALOGUE_COOLDOWN_MS,
      priority: 2,
    },
  ],
  preseason: [
    {
      id: 'chip.weekly.preseason',
      beat: 0,
      pose: 'reviewing-tablet',
      reducedMotionPose: 'idle',
      text: 'Must Do: set Depth Chart starters and backups before Week 1. Where: Depth Chart. Consequence: missing starter or backup choices turn injuries into losses.',
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
      text: 'Must Do: cover injuries, first backups, and matchup calls before kickoff. Where: Roster, Depth Chart, Game Plan. Consequence: one missed injury, backup order, or matchup call ends the season.',
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
      text: 'Must Do: open Season Recap before bids. Where: Season Recap, Contracts, Staff, Cap Lab, Free Agency. Consequence: rushed bids spend cap space on unneeded roles, miss extensions, or leave staff seats empty.',
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
      text: 'Must Do: open Recap before cutting or trading a starter. Where: Postgame Recap, Roster, Contracts. Consequence: reaction moves create dead money, morale loss, or leave you one injury from an unassigned backup.',
      archetype: 'weekly',
      cooldownMs: WEEKLY_DIALOGUE_COOLDOWN_MS,
      priority: 5,
    },
  ],
};

export const weeklyDialogue = WEEKLY_DIALOGUE_VARIANTS.flatMap((variant) =>
  weeklyDialogueEntries[variant].map(assertDialogueEntry),
);

/**
 * Fallback alternates (B8). The canonical catalog above is locked: ids, poses,
 * and text are pinned by guard tests and Monday Briefing integration. These
 * alternates add a second validated entry per variant for fallback paths —
 * currently the reduced-motion pose rotation via selectWeeklyReducedMotionPose —
 * without touching the locked canonical selection.
 */
const weeklyDialogueAlternateEntries: Record<WeeklyDialogueVariant, DialogueCatalogEntry> = {
  cleanWin: {
    id: 'chip.weekly.cleanWin.alt',
    beat: 0,
    pose: 'proud',
    reducedMotionPose: 'think',
    text: 'Recommended: open Roster for injury flags and set first backups after the win. Where: Roster, Depth Chart. Consequence: a missed flag puts an unassigned backup on the field next week.',
    archetype: 'weekly',
    cooldownMs: WEEKLY_DIALOGUE_COOLDOWN_MS,
    priority: 3,
  },
  uglyWin: {
    id: 'chip.weekly.uglyWin.alt',
    beat: 0,
    pose: 'pointing-at-tape',
    reducedMotionPose: 'think',
    text: 'Must Do: open Postgame Recap and fix the named protection, coverage, or run-defense miss first. Where: Postgame Recap, Game Plan. Consequence: the same failure repeats next week.',
    archetype: 'weekly',
    cooldownMs: WEEKLY_DIALOGUE_COOLDOWN_MS,
    priority: 3,
  },
  loss: {
    id: 'chip.weekly.loss.alt',
    beat: 0,
    pose: 'frustrated',
    reducedMotionPose: 'reviewing-tablet',
    text: 'Must Do: open Recap and name the failed call before any trade or contract move. Where: Postgame Recap. Consequence: rushed moves damage cap, morale, or depth.',
    archetype: 'weekly',
    cooldownMs: WEEKLY_DIALOGUE_COOLDOWN_MS,
    priority: 3,
  },
  blowoutLoss: {
    id: 'chip.weekly.blowoutLoss.alt',
    beat: 0,
    pose: 'head-in-hands',
    reducedMotionPose: 'reviewing-tablet',
    text: 'Must Do: open Recap and Roster before changing starters after a blowout. Where: Postgame Recap, Roster. Consequence: the uncovered miss exposes the same starter next week.',
    archetype: 'weekly',
    cooldownMs: WEEKLY_DIALOGUE_COOLDOWN_MS,
    priority: 4,
  },
  threeLossStreak: {
    id: 'chip.weekly.threeLossStreak.alt',
    beat: 0,
    pose: 'head-in-hands',
    reducedMotionPose: 'think',
    text: 'Must Do: pick one fix and finish it: lineup, plan, or roster. Where: Depth Chart, Game Plan, or Roster. Consequence: splitting attention leaves all three broken before kickoff.',
    archetype: 'weekly',
    cooldownMs: WEEKLY_DIALOGUE_COOLDOWN_MS,
    priority: 5,
  },
  midseason: {
    id: 'chip.weekly.midseason.alt',
    beat: 0,
    pose: 'reviewing-tablet',
    reducedMotionPose: 'idle',
    text: 'Recommended: open Standings and Cap Lab before the deadline moves the market. Where: Standings, Cap Lab. Consequence: waiting loses division or wild-card ground.',
    archetype: 'weekly',
    cooldownMs: WEEKLY_DIALOGUE_COOLDOWN_MS,
    priority: 2,
  },
  preseason: {
    id: 'chip.weekly.preseason.alt',
    beat: 0,
    pose: 'reviewing-tablet',
    reducedMotionPose: 'talk',
    text: 'Must Do: set starter and backup roles before Week 1 locks the opener. Where: Depth Chart. Consequence: missing roles turn one injury into a loss.',
    archetype: 'weekly',
    cooldownMs: WEEKLY_DIALOGUE_COOLDOWN_MS,
    priority: 2,
  },
  playoffs: {
    id: 'chip.weekly.playoffs.alt',
    beat: 0,
    pose: 'rallying',
    reducedMotionPose: 'idle',
    text: 'Must Do: cover every injury flag and matchup call before kickoff. Where: Roster, Game Plan. Consequence: one missed call ends the season.',
    archetype: 'weekly',
    cooldownMs: WEEKLY_DIALOGUE_COOLDOWN_MS,
    priority: 4,
  },
  championship: {
    id: 'chip.weekly.championship.alt',
    beat: 0,
    pose: 'proud',
    reducedMotionPose: 'reviewing-tablet',
    text: 'Must Do: open Season Recap and Contracts before the first bid. Where: Season Recap, Contracts. Consequence: early bids miss extensions and leave staff seats empty.',
    archetype: 'weekly',
    cooldownMs: WEEKLY_DIALOGUE_COOLDOWN_MS,
    priority: 5,
  },
  darkMoment: {
    id: 'chip.weekly.darkMoment.alt',
    beat: 0,
    pose: 'facepalm',
    reducedMotionPose: 'think',
    text: 'Must Do: open Recap before any cut or trade after a loss like that. Where: Postgame Recap, Roster. Consequence: reaction moves create dead money or morale loss.',
    archetype: 'weekly',
    cooldownMs: WEEKLY_DIALOGUE_COOLDOWN_MS,
    priority: 5,
  },
};

export const weeklyDialogueAlternates = WEEKLY_DIALOGUE_VARIANTS.map(
  (variant) => assertDialogueEntry(weeklyDialogueAlternateEntries[variant]),
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

/**
 * Deterministic reduced-motion pose for the weekly fallback entry. Seeded
 * dynasties rotate between the canonical entry's reduced-motion pose and the
 * alternate's, so reduced-motion players get the same week-over-week variety
 * animated players get from pose reactions.
 */
export function selectWeeklyReducedMotionPose(input: WeeklyContext): ChipPose {
  if (!isWeeklyDialogueVariant(input.gameOutcome)) {
    throw new Error(`Unsupported weekly dialogue variant: ${String(input.gameOutcome)}`);
  }
  const canonical = weeklyDialogueEntries[input.gameOutcome][0]!;
  const alternate = weeklyDialogueAlternateEntries[input.gameOutcome];
  const pool = [canonical.reducedMotionPose ?? canonical.pose, alternate.reducedMotionPose ?? alternate.pose] as const;
  const index = fnv1a(`chip.weekly.reduced|${input.gameOutcome}|${input.dynastySeed}|${Math.max(0, Math.trunc(input.currentWeek))}`) % pool.length;
  return pool[index]!;
}
