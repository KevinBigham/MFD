# WP-02 — Adaptive Viewport and Screen-Archetype Primitives

## Packet control

| Field | Value |
|---|---|
| Phase | 1 |
| Relative effort | L |
| Critical-path status | Critical path |
| Dependencies | WP-00, WP-01 |
| Owner gate | None beyond packet dependencies |
| Migration rule | Reversible, compatibility-first, no production route removal |

## User problem solved

Width-only responsive overrides and permanent fixed clearances produce nested scroll and poor short-height behavior.

## Objective

Create safe-area, dynamic-height, scroll-owner, sticky-action, compact-height, rail/sidebar, and pane primitives used by every new screen archetype.

## Scope

- Create explicit phone, compact-height, tablet, laptop, and wide layout modes.
- Enforce one primary page scroll owner and measured exceptions for contained data panes.
- Implement safe-area, `dvh`, sticky-action, rail/sidebar, pane, and focus-visibility primitives.
- Create reusable archetype wrappers rather than screen-specific viewport hacks.

## Explicit non-scope

- No route migration.
- No feature logic changes.
- No arbitrary device-model branching.

## Exact files to add

- `apps/web/src/ui/layout/AdaptiveViewport.tsx`
- `apps/web/src/ui/layout/AppFrame.tsx`
- `apps/web/src/ui/layout/PageScroll.tsx`
- `apps/web/src/ui/layout/StickyActionDock.tsx`
- `apps/web/src/ui/layout/PaneLayout.tsx`
- `apps/web/src/ui/layout/layout.module.css`
- `apps/web/src/ui/layout/layout.test.tsx`

## Exact files to modify

- `apps/web/src/app/a11y.css`

## Exact files to delete — only after migration proof

- None in this packet.

A glob in this packet identifies a route cluster, not permission for blind bulk editing. Claude must enumerate the concrete touched files in the progress ledger before committing.

## Relevant symbols and contracts

- `AdaptiveViewport`
- `AppFrame`
- `PageScroll`
- `StickyActionDock`
- `PaneLayout`
- `useLayoutMode`

## Proposed component / module structure

- `AdaptiveViewport` owns CSS environment variables and layout-mode measurement.
- `AppFrame` composes global navigation, phase context, content scroll, and optional action dock.
- `PageScroll` is the default single scroll owner.
- `PaneLayout` enables tablet/desktop split views while collapsing to ordered phone content.
- `StickyActionDock` reserves only its measured height plus safe area.

## Data and state contracts

- Presentation data is derived through pure selectors/presenters or UI-only adapters.
- Existing authoritative mutation functions remain the only commit boundary.
- No new field enters the save schema unless a separately documented protected-contract exception is approved.
- No UI read, sort, animation, or preview may consume simulation RNG.
- Route/UI preference state must be isolated from deterministic engine state.

## CSS and responsive behavior

- Phone portrait: single column; bottom navigation; sticky actions above safe area.
- Short landscape: compact header; horizontal local navigation where needed; no forced full-screen decorative regions.
- Tablet: rail plus optional two-pane content.
- Desktop: rail/sidebar selected by available width; content max-width by archetype, not globally.

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

- 320×568 through 1600×1000
- 375 px height
- safe-area emulation
- one-scroll-owner assertion
- focused element not obscured.

Also required:

- Unit tests for pure presenter/adapter logic and each error/state branch introduced.
- Component tests for semantics, keyboard, focus, disabled/loading behavior, and state transitions.
- Route compatibility/coverage tests for every route touched.
- Viewport geometry assertions at the smallest relevant phone, compact-height landscape, tablet, and desktop.
- Existing engine/web/design-system tests plus build, bundle, smoke, and release gates according to the packet’s blast radius.

## Manual test script

- Resize live through every breakpoint; verify no state reset.
- Emulate top/bottom safe areas.
- Open virtual keyboard over a form and focus the final control.
- Inspect 375px height and 200% zoom.
- Use keyboard to traverse sticky controls without occlusion.

## Required before / after screenshots

- Blank shell archetype at each viewport.
- Long task page with sticky dock.
- Collection/detail split pane on tablet and desktop.

Each screenshot entry must include viewport, state/fixture, route, mode, commit, and the matching geometry measurement. Capture focus, open-sheet/dialog, error, and 200%-zoom states where this packet changes them.

## Performance and bundle checks

- Measure route bundle change and compare against the existing release/bundle gate.
- Avoid mounting hidden heavy legacy and new implementations simultaneously outside controlled migration tests.
- Use memoized selectors/view models only where profiling shows value; do not cache mutable domain objects.
- Large lists must have an explicit DOM/render strategy and a keyboard/focus-safe fallback.
- Foundation code is shared widely; treat every dependency and CSS import as a startup/bundle decision.

## Risks

- Multiple wrappers can accidentally create nested `overflow:auto`.
- Sticky docks can obscure anchored/focused content.
- JavaScript width checks can drift from CSS media/container queries.

## Rollback path

New primitives are isolated and removable before shell adoption.

Additionally:

- Keep the legacy route/shell/component available until replacement coverage and acceptance gates are green.
- Separate extraction, new implementation, route adoption, and deletion commits so any layer can be reverted independently.
- Never roll back by altering or discarding user saves.

## Suggested atomic commits

- feat(ui-layout): add adaptive viewport primitives
- feat(ui-layout): add single-scroll and sticky-action contracts
- test(ui-layout): cover safe area and compact height

Each commit must update the progress ledger with checks, screenshots, remaining compatibility behavior, and rollback command/commit.

## Definition of done

All archetype demo states have no unintended overflow/occlusion and expose measured layout mode.

The packet is not done when the new UI merely renders. It is done only when feature parity, route compatibility, interaction/accessibility behavior, viewport acceptance, deterministic/save safety, evidence capture, and rollback proof all pass.
