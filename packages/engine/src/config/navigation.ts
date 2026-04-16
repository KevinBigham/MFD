/**
 * Navigation unlock config (Sprint 43 — Progressive Tab Disclosure).
 *
 * Data-only. UI consumes via `isNavItemUnlocked()` / `getNavUnlockLabel()`.
 * Keeps new players from drowning in 20+ tabs during Week 1 — advanced
 * screens gate in as the season progresses.
 */

import type { SeasonPhase } from '../types/season';

export interface NavUnlockRule {
  /** Route key (matches the hash route, e.g. "/trades"). */
  route: string;
  /** Display label (also used in "Unlocks in Week N" tooltips). */
  label: string;
  /**
   * Earliest regular-season week this route becomes available.
   * Use `'always'` for routes available from Week 1.
   */
  unlockWeek?: number | 'always' | 'midseason';
  /** Phase unlock (e.g. "offseason" for draft-room screens). */
  unlockPhase?: SeasonPhase;
}

/**
 * Week at which "midseason" unlocks become active.
 * Kept as a constant so tests + UI can reference the same value.
 */
export const MIDSEASON_UNLOCK_WEEK = 8;

export const NAV_UNLOCK_RULES: readonly NavUnlockRule[] = [
  // ── Always visible ────────────────────────────────────
  { route: '/', label: 'Dashboard', unlockWeek: 'always' },
  { route: '/roster', label: 'Roster', unlockWeek: 'always' },
  { route: '/depth-chart', label: 'Depth Chart', unlockWeek: 'always' },
  { route: '/schedule', label: 'Schedule', unlockWeek: 'always' },
  { route: '/standings', label: 'Standings', unlockWeek: 'always' },
  { route: '/inbox', label: 'Inbox', unlockWeek: 'always' },
  { route: '/briefing', label: 'Briefing', unlockWeek: 'always' },
  { route: '/game-plan', label: 'Game Plan', unlockWeek: 'always' },
  { route: '/settings', label: 'Settings', unlockWeek: 'always' },

  // ── Week 4+ ───────────────────────────────────────────
  { route: '/trades', label: 'Trades', unlockWeek: 4 },
  { route: '/contracts', label: 'Contracts', unlockWeek: 4 },

  // ── Midseason (Week 8+) ───────────────────────────────
  { route: '/scouting', label: 'Scouting', unlockWeek: 'midseason' },
  { route: '/power-rankings', label: 'Power Rankings', unlockWeek: 'midseason' },

  // ── Offseason-only ────────────────────────────────────
  { route: '/draft', label: 'Draft', unlockPhase: 'draft' },
  { route: '/free-agency', label: 'Free Agency', unlockPhase: 'free_agency' },
  { route: '/training-camp', label: 'Training Camp', unlockPhase: 'training_camp' },
];

export interface NavUnlockStatus {
  unlocked: boolean;
  /** Human-facing reason ("Unlocks Week 4", "Unlocks in Offseason"), or null when already open. */
  unlockLabel: string | null;
}

/**
 * Decide whether the route is currently available given season state.
 * Determinism: pure function, no RNG, no side effects.
 */
export function getNavUnlockStatus(
  route: string,
  ctx: { week: number; phase: SeasonPhase },
): NavUnlockStatus {
  const rule = NAV_UNLOCK_RULES.find((r) => r.route === route);
  if (!rule) return { unlocked: true, unlockLabel: null };

  if (rule.unlockPhase) {
    const unlocked = ctx.phase === rule.unlockPhase;
    return {
      unlocked,
      unlockLabel: unlocked ? null : `Unlocks in ${prettyPhase(rule.unlockPhase)}`,
    };
  }

  if (rule.unlockWeek === 'always' || rule.unlockWeek === undefined) {
    return { unlocked: true, unlockLabel: null };
  }
  if (rule.unlockWeek === 'midseason') {
    const unlocked = ctx.week >= MIDSEASON_UNLOCK_WEEK;
    return {
      unlocked,
      unlockLabel: unlocked ? null : `Unlocks Week ${MIDSEASON_UNLOCK_WEEK}`,
    };
  }
  const targetWeek = rule.unlockWeek;
  const unlocked = ctx.week >= targetWeek;
  return {
    unlocked,
    unlockLabel: unlocked ? null : `Unlocks Week ${targetWeek}`,
  };
}

export function isNavItemUnlocked(route: string, ctx: { week: number; phase: SeasonPhase }): boolean {
  return getNavUnlockStatus(route, ctx).unlocked;
}

function prettyPhase(phase: SeasonPhase): string {
  switch (phase) {
    case 'regular_season': return 'Regular Season';
    case 'free_agency':    return 'Free Agency';
    case 'training_camp':  return 'Training Camp';
    case 'post_draft':     return 'Post-Draft';
    default:
      return phase.charAt(0).toUpperCase() + phase.slice(1);
  }
}
