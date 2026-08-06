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
