# WP-19 — League Hub and Dense Data Patterns

## Packet control

| Field | Value |
|---|---|
| Phase | 7 |
| Relative effort | XL |
| Critical-path status | Non-critical-path after prerequisites |
| Dependencies | H1, WP-01–WP-06, WP-12 row primitives |
| Owner gate | H1/H2/H3 only where listed in dependencies or implementation plan |
| Migration rule | Reversible, compatibility-first, no production route removal |

## User problem solved

League feeds/data overlap and dense screens lack question-specific mobile strategies.

## Objective

Create League Overview/Race/News/Stats/Records/Rules plus reusable standings/stat/chart patterns with entity links and accessible data alternatives.

## Scope

- Create League hub with Overview, Race/Standings, News, Stats, Records, and Rules/Governance.
- Resolve overlap among standings, rankings, pulse, newsroom/news/social, analytics, records, and stat central.
- Implement reusable question-specific responsive data patterns and accessible chart alternatives.
- Preserve entity links and origin restoration.

## Explicit non-scope

- No league data/stat calculation change.
- No one-size-fits-all card conversion.
- No chart without textual/table equivalent.

## Exact files to add

- `apps/web/src/ui/screens/league/LeagueHub.tsx`
- `apps/web/src/ui/screens/league/StandingsView.tsx`
- `apps/web/src/ui/screens/league/LeagueNewsView.tsx`
- `apps/web/src/ui/screens/league/StatsRecordsView.tsx`
- `apps/web/src/ui/data/ResponsiveDataView.tsx`
- `apps/web/src/ui/data/ChartFrame.tsx`

## Exact files to modify

- `apps/web/src/features/league/**`
- `apps/web/src/features/league-news/**`
- `apps/web/src/features/standings/**`
- `apps/web/src/features/power-rankings/**`
- `apps/web/src/features/newsroom/**`
- `apps/web/src/features/social/**`
- `apps/web/src/features/analytics/**`
- `apps/web/src/features/stats/**`

## Exact files to delete — only after migration proof

- None in this packet.

A glob in this packet identifies a route cluster, not permission for blind bulk editing. Claude must enumerate the concrete touched files in the progress ledger before committing.

## Relevant symbols and contracts

- `LeagueHub`
- `StandingsView`
- `ResponsiveDataView`
- `ChartFrame`
- `LeagueViewModel`

## Proposed component / module structure

- Each section answers a distinct user question and consumes a pure view model.
- `ResponsiveDataView` selects table, priority row, grouped list, summary/detail, or comparison based on data/job—not width alone.
- `ChartFrame` includes title, takeaway, data table/text alternative, non-color cues, and reduced animation.
- Old feed/data routes map to canonical local sections or deep details.

## Data and state contracts

- Presentation data is derived through pure selectors/presenters or UI-only adapters.
- Existing authoritative mutation functions remain the only commit boundary.
- No new field enters the save schema unless a separately documented protected-contract exception is approved.
- No UI read, sort, animation, or preview may consume simulation RNG.
- Route/UI preference state must be isolated from deterministic engine state.

## CSS and responsive behavior

- Phone standings prioritize rank/team/record/key race signal; details open intentionally.
- Stats/records use filters and entity drill-down rather than all columns.
- Tablet/desktop expose more columns and synchronized detail panes.
- Long feeds paginate/virtualize with retained position.

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

- Early/late/playoff standings
- mobile priorities
- sort/filter
- chart alternatives
- team/game return origin
- old route aliases
- long-list performance.

Also required:

- Unit tests for pure presenter/adapter logic and each error/state branch introduced.
- Component tests for semantics, keyboard, focus, disabled/loading behavior, and state transitions.
- Route compatibility/coverage tests for every route touched.
- Viewport geometry assertions at the smallest relevant phone, compact-height landscape, tablet, and desktop.
- Existing engine/web/design-system tests plus build, bundle, smoke, and release gates according to the packet’s blast radius.

## Manual test script

- Test early season, late race, playoffs, ties, empty/no games, long news history, stat leaders, records, analytics, rules.
- Sort/filter/search and return from team/game/player entities.
- Run chart a11y and non-color checks.
- Measure DOM and route transitions.

## Required before / after screenshots

- League overview.
- Standings phone/desktop.
- News feed.
- Stats/records filter state.
- Accessible chart.

Each screenshot entry must include viewport, state/fixture, route, mode, commit, and the matching geometry measurement. Capture focus, open-sheet/dialog, error, and 200%-zoom states where this packet changes them.

## Performance and bundle checks

- Measure route bundle change and compare against the existing release/bundle gate.
- Avoid mounting hidden heavy legacy and new implementations simultaneously outside controlled migration tests.
- Use memoized selectors/view models only where profiling shows value; do not cache mutable domain objects.
- Large lists must have an explicit DOM/render strategy and a keyboard/focus-safe fallback.

## Risks

- Consolidation can blur editorial feed differences.
- Mobile field priority can hide important tie-break context.
- Chart libraries can inflate bundle or impair accessibility.

## Rollback path

Legacy routes remain available by tab/route wrapper.

Additionally:

- Keep the legacy route/shell/component available until replacement coverage and acceptance gates are green.
- Separate extraction, new implementation, route adoption, and deletion commits so any layer can be reverted independently.
- Never roll back by altering or discarding user saves.

## Suggested atomic commits

- feat(league): add canonical League hub
- feat(data): add responsive dense-data primitives
- feat(league): migrate standings news stats records and rules
- test(league): cover data parity a11y and performance

Each commit must update the progress ledger with checks, screenshots, remaining compatibility behavior, and rollback command/commit.

## Definition of done

Each league question has one canonical section; dense patterns pass phone/desktop/a11y tests.

The packet is not done when the new UI merely renders. It is done only when feature parity, route compatibility, interaction/accessibility behavior, viewport acceptance, deterministic/save safety, evidence capture, and rollback proof all pass.
