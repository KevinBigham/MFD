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

/**
 * The new shell's own route.
 *
 * Two places in `App.tsx` branch on it — `RootLayout` returns a bare `Outlet`
 * so `AppFrame` is not nested inside 383–425px of legacy chrome, and
 * `PostSetupApp` suppresses the legacy Chip dock so its 193px of permanent
 * clearance does not land on a screen with a 152px budget.
 *
 * They read the current path from different sources: TanStack's
 * `location.pathname`, and `resolveCurrentAppRoute(window.location)`, which
 * returns the raw hash including any query string or trailing slash. Comparing
 * each against a bare string made `#/today?panel=x` match one and not the
 * other — the new shell would render with the legacy Chip dock on top of it.
 * Both go through this instead.
 */
export const TODAY_ROUTE = '/today';

export function isTodayRoute(path: string | null | undefined): boolean {
  if (!path) return false;
  const withoutHash = path.startsWith('#') ? path.slice(1) : path;
  const [pathname = ''] = withoutHash.split(/[?#]/);
  return (pathname.replace(/\/+$/, '') || '/') === TODAY_ROUTE;
}
