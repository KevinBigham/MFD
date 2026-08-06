# WP-18 — Game Hub and Unified Game Center

## Packet control

| Field | Value |
|---|---|
| Phase | 5 |
| Relative effort | XL |
| Critical-path status | Non-critical-path after prerequisites |
| Dependencies | H1, WP-04–WP-07, WP-10 |
| Owner gate | H1/H2/H3 only where listed in dependencies or implementation plan |
| Migration rule | Reversible, compatibility-first, no production route removal |

## User problem solved

Preparation and one game’s broadcast, presentation, plays, flow, film, recap, and schedule context are fragmented.

## Objective

Create Game Hub and canonical game-ID Game Center with local tabs, persistent score/context, pre/live/post states, and old-route aliases.

## Scope

- Create Game Hub for opponent, preparation, schedule, and current/next game.
- Create one game-ID Game Center with Summary, Broadcast, Play-by-Play, Flow, Film, and contextually available tabs.
- Preserve pregame/live/halftime/final/replay states and every existing view capability.
- Keep score/opponent/game identity persistent while switching views.

## Explicit non-scope

- No game outcome, play simulation, presentation event ordering, or RNG change.
- No forced landscape for ordinary management.
- No deletion of old game URLs before alias proof.

## Exact files to add

- `apps/web/src/ui/screens/game/GameHub.tsx`
- `apps/web/src/ui/screens/game/GameCenter.tsx`
- `apps/web/src/ui/screens/game/GameScoreHeader.tsx`
- `apps/web/src/ui/screens/game/game-center-presenter.ts`
- `apps/web/src/ui/screens/game/game.module.css`

## Exact files to modify

- `apps/web/src/features/game-plan/**`
- `apps/web/src/features/game-day/**`
- `apps/web/src/features/broadcast/**`
- `apps/web/src/features/film-room/**`
- `apps/web/src/features/schedule/**`

## Exact files to delete — only after migration proof

- None in this packet.

A glob in this packet identifies a route cluster, not permission for blind bulk editing. Claude must enumerate the concrete touched files in the progress ledger before committing.

## Relevant symbols and contracts

- `GameHub`
- `GameCenter`
- `GameCenterTab`
- `GameCenterViewModel`
- `GameScoreHeader`

## Proposed component / module structure

- `GameCenterViewModel` reads immutable game data and available presentation sections.
- `GameScoreHeader` persists essential score/clock/status/context.
- Each old route becomes a deep link/compatibility wrapper to a Game Center tab/state.
- Launch/sim actions remain existing authoritative mutations.
- Game Center returns to Game Hub/Today with consequences surfaced.

## Data and state contracts

- Presentation data is derived through pure selectors/presenters or UI-only adapters.
- Existing authoritative mutation functions remain the only commit boundary.
- No new field enters the save schema unless a separately documented protected-contract exception is approved.
- No UI read, sort, animation, or preview may consume simulation RNG.
- Route/UI preference state must be isolated from deterministic engine state.

## CSS and responsive behavior

- Phone portrait supports summary, play feed, and film insights; local tabs are labeled and scrollable.
- Landscape enhances broadcast/flow but is optional unless existing content truly requires it.
- Tablet/desktop support score header plus content/insight panes.
- Animations honor reduced motion and avoid flashing.

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

- Pregame/live/halftime/final/replay
- tab deep links
- no game-context loss
- phone landscape/touch
- reduced motion
- old route resolution
- game outcome parity.

Also required:

- Unit tests for pure presenter/adapter logic and each error/state branch introduced.
- Component tests for semantics, keyboard, focus, disabled/loading behavior, and state transitions.
- Route compatibility/coverage tests for every route touched.
- Viewport geometry assertions at the smallest relevant phone, compact-height landscape, tablet, and desktop.
- Existing engine/web/design-system tests plus build, bundle, smoke, and release gates according to the packet’s blast radius.

## Manual test script

- Test pregame, simulated game, live/interactive state where supported, halftime, final, replay, missing data, and historical game.
- Switch every tab and deep link.
- Rotate mid-view.
- Compare game state/outcome/event order with legacy.
- Return to Today and Schedule.

## Required before / after screenshots

- Game Hub.
- Pregame Game Center.
- Final summary.
- Play-by-play/flow/film tabs.
- Phone landscape broadcast.

Each screenshot entry must include viewport, state/fixture, route, mode, commit, and the matching geometry measurement. Capture focus, open-sheet/dialog, error, and 200%-zoom states where this packet changes them.

## Performance and bundle checks

- Measure route bundle change and compare against the existing release/bundle gate.
- Avoid mounting hidden heavy legacy and new implementations simultaneously outside controlled migration tests.
- Use memoized selectors/view models only where profiling shows value; do not cache mutable domain objects.
- Large lists must have an explicit DOM/render strategy and a keyboard/focus-safe fallback.

## Risks

- Combining routes can accidentally keep several heavy views mounted.
- Game identity can drift when moving between current and historical games.
- Presentation refactor can subtly alter event sequencing.

## Rollback path

Each old game route remains a compatibility wrapper to legacy/new tab.

Additionally:

- Keep the legacy route/shell/component available until replacement coverage and acceptance gates are green.
- Separate extraction, new implementation, route adoption, and deletion commits so any layer can be reverted independently.
- Never roll back by altering or discarding user saves.

## Suggested atomic commits

- feat(game): add phase-aware Game Hub
- feat(game-center): add canonical game entity and score header
- feat(game-center): migrate broadcast play flow and film tabs
- test(game): prove outcome event and deep-link parity

Each commit must update the progress ledger with checks, screenshots, remaining compatibility behavior, and rollback command/commit.

## Definition of done

One game ID carries every view; start/review/return loop passes; no simulation changes.

The packet is not done when the new UI merely renders. It is done only when feature parity, route compatibility, interaction/accessibility behavior, viewport acceptance, deterministic/save safety, evidence capture, and rollback proof all pass.
