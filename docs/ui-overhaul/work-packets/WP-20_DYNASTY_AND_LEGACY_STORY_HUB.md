# WP-20 — Dynasty and Legacy Story Hub

## Packet control

| Field | Value |
|---|---|
| Phase | 7 |
| Relative effort | XL |
| Critical-path status | Non-critical-path after prerequisites |
| Dependencies | WP-07, WP-18, WP-19 |
| Owner gate | None beyond packet dependencies |
| Migration rule | Reversible, compatibility-first, no production route removal |

## User problem solved

Twenty-three legacy routes hide emotional payoff in an archive directory.

## Objective

Create Story/People/Honors/Seasons/Records/Scenarios hub, durable artifacts, and event-driven entry points while preserving every archive route/detail.

## Scope

- Create Dynasty hub sections for Story, People, Honors, Seasons, Records, and Scenarios.
- Map all 23 legacy routes to canonical sections/details.
- Create durable artifacts/timeline entries and event-driven discovery for emotionally relevant moments.
- Preserve historical details, deep links, and long-running dynasty performance.

## Explicit non-scope

- No rewriting dynasty history/content generation.
- No loss of niche archive capability.
- No forced interruption for every artifact.

## Exact files to add

- `apps/web/src/ui/screens/dynasty/DynastyHub.tsx`
- `apps/web/src/ui/screens/dynasty/LegacyArtifact.tsx`
- `apps/web/src/ui/screens/dynasty/DynastyTimeline.tsx`
- `apps/web/src/ui/screens/dynasty/dynasty-presenter.ts`

## Exact files to modify

- `apps/web/src/features/franchise/**`
- `apps/web/src/features/legacy/**`
- `apps/web/src/features/dynasty-era/**`
- `apps/web/src/features/season/**`
- `apps/web/src/features/playoffs/**`
- `apps/web/src/features/scenario/**`

## Exact files to delete — only after migration proof

- None in this packet.

A glob in this packet identifies a route cluster, not permission for blind bulk editing. Claude must enumerate the concrete touched files in the progress ledger before committing.

## Relevant symbols and contracts

- `DynastyHub`
- `LegacyArtifact`
- `DynastyTimeline`
- `DynastyViewModel`

## Proposed component / module structure

- `DynastyViewModel` groups existing records/artifacts by meaning and chronology.
- `LegacyArtifact` provides one detail shell for award, game, person, era, season, trophy, record, and story types.
- Event/overlay requests link to durable artifacts.
- The hub uses curated highlights plus search/filter, not 23 equal cards.

## Data and state contracts

- Presentation data is derived through pure selectors/presenters or UI-only adapters.
- Existing authoritative mutation functions remain the only commit boundary.
- No new field enters the save schema unless a separately documented protected-contract exception is approved.
- No UI read, sort, animation, or preview may consume simulation RNG.
- Route/UI preference state must be isolated from deterministic engine state.

## CSS and responsive behavior

- Phone shows current era/story highlights and chronological groups.
- Tablet/desktop can use timeline plus detail pane.
- Long histories paginate/virtualize and preserve anchors.
- Cinematic entries degrade to static readable cards under reduced motion.

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

- First-season empty
- record, award, named game, retirement, championship, era transition
- artifact links
- old route aliases
- long history performance.

Also required:

- Unit tests for pure presenter/adapter logic and each error/state branch introduced.
- Component tests for semantics, keyboard, focus, disabled/loading behavior, and state transitions.
- Route compatibility/coverage tests for every route touched.
- Viewport geometry assertions at the smallest relevant phone, compact-height landscape, tablet, and desktop.
- Existing engine/web/design-system tests plus build, bundle, smoke, and release gates according to the packet’s blast radius.

## Manual test script

- Test empty first season, award, record, named game, retirement, Hall of Fame, championship, season recap, era transition, bloodline/lore, scenarios.
- Open every old legacy route.
- Navigate event → artifact → related entity → return.
- Load multi-decade fixture and measure.

## Required before / after screenshots

- Dynasty overview.
- Timeline.
- Award/game/person artifact.
- Season/era view.
- Empty first-season state.

Each screenshot entry must include viewport, state/fixture, route, mode, commit, and the matching geometry measurement. Capture focus, open-sheet/dialog, error, and 200%-zoom states where this packet changes them.

## Performance and bundle checks

- Measure route bundle change and compare against the existing release/bundle gate.
- Avoid mounting hidden heavy legacy and new implementations simultaneously outside controlled migration tests.
- Use memoized selectors/view models only where profiling shows value; do not cache mutable domain objects.
- Large lists must have an explicit DOM/render strategy and a keyboard/focus-safe fallback.

## Risks

- Grouping can erase subtle distinctions between archive features.
- Event-driven surfacing can become interruption overload.
- Large historical media/data can hurt memory and render time.

## Rollback path

Legacy detail routes stay intact; hub/event entries can be disabled independently.

Additionally:

- Keep the legacy route/shell/component available until replacement coverage and acceptance gates are green.
- Separate extraction, new implementation, route adoption, and deletion commits so any layer can be reverted independently.
- Never roll back by altering or discarding user saves.

## Suggested atomic commits

- feat(dynasty): add story-first hub and presenter
- feat(dynasty): add durable legacy artifact shell
- feat(dynasty): connect event-driven discovery
- test(dynasty): prove 23-route coverage and long-history performance

Each commit must update the progress ledger with checks, screenshots, remaining compatibility behavior, and rollback command/commit.

## Definition of done

23/23 legacy rows have a canonical section/detail and emotionally timed entry.

The packet is not done when the new UI merely renders. It is done only when feature parity, route compatibility, interaction/accessibility behavior, viewport acceptance, deterministic/save safety, evidence capture, and rollback proof all pass.
