import type { DialogueCatalogEntry } from './dialogue/types';
import type { WeeklyDialogueVariant } from './dialogue/weekly';

export interface WeeklyGuidanceInput {
  outcome: WeeklyDialogueVariant;
  currentWeek: number;
  record?: string;
  opponentName?: string;
  injuryCount?: number;
  pendingDecisionCount?: number;
  capSpace?: number;
  difficulty?: string;
}

export interface WeeklyGuidance {
  id: string;
  pose: DialogueCatalogEntry['pose'];
  whatChanged: string;
  whyItMatters: string;
  topAction: string;
  urgent: string;
  canWait: string;
  risk: string;
}

function outcomeLabel(outcome: WeeklyDialogueVariant): string {
  switch (outcome) {
    case 'cleanWin':
      return 'a clean win';
    case 'uglyWin':
      return 'a win with bad tape';
    case 'loss':
      return 'a loss';
    case 'blowoutLoss':
      return 'a blowout loss';
    case 'threeLossStreak':
      return 'a three-game skid';
    case 'preseason':
      return 'preseason setup';
    case 'playoffs':
      return 'playoff pressure';
    case 'championship':
      return 'a championship reset';
    case 'darkMoment':
      return 'a bad night';
    case 'midseason':
      return 'the weekly board';
  }
}

function poseFor(outcome: WeeklyDialogueVariant): DialogueCatalogEntry['pose'] {
  if (outcome === 'cleanWin' || outcome === 'championship') return 'proud';
  if (outcome === 'uglyWin') return 'pointing-at-tape';
  if (outcome === 'playoffs') return 'rallying';
  if (outcome === 'preseason') return 'reviewing-tablet';
  if (outcome === 'loss') return 'frustrated';
  if (outcome === 'blowoutLoss' || outcome === 'threeLossStreak') {
    return 'head-in-hands';
  }
  if (outcome === 'darkMoment') return 'facepalm';
  return 'reviewing-tablet';
}

export function buildWeeklyGuidance(input: WeeklyGuidanceInput): WeeklyGuidance {
  const pending = Math.max(0, Math.trunc(input.pendingDecisionCount ?? 0));
  const injuries = Math.max(0, Math.trunc(input.injuryCount ?? 0));
  const capSpace = input.capSpace;
  const hard = input.difficulty?.toLowerCase() === 'hard';
  const topAction = pending > 0
    ? 'Owner-desk decisions come before the advance.'
    : injuries > 0
      ? 'Roster and depth chart come before the game plan.'
      : 'Monday Briefing sets the board.';
  const urgent = pending > 0
    ? `${pending} decisions waiting need a yes, no, or later.`
    : injuries > 0
      ? `${injuries} injuries can change Sunday.`
      : 'No single fire outranks the briefing.';
  const risk = hard
    ? 'Hard difficulty punishes loose roster and plan work.'
    : capSpace !== undefined && capSpace < 8
      ? 'Cap room is tight. Short-term fixes need contract-year math.'
      : 'Make the next football decision before chasing every screen.';

  return {
    id: `chip.weekly.guidance.${Math.max(0, Math.trunc(input.currentWeek))}`,
    pose: poseFor(input.outcome),
    whatChanged: `Week ${input.currentWeek}: ${outcomeLabel(input.outcome)}${input.record ? `, record ${input.record}` : ''}.`,
    whyItMatters: input.opponentName
      ? `${input.opponentName} is next. Triage becomes a game-plan choice.`
      : 'Briefing is triage before deeper rooms matter.',
    topAction,
    urgent,
    canWait: 'Legacy rooms can wait until briefing, roster, plan, and advance are clean.',
    risk,
  };
}

export function weeklyGuidanceToDialogueEntry(guidance: WeeklyGuidance): DialogueCatalogEntry {
  return {
    id: guidance.id,
    beat: 0,
    pose: guidance.pose,
    text: `${guidance.topAction} ${guidance.whyItMatters}`,
    contextDetails: [
      `What changed: ${guidance.whatChanged}`,
      `Urgent: ${guidance.urgent}`,
      `Can wait: ${guidance.canWait}`,
      `Risk: ${guidance.risk}`,
    ],
    archetype: 'weekly',
    priority: 4,
  };
}
