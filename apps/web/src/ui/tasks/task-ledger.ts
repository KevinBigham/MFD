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

import type { AGMRecommendation, AGMRecommendationPriority } from '@mfd/engine';
import { hubForLegacyPath } from '../routes/route-surface-map';
import type { HubId } from '../routes/route-surface-types';

export type TaskCategory = 'must' | 'recommended' | 'optional';

/**
 * Where a task came from. This is the tiebreak input for `mergeTaskLedger`, not
 * a display field — the audit's "hidden/deferred" list for Today puts
 * provenance behind disclosure precisely so the screen never leads with it.
 */
export type TaskSource = 'state' | 'agm' | 'standing';

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
  source: TaskSource;
  /**
   * Semantic identity. Two tasks sharing a key are the same job described by
   * two systems, and `mergeTaskLedger` collapses them to one row.
   *
   * Keys are authored per task rather than derived from the route: the AGM's
   * cap mandate and the owner-approval warning both point at `/owner` and are
   * genuinely different work, while its injury advisory and the state-derived
   * injury task point at `/roster` and are genuinely the same.
   */
  dedupeKey: string;
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
    source: 'state',
    dedupeKey: 'advance-ready',
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
    source: 'state',
    dedupeKey: 'advance-recommended-clear',
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
      source: 'state',
      dedupeKey: 'game-plan',
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
      source: 'state',
      dedupeKey: 'depth-chart',
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
      source: 'state',
      dedupeKey: 'market',
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
      source: 'state',
      dedupeKey: 'owner-approval',
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
      source: 'state',
      dedupeKey: 'roster-moves',
    });
  }

  if (tasks.length === 0) tasks.push(readyToAdvanceTask());

  return tasks;
}

/**
 * The standing Optional lane: legal moves that are always available, listed so
 * the player knows the week is not over when the Must Do lane is empty.
 *
 * SAVE-VISIBLE IDS, LATENTLY. Unlike the Must Do and Recommended lanes — whose
 * card ids the board builds from a lane index — every id here is passed through
 * as the card id verbatim. The Optional lane renders no Close control today, so
 * none of these has actually reached `leagueEvents` yet; the moment it gains
 * one, they become a save contract and renaming one brings a dismissed card
 * back. Treat them as frozen now rather than discovering it later. Pinned by
 * `task-ledger.test.ts`.
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
    source: 'standing',
    dedupeKey: 'roster-moves',
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
    source: 'standing',
    dedupeKey: 'depth-chart',
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
    source: 'standing',
    dedupeKey: 'game-plan',
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
    source: 'standing',
    dedupeKey: 'cap',
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
    source: 'standing',
    dedupeKey: 'market',
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
    source: 'standing',
    dedupeKey: 'scouting-staff',
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
    source: 'standing',
    dedupeKey: 'save',
  },
];

/* ── The AGM lane ─────────────────────────────────────────────────────────
 *
 * Until now the Assistant GM's weekly recommendations bypassed the ledger
 * entirely: `ActionCenter.tsx` mapped them straight to board rows with their
 * own priority→accent table and their own deadline copy. That is precisely the
 * "several systems answering the same question" problem the ledger exists to
 * end, so they become tasks here.
 *
 * Copy and colour are reproduced exactly. `AGM_SEVERITY` is chosen so that
 * routing a recommendation through `TaskSeverity` and back out through the
 * board's `SEVERITY_ACCENT` lands on the same accent the old `PRIORITY_ACCENT`
 * table produced, and `task-ledger.test.ts` asserts that round trip rather
 * than trusting it.
 */

const AGM_SEVERITY: Record<AGMRecommendationPriority, TaskSeverity> = {
  urgent: 'blocking',
  high: 'warning',
  medium: 'info',
  low: 'clear',
};

const AGM_CATEGORY: Record<AGMRecommendationPriority, TaskCategory> = {
  urgent: 'recommended',
  high: 'recommended',
  medium: 'recommended',
  low: 'optional',
};

