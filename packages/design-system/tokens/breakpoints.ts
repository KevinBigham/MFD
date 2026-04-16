/**
 * JS mirror of the --mfd-bp-* CSS tokens (Sprint 42).
 *
 * Use these for prop-based breakpoint helpers or window.matchMedia checks.
 * Keep in sync with tokens/index.css.
 */
export const BREAKPOINTS = {
  sm: 480, // phone portrait
  md: 768, // phone landscape / small tablet
  lg: 1024, // tablet / small desktop
} as const;

export const TOUCH_MIN_PX = 44; // iOS HIG / WCAG 2.5.5

export type BreakpointKey = keyof typeof BREAKPOINTS;

/** Build a `max-width` media-query string for `matchMedia()`. */
export function maxWidthQuery(bp: BreakpointKey): string {
  return `(max-width: ${BREAKPOINTS[bp]}px)`;
}

/** Build a `min-width` media-query string for `matchMedia()`. */
export function minWidthQuery(bp: BreakpointKey): string {
  return `(min-width: ${BREAKPOINTS[bp] + 1}px)`;
}
