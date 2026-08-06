# WP-11 — Entry and Guided Setup Reinvention

## Packet control

| Field | Value |
|---|---|
| Phase | 3 |
| Relative effort | L |
| Critical-path status | Non-critical-path after prerequisites |
| Dependencies | WP-01–WP-06 |
| Owner gate | None beyond packet dependencies |
| Migration rule | Reversible, compatibility-first, no production route removal |

## User problem solved

New Game is six phone screens and 56 controls before commitment.

## Objective

Stage title/continue/start type/franchise/experience/review into bounded steps, preserving existing creation logic and Chip onboarding.

## Scope

- Create a clear entry screen for Continue, New Dynasty, Import, Demo/Scenario where supported.
- Stage new dynasty setup into bounded steps with progress, retained choices, review, and safe backtracking.
- Preserve guided/instant/scenario/import creation paths and exact output contracts.
- Integrate Chip onboarding contextually rather than as competing chrome.

## Explicit non-scope

- No changes to generated league/team/player data.
- No new account/cloud requirement.
- No destructive overwrite without explicit scope and confirmation.

## Exact files to add

- `apps/web/src/ui/screens/entry/EntryScreen.tsx`
- `apps/web/src/ui/screens/entry/StartTypeStep.tsx`
- `apps/web/src/ui/screens/setup/SetupShell.tsx`
- `apps/web/src/ui/screens/setup/setup.module.css`

## Exact files to modify

- `apps/web/src/app/BootScreen.tsx`
- `apps/web/src/app/NewGameScreen.tsx`
- `apps/web/src/app/new-game-screen.css`
- `apps/web/src/features/franchise-setup/FranchiseSetupWizard.tsx`

## Exact files to delete — only after migration proof

- None in this packet.

A glob in this packet identifies a route cluster, not permission for blind bulk editing. Claude must enumerate the concrete touched files in the progress ledger before committing.

## Relevant symbols and contracts

- `EntryScreen`
- `StartTypeStep`
- `SetupShell`
- `SetupDraft`

## Proposed component / module structure

- Entry chooses start intent before exposing deep configuration.
- `SetupDraft` is UI-only transient state with restoration during the flow.
- `SetupShell` owns progress, step title, back/continue, error state, and sticky action.
- Final review calls existing creation/import action exactly once.

## Data and state contracts

- Presentation data is derived through pure selectors/presenters or UI-only adapters.
- Existing authoritative mutation functions remain the only commit boundary.
- No new field enters the save schema unless a separately documented protected-contract exception is approved.
- No UI read, sort, animation, or preview may consume simulation RNG.
- Route/UI preference state must be isolated from deterministic engine state.

## CSS and responsive behavior

- Primary choices fit first phone viewport.
- Each setup step targets ≤1.5 phone viewports and one decision family.
- Tablet/desktop may use a summary side pane but preserve step order.
- Mobile keyboard never hides continue/error.

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

- No/one/multiple save
- Guided/Instant/Scenario/Import
- back preserves
- step ≤1.5 viewports
- storage error/recovery
- keyboard/touch.

Also required:

- Unit tests for pure presenter/adapter logic and each error/state branch introduced.
- Component tests for semantics, keyboard, focus, disabled/loading behavior, and state transitions.
- Route compatibility/coverage tests for every route touched.
- Viewport geometry assertions at the smallest relevant phone, compact-height landscape, tablet, and desktop.
- Existing engine/web/design-system tests plus build, bundle, smoke, and release gates according to the packet’s blast radius.

## Manual test script

- Test no save, one save, multiple saves, corrupt/recoverable save.
- Run every start type.
- Back/forward across steps and refresh where supported.
- Compare produced save metadata/state with legacy flow.
- Test import validation and overwrite confirmation.

## Required before / after screenshots

- Entry: continue/new/import.
- Setup step.
- Review/commit.
- Storage/import error and recovery.

Each screenshot entry must include viewport, state/fixture, route, mode, commit, and the matching geometry measurement. Capture focus, open-sheet/dialog, error, and 200%-zoom states where this packet changes them.

## Performance and bundle checks

- Measure route bundle change and compare against the existing release/bundle gate.
- Avoid mounting hidden heavy legacy and new implementations simultaneously outside controlled migration tests.
- Use memoized selectors/view models only where profiling shows value; do not cache mutable domain objects.
- Large lists must have an explicit DOM/render strategy and a keyboard/focus-safe fallback.

## Risks

- Transient draft can accidentally persist sensitive/large game state.
- Creation can double-fire under navigation/re-render.
- Scenario/import branches may have hidden legacy assumptions.

## Rollback path

Legacy entry/setup retained behind migration mode until H1.

Additionally:

- Keep the legacy route/shell/component available until replacement coverage and acceptance gates are green.
- Separate extraction, new implementation, route adoption, and deletion commits so any layer can be reverted independently.
- Never roll back by altering or discarding user saves.

## Suggested atomic commits

- feat(entry): add clear continue and start choices
- feat(setup): add bounded guided setup shell
- test(setup): preserve creation contracts and recovery states

Each commit must update the progress ledger with checks, screenshots, remaining compatibility behavior, and rollback command/commit.

## Definition of done

Primary start choices in first viewport; setup progress/restoration works; creation outputs identical save contracts.

The packet is not done when the new UI merely renders. It is done only when feature parity, route compatibility, interaction/accessibility behavior, viewport acceptance, deterministic/save safety, evidence capture, and rollback proof all pass.
