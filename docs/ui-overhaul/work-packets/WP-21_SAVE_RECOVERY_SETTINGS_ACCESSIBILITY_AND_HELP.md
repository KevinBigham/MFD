# WP-21 — Save, Recovery, Settings, Accessibility, and Help

## Packet control

| Field | Value |
|---|---|
| Phase | 8 |
| Relative effort | XL |
| Critical-path status | Non-critical-path after prerequisites |
| Dependencies | H1, WP-03, WP-05, WP-07 |
| Owner gate | H1/H2/H3 only where listed in dependencies or implementation plan |
| Migration rule | Reversible, compatibility-first, no production route removal |

## User problem solved

Trust-critical settings/save/recovery are overlong and distributed.

## Objective

Create System entry, Save & Recovery status/actions, categorized settings/accessibility, and help while preserving slots, autosaves, imports/exports, combined backups, and sidecars.

## Scope

- Create a clear System entry and separate Save & Recovery, Settings, Accessibility, and Help surfaces.
- Expose save health, last save, autosave, slots, export/import, complete backup/sidecars, recovery, storage limits, and destructive scope.
- Categorize settings by user intent and keep accessibility always reachable.
- Wrap existing persistence APIs without format changes.

## Explicit non-scope

- No backend/account/cloud requirement.
- No save schema or archive format change unless separately justified and tested.
- No destructive action hidden behind vague copy.

## Exact files to add

- `apps/web/src/ui/screens/system/SystemHome.tsx`
- `apps/web/src/ui/screens/system/SaveRecoveryScreen.tsx`
- `apps/web/src/ui/screens/system/SettingsScreen.tsx`
- `apps/web/src/ui/screens/system/AccessibilityScreen.tsx`
- `apps/web/src/ui/screens/system/HelpScreen.tsx`

## Exact files to modify

- `apps/web/src/features/dynasty-cartridge/DynastyCartridge.tsx`
- `apps/web/src/features/settings/Settings.tsx`
- `apps/web/src/app/AutosaveToast.tsx`
- `apps/web/src/app/store/persistence.ts`

## Exact files to delete — only after migration proof

- None in this packet.

A glob in this packet identifies a route cluster, not permission for blind bulk editing. Claude must enumerate the concrete touched files in the progress ledger before committing.

## Relevant symbols and contracts

- `SystemHome`
- `SaveHealthViewModel`
- `SaveRecoveryScreen`
- `SettingsScreen`
- `AccessibilityScreen`

## Proposed component / module structure

- `SaveHealthViewModel` reads persistence status and exposes actionable recovery states.
- `SaveRecoveryScreen` separates routine save actions from import/restore/destructive recovery.
- Settings sections are locally navigable and searchable.
- Accessibility preferences use existing UI-only storage where safe.
- Help links route taxonomy, controls, saves, and Chip guidance.

## Data and state contracts

- Presentation data is derived through pure selectors/presenters or UI-only adapters.
- Existing authoritative mutation functions remain the only commit boundary.
- No new field enters the save schema unless a separately documented protected-contract exception is approved.
- No UI read, sort, animation, or preview may consume simulation RNG.
- Route/UI preference state must be isolated from deterministic engine state.

## CSS and responsive behavior

- Phone uses categorized list → focused detail/workflow; destructive confirmations are full-context sheets/dialogs.
- Tablet/desktop may show category sidebar plus detail pane.
- Import/export progress and errors remain visible and recoverable.
- 200% zoom and keyboard work throughout.

The shared rules in `05_SCREEN_BLUEPRINTS.md` and `06_DESIGN_SYSTEM_AND_VISUAL_SPEC.md` remain authoritative. Screen-specific CSS must use semantic tokens, one primary scroll owner, safe-area-aware sticky actions, and explicit compact-height behavior.

## Touch behavior

- Essential actions must be completable with touch only and must not depend on hover, right-click, or drag.
- Core interactive targets must meet the selected 44 CSS-pixel minimum; primary phone actions should normally be 48 pixels high.
- Bottom navigation, sheets, and sticky actions must avoid system-gesture and safe-area conflicts.
- Taps that commit a destructive, irreversible, or phase-changing action require clear scope and confirmation appropriate to the risk.
- Pressed/loading/disabled feedback must prevent accidental double activation.

## Keyboard behavior

- Use semantic DOM and natural tab order before adding custom key handling.
- Focus-visible must remain obvious against every surface and team-color state.
- Dialogs/sheets trap focus only while modal and restore it to the invoking control.
- Escape cancels/dismisses when safe; Enter/Space activate according to native semantics.
- Route changes place focus at the screen heading, requested entity, or restored origin target intentionally.
- Existing global shortcuts must be audited for conflicts and documented rather than silently changed.

