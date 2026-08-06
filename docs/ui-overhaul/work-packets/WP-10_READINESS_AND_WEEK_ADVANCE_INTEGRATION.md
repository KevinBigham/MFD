# WP-10 — Readiness and Week-Advance Integration

## Packet control

| Field | Value |
|---|---|
| Phase | 3 |
| Relative effort | L |
| Critical-path status | Critical path |
| Dependencies | WP-09, WP-03, WP-07 |
| Owner gate | None beyond packet dependencies |
| Migration rule | Reversible, compatibility-first, no production route removal |

## User problem solved

Advance is treated as a route/action without one concise, trustworthy blocker/warning/consequence checkpoint.

## Objective

Unify readiness with the Task Ledger, provide actionable sheet/panel and exact transition labels, then preserve existing advance/game mutations behind a presenter boundary.

## Scope

- Derive readiness from the Task Ledger plus existing authoritative advance/game checks.
- Separate blockers, acknowledged warnings, optional recommendations, exact transition, and save status.
- Implement compact readiness control and detailed sheet/panel.
- Delegate final mutation to existing production action only after current checks pass.

## Explicit non-scope

- No bypass of blockers.
- No simulation/phase logic rewrite.
- No generic “Advance” label when the next transition is knowable.

## Exact files to add

- `apps/web/src/ui/presenters/readiness-presenter.ts`
- `apps/web/src/ui/screens/today/ReadinessControl.tsx`
- `apps/web/src/ui/screens/today/ReadinessSheet.tsx`
- `apps/web/src/ui/screens/today/readiness.test.tsx`

## Exact files to modify

- `apps/web/src/features/week-advance/WeekAdvance.tsx`
- `apps/web/src/ui/screens/today/TodayScreen.tsx`

## Exact files to delete — only after migration proof

- None in this packet.

A glob in this packet identifies a route cluster, not permission for blind bulk editing. Claude must enumerate the concrete touched files in the progress ledger before committing.

## Relevant symbols and contracts

- `ReadinessViewModel`
- `presentReadiness`
- `ReadinessControl`
- `ReadinessSheet`

## Proposed component / module structure

- `presentReadiness` consumes authoritative checks and ledger, producing no mutations.
- `ReadinessControl` exposes state and exact label such as “Play Week 14 vs DAL” or “Advance to Free Agency.”
- `ReadinessSheet` links each blocker to its destination and records warning acknowledgement in UI-only state.
- Final confirm invokes the existing action and handles save failure/recovery.

## Data and state contracts

- Presentation data is derived through pure selectors/presenters or UI-only adapters.
- Existing authoritative mutation functions remain the only commit boundary.
- No new field enters the save schema unless a separately documented protected-contract exception is approved.
- No UI read, sort, animation, or preview may consume simulation RNG.
- Route/UI preference state must be isolated from deterministic engine state.

## CSS and responsive behavior

- Phone control is sticky above safe area only on Today/appropriate phase surfaces.
- Sheet fits 320×568 and allows action rows to scroll while confirm remains visible.
- Desktop uses inline control plus popover/panel.

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

- Blocked/warning/ready/stale/save-failure fixtures
- exact task destinations
- acknowledgement
- mutation parity
- deterministic before/after state.

Also required:

- Unit tests for pure presenter/adapter logic and each error/state branch introduced.
- Component tests for semantics, keyboard, focus, disabled/loading behavior, and state transitions.
- Route compatibility/coverage tests for every route touched.
- Viewport geometry assertions at the smallest relevant phone, compact-height landscape, tablet, and desktop.
- Existing engine/web/design-system tests plus build, bundle, smoke, and release gates according to the packet’s blast radius.

## Manual test script

- Test blocked, warning, ready, stale state, save-in-progress, save failure, and phase transition.
- Resolve each blocker through its direct link and return.
- Verify warning acknowledgement resets when underlying facts change.
- Hash before/after simulation state against legacy action.

## Required before / after screenshots

- Blocked readiness sheet.
- Warning acknowledgement.
- Ready exact-transition control.
- Save failure recovery.

Each screenshot entry must include viewport, state/fixture, route, mode, commit, and the matching geometry measurement. Capture focus, open-sheet/dialog, error, and 200%-zoom states where this packet changes them.

## Performance and bundle checks

- Measure route bundle change and compare against the existing release/bundle gate.
- Avoid mounting hidden heavy legacy and new implementations simultaneously outside controlled migration tests.
- Use memoized selectors/view models only where profiling shows value; do not cache mutable domain objects.
- Large lists must have an explicit DOM/render strategy and a keyboard/focus-safe fallback.
- Foundation code is shared widely; treat every dependency and CSS import as a startup/bundle decision.

## Risks

- UI acknowledgement could be mistaken for game-state resolution.
- Stale readiness after async/state update.
- Double activation could advance twice.

## Rollback path

Existing WeekAdvance route remains compatibility destination; new control delegates to existing actions.

Additionally:

- Keep the legacy route/shell/component available until replacement coverage and acceptance gates are green.
- Separate extraction, new implementation, route adoption, and deletion commits so any layer can be reverted independently.
- Never roll back by altering or discarding user saves.

## Suggested atomic commits

- feat(readiness): add pure readiness presenter
- feat(today): integrate readiness control and sheet
- test(readiness): verify blockers warnings save and mutation parity

Each commit must update the progress ledger with checks, screenshots, remaining compatibility behavior, and rollback command/commit.

## Definition of done

Advance label states real transition; blockers actionable; warnings explicit; no UI-only bypass of game rules.

The packet is not done when the new UI merely renders. It is done only when feature parity, route compatibility, interaction/accessibility behavior, viewport acceptance, deterministic/save safety, evidence capture, and rollback proof all pass.
