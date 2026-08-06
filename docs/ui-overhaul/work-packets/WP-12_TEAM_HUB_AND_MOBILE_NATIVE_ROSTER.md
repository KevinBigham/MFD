# WP-12 — Team Hub and Mobile-Native Roster

## Packet control

| Field | Value |
|---|---|
| Phase | 4 |
| Relative effort | XL |
| Critical-path status | Non-critical-path after prerequisites |
| Dependencies | H1, WP-01–WP-06 |
| Owner gate | H1/H2/H3 only where listed in dependencies or implementation plan |
| Migration rule | Reversible, compatibility-first, no production route removal |

## User problem solved

Team systems are scattered and Roster reaches fourteen phone screens through generic card conversion.

## Objective

Create Team hub and purpose-built responsive Roster collection with position groups, prioritized fields, filters, compare tray, and preserved entity origin.

## Scope

- Create Team hub overview and canonical Roster collection.
- Build position-group navigation, prioritized mobile row fields, sort/filter/search, density, selection, compare tray, and entity links.
- Preserve all roster actions and current player context.
- Use virtualization/pagination only at measured thresholds.

## Explicit non-scope

- Do not render every desktop field as a giant mobile card.
- Do not remove advanced fields; defer them to detail/expanded row/column chooser.
- Do not change roster rules.

## Exact files to add

- `apps/web/src/ui/screens/team/TeamHub.tsx`
- `apps/web/src/ui/screens/team/RosterScreen.tsx`
- `apps/web/src/ui/screens/team/PlayerRow.tsx`
- `apps/web/src/ui/screens/team/roster-presenter.ts`
- `apps/web/src/ui/screens/team/team.module.css`

## Exact files to modify

- `apps/web/src/features/roster/RosterManagement.tsx`

## Exact files to delete — only after migration proof

- None in this packet.

A glob in this packet identifies a route cluster, not permission for blind bulk editing. Claude must enumerate the concrete touched files in the progress ledger before committing.

## Relevant symbols and contracts

- `TeamHub`
- `RosterScreen`
- `RosterViewModel`
- `PlayerRow`
- `RosterFilterState`

## Proposed component / module structure

- `roster-presenter` converts selectors to stable row/group/filter view models.
- `RosterScreen` owns collection state and URL/shareable filters where appropriate.
- `PlayerRow` uses semantic slots: identity, role/status, essential ratings, contract/injury signal, contextual actions.
- Compare tray is explicit and recoverable; it never changes roster state.

## Data and state contracts

- Presentation data is derived through pure selectors/presenters or UI-only adapters.
- Existing authoritative mutation functions remain the only commit boundary.
- No new field enters the save schema unless a separately documented protected-contract exception is approved.
- No UI read, sort, animation, or preview may consume simulation RNG.
- Route/UI preference state must be isolated from deterministic engine state.

## CSS and responsive behavior

- Phone: grouped rows with 2–4 prioritized values and tap-to-detail; filters in sheet.
- Tablet: denser rows and optional detail pane.
- Desktop: accessible table/list hybrid with sticky header and user column preferences.
- Compact density reduces spacing, not target size for actions.

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

- 53/expanded roster fixtures
- filters/sort/group
- phone priorities
- virtualization threshold
- player return
- 320/390/tablet/desktop
- compact/coarse pointer.

Also required:

- Unit tests for pure presenter/adapter logic and each error/state branch introduced.
- Component tests for semantics, keyboard, focus, disabled/loading behavior, and state transitions.
- Route compatibility/coverage tests for every route touched.
- Viewport geometry assertions at the smallest relevant phone, compact-height landscape, tablet, and desktop.
- Existing engine/web/design-system tests plus build, bundle, smoke, and release gates according to the packet’s blast radius.

## Manual test script

- Test normal, expanded, injured-heavy, practice-squad, empty filter, and long-history rosters.
- Sort/filter/search/group and restore origin.
- Select compare candidates.
- Measure DOM count and scroll length.
- Complete every legacy roster action.

## Required before / after screenshots

- Team overview.
- Phone roster default/filter/compare.
- Tablet split view.
- Desktop data view.
- Empty/no-result state.

Each screenshot entry must include viewport, state/fixture, route, mode, commit, and the matching geometry measurement. Capture focus, open-sheet/dialog, error, and 200%-zoom states where this packet changes them.

## Performance and bundle checks

- Measure route bundle change and compare against the existing release/bundle gate.
- Avoid mounting hidden heavy legacy and new implementations simultaneously outside controlled migration tests.
- Use memoized selectors/view models only where profiling shows value; do not cache mutable domain objects.
- Large lists must have an explicit DOM/render strategy and a keyboard/focus-safe fallback.

## Risks

- Presenter may copy mutable player objects.
- Virtualization can break focus/return anchors.
- Advanced fields can become undiscoverable without explicit detail/column strategy.

## Rollback path

Old `/roster` wrapper remains available through compatibility mapping.

Additionally:

- Keep the legacy route/shell/component available until replacement coverage and acceptance gates are green.
- Separate extraction, new implementation, route adoption, and deletion commits so any layer can be reverted independently.
- Never roll back by altering or discarding user saves.

## Suggested atomic commits

- feat(team): add Team hub and roster presenter
- feat(roster): add responsive roster collection and rows
- feat(roster): add filters comparison and origin restoration
- test(roster): cover parity performance and viewport behavior

Each commit must update the progress ledger with checks, screenshots, remaining compatibility behavior, and rollback command/commit.

## Definition of done

Roster is bounded and scannable; no generic all-field cards; all existing roster actions reachable.

The packet is not done when the new UI merely renders. It is done only when feature parity, route compatibility, interaction/accessibility behavior, viewport acceptance, deterministic/save safety, evidence capture, and rollback proof all pass.