## Accessibility requirements

- Meet the contrast, target-size, zoom, reduced-motion, focus, heading, landmark, error, and non-color requirements in the QA matrix.
- Every icon action has a visible label or accessible name; primary navigation retains visible text labels.
- Dynamic task/save/overlay status uses restrained live-region behavior.
- Tables, charts, comparison grids, and visual state indicators have semantic or textual equivalents.
- At 200% zoom, the complete packet journey remains operable without two-dimensional page scrolling.

## Loading, empty, locked, and error behavior

- Loading preserves the screen frame and current context; it does not replace the whole app shell.
- Empty states explain why the surface is empty and offer the most relevant safe next action.
- Errors identify what failed, what was not changed, and a retry/recovery path.
- Locked/unavailable states explain lifecycle timing and preserve a path back to the originating task.

## Route and deep-link implications

- Use the route-surface map and compatibility resolver from WP-04.
- Preserve existing deep links until the route matrix and owner gate permit retirement.
- Preserve entity IDs, query/filter state, navigation origin, scroll anchor, and focus target when valid.
- Browser back/forward must behave predictably and must not repeat mutations.

## Save, determinism, and protected-layer implications

- No save-schema version change is expected.
- UI-only preferences use the existing UI preference boundary and must fail safely.
- Before/after deterministic fixture state must match legacy behavior for every committed game action.
- Import/export/autosave behavior is out of scope unless explicitly named in this packet.

Protected by default: `packages/engine/src/systems/`, RNG/determinism, save schemas/migrations, core domain types, game outcome logic, state-mutation actions, persistence serialization, and backup formats. If a protected change appears necessary, stop this packet and document the exact requirement, why an adapter is insufficient, determinism/save impact, tests, and rollback before proceeding.

## Automated tests

- Healthy/saving/failure/quota/import invalid/recovery
- complete backup and sidecars
- keyboard/zoom/reduced motion
- no persistence format change
- old utility routes.

Also required:

- Unit tests for pure presenter/adapter logic and each error/state branch introduced.
- Component tests for semantics, keyboard, focus, disabled/loading behavior, and state transitions.
- Route compatibility/coverage tests for every route touched.
- Viewport geometry assertions at the smallest relevant phone, compact-height landscape, tablet, and desktop.
- Existing engine/web/design-system tests plus build, bundle, smoke, and release gates according to the packet’s blast radius.

## Manual test script

- Test healthy, saving, failed, quota, missing sidecar, invalid/corrupt import, recovery, overwrite, export, complete backup, and reload.
- Compare bytes/metadata with legacy operations.
- Test every settings category, reduced motion, density, font/contrast options present.
- Open old utility routes.

## Required before / after screenshots

- System home.
- Save health and recovery.
- Import validation/overwrite.
- Settings categories.
- Accessibility and Help.

Each screenshot entry must include viewport, state/fixture, route, mode, commit, and the matching geometry measurement. Capture focus, open-sheet/dialog, error, and 200%-zoom states where this packet changes them.

## Performance and bundle checks

- Measure route bundle change and compare against the existing release/bundle gate.
- Avoid mounting hidden heavy legacy and new implementations simultaneously outside controlled migration tests.
- Use memoized selectors/view models only where profiling shows value; do not cache mutable domain objects.
- Large lists must have an explicit DOM/render strategy and a keyboard/focus-safe fallback.

## Risks

- Presentation changes can obscure destructive scope.
- Progress feedback can claim success before storage completes.
- Touching persistence module can accidentally change serialization.

## Rollback path

Presentation wraps existing persistence APIs; legacy utilities remain until parity proof.

Additionally:

- Keep the legacy route/shell/component available until replacement coverage and acceptance gates are green.
- Separate extraction, new implementation, route adoption, and deletion commits so any layer can be reverted independently.
- Never roll back by altering or discarding user saves.

## Suggested atomic commits

- feat(system): add System home and categorized settings
- feat(save): add save health and recovery presenter
- feat(a11y): add dedicated accessibility surface
- test(save): prove import export backup and recovery parity

Each commit must update the progress ledger with checks, screenshots, remaining compatibility behavior, and rollback command/commit.

## Definition of done

Trust state is legible; destructive scope explicit; all save contracts and recovery fixtures pass.

The packet is not done when the new UI merely renders. It is done only when feature parity, route compatibility, interaction/accessibility behavior, viewport acceptance, deterministic/save safety, evidence capture, and rollback proof all pass.
