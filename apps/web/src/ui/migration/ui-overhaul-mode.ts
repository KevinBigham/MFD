/**
 * UI-only migration boundary for the UI/UX reinvention.
 *
 * `legacy` renders the existing shell; `v2` renders the new Broadcast War Room
 * shell. This is a presentation preference only: it lives in the ui-store's
 * localStorage channel, never in `GameState`, and never bumps SAVE_VERSION.
 * Toggling it must not read, write, or reorder simulation state.
 *
 * Legacy is the default and remains the rollback path until release approval.
 */

import { splitHref } from '../routes/href';

export type UiOverhaulMode = 'legacy' | 'v2';

export const DEFAULT_UI_OVERHAUL_MODE: UiOverhaulMode = 'legacy';

/** Unknown or corrupt persisted values fall back to legacy rather than throwing. */
export function normalizeUiOverhaulMode(value: unknown): UiOverhaulMode {
  return value === 'v2' || value === 'legacy' ? value : DEFAULT_UI_OVERHAUL_MODE;
}

/**
 * Structurally typed so this module never imports the store, keeping the
 * boundary free of an import cycle with `app/store/ui-store`.
 */
export function selectUiOverhaulMode(state: { uiOverhaulMode: UiOverhaulMode }): UiOverhaulMode {
  return state.uiOverhaulMode;
}

export function isUiOverhaulEnabled(state: { uiOverhaulMode: UiOverhaulMode }): boolean {
  return selectUiOverhaulMode(state) === 'v2';
}

export const TODAY_ROUTE = '/today';

/**
 * The routes the new shell renders, and the legacy shell must not.
 *
 * This is the strangler boundary as a data structure. Two places in `App.tsx`
 * branch on it — `RootLayout` returns a bare `Outlet` so `MfdAppShell` is not
 * nested inside 383–425px of legacy chrome, and `PostSetupApp` suppresses the
 * legacy Chip dock so its 193px of permanent clearance does not land on a
 * screen with a 152px budget.
 *
 * Keeping it a set rather than a route-by-route condition is the point: each
 * migrated hub adds one string here, and neither branch in the 2,276-line
 * shell is edited again. Both branches read the *same* set, which is what
 * stops them from disagreeing about which shell owns a route — a disagreement
 * that renders both at once.
 */
export const V2_SHELL_ROUTES: ReadonlySet<string> = new Set([TODAY_ROUTE]);

/**
 * Normalises the many shapes a current path arrives in.
 *
 * The two call sites read from different sources: TanStack's
 * `location.pathname`, and `resolveCurrentAppRoute(window.location)`, which
 * returns the raw hash including any query string or trailing slash. Comparing
 * each against a bare string made `#/today?panel=x` match one and not the
 * other — the new shell would render with the legacy Chip dock on top of it.
 *
 * The parsing is `splitHref`'s, not a second copy of it: `ui/routes/href.ts`
 * is the UI layer's one href parser and has no dependencies, so importing it
 * here costs nothing and keeps the boundary from disagreeing with route
 * resolution about what a path means. Absent input answers `null` rather than
 * `/`, so "no path" and "the home path" stay distinguishable.
 */
export function normalizeRoutePath(path: string | null | undefined): string | null {
  if (!path) return null;
  return splitHref(path).path;
}

export function isV2ShellRoute(path: string | null | undefined): boolean {
  const normalized = normalizeRoutePath(path);
  return normalized !== null && V2_SHELL_ROUTES.has(normalized);
}
