/**
 * WP-09a — the canonical task ledger.
 *
 * The audit's core diagnosis is that MFD has several systems all trying to tell
 * you what to do next — the Action Center, nav badges, Chip, readiness, the
 * inbox — and they do not agree. The ledger is the one derivation they will all
 * read from.
 *
 * This module is an **extraction**, not a redesign. Every string here already
 * shipped in `features/monday-briefing/ActionCenter.tsx`, and the copy is
 * reproduced exactly: the release-gate smoke harness asserts on-screen text
 * across 49 legacy routes, and amendment A1 pins the legacy shell's rendered
 * copy for the whole migration. Rewording belongs to WP-09b, behind the flag.
 *
 * Pure: no store, no React, no `GameState`. Callers pass a `TaskLedgerInput`;
 * `task-ledger-input.ts` derives one from a game.
 */

import { hubForLegacyPath } from '../routes/route-surface-map';
import type { HubId } from '../routes/route-surface-types';

export type TaskCategory = 'must' | 'recommended' | 'optional';

/**
 * How loudly a task should present. Kept semantic rather than chromatic so the
 * legacy board and the new shell can pick their own accents from it.
 */
export type TaskSeverity = 'blocking' | 'warning' | 'clear' | 'info' | 'neutral';

export interface TaskDestination {
  route: string;
  /** Wayfinding label — the legacy board's "Where" line. */
  label: string;
  /** Verb for the control that goes there. */
  actionLabel: string;
  /** New-IA hub that owns this route, so tasks and navigation cannot disagree. */
  hub: HubId | undefined;
}

export interface UiTask {
  id: string;
  category: TaskCategory;
  /** "What" — the thing to do. */
  title: string;
  /** "Why" — the state that produced it. */
  reason: string;
  /** "Consequence / deadline" — what happens if it is left alone. */
  consequence: string;
  destination: TaskDestination;
  severity: TaskSeverity;
  /** True when Advance Week stops or redirects until this is handled. */
  blocksAdvance: boolean;
}

export interface TaskLedgerInput {
  phase: string;
  hasGamePlan: boolean;
  starterCount: number;
  tradeOfferCount: number;
  ownerApproval: number;
  injuredCount: number;
}

/** The full-lineup target the depth-chart task measures against. */
export const FIELD_STARTER_TARGET = 22;

/** Owner approval at or below this reads as patience running out. */
export const OWNER_APPROVAL_FLOOR = 50;

const ACTION_LABELS: Record<string, string> = {
  '/game-plan': 'Set Plan',
  '/depth-chart': 'Fix Depth',
  '/trades': 'Decide',
  '/owner': 'Open',
  '/roster': 'View',
  '/week-advance': 'Advance Week',
  '/contracts': 'Open',
  '/cap-lab': 'Open',
  '/trade-block': 'Open',
  '/waivers': 'Open',
  '/practice-squad': 'Open',
  '/free-agency': 'Open',
  '/scouting': 'Open',
  '/coaching': 'Open',
  '/settings': 'Open',
  '/dynasty': 'Open',
};

/**
 * Destination labels as the legacy board renders them.
 *
 * These agree with `APP_ROUTE_REGISTRY` everywhere except `/owner`, which the
 * board calls "Owner" and the registry calls "Owner Suite". The divergence is
 * deliberate here: unifying it would change rendered copy, which A1 forbids
 * until the new shell owns the surface. `task-ledger.test.ts` pins the
 * exception so it stays the only one.
 */
const DESTINATION_LABELS: Record<string, string> = {
  '/game-plan': 'Game Plan',
  '/depth-chart': 'Depth Chart',
  '/trades': 'Trades',
  '/trade-block': 'Trade Block',
  '/owner': 'Owner',
  '/roster': 'Roster',
  '/week-advance': 'Advance Week',
  '/contracts': 'Contracts',
  '/cap-lab': 'Cap Lab',
  '/waivers': 'Waiver Wire',
  '/practice-squad': 'Practice Squad',
  '/free-agency': 'Free Agency',
  '/scouting': 'Scouting',
  '/coaching': 'Coaching',
  '/settings': 'Settings',
  '/dynasty': 'Save/Load',
  '/team-needs': 'Team Needs',
};

