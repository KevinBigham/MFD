/**
 * Navigation unlock config (Sprint 43 — Progressive Tab Disclosure).
 *
 * Data-only metadata. The app shell consumes this table through
 * `getNavUnlockStatus()`; new progressive-disclosure rules belong here instead
 * of being recreated in the shell.
 */

import type { SeasonPhase } from '../types/season';
import { APP_ROUTE_REGISTRY } from './route-registry';

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

export const NAV_UNLOCK_RULES: readonly NavUnlockRule[] = APP_ROUTE_REGISTRY.map((entry) => ({
  route: entry.path,
  label: entry.label,
  unlockWeek: entry.unlockWeek,
  ...('unlockPhase' in entry ? { unlockPhase: entry.unlockPhase } : {}),
}));

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
