/**
 * Navigation unlock config (Sprint 43 — Progressive Tab Disclosure).
 *
 * Data-only metadata. The app shell consumes this table through
 * `getNavUnlockStatus()`; new progressive-disclosure rules belong here instead
 * of being recreated in the shell.
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
  // ── Current shell primary routes ──────────────────────
  { route: '/', label: 'Monday Briefing', unlockWeek: 'always' },
  { route: '/roster', label: 'Roster', unlockWeek: 'always' },
  { route: '/watch-list', label: 'Watch List', unlockWeek: 'always' },
  { route: '/locker-room', label: 'Locker Room', unlockWeek: 'always' },
  { route: '/contracts', label: 'Contracts', unlockWeek: 4 },
  { route: '/cap-lab', label: 'Cap Lab', unlockWeek: 'always' },
  { route: '/front-office', label: 'Front Office', unlockWeek: 'always' },
  { route: '/endorsements', label: 'Endorsements', unlockWeek: 'always' },
  { route: '/trades', label: 'Trades', unlockWeek: 4 },
  { route: '/trade-block', label: 'Trade Block', unlockWeek: 'always' },
  { route: '/team-needs', label: 'Team Needs', unlockWeek: 'always' },
  { route: '/scouting', label: 'Scouting', unlockWeek: 'midseason' },
  { route: '/draft', label: 'Draft', unlockPhase: 'draft' },
  { route: '/free-agency', label: 'Free Agency', unlockPhase: 'free_agency' },
  { route: '/fa-targets', label: 'FA Targets', unlockWeek: 'always' },
  { route: '/game-day', label: 'Game Day', unlockWeek: 'always' },
  { route: '/game-plan', label: 'Game Plan', unlockWeek: 'always' },
  { route: '/broadcast', label: 'Broadcast', unlockWeek: 'always' },
  { route: '/presentation', label: 'Presentation', unlockWeek: 'always' },
  { route: '/play-by-play', label: 'Play-by-Play', unlockWeek: 'always' },
  { route: '/game-flow', label: 'Game Flow', unlockWeek: 'always' },
  { route: '/film-room', label: 'Film Room', unlockWeek: 'always' },
  { route: '/super-bowl', label: 'Super Bowl', unlockWeek: 'always' },
  { route: '/inbox', label: 'Inbox', unlockWeek: 'always' },
  { route: '/social', label: 'MFSN', unlockWeek: 'always' },
  { route: '/waivers', label: 'Waiver Wire', unlockWeek: 'always' },
  { route: '/practice-squad', label: 'Practice Squad', unlockWeek: 'always' },
  { route: '/schedule', label: 'Schedule', unlockWeek: 'always' },
  { route: '/depth-chart', label: 'Depth Chart', unlockWeek: 'always' },
  { route: '/coaching', label: 'Coaching', unlockWeek: 'always' },
  { route: '/training-camp', label: 'Training Camp', unlockPhase: 'training_camp' },
  { route: '/mentors', label: 'Alumni Mentors', unlockWeek: 'always' },
  { route: '/owner', label: 'Owner', unlockWeek: 'always' },
  { route: '/commissioner', label: 'Commissioner', unlockWeek: 'always' },
  { route: '/cba', label: 'CBA Negotiation', unlockWeek: 'always' },
  { route: '/league-rules', label: 'League Rules', unlockWeek: 'always' },
  { route: '/franchise', label: 'Franchise', unlockWeek: 'always' },
  { route: '/legends', label: 'Legends', unlockWeek: 'always' },
  { route: '/week-advance', label: 'Advance Week', unlockWeek: 'always' },
  { route: '/handshakes', label: 'Handshakes', unlockWeek: 'always' },
  { route: '/news', label: 'News', unlockWeek: 'always' },
  { route: '/newsroom', label: 'Newsroom', unlockWeek: 'always' },
  { route: '/records', label: 'Record Book', unlockWeek: 'always' },
  { route: '/stat-central', label: 'Stat Central', unlockWeek: 'always' },
  { route: '/standings', label: 'Standings', unlockWeek: 'always' },
  { route: '/analytics', label: 'Analytics', unlockWeek: 'always' },
  { route: '/power-rankings', label: 'Power Rankings', unlockWeek: 'midseason' },
  { route: '/league-pulse', label: 'League Pulse', unlockWeek: 'always' },
  { route: '/scenarios', label: 'Scenarios', unlockWeek: 'always' },
  { route: '/legacy', label: 'Legacy', unlockWeek: 'always' },
  { route: '/awards', label: 'Awards Hub', unlockWeek: 'always' },
  { route: '/about', label: 'About', unlockWeek: 'always' },
  { route: '/credits', label: 'Credits', unlockWeek: 'always' },
  { route: '/faq', label: 'FAQ', unlockWeek: 'always' },
  { route: '/dynasty', label: 'Save/Load', unlockWeek: 'always' },
  { route: '/settings', label: 'Settings', unlockWeek: 'always' },
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