export function taskDestination(route: string, labelOverride?: string): TaskDestination {
  return {
    route,
    label: labelOverride ?? DESTINATION_LABELS[route] ?? route,
    actionLabel: ACTION_LABELS[route] ?? 'Go',
    hub: hubForLegacyPath(route),
  };
}

const ADVANCE_AVAILABLE_CONSEQUENCE =
  'Advance Week is available. Make roster, depth, cap, market, staff, or matchup changes before Advance Week, offer expiration, or phase rules lock them.';

/** The all-clear task. Shown in the Must Do lane when nothing blocks the week. */
export function readyToAdvanceTask(): UiTask {
  return {
    id: 'ready-to-advance',
    category: 'must',
    title: 'Ready for Advance Week',
    reason: 'Must Do: none right now.',
    consequence: ADVANCE_AVAILABLE_CONSEQUENCE,
    destination: taskDestination('/week-advance'),
    severity: 'clear',
    blocksAdvance: false,
  };
}

/**
 * Shown in the Recommended lane when no state-derived or AGM item applies.
 *
 * SAVE-VISIBLE ID. The legacy board uses this task's `id` verbatim as the card
 * id it writes to `leagueEvents` when a player closes the card. Renaming it
 * resurrects a dismissed card. Pinned by `task-ledger.test.ts`.
 */
export function noRecommendationsTask(): UiTask {
  return {
    id: 'recommended-clear',
    category: 'recommended',
    title: 'Optional roster, cap, staff, and matchup moves',
    reason: 'No new injury, cap, owner, trade, depth, or matchup warning requires action this week.',
    consequence: ADVANCE_AVAILABLE_CONSEQUENCE,
    destination: taskDestination('/week-advance'),
    severity: 'clear',
    blocksAdvance: false,
  };
}

/**
 * The state-derived lane, in the order the weekly board has always emitted it.
 *
 * Order is part of the contract: the board slices the first three of each lane,
 * so reordering silently changes which tasks a player sees.
 */
export function buildTaskLedger(input: TaskLedgerInput): UiTask[] {
  const { phase, hasGamePlan, starterCount, tradeOfferCount, ownerApproval, injuredCount } = input;
  const tasks: UiTask[] = [];

  if (!hasGamePlan && (phase === 'regular_season' || phase === 'playoffs')) {
    tasks.push({
      id: 'game-plan-missing',
      category: 'must',
      title: 'Set your game plan',
      reason: 'No prep plan locked for this week',
      consequence: 'Advance Week sends you to Game Plan until a prep plan is saved for this matchup.',
      destination: taskDestination('/game-plan'),
      severity: 'blocking',
      blocksAdvance: true,
    });
  }

  if (starterCount < FIELD_STARTER_TARGET) {
    tasks.push({
      id: 'depth-chart-incomplete',
      category: 'recommended',
      title: `Fill depth chart (${starterCount}/${FIELD_STARTER_TARGET} starters)`,
      reason: 'Starting lineup has gaps',
      consequence: 'Advance Week remains available, but missing starters leave uncovered matchups and put the next backup on the field after injuries.',
      destination: taskDestination('/depth-chart'),
      severity: 'warning',
      blocksAdvance: false,
    });
  }

  if (tradeOfferCount > 0) {
    tasks.push({
      id: 'trade-offers-pending',
      category: 'recommended',
      title: `${tradeOfferCount} pending trade offer${tradeOfferCount > 1 ? 's' : ''}`,
      reason: 'Accept, counter, or decline before they expire',
      consequence: 'Offers expire or get more expensive as the league calendar advances.',
      destination: taskDestination('/trades'),
      severity: 'warning',
      blocksAdvance: false,
    });
  }

  if (ownerApproval < OWNER_APPROVAL_FLOOR) {
    tasks.push({
      id: 'owner-patience-low',
      category: 'recommended',
      title: 'Owner patience is dropping',
      reason: `Approval at ${ownerApproval}%`,
      consequence: 'Advance Week still lets you continue, but future losses or missed promises cut owner patience and job security.',
      destination: taskDestination('/owner'),
      severity: 'blocking',
      blocksAdvance: false,
    });
  }

  if (injuredCount > 0) {
    tasks.push({
      id: 'injuries-unresolved',
      category: 'recommended',
      title: `${injuredCount} injured player${injuredCount > 1 ? 's' : ''}`,
      reason: 'Set roster status and replacement roles',
      consequence: 'Advance Week remains available, but unresolved roles expose backups or delay IR decisions.',
      destination: taskDestination('/roster'),
      severity: 'warning',
      blocksAdvance: false,
    });
  }

  if (tasks.length === 0) tasks.push(readyToAdvanceTask());

  return tasks;
}

