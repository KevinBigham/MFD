# WP-13 — Player Entity Detail and Comparison

## Packet control

| Field | Value |
|---|---|
| Phase | 4 |
| Relative effort | L |
| Critical-path status | Non-critical-path after prerequisites |
| Dependencies | WP-12, WP-04 |
| Owner gate | None beyond packet dependencies |
| Migration rule | Reversible, compatibility-first, no production route removal |

## User problem solved

Player drill-down and comparison do not share a consistent entity/local-tab/origin model.

## Objective

Create canonical player detail tabs and comparison flow preserving roster/task/trade origins.

## Scope

- Create one canonical player entity route/detail with Overview, Skills/Development, Contract, Health, History/Stats, and contextual Actions as applicable.
- Add consistent entity header and local navigation.
- Build accessible comparison from roster/depth/trade/market contexts.
- Restore exact origin, selected tab, filter, and focus.

## Explicit non-scope

- No player data schema change.
- No duplicate profile variants per originating feature.
- No mutation in comparison/presenter.

## Exact files to add

- `apps/web/src/ui/screens/player/PlayerDetailScreen.tsx`
- `apps/web/src/ui/screens/player/PlayerHeader.tsx`
- `apps/web/src/ui/screens/player/PlayerLocalNav.tsx`
- `apps/web/src/ui/screens/player/PlayerComparison.tsx`
- `apps/web/src/ui/screens/player/player-presenter.ts`

## Exact files to modify

- `apps/web/src/features/player/PlayerProfile.tsx`

## Exact files to delete — only after migration proof

- None in this packet.

A glob in this packet identifies a route cluster, not permission for blind bulk editing. Claude must enumerate the concrete touched files in the progress ledger before committing.

## Relevant symbols and contracts

- `PlayerDetailScreen`
- `PlayerViewModel`
- `PlayerComparison`
- `PlayerActionContext`

## Proposed component / module structure

- `PlayerViewModel` normalizes status and available sections.
- `PlayerActionContext` limits actions based on origin/phase while reusing existing authoritative actions.
- Local tabs have deep-linkable identifiers.
- `PlayerComparison` aligns comparable fields and explains unavailable/noncomparable values.

## Data and state contracts

- Presentation data is derived through pure selectors/presenters or UI-only adapters.
- Existing authoritative mutation functions remain the only commit boundary.
- No new field enters the save schema unless a separately documented protected-contract exception is approved.
- No UI read, sort, animation, or preview may consume simulation RNG.
- Route/UI preference state must be isolated from deterministic engine state.

## CSS and responsive behavior

- Phone: compact identity/status header; scrollable labeled local nav; summary-first sections.
- Tablet: detail with contextual side actions.
- Desktop: two-column summary/detail when useful.
- Comparison uses stacked category sections on phone and aligned columns on larger screens.

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

- Roster/depth/trade/stat origins
- injured/prospect/retired/practice states
- tab deep links
- comparison
- focus/scroll restoration.

Also required:

- Unit tests for pure presenter/adapter logic and each error/state branch introduced.
- Component tests for semantics, keyboard, focus, disabled/loading behavior, and state transitions.
- Route compatibility/coverage tests for every route touched.
- Viewport geometry assertions at the smallest relevant phone, compact-height landscape, tablet, and desktop.
- Existing engine/web/design-system tests plus build, bundle, smoke, and release gates according to the packet’s blast radius.

## Manual test script

- Open active, injured, prospect, practice-squad, free-agent, traded, retired, and historical players.
- Enter from each origin and return.
- Deep-link each tab.
- Compare 2–4 players and change candidates.
- Run actions and verify legacy parity.

## Required before / after screenshots

- Player overview phone/desktop.
- Contract/health state.
- Comparison phone/desktop.
- Historical/retired state.

Each screenshot entry must include viewport, state/fixture, route, mode, commit, and the matching geometry measurement. Capture focus, open-sheet/dialog, error, and 200%-zoom states where this packet changes them.

## Performance and bundle checks

- Measure route bundle change and compare against the existing release/bundle gate.
- Avoid mounting hidden heavy legacy and new implementations simultaneously outside controlled migration tests.
- Use memoized selectors/view models only where profiling shows value; do not cache mutable domain objects.
- Large lists must have an explicit DOM/render strategy and a keyboard/focus-safe fallback.

## Risks

- One detail route can expose actions inappropriate to origin/phase.
- Local tab URLs can break legacy deep links if aliases are incomplete.
- Comparison may encourage misleading cross-position values.

## Rollback path

Compatibility wrapper renders legacy profile when new presenter unsupported.

Additionally:

- Keep the legacy route/shell/component available until replacement coverage and acceptance gates are green.
- Separate extraction, new implementation, route adoption, and deletion commits so any layer can be reverted independently.
- Never roll back by altering or discarding user saves.

## Suggested atomic commits

- feat(player): add canonical player presenter and detail
- feat(player): add local navigation and origin restoration
- feat(player): add accessible comparison
- test(player): cover states actions and deep links

Each commit must update the progress ledger with checks, screenshots, remaining compatibility behavior, and rollback command/commit.

## Definition of done

One canonical player entity; all old player actions/history accounted for; return origin exact.

The packet is not done when the new UI merely renders. It is done only when feature parity, route compatibility, interaction/accessibility behavior, viewport acceptance, deterministic/save safety, evidence capture, and rollback proof all pass.
