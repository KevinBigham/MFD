# WP-14 — Depth, Development, Staff, and Culture Surfaces

## Packet control

| Field | Value |
|---|---|
| Phase | 4 |
| Relative effort | XL |
| Critical-path status | Non-critical-path after prerequisites |
| Dependencies | WP-12, WP-13 |
| Owner gate | None beyond packet dependencies |
| Migration rule | Reversible, compatibility-first, no production route removal |

## User problem solved

Core team-preparation and people systems remain separate route-style pages with inconsistent mobile workflows.

## Objective

Migrate Depth, development, coaching/staff, locker room/culture, mentors, commitments, and practice squad into Team sections and workflows.

## Scope

- Migrate Depth, Development, Coaching/Staff, Locker Room/Culture, Mentors, Commitments/Promises, and Practice Squad into Team sections/workflows.
- Provide non-drag alternatives and clear task completion.
- Preserve every action and rule through existing mutations.
- Integrate player detail and Today return behavior.

## Explicit non-scope

- No gameplay rating/development/cohesion rule change.
- No drag-only interaction.
- No route deletion before parity proof.

## Exact files to add

- `apps/web/src/ui/screens/team/DepthWorkflow.tsx`
- `apps/web/src/ui/screens/team/DevelopmentSection.tsx`
- `apps/web/src/ui/screens/team/StaffSection.tsx`
- `apps/web/src/ui/screens/team/CultureSection.tsx`

## Exact files to modify

- `apps/web/src/features/depth-chart/**`
- `apps/web/src/features/coaching/**`
- `apps/web/src/features/locker-room/**`
- `apps/web/src/features/mentors/**`
- `apps/web/src/features/handshake-ledger/**`
- `apps/web/src/features/practice-squad/**`

## Exact files to delete — only after migration proof

- None in this packet.

A glob in this packet identifies a route cluster, not permission for blind bulk editing. Claude must enumerate the concrete touched files in the progress ledger before committing.

## Relevant symbols and contracts

- `DepthWorkflow`
- `DepthViewModel`
- `DevelopmentSection`
- `StaffSection`
- `CultureSection`

## Proposed component / module structure

- `DepthWorkflow` uses a pure depth view model and explicit slot assignment controls.
- Development/Staff/Culture sections use shared hub and entity patterns.
- Required decisions emit task completion through state observation, not manual UI flags.
- Legacy paths resolve to the correct Team section or workflow.

## Data and state contracts

- Presentation data is derived through pure selectors/presenters or UI-only adapters.
- Existing authoritative mutation functions remain the only commit boundary.
- No new field enters the save schema unless a separately documented protected-contract exception is approved.
- No UI read, sort, animation, or preview may consume simulation RNG.
- Route/UI preference state must be isolated from deterministic engine state.

## CSS and responsive behavior

- Phone depth uses position/slot steps, conflict summary, and sticky save/confirm.
- Tablet/desktop may use board/workbench with keyboard alternatives.
- Long people lists use row/detail patterns from Team/Player packets.

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

- Incomplete/conflict/injury depth
- no drag-only path
- development/staff/culture states
- task completion
- route compatibility.

Also required:

- Unit tests for pure presenter/adapter logic and each error/state branch introduced.
- Component tests for semantics, keyboard, focus, disabled/loading behavior, and state transitions.
- Route compatibility/coverage tests for every route touched.
- Viewport geometry assertions at the smallest relevant phone, compact-height landscape, tablet, and desktop.
- Existing engine/web/design-system tests plus build, bundle, smoke, and release gates according to the packet’s blast radius.

## Manual test script

- Test incomplete depth, injuries, conflicts, auto-order, manual assignment, cancel, and confirm.
- Run development, staff, mentor, promise, culture, and practice-squad states.
- Complete required depth task from Today and return.
- Verify every old path/action.

## Required before / after screenshots

- Depth task workflow phone/desktop.
- Development section.
- Staff section.
- Culture/commitment state.
- Conflict/error state.

Each screenshot entry must include viewport, state/fixture, route, mode, commit, and the matching geometry measurement. Capture focus, open-sheet/dialog, error, and 200%-zoom states where this packet changes them.

## Performance and bundle checks

- Measure route bundle change and compare against the existing release/bundle gate.
- Avoid mounting hidden heavy legacy and new implementations simultaneously outside controlled migration tests.
- Use memoized selectors/view models only where profiling shows value; do not cache mutable domain objects.
- Large lists must have an explicit DOM/render strategy and a keyboard/focus-safe fallback.

## Risks

- UI reordering can accidentally mutate before confirm.
- Auto-depth and manual depth may have different hidden side effects.
- Culture/commitment information can be oversimplified if grouped only by route label.

## Rollback path

Cluster routes retain legacy wrappers individually.

Additionally:

- Keep the legacy route/shell/component available until replacement coverage and acceptance gates are green.
- Separate extraction, new implementation, route adoption, and deletion commits so any layer can be reverted independently.
- Never roll back by altering or discarding user saves.

## Suggested atomic commits

- feat(team): add accessible depth workflow
- feat(team): migrate development and staff sections
- feat(team): migrate culture commitments and practice squad
- test(team): verify task round-trip and action parity

Each commit must update the progress ledger with checks, screenshots, remaining compatibility behavior, and rollback command/commit.

## Definition of done

All Team matrix rows green; required depth task round-trip passes phone/desktop.

The packet is not done when the new UI merely renders. It is done only when feature parity, route compatibility, interaction/accessibility behavior, viewport acceptance, deterministic/save safety, evidence capture, and rollback proof all pass.