/**
 * The standing Optional lane: legal moves that are always available, listed so
 * the player knows the week is not over when the Must Do lane is empty.
 *
 * SAVE-VISIBLE IDS. Unlike the Must Do and Recommended lanes — whose card ids
 * the board builds from a lane index — every id here is used verbatim as the
 * card id persisted to `leagueEvents` on close. They are a save contract, not a
 * React key: renaming one brings a dismissed card back for every player who
 * closed it. Pinned by `task-ledger.test.ts`.
 */
export const OPTIONAL_TASKS: readonly UiTask[] = [
  {
    id: 'optional-roster-training-medical',
    category: 'optional',
    title: 'Roster, weekly training, and medical roster calls',
    reason: 'Use the roster screen for player moves, training focus changes, and IR or return-from-IR decisions before roles lock.',
    consequence: 'Optional before Advance Week. Prioritize role changes that fix the current lineup, injury return, or training plan before those choices lock.',
    destination: taskDestination('/roster'),
    severity: 'info',
    blocksAdvance: false,
  },
  {
    id: 'optional-depth',
    category: 'optional',
    title: 'Depth-chart freedom',
    reason: 'Set starter and reserve order before Advance Week when every required slot has a legal player.',
    consequence: 'Optional, but the next game uses the saved depth chart when you press Advance Week.',
    destination: taskDestination('/depth-chart'),
    severity: 'info',
    blocksAdvance: false,
  },
  {
    id: 'optional-prep',
    category: 'optional',
    title: 'Tune game-plan and prep changes',
    reason: 'Set offensive, defensive, and weekly prep choices before kickoff when injuries or opponent matchups change.',
    consequence: 'Required when the week has no saved prep plan; otherwise optional until Advance Week locks the matchup plan.',
    destination: taskDestination('/game-plan'),
    severity: 'warning',
    blocksAdvance: false,
  },
  {
    id: 'optional-cap',
    category: 'optional',
    title: 'Contracts, restructures, cuts, tags, and Cap Lab batches',
    reason: 'Preview legal releases, extensions, restructures, backloads, and sandboxed batches before cap choices become final.',
    consequence: 'Optional while the cap move is legal; applied moves immediately change dead money, cap space, and extension money.',
    destination: taskDestination('/contracts', 'Contracts / Cap Lab'),
    severity: 'info',
    blocksAdvance: false,
  },
  {
    id: 'optional-market',
    category: 'optional',
    title: 'Trades, trade block, waiver, practice-squad, and free-agency paths',
    reason: 'Open acquisition screens for legal offers, counters, claims, adds, bids, and signings before deadlines hit.',
    consequence: 'Optional until offer expirations, waiver or free-agency windows, or phase-specific market rules apply.',
    destination: taskDestination('/trades', 'Trades / Waiver Wire / Practice Squad / Free Agency'),
    severity: 'warning',
    blocksAdvance: false,
  },
  {
    id: 'optional-scouting-staff-facility',
    category: 'optional',
    title: 'Scouting, coaching, facilities, and medical staff',
    reason: 'Open scouting, coaching, facilities, and medical staff after immediate injuries, depth, cap, or matchup calls are covered.',
    consequence: 'Optional before Advance Week. Staff, facility, or medical changes alter scouting reports, player growth, or injury recovery after the week advances.',
    destination: taskDestination('/scouting', 'Scouting / Coaching / Settings'),
    severity: 'info',
    blocksAdvance: false,
  },
  {
    id: 'optional-save',
    category: 'optional',
    title: 'Save slot and backup export',
    reason: 'Preserve the current dynasty before irreversible trades, cuts, imports, or multi-week advances.',
    consequence: 'Optional before Advance Week. Skipping it leaves no restore point before irreversible trades, cuts, imports, or multi-week advances.',
    destination: taskDestination('/dynasty', 'Save/Load'),
    severity: 'clear',
    blocksAdvance: false,
  },
];
