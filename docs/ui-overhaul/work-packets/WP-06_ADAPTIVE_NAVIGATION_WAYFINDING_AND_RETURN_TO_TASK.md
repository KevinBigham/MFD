# WP-06 — Adaptive Navigation, Wayfinding, and Return-to-Task

## Packet control

| Field | Value |
|---|---|
| Phase | 2 |
| Relative effort | L |
| Critical-path status | Critical path |
| Dependencies | WP-04, WP-05 |
| Owner gate | None beyond packet dependencies |
| Migration rule | Reversible, compatibility-first, no production route removal |

## User problem solved

Four phone feature links plus an overloaded More drawer do not represent the new job-centered IA.

## Objective

Implement Today/Team/Game/Office/League adaptive navigation, expanded Dynasty/System entries, local location labels, origin restoration, and power search integration.

## Scope

- Implement five stable mobile job destinations: Today, Team, Game, Office, League.
- Expose Dynasty and System intentionally through desktop navigation, contextual entry, profile/system menu, search, and emotionally timed events.
- Add current hub/local section labels and a consistent return-to-task affordance.
- Integrate command search as a power tool, not a requirement.

## Explicit non-scope

- No route capability removal.
- No unlabeled icon-only primary navigation.
- No replacement “More” drawer containing the sitemap.

## Exact files to add

- `apps/web/src/ui/navigation/AdaptivePrimaryNav.tsx`
- `apps/web/src/ui/navigation/MobileHubBar.tsx`
- `apps/web/src/ui/navigation/NavigationRail.tsx`
- `apps/web/src/ui/navigation/DesktopSidebar.tsx`
- `apps/web/src/ui/navigation/ReturnToTask.tsx`
- `apps/web/src/ui/navigation/navigation.module.css`

## Exact files to modify

- `apps/web/src/app/MobileBottomTabBar.tsx`
- `apps/web/src/app/hooks/useKeyboard.ts`
- `packages/design-system/components/MfdCommandPalette/MfdCommandPalette.tsx`

## Exact files to delete — only after migration proof

- None in this packet.

A glob in this packet identifies a route cluster, not permission for blind bulk editing. Claude must enumerate the concrete touched files in the progress ledger before committing.

## Relevant symbols and contracts

- `AdaptivePrimaryNav`
- `MobileHubBar`
- `NavigationRail`
- `DesktopSidebar`
- `ReturnToTask`

## Proposed component / module structure

- `AdaptivePrimaryNav` selects `MobileHubBar`, `NavigationRail`, or `DesktopSidebar` by layout mode.
- Each destination carries label, icon, active state, bounded badge, and accessible current-page state.
- `ReturnToTask` uses navigation-origin metadata and shows the task name, not generic “Back.”
- Search results group actions, entities, destinations, help, and recent items.

## Data and state contracts

- Presentation data is derived through pure selectors/presenters or UI-only adapters.
- Existing authoritative mutation functions remain the only commit boundary.
- No new field enters the save schema unless a separately documented protected-contract exception is approved.
- No UI read, sort, animation, or preview may consume simulation RNG.
- Route/UI preference state must be isolated from deterministic engine state.

## CSS and responsive behavior

- Phone: five equal job tabs; labels remain visible; safe-area-aware.
- Short landscape: compact labeled bar/rail without covering primary action.
- Tablet: rail with expanded tooltip/label behavior.
- Desktop: sidebar may expose Dynasty/System but does not list 79 routes.

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

- Five destinations at compact
- rail/sidebar adaptation
- labels/active/badges
- 44/48 targets
- core loop without search
- origin/scroll/focus restoration.

Also required:

- Unit tests for pure presenter/adapter logic and each error/state branch introduced.
- Component tests for semantics, keyboard, focus, disabled/loading behavior, and state transitions.
- Route compatibility/coverage tests for every route touched.
- Viewport geometry assertions at the smallest relevant phone, compact-height landscape, tablet, and desktop.
- Existing engine/web/design-system tests plus build, bundle, smoke, and release gates according to the packet’s blast radius.

## Manual test script

- Complete a weekly loop without search.
- Reach every hub one-handed on phone.
- Enter deep detail and return to original task/filter/scroll.
- Test active/badge states in each phase.
- Use keyboard shortcuts and command search.

## Required before / after screenshots

- Five-tab phone nav.
- Tablet rail.
- Desktop sidebar.
- Return-to-task state.
- Search taxonomy results.

Each screenshot entry must include viewport, state/fixture, route, mode, commit, and the matching geometry measurement. Capture focus, open-sheet/dialog, error, and 200%-zoom states where this packet changes them.

## Performance and bundle checks

- Measure route bundle change and compare against the existing release/bundle gate.
- Avoid mounting hidden heavy legacy and new implementations simultaneously outside controlled migration tests.
- Use memoized selectors/view models only where profiling shows value; do not cache mutable domain objects.
- Large lists must have an explicit DOM/render strategy and a keyboard/focus-safe fallback.
- Foundation code is shared widely; treat every dependency and CSS import as a startup/bundle decision.

## Risks

- Badge overload can recreate equal-priority noise.
- Five phone labels can truncate at 320px.
- Origin restoration can become stale after state/phase changes.

## Rollback path

Legacy bar remains in legacy shell; new navigation removable behind mode.

Additionally:

- Keep the legacy route/shell/component available until replacement coverage and acceptance gates are green.
- Separate extraction, new implementation, route adoption, and deletion commits so any layer can be reverted independently.
- Never roll back by altering or discarding user saves.

## Suggested atomic commits

- feat(navigation): add job-centered adaptive primary nav
- feat(navigation): add wayfinding and return-to-task
- feat(command): align search with route surface taxonomy
- test(navigation): cover touch keyboard and origin restoration

Each commit must update the progress ledger with checks, screenshots, remaining compatibility behavior, and rollback command/commit.

## Definition of done

No all-route More drawer in new shell; five jobs stable at every viewport; Dynasty/System deliberately reachable.

The packet is not done when the new UI merely renders. It is done only when feature parity, route compatibility, interaction/accessibility behavior, viewport acceptance, deterministic/save safety, evidence capture, and rollback proof all pass.
