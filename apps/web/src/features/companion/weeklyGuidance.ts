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
  if (outcome === 'cleanWin' || outcome === 'championship') return 'celebrate';
  if (outcome === 'loss' || outcome === 'blowoutLoss' || outcome === 'threeLossStreak' || outcome === 'darkMoment') {
    return 'concern';
  }
  return 'mic-check';
}

export function buildWeeklyGuidance(input: WeeklyGuidanceInput): WeeklyGuidance {
  const pending = Math.max(0, Math.trunc(input.pendingDecisionCount ?? 0));
  const injuries = Math.max(0, Math.trunc(input.injuryCount ?? 0));
  const capSpace = input.capSpace;
  const hard = input.difficulty?.toLowerCase() === 'hard';
  const topAction = pending > 0
    ? 'Open the Inbox before touching the advance button.'
    : injuries > 0
      ? 'Check the roster and depth chart before setting the game plan.'
      : 'Start with the Monday Briefing.';
  const urgent = pending > 0
    ? `${pending} decisions waiting need a yes, no, or later.`
    : injuries > 0
      ? `${injuries} injured players can change the depth chart.`
      : 'No single fire is louder than the weekly briefing yet.';
  const risk = hard
    ? 'Hard difficulty punishes unresolved roster and plan mistakes faster.'
    : capSpace !== undefined && capSpace < 8
      ? 'Cap room is tight, so short-term fixes need a future bill check.'
      : 'Uncertainty is normal; make the next football decision before chasing every screen.';

  return {
    id: `chip.weekly.guidance.${Math.max(0, Math.trunc(input.currentWeek))}`,
    pose: poseFor(input.outcome),
    whatChanged: `Week ${input.currentWeek}: ${outcomeLabel(input.outcome)}${input.record ? `, record ${input.record}` : ''}.`,
    whyItMatters: input.opponentName
      ? `${input.opponentName} is next, so weekly triage has to become a game-plan choice.`
      : 'The Monday Briefing is the weekly triage board before deeper screens matter.',
    topAction,
    urgent,
    canWait: 'Deep legacy screens can wait until the briefing, roster, plan, and advance checks are clean.',
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