/** Verbatim from `recommendationDeadline()` in `ActionCenter.tsx`. */
const AGM_CONSEQUENCE: Record<AGMRecommendationPriority, string> = {
  urgent: 'Recommended before Advance Week for lineup, cap space, or matchup changes. Advance Week remains available when no Must Do item stops it.',
  high: 'Recommended this week: handle before Advance Week locks the next game for lineup, cap, depth, or Game Plan changes.',
  medium: 'Recommended before kickoff for lineup, cap, depth, or Game Plan changes.',
  low: 'Optional: handle lineup, cap space, market offer, staff plan, or matchup changes before Advance Week, offer expiration, market windows, or phase rules lock them. Advance Week remains available when no Must Do item stops it.',
};

/**
 * Which state-derived task each recommendation duplicates.
 *
 * An id that is absent gets a key of its own and therefore never merges. That
 * is the safe default: a recommendation the engine grows later must show up as
 * its own row rather than being silently absorbed into an unrelated task.
 */
const AGM_DEDUPE_KEYS: Record<string, string> = {
  injury_watch: 'roster-moves',
  cap_trouble: 'cap',
  next_opponent: 'game-plan',
  roster_gaps: 'team-needs',
  marcus_cap_mandate: 'owner-mandate',
  sandra_development_mandate: 'roster-moves',
};

/**
 * SAVE-VISIBLE ID. `agm-${id}` is the card id the legacy board writes to
 * `leagueEvents` when a player closes a recommendation, so the prefix and the
 * engine's recommendation id are both frozen. Pinned by `task-ledger.test.ts`.
 */
export function agmTask(recommendation: AGMRecommendation): UiTask {
  const route = recommendation.targetRoute ?? '/week-advance';
  return {
    id: `agm-${recommendation.id}`,
    category: AGM_CATEGORY[recommendation.priority],
    title: recommendation.title,
    reason: recommendation.body,
    consequence: AGM_CONSEQUENCE[recommendation.priority],
    destination: taskDestination(route),
    severity: AGM_SEVERITY[recommendation.priority],
    blocksAdvance: false,
    source: 'agm',
    dedupeKey: AGM_DEDUPE_KEYS[recommendation.id] ?? `agm:${recommendation.id}`,
  };
}

/* ── Merge ────────────────────────────────────────────────────────────────
 *
 * Three sources now describe overlapping work. On the legacy board that shows
 * up as, for example, "3 injured players → Roster", the AGM's "Injury fix: 2
 * starters sidelined → Roster", and the standing "Roster, weekly training, and
 * medical roster calls → Roster" as three separate cards. On a 390 px screen
 * that is one job wearing three hats.
 *
 * Merging is lossless: the losers travel on the winner as `merged`, so a
 * surface can disclose them and none of the audit's "no feature data deleted"
 * requirement depends on the caller remembering to keep the raw list.
 */

export interface MergedTask extends UiTask {
  /** Lower-precedence tasks sharing this task's key, in encounter order. */
  merged: readonly UiTask[];
}

const CATEGORY_RANK: Record<TaskCategory, number> = { must: 0, recommended: 1, optional: 2 };
const SOURCE_RANK: Record<TaskSource, number> = { state: 0, agm: 1, standing: 2 };

/**
 * A blocking task always wins, then the more urgent category, then the source
 * closest to game state. Ties keep the earlier task, which makes the result a
 * function of input order alone — no clock, no hashing, no set iteration.
 */
function outranks(candidate: UiTask, incumbent: UiTask): boolean {
  if (candidate.blocksAdvance !== incumbent.blocksAdvance) return candidate.blocksAdvance;
  const byCategory = CATEGORY_RANK[candidate.category] - CATEGORY_RANK[incumbent.category];
  if (byCategory !== 0) return byCategory < 0;
  return SOURCE_RANK[candidate.source] < SOURCE_RANK[incumbent.source];
}

export function mergeTaskLedger(tasks: readonly UiTask[]): MergedTask[] {
  const order: string[] = [];
  const winners = new Map<string, UiTask>();
  const losers = new Map<string, UiTask[]>();

  for (const task of tasks) {
    const incumbent = winners.get(task.dedupeKey);
    if (!incumbent) {
      order.push(task.dedupeKey);
      winners.set(task.dedupeKey, task);
      losers.set(task.dedupeKey, []);
      continue;
    }
    if (outranks(task, incumbent)) {
      winners.set(task.dedupeKey, task);
      losers.get(task.dedupeKey)!.push(incumbent);
    } else {
      losers.get(task.dedupeKey)!.push(task);
    }
  }

  return order.map((key) => ({ ...winners.get(key)!, merged: losers.get(key)! }));
}
