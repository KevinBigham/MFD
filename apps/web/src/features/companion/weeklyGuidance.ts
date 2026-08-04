import type { DialogueCatalogEntry } from './dialogue/types';
import { MAX_CHIP_DIALOGUE_CHARS } from './dialogue/types';
import type { WeeklyDialogueVariant } from './dialogue/weekly';
import { fnv1a } from './hash';
import { selectSidelineNote, seasonArcForWeek } from './sidelineFlavor';

export interface WeeklyGuidanceInput {
  outcome: WeeklyDialogueVariant;
  currentWeek: number;
  eventTrigger?: WeeklyGuidanceTrigger;
  record?: string;
  opponentName?: string;
  injuryCount?: number;
  pendingDecisionCount?: number;
  capSpace?: number;
  difficulty?: string;
  dynastySeed?: number;
  consecutiveOutcomeWeeks?: number;
  averageMorale?: number;
  ownerPatience?: number;
  /** B5: last served flavor line from the memory sidecar; the seeded flavor
   * pick rotates one slot instead of repeating it across sessions. */
  avoidFlavorLine?: string;
}

export type WeeklyGuidanceTrigger = 'weekRollover' | 'gameComplete' | 'seasonEnd';

/**
 * Cap-space pressure thresholds (in $M). At or below these, risk copy names the
 * tight cap. High-pressure difficulties warn earlier because skipped cap work
 * punishes harder there. Exported so tuning stays out of the copy functions.
 */
export const CAP_TIGHT_MAX_MILLIONS = 8;
export const CAP_TIGHT_HIGH_PRESSURE_MAX_MILLIONS = 12;

/**
 * Seeded variant pools (B3) for the generic recommended/optional guidance
 * lines. Index 0 is the canonical line served to unseeded callers byte-for-byte;
 * seeded dynasties rotate by seed + week so long saves stop reading the same
 * sentence every Monday.
 */
export const GENERIC_RECOMMENDED_LINES = [
  'Open Action Center for current notes; then any legal roster, depth chart, training, game plan, contracts, Cap Lab, trade, waiver, practice-squad, free-agency, scouting, coaching, facility, or medical move remains available before Advance Week.',
  'Open Monday Briefing notes first; then the strongest legal roster, depth, cap, trade, waiver, practice-squad, free-agency, scouting, or coaching move before Advance Week locks.',
  'Scan Action Center, then Roster and Cap Lab; pick the one legal move whose gain beats its cost before Advance Week.',
] as const;

export const GENERIC_OPTIONAL_LINES = [
  "Make any legal roster, depth chart, training, game plan, cap space, trade, waiver, practice-squad, free-agency, scouting, coaching, facility, or medical move this week; prioritize moves that change lineup, cap space, market offer, staff plan, recovery, or matchup before Advance Week.",
  'After the priority work, one extra legal move is a bonus: training camp, scouting, practice-squad, or staff work all compound before Advance Week.',
  'If the Must Do and Recommended are done, any remaining legal football-ops move is fair game this week; favor moves that shape starters, cap space, or staff before Advance Week.',
] as const;

function selectSeededLine(
  pool: readonly string[],
  input: WeeklyGuidanceInput,
  salt: string,
): string {
  if (!Number.isFinite(input.dynastySeed)) return pool[0]!;
  const seed = Math.trunc(Number(input.dynastySeed));
  const week = Math.max(0, Math.trunc(input.currentWeek));
  return pool[fnv1a(`chip.guidance.${salt}|${seed}|${week}`) % pool.length]!;
}

function isHighPressureDifficulty(difficulty: string | undefined): boolean {
  const normalized = difficulty?.toLowerCase();
  return normalized === 'hard'
    || normalized === 'allpro'
    || normalized === 'all-pro'
    || normalized === 'legend';
}

export interface WeeklyGuidance {
  id: string;
  pose: DialogueCatalogEntry['pose'];
  whatChanged: string;
  whyItMatters: string;
  topAction: string;
  mustDo: string;
  recommended: string;
  optional: string;
  where: string;
  deadline: string;
  canWait: string;
  risk: string;
  sidelineNote: string;
  continuityNote?: string;
}

function outcomeLabel(outcome: WeeklyDialogueVariant): string {
  switch (outcome) {
    case 'cleanWin':
      return 'strong win; open Roster and Depth Chart for injury flags before changing starters';
    case 'uglyWin':
      return 'close win; open Recap for injuries, backup order, and Game Plan miss';
    case 'loss':
      return 'loss; name the failed call or position before fixes';
    case 'blowoutLoss':
      return 'blowout loss; open Recap before roster or Game Plan fixes';
    case 'threeLossStreak':
      return 'three-game skid; pick one lineup, plan, or roster fix';
    case 'preseason':
      return 'preseason week; lock depth before Week 1';
    case 'playoffs':
      return 'playoff week; fix injuries and matchups first';
    case 'championship':
      return 'offseason; open Contracts and Staff for expiring starters before spending';
    case 'darkMoment':
      return 'lopsided loss; open Recap before roster or Game Plan changes';
    case 'midseason':
      return 'midseason week; open Standings, Roster, and cap space before deadline moves';
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

function changedSubjectFor(trigger: WeeklyGuidanceTrigger | undefined, currentWeek: number): string {
  if (trigger === 'gameComplete') return `Final whistle, Week ${currentWeek}`;
  if (trigger === 'seasonEnd') return 'Season closed';
  return `Week ${currentWeek}`;
}

function topActionFor(input: WeeklyGuidanceInput, pending: number, injuries: number): string {
  if (input.eventTrigger === 'seasonEnd') {
    return 'Must Do: open Season Recap before bids. Where: Season Recap, Contracts, Staff, Cap Lab, Free Agency. Consequence: rushed bids spend cap space on unneeded roles, miss extensions, or leave staff seats empty.';
  }
  if (input.eventTrigger === 'gameComplete') {
    return 'Must Do: open Postgame Recap before Advance Week. Where: Post-Week Command Deck, then Roster, Depth Chart, Game Plan. Consequence: next week uses unfixed injuries, morale, and matchup calls.';
  }
  if (pending > 0) {
    return `Must Do: choose or defer ${pending} pending decision${pending === 1 ? '' : 's'} before Advance Week. Where: Inbox, Action Center, or highlighted screen badges. Consequence: offers, promises, votes, cap, lineup, and morale expire or lock.`;
  }
  if (injuries > 0) {
    return 'Must Do: set injury status, first backups, and safer calls before kickoff. Where: Roster, Depth Chart, Game Plan. Consequence: unassigned backups enter saved calls.';
  }
  return 'Must Do: open Monday Briefing. Where: Action Center. Consequence: Advance Week locks saved lineups, cap moves, morale, and matchup calls.';
}

function whereFor(input: WeeklyGuidanceInput, pending: number, injuries: number): string {
  if (input.eventTrigger === 'seasonEnd') return 'Season Recap, Contracts, Staff, Cap Lab, and Free Agency.';
  if (input.eventTrigger === 'gameComplete') return 'Open Post-Week Command Deck, then open Roster, Depth Chart, and Game Plan before Advance Week.';
  if (pending > 0) return 'Inbox, Action Center, or highlighted screen badges; choose or defer there, then return to Monday Briefing.';
  if (injuries > 0) return 'Open Roster, then Depth Chart for the first backup; open Game Plan if the injury changes calls.';
  return 'Action Center, then any legal football-ops screen: Roster, Depth Chart, Training Camp, Game Plan, Contracts, Cap Lab, Trades, Waiver Wire, Practice Squad, Free Agency, Scouting, Coaching, or Front Office.';
}

function recommendedFor(input: WeeklyGuidanceInput, pending: number, injuries: number): string {
  if (pending > 0) return 'Choose or defer every pending decision before Advance Week; ignored offers, promises, votes, cap, lineup, or morale expire or lock.';
  if (injuries > 0) return 'Set injured roles, first backups, and one legal free-agent or practice-squad option.';
  if (input.eventTrigger === 'seasonEnd') return 'Open Contracts, Staff, Cap Lab, and Free Agency for expiring starters, open staff seats, aging positions, and cap space before the first bid.';
  if (input.eventTrigger === 'gameComplete') return 'Open Recap notes, then fix the Game Plan call, Depth Chart order, or roster role Recap names before lower-impact moves.';
  if (input.opponentName) {
    return `Scout ${input.opponentName} for injuries, backup order, cap space, and matchup calls; then make any legal roster, cap, market, staff, or matchup move whose gain beats the cost.`;
  }
  return selectSeededLine(GENERIC_RECOMMENDED_LINES, input, 'recommended');
}

function optionalFor(input: WeeklyGuidanceInput): string {
  if (input.eventTrigger === 'seasonEnd') {
    return 'Open awards, records, and history after Season Recap, Contracts, Staff, Cap Lab, and the first-bid plan; those screens do not fix extensions, bids, or empty staff seats.';
  }
  return selectSeededLine(GENERIC_OPTIONAL_LINES, input, 'optional');
}

function whyItMattersFor(input: WeeklyGuidanceInput): string {
  if (input.eventTrigger === 'seasonEnd') {
    return 'Offseason spending locks fast; expiring starters, open staff seats, aging positions, and cap space decide extensions, bids, and draft roles.';
  }
  if (input.eventTrigger === 'gameComplete') {
    return input.opponentName
      ? `Final score is locked. Recap names injuries, morale swings, and matchup misses before you prep for ${input.opponentName}.`
      : 'Final score is locked. Recap names injuries, morale swings, and matchup misses before Advance Week.';
  }
  return input.opponentName
    ? `Scout ${input.opponentName} now; choices affect depth, morale, cap space, and Game Plan.`
    : 'Monday Briefing names injuries, backup gaps, morale drops, or uncovered protection, coverage, or run-defense calls before Advance Week locks the next game.';
}

function canWaitFor(trigger: WeeklyGuidanceTrigger | undefined): string {
  if (trigger === 'seasonEnd') {
    return "Open awards, records, and history after Season Recap, Contracts, Staff, Cap Lab, and the first free-agent plan; awards, records, and history do not change next season's roster plan.";
  }
  if (trigger === 'gameComplete') {
    return 'Open awards, records, and history after you fix or accept the roster role, depth-chart order, or Game Plan call Recap names; awards, records, and history do not change the next game.';
  }
  return 'Open awards, records, and history after you fix or accept Monday Briefing and Action Center notes; awards, records, and history do not change the next game.';
}

function riskFor(input: WeeklyGuidanceInput, pending: number, injuries: number): string {
  const capSpace = input.capSpace;
  const highPressureDifficulty = isHighPressureDifficulty(input.difficulty);
  if (pending > 0) return 'Ignored decisions expire, remove offers, cut owner patience, or lock weaker starter, backup, cap, lineup, or morale choices after Advance Week.';
  if (injuries > 0) return 'Uncovered injuries put an unassigned first backup on the field or break the saved Game Plan.';
  if (
    capSpace !== undefined
    && capSpace < (highPressureDifficulty ? CAP_TIGHT_HIGH_PRESSURE_MAX_MILLIONS : CAP_TIGHT_MAX_MILLIONS)
  ) {
    return 'Cap space is tight. Open Contracts or Cap Lab before short-term fixes; new money blocks injury replacements, extensions, or next-offseason moves.';
  }
  if (highPressureDifficulty) return 'Higher difficulty punishes skipped injury, backup, cap, and matchup work; Advance Week locks what you leave.';
  if (input.eventTrigger === 'seasonEnd') {
    return 'Bidding before Season Recap, Contracts, Staff, and Cap Lab decisions wastes cap space on a veteran role the roster does not need, misses an extension, or leaves a staff vacancy slowing prep.';
  }
  if (input.eventTrigger === 'gameComplete') {
    return 'Skipping Recap leaves injuries, morale swings, and matchup notes unseen before the next Game Plan locks.';
  }
  if (input.outcome === 'threeLossStreak') {
    return 'Another week with the same lineup or plan miss cuts owner patience and makes morale harder to recover.';
  }
  if (input.outcome === 'blowoutLoss' || input.outcome === 'darkMoment') {
    return 'Skipping Recap, Roster, or Game Plan repeats matchup, injury, or starter mistakes by kickoff.';
  }
  return 'Skipping Monday Briefing leaves a named injury, unassigned first backup, tight cap choice, or uncovered matchup call locked into Advance Week.';
}

/**
 * "We talked about this" continuity line. When the derived outcome repeats for
 * two or more straight weeks, Chip acknowledges the pattern instead of reading
 * the week like it is brand new.
 */
function continuityNoteFor(input: WeeklyGuidanceInput): string | undefined {
  const count = Math.max(0, Math.trunc(input.consecutiveOutcomeWeeks ?? 0));
  if (count < 2) return undefined;
  if (input.outcome === 'cleanWin' || input.outcome === 'uglyWin' || input.outcome === 'championship') {
    return `${count} straight weeks in the win column; protect the routine earning it.`;
  }
  if (
    input.outcome === 'loss'
    || input.outcome === 'blowoutLoss'
    || input.outcome === 'threeLossStreak'
    || input.outcome === 'darkMoment'
  ) {
    return `${count} straight weeks on the wrong side of the table; the named fix is still the assignment.`;
  }
  return `${count} straight weeks with the same assignment; the standard does not change.`;
}

export function buildWeeklyGuidance(input: WeeklyGuidanceInput): WeeklyGuidance {
  const pending = Math.max(0, Math.trunc(input.pendingDecisionCount ?? 0));
  const injuries = Math.max(0, Math.trunc(input.injuryCount ?? 0));
  const topAction = topActionFor(input, pending, injuries);
  const deadline = pending > 0
    ? `${pending} decision${pending === 1 ? '' : 's'} need a choice or defer before Advance Week.`
    : injuries > 0
      ? `${injuries} injuries need Roster, Depth Chart, or Game Plan before kickoff locks the lineup.`
      : input.eventTrigger === 'seasonEnd'
        ? 'Before bidding, open Season Recap, Contracts, Staff, Cap Lab, and Free Agency; rushed bids miss extensions or leave staff seats empty.'
        : input.eventTrigger === 'gameComplete'
        ? 'Open Postgame Recap before Advance Week; next week uses the injuries, morale, and matchup plan you leave in place.'
          : 'Open Monday Briefing. Fix or accept any Action Center injury, backup, morale, cap, or matchup note before Advance Week.';
  const recommended = recommendedFor(input, pending, injuries);
  const optional = optionalFor(input);
  const where = whereFor(input, pending, injuries);

  return {
    id: `chip.weekly.guidance.${Math.max(0, Math.trunc(input.currentWeek))}`,
    pose: poseFor(input.outcome),
    whatChanged:
      `${changedSubjectFor(input.eventTrigger, input.currentWeek)}: ${outcomeLabel(input.outcome)}${
        input.record ? `, record ${input.record}` : ''
      }.`,
    whyItMatters: whyItMattersFor(input),
    topAction,
    mustDo: topAction,
    recommended,
    optional,
    where,
    deadline,
    canWait: canWaitFor(input.eventTrigger),
    risk: riskFor(input, pending, injuries),
    sidelineNote: selectSidelineNote({
      outcome: input.outcome,
      currentWeek: input.currentWeek,
      dynastySeed: input.dynastySeed,
      opponentName: input.opponentName,
      difficulty: input.difficulty,
      seasonArc: seasonArcForWeek(input.currentWeek),
      averageMorale: input.averageMorale,
      ownerPatience: input.ownerPatience,
      avoidLine: input.avoidFlavorLine,
    }),
    continuityNote: continuityNoteFor(input),
  };
}

function stripLeadingGuidanceLabel(text: string): string {
  return text.replace(/^(Must Do|Recommended|Optional|Where|Deadline|Later|Risk):\s*/i, '');
}

/**
 * The dock bubble hard-caps visible text at MAX_CHIP_DIALOGUE_CHARS. Weekly
 * Must Do + why-it-matters pairs regularly exceed that cap, which previously
 * meant production bubbles ended mid-sentence with an ellipsis. Compose the
 * visible text so it always fits: keep the Must Do action intact, then append
 * the why only when the budget allows; the full detail set renders in the
 * dock details panel, so nothing is lost.
 */
export function composeWeeklyDialogueText(
  topAction: string,
  whyItMatters: string,
  maxChars: number = MAX_CHIP_DIALOGUE_CHARS,
): string {
  const combined = `${topAction} ${whyItMatters}`;
  if (combined.length <= maxChars) return combined;
  if (topAction.length <= maxChars) return topAction;
  return `${topAction.slice(0, Math.max(0, maxChars - 3))}...`;
}

export function weeklyGuidanceToDialogueEntry(guidance: WeeklyGuidance): DialogueCatalogEntry {
  return {
    id: guidance.id,
    beat: 0,
    pose: guidance.pose,
    text: composeWeeklyDialogueText(guidance.topAction, guidance.whyItMatters),
    contextDetails: [
      `What changed: ${guidance.whatChanged}`,
      `Why: ${guidance.whyItMatters}`,
      ...(guidance.continuityNote ? [`Continuity: ${guidance.continuityNote}`] : []),
      `Must Do: ${stripLeadingGuidanceLabel(guidance.mustDo)}`,
      `Recommended: ${guidance.recommended}`,
      `Optional: ${guidance.optional}`,
      `Where: ${guidance.where}`,
      `Deadline: ${guidance.deadline}`,
      `Optional later: ${guidance.canWait}`,
      `Consequence: ${guidance.risk}`,
      `Sideline note: ${guidance.sidelineNote}`,
    ],
    archetype: 'weekly',
    priority: 4,
  };
}
