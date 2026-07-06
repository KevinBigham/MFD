# Goal Progress - UI/UX Command Shell Pass

Date: 2026-05-21

# Goal Progress - UI/UX Convergence Marathon

Date: 2026-07-05

## Milestone 1 - Mission packet and live state verification

Files changed:
- `.logs/goal-progress.md`

Checks run:
- Read `/Users/kevin/Downloads/MFD/MISSION.md`, `AGENTS.md`, `CODEX_GOAT_MARATHON_PROMPT.md`, `CODEX_FINISH_GAME_MARATHON_PROMPT.md`, `CODEX_RELEASE_CONVERGENCE_GOAL_PROMPT.md`, `RELEASE_CONVERGENCE.md`, `CODEX_GAME_GUIDE.md`, `STATUS.md`, `DESIGN.md`, and `docs/release/KEVIN_PLAYTEST_SCRIPT.md:74-91`.
- Confirmed the mission file lives one directory above the repo at `/Users/kevin/Downloads/MFD/MISSION.md`; assumption: use that file as the complete spec and keep repo edits under `/Users/kevin/Downloads/MFD/MFD-main`.
- Confirmed `SAVE_VERSION = 36` in `packages/engine/src/config/difficulty.ts`; no save/schema/RNG/engine edits are allowed for this run.
- Confirmed this extracted checkout has no `.git` directory, so commit/PR ceremony is unavailable but implementation and verification can continue.
- Confirmed root `package.json` pins `pnpm@9.15.9` and `corepack pnpm --version` returns `9.15.9`.
- Confirmed `apps/web/dist/index.html` exists.
- Confirmed `RELEASE_CONVERGENCE.md` currently lists G1-G5 GREEN, G6 GREEN with 48-route DOM/console visual diagnostics rather than real screenshot review, and G7 YELLOW for full release-gate/remote CI proof.
- Confirmed no Tailwind or PostCSS config files are present; `packages/design-system/tokens/index.css` is a single `:root` 8-bit ESPN token palette imported by `apps/web/src/main.tsx`.
- Recounted navigation live from `apps/web/src/app/App.tsx`: 81 registered routes, 56 `NAV_ITEMS`, and 25 direct-only routes. This drifts from the mission paragraph's older 86/54 wording but preserves the same direct-only route count and navigation-overload problem.

Result:
- Verification complete. Phase 1 will consume the existing exported engine navigation-unlock helpers in the web shell, remove the 32-player command-palette cap, and make every current direct-only route either discoverable in an existing nav group or explicitly documented as contextual-only without changing `packages/engine`, `GameState`, `SAVE_VERSION`, or RNG.

## Milestone 2 - Phase 1 navigation and onboarding convergence

Files changed:
- `apps/web/src/app/App.tsx`
- `apps/web/src/app/App.test.tsx`
- `apps/web/src/app/nav-items.test.ts`
- `apps/web/src/features/tutorial/TutorialCoverage.test.tsx`
- `apps/web/src/features/route-coaching/useActiveRouteBeats.test.ts`
- `.logs/goal-progress.md`

Changes shipped:
- Added existing nav homes for every static route that was previously direct-only: coaching tree/relationships, player development/compare/rivalries, trade deadline, draft recap, expansion draft, franchise archive routes, legacy named games/bloodlines, season recap, relocation, and league weather.
- Left only `/player/$playerId` and `/player/$playerId/timeline` direct-only, with documented reasons: they require a concrete saved player id from a roster/search/profile link.
- Wired `getNavUnlockStatus` from `@mfd/engine/config` into desktop nav, mobile drawer, route shortcuts, hotkey help, and command-palette screen results. Existing engine unlock metadata now hides locked routes from ordinary navigation until week/phase context opens them, while active direct-link routes still remain navigable.
- Removed the command-palette roster-player cap by deleting the old `.slice(0, 32)`, so all rostered players can be found.
- Added a compact desktop `LATER` row for the selected group when engine-locked routes are hidden.
- Updated source guards, tutorial allowlists, and route-coaching coverage to match the new discoverability contract.

Checks run:
- Passed: `corepack pnpm --filter @mfd/web test -- --run src/app/nav-items.test.ts src/features/tutorial/TutorialCoverage.test.tsx src/features/route-coaching/useActiveRouteBeats.test.ts` (3 files / 32 tests).
- Passed after updating intentional source guards: `corepack pnpm --filter @mfd/web test -- --run src/app/App.test.tsx src/app/nav-items.test.ts src/features/tutorial/TutorialCoverage.test.tsx src/features/route-coaching/useActiveRouteBeats.test.ts` (4 files / 88 tests).
- Passed: `corepack pnpm --filter @mfd/web typecheck`.
- Passed: `VITE_CHIP_ENABLED=true corepack pnpm --filter @mfd/web build` with the existing non-blocking Vite large-chunk warning.
- Passed after rerun with Vite-bin fallback: `VITE_CHIP_ENABLED=true PNPM_BIN=__missing_pnpm__ SMOKE_FULL_SETUP_COMPLETE=1 SMOKE_TIMEOUT_MS=180000 node scripts/smoke-test-post-setup-route.mjs`; it completed normal Full Setup from cleared storage, reached playable Year 1 preseason Week 1, persisted the first-ten marker, and saw no browser errors.
- Failed environmental first attempt: the same full-setup smoke without `PNPM_BIN=__missing_pnpm__` exited before app launch because the harness-selected bundled `pnpm` tried an interactive `node_modules` purge. No app code failed in that attempt.
- Recounted current navigation after the patch: 81 registered routes, 79 `NAV_ITEMS`, and 2 direct-only dynamic player routes.

Result:
- Phase 1 complete. The nav surface now consumes existing engine unlock status, the command palette searches all roster players, and all static routes have an in-app discovery path. No engine, save schema, `SAVE_VERSION`, RNG, or `GameState` changes were made.

## Milestone 3 - Phase 2 component and copy consolidation

Files changed:
- `packages/design-system/components/MfdBadge/MfdBadge.tsx`
- `packages/design-system/components/MfdDialog/MfdDialog.tsx`
- `packages/design-system/components/MfdTable/MfdTable.tsx`
- `apps/web/src/features/monday-briefing/ActionCenter.tsx`
- `apps/web/src/app/store/game-store.ts`
- `apps/web/src/features/team-needs/TeamNeeds.tsx`
- `apps/web/src/features/team-needs/TeamNeeds.test.tsx`
- `apps/web/src/features/coaching/CoachingStaff.tsx`
- `apps/web/src/features/coaching/CoachingStaff.test.tsx`
- `apps/web/src/features/depth-chart/DepthChart.tsx`
- `apps/web/src/features/depth-chart/DepthChart.test.tsx`
- `.logs/goal-progress.md`

Changes shipped:
- Collapsed duplicate design-system implementations for badge, dialog, and table. The public `MfdBadge`, `MfdDialog`, and `MfdTable` export names remain as compatibility wrappers, but they now render through `PixelBadge`, `PixelModal`, and `PixelTable`.
- Migrated the last app call site from `MfdDialog` to `PixelModal` in Monday Briefing's AGM recommendations modal.
- Added `actions.refreshTeamNeedsReport(teamId?)` in `apps/web` to rebuild an existing `teamNeedsCache` entry from current roster/team context without engine edits, save-schema changes, RNG, or `SAVE_VERSION` movement.
- Added Team Needs `Refresh Board` and `Refresh Compare` controls and replaced cache/source-provenance paragraphs with player-facing command-center copy.
- Rewrote the named Coaching and Depth Chart source-copy panels into in-world command-center language while keeping explicit action boundaries.
- Replaced Depth Chart's naive total-starter indicator with a position-by-position readout from existing engine `STARTER_SLOTS`; decision note: use the engine-owned slot map as the formation-validity source rather than inventing web-only football rules.

Checks run:
- Passed: `corepack pnpm --filter @mfd/web test -- --run src/features/team-needs/TeamNeeds.test.tsx src/features/coaching/CoachingStaff.test.tsx src/features/depth-chart/DepthChart.test.tsx src/features/monday-briefing/ActionCenter.test.tsx` (4 files / 29 tests).
- Passed: `corepack pnpm --filter @mfd/design-system test -- --run components/PixelTable/PixelTable.test.tsx components/MfdCommandPalette/MfdCommandPalette.test.tsx` (2 files / 9 tests).
- Passed: `corepack pnpm --filter @mfd/web typecheck`.

Result:
- Phase 2 complete. Component duplication is consolidated behind Pixel implementations, Team Needs has a real refresh path, and the named technical/source-copy surfaces now read like usable football UI. No `packages/engine`, `GameState`, save-schema, RNG, or `SAVE_VERSION` changes were made.

## Milestone 4 - Phase 3 passive-screen activation and inbox convergence

Files changed:
- `apps/web/src/features/legacy/LegacyTimeline.tsx`
- `apps/web/src/features/legacy/LegacyTimeline.test.tsx`
- `apps/web/src/features/franchise/TrophyRoom.tsx`
- `apps/web/src/features/franchise/TrophyRoom.test.tsx`
- `apps/web/src/features/playoffs/PlayoffLoreDirectory.tsx`
- `apps/web/src/features/playoffs/PlayoffLoreDirectory.test.tsx`
- `apps/web/src/features/franchise/RookieOfYearHistory.tsx`
- `apps/web/src/features/franchise/RookieOfYearHistory.test.tsx`
- `apps/web/src/features/inbox/buildInboxMessages.ts`
- `apps/web/src/features/inbox/buildInboxMessages.test.ts`
- `apps/web/src/features/inbox/InboxTriage.tsx`
- `apps/web/src/features/inbox/InboxTriage.test.tsx`
- `.logs/goal-progress.md`

Changes shipped:
- Added living-game CTAs to passive archive routes: Legacy now routes to current standings, Trophy Room routes to standings/schedule/game plan in empty and populated states, Playoff Lore routes to standings/schedule/game plan, and Rookie of the Year history routes to scouting/draft/player development.
- Consumed existing saved `game.ownerPersonalityInbox` in `/inbox` by projecting recent owner personality events into Ownership messages with owner-room CTAs, signed mood/morale deltas, consequences, unread display state, and action-required classification for negative deltas.
- Updated Inbox source rows so they no longer claim owner personality events are unused. They now state the actual boundary: owner events are saved and consumed, while generated read flags are display hints only.
- Audited localStorage-only state under `apps/web`: Chip onboarding/read receipts/dock state and route-coaching receipts are UI assistant preferences; first-ten/setup prelude markers are setup UX markers; ghost broadcast preferences are view preferences; dynasty sidecars are export/import-backed archive sidecars; global Watch List pins use `mfd.watchlist.v1`.

Scope-fenced decisions:
- Skipped durable Inbox read-receipt persistence because no saved `GameState` field exists for generated inbox message read state; adding it would require engine/save-schema migration and violates this mission's scope fence.
- Skipped moving the global Watch List pin board into save-backed state because the existing saved watchlists are semantically narrower (`offseasonState.scoutingWatchlist` and `faTargetBoard.watchlist`). A true cross-roster/free-agent/prospect/archive pin list would require a new `GameState` field, so the browser-local board remains explicit sidecar UI state.

Checks run:
- Passed: `corepack pnpm --filter @mfd/web test -- --run src/features/inbox/InboxTriage.test.tsx src/features/inbox/buildInboxMessages.test.ts src/features/legacy/LegacyTimeline.test.tsx src/features/franchise/TrophyRoom.test.tsx src/features/playoffs/PlayoffLoreDirectory.test.tsx src/features/franchise/RookieOfYearHistory.test.tsx` (6 files / 46 tests).
- Passed: `corepack pnpm --filter @mfd/web typecheck`.

Result:
- Phase 3 complete. Passive archive screens now point back into live gameplay, Inbox consumes the existing saved owner mailbox, and schema-crossing persistence requests were deliberately skipped rather than smuggled into `localStorage` or `packages/engine`. No `packages/engine`, `GameState`, save-schema, RNG, or `SAVE_VERSION` changes were made.

## Milestone 5 - Phase 4 full-route visual sweep

Files changed:
- `.logs/g6-visual-sweep.mjs`
- `.logs/screenshots/g6-full-route-sweep/*.png`
- `.logs/screenshots/g6-full-route-sweep/summary.json`
- `.logs/screenshots/g6-full-route-sweep/review.md`
- `.logs/goal-progress.md`

Changes shipped:
- Added a `.logs`-scoped visual sweep runner instead of changing out-of-scope `scripts/`. The runner launches the built production preview, clears browser storage/IndexedDB, opens the convention demo save, emulates `prefers-reduced-motion: reduce`, and captures the full current registered route set.
- Covered all 79 static `NAV_ITEMS` routes plus the 2 dynamic player routes by discovering `/player/afce1-qb-1` from the demo roster and deriving `/player/afce1-qb-1/timeline`.
- Generated raw screenshots and contact sheets for 1366x900 desktop and 480x900 (`BREAKPOINTS.sm`) review.

Checks run:
- Passed: `VITE_CHIP_ENABLED=true corepack pnpm --filter @mfd/web build` with the existing non-blocking Vite large-chunk warning.
- Passed: `SMOKE_TIMEOUT_MS=60000 node .logs/g6-visual-sweep.mjs` (162 route screenshots, 81/81 registered routes, 0 browser errors, 0px max horizontal overflow, reduced-motion emulated on every route).
- Reviewed: `.logs/screenshots/g6-full-route-sweep/contact-desktop.png` and `.logs/screenshots/g6-full-route-sweep/contact-sm-480.png`.
- Passed after environmental reruns: `corepack pnpm -r typecheck`. The initial `corepack pnpm typecheck` root script failed because its nested bare `pnpm` resolved to the bundled pnpm 11 runtime and attempted an interactive/no-build install; direct project-pinned pnpm 9.15.9 recursive typecheck passed.

Result:
- Phase 4 complete. G6 now has real screenshot evidence across the current 81/81 registered-route set at desktop and 480px, including the previously contextual dynamic player routes. No app visual defect was found that required an `apps/web` or `packages/design-system` patch.

## Milestone 6 - Final wrap-up gates and release docs

Files changed:
- `.logs/goal-progress.md`
- `STATUS.md`
- `RELEASE_CONVERGENCE.md`

Checks run:
- Passed: `corepack pnpm -r --workspace-concurrency=1 typecheck` across `@mfd/design-system`, `@mfd/engine`, and `@mfd/web`.
- Passed: `G4_SOAK_LOG=1 corepack pnpm --filter @mfd/web test` (247 files / 1902 tests). The G4 multi-year trust test completed the full deterministic 10-season replay in the suite after 868.7s.
- Passed: `corepack pnpm --filter @mfd/engine test` (226 files / 2245 tests).
- Passed: `corepack pnpm --filter @mfd/design-system test` (17 files / 105 tests).
- Passed: `VITE_CHIP_ENABLED=true corepack pnpm --filter @mfd/web build` with the existing Vite large-chunk warning only.
- Passed: `bash scripts/check-math-random.sh`.
- Root-script environmental failure: `corepack pnpm test:perft` did not reach the playtest gate because the root script shells out to bare `pnpm`, which resolves here to the bundled pnpm 11 runtime and fails dependency-status install with `ERR_PNPM_IGNORED_BUILDS` for `esbuild@0.25.12`.
- Passed direct underlying performance gate: `corepack pnpm --filter @mfd/engine playtest:all`. Reports were written for SPEEDRUNNER, GLUTTON, CHEAPSKATE, CHURN_ARTIST, and INJURY_MAGNET with 10 seasons / 293 weeks each and `high = 0` for every persona.
- Previously passed and now documented: `SMOKE_TIMEOUT_MS=60000 node .logs/g6-visual-sweep.mjs` captured 162 screenshots for 81/81 registered routes, with zero browser errors, 0px max horizontal overflow, no tiny visible interactive controls, and reduced motion emulated on every route.

Result:
- Mission complete. All four phases were executed in order, final gates were run with direct project-pinned Corepack commands where root nested bare-`pnpm` wrappers were environmental blockers, and `STATUS.md` plus the `RELEASE_CONVERGENCE.md` G6 row now carry the actual evidence. No `packages/engine` source files, save schema, `GameState`, RNG, migrations, or `SAVE_VERSION` were changed.

## Milestone 1 - Baseline inspection

Files changed: none.

Checks run:
- Read `DESIGN.md`, `README.md`, package scripts, launch/setup/app shell/mobile nav/Monday Briefing sources, related tests, and public screenshots.
- Started local Vite dev server with bundled Node runtime at `http://127.0.0.1:5173/MFD/`.
- Captured baseline screenshots in `.logs/screenshots/before-*.png`.
- Checked baseline console warnings/errors through the browser: none.

Screenshot notes:
- Launch desktop had good identity, but the franchise board consumed the first decision area and the command card could work harder.
- Launch mobile had no horizontal overflow, but selecting a team required walking the full 32-team board before reaching the selected summary/start area.
- Setup cold open and AGM screens were reachable on mobile, but the command bar was tall and the first cold-open decision felt delayed.
- Monday Briefing and the More drawer had no horizontal overflow; More drawer scanability was acceptable and bottom nav behavior should be preserved.

Result: baseline complete.

## Milestone 2 - Focused UI improvements

Files changed:
- `apps/web/src/app/NewGameScreen.tsx`
- `apps/web/src/app/new-game-screen.css`
- `apps/web/src/app/App.tsx`
- `apps/web/src/app/app-shell.css`
- `apps/web/src/features/franchise-setup/SetupColdOpen.tsx`
- `apps/web/src/features/franchise-setup/FranchiseSetupWizard.css`
- `apps/web/src/app/NewGameScreen.test.tsx`

Changes shipped:
- Tightened desktop top-nav spacing, brand footprint, grouped-nav buttons, active strip, action buttons, and main top padding while preserving route/team/week context, badges, audio, and command palette.
- Added launch team search plus conference/division chips with visible count and clear affordance.
- Reordered launch mobile so the selected-team `Next Snap` command card and primary actions are first, the mode/team picker follows, and demo/recovery support stays below.
- Made the launch command card more action-oriented and kept save/import/demo behavior intact.
- Added a setup cold-open `Decision Up Next` beat and reduced mobile setup command-bar height while preserving the fixed action bar.
- Added a targeted render test for the team finder controls.

Result: implementation complete.

## Milestone 3 - Browser/screenshot verification

Files changed:
- `.logs/screenshots/*.png`

Checks run:
- Baseline Browser screenshots at 1280x720 and 390x844 for launch, setup cold open, choose AGM, Monday Briefing, and mobile More drawer.
- Final screenshot pass with bundled Playwright after the in-app Browser screenshot capture started timing out after hot reload; DOM/console browser checks continued to work.
- Final screenshot files:
  - `.logs/screenshots/after-launch-desktop.png`
  - `.logs/screenshots/after-launch-mobile.png`
  - `.logs/screenshots/after-launch-mobile-filtered.png`
  - `.logs/screenshots/after-setup-cold-open-desktop.png`
  - `.logs/screenshots/after-setup-cold-open-mobile.png`
  - `.logs/screenshots/after-choose-agm-desktop.png`
  - `.logs/screenshots/after-choose-agm-mobile.png`
  - `.logs/screenshots/after-monday-desktop.png`
  - `.logs/screenshots/after-monday-mobile.png`
  - `.logs/screenshots/after-mobile-more-drawer.png`

Verification notes:
- All final checked viewports reported `hasHorizontalOverflow: false`.
- Mobile team filtering reduced the visible board from 32 teams to 1 team for query `mia`.
- Setup mobile scroll measurements showed content scroll areas clear the fixed command bar on both cold open and choose-AGM screens.
- Final browser/Playwright console warning/error capture: none.

Result: responsive verification passed.

## Milestone 4 - Tests and build

Files changed: none.

Checks run:
- `PATH=/Users/kevin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH ./node_modules/.bin/vitest run src/app/NewGameScreen.test.tsx src/app/MobileBottomTabBar.test.tsx`
- `PATH=/Users/kevin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH ./node_modules/.bin/tsc --noEmit`
- `PATH=/Users/kevin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH VITE_CHIP_ENABLED=true VITE_CHIP_TTS_ENABLED=false VITE_MFD_SHARE_ENABLED=false ./node_modules/.bin/vite build`

Result:
- Targeted tests passed: 2 files, 15 tests.
- Typecheck passed.
- Build passed. Vite still reports existing chunk-size warnings for large bundles.

## Milestone 5 - Dense-route baseline and Chip diagnosis

Files changed: none.

Checks run:
- Read the current mission sources and related tests across app shell, launch/setup, Chip, route coaching, Monday Briefing, roster, depth chart, game plan, week advance, standings, power rankings, scouting, draft, and trades.
- Captured baseline screenshots at 1280x720 and 390x844 for Monday Briefing with Chip active, mobile More drawer, launch, setup cold open, choose AGM, roster, depth chart, game plan, week advance, standings, power rankings, scouting, draft, and trades.
- Wrote baseline metrics to `.logs/screenshots/baseline-metrics.json`.

Screenshot notes:
- Monday desktop baseline had the expanded Chip route dock overlapping the command queue region.
- Monday mobile baseline had a full-width Chip route panel competing with the command queue and bottom nav.
- Dense mobile routes had no document-level horizontal overflow, but standings/power-style tables still required desktop-style scanning.

Result: highest-friction target was confirmed as Chip/Monday hierarchy, with dense routes needing local `Next Call` triage before tables.

## Milestone 6 - Hierarchy implementation

Files changed:
- `apps/web/src/app/app-shell.css`
- `apps/web/src/features/companion/ChipDock.tsx`
- `apps/web/src/features/companion/ChipDock.css`
- `apps/web/src/features/companion/ChipDock.test.tsx`
- `apps/web/src/features/monday-briefing/MondayBriefing.tsx`
- `apps/web/src/features/monday-briefing/MondayBriefing.integration.test.tsx`
- `apps/web/src/features/roster/RosterManagement.tsx`
- `apps/web/src/features/roster/RosterManagement.test.tsx`
- `apps/web/src/features/depth-chart/DepthChart.tsx`
- `apps/web/src/features/depth-chart/DepthChart.test.tsx`
- `apps/web/src/features/week-advance/WeekAdvance.tsx`
- `apps/web/src/features/week-advance/WeekAdvance.test.tsx`
- `apps/web/src/features/standings/LeagueStandings.tsx`
- `apps/web/src/features/standings/LeagueStandings.test.tsx`
- `apps/web/src/features/power-rankings/PowerRankings.tsx`
- `apps/web/src/features/power-rankings/PowerRankings.test.tsx`
- `apps/web/src/features/scouting/ScoutingBoard.tsx`
- `apps/web/src/features/scouting/ScoutingBoard.test.tsx`
- `apps/web/src/features/draft/DraftBoard.tsx`
- `apps/web/src/features/draft/DraftBoard.test.tsx`
- `apps/web/src/features/trades/TradeCenter.tsx`
- `apps/web/src/features/trades/TradeCenter.test.tsx`

Changes shipped:
- Kept route-coaching Chip expanded on desktop but constrained it to a compact right dock that no longer overlaps the Monday command queue at 1280px.
- Made route-coaching Chip start collapsed on mobile once the viewport is narrow, while preserving route beats, read receipts, pending-decision badge, expand/collapse, live-beat priority, reduced motion, and bottom nav behavior.
- Tightened the collapsed mobile route-tip chip from a 96px footprint to a 70px settled footprint so it keeps the pending badge without covering as much command-card area.
- Moved Monday Briefing's in-page Chip commentary below the `Command Queue`, making the first actionable panel appear before companion flavor copy.
- Added focused `Next Call` command callouts to roster, depth chart, week advance, standings, power rankings, scouting, draft, and trades.
- Converted standings and power rankings tables to responsive card mode and removed the cramped two-column standings shell.

Result: implementation complete without engine, save schema, persistence, route, package, or generated-asset changes.

## Milestone 7 - Final verification

Files changed:
- `.logs/screenshots/after-final-*.png`
- `.logs/screenshots/after-final-*.json`
- `.logs/goal-progress.md`
- `STATUS.md`

Checks run:
- `PATH=/Users/kevin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH ./node_modules/.bin/vitest run src/features/monday-briefing/MondayBriefing.integration.test.tsx src/features/companion/ChipDock.test.tsx src/features/roster/RosterManagement.test.tsx src/features/depth-chart/DepthChart.test.tsx src/features/week-advance/WeekAdvance.test.tsx src/features/standings/LeagueStandings.test.tsx src/features/power-rankings/PowerRankings.test.tsx src/features/scouting/ScoutingBoard.test.tsx src/features/draft/DraftBoard.test.tsx src/features/trades/TradeCenter.test.tsx`
- `PATH=/Users/kevin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH ./node_modules/.bin/tsc --noEmit`
- `PATH=/Users/kevin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH VITE_CHIP_ENABLED=true VITE_CHIP_TTS_ENABLED=false VITE_MFD_SHARE_ENABLED=false ./node_modules/.bin/vite build`
- Browser screenshots at 1280x720 and 390x844 for Monday, roster, depth chart, game plan, week advance, standings, power rankings, scouting, draft, trades, plus mobile More drawer.
- Browser console warning/error capture during final checked flows.
- Mobile overflow check using `document.documentElement.scrollWidth > window.innerWidth`.

Verification notes:
- Final metrics are in `.logs/screenshots/after-final-verification.json`.
- Final route metric count: 21.
- Mobile overflow failures: 0.
- Signal failures: 0.
- Console warning/error count: 0.
- Monday desktop: Chip route dock is expanded at `x=915..1243`; command queue is `x=46..911`, so they do not overlap.
- Monday mobile: Chip route dock is collapsed to a 70px route-tip badge above the bottom nav; command queue is first after the header and remains readable/actionable.
- The mobile More drawer remained width-safe with `scrollWidth=375` at a 390px target viewport.

Result:
- Targeted tests passed: 10 files, 64 tests.
- Typecheck passed.
- Build passed with the existing non-blocking Vite large-chunk warnings.

# Goal Progress - AGM + Season Goals Consequentiality

Date: 2026-05-21

## Milestone 1 - Baseline trace

Files changed: none.

Read-first files inspected:
- `package.json`, `packages/engine/package.json`
- `packages/engine/src/systems/franchise-setup.ts`
- `packages/engine/src/systems/assistant-gm.ts`
- `packages/engine/src/systems/agm.ts`
- `packages/engine/src/systems/owner-goals.ts`
- `packages/engine/src/systems/owner.ts`
- `packages/engine/src/systems/handshake-ledger.ts`
- `packages/engine/src/systems/franchise-week.ts`
- `packages/engine/src/systems/franchise-week-helpers.ts`
- `packages/engine/src/systems/offseason.ts`
- `packages/engine/src/systems/season-report.ts`
- `packages/engine/src/systems/weekly-prep.ts`
- `packages/engine/src/systems/game-plan.ts`
- `packages/engine/src/types/franchise.ts`
- `packages/engine/src/types/team.ts`
- `packages/engine/src/save/schema.ts`
- `packages/engine/src/save/migrations.ts`
- `apps/web/src/features/franchise-setup/*`
- `apps/web/src/features/monday-briefing/*`
- `apps/web/src/features/owner/*`
- `apps/web/src/features/handshake-ledger/*`
- Related engine and web tests found via `rg`.

Baseline findings:
- Setup stores selected AGM only in setup decisions and blueprint metadata. It does not become a durable front-office identity.
- Setup writes selected goal labels into `owner.goals`, but not selected IDs, slots, progress, evaluations, or consequences.
- Existing `owner-goals.ts` evaluates several goals using blunt win-count proxies.
- Handshake Ledger already gives owner promise UI, so owner mandates can bridge into active owner handshakes while a focused mandate state holds progress/evaluation details.
- Monday Briefing already renders active handshakes; Owner screen has placeholder owner goals that should be replaced with real mandates.
- Season reports can add a mandate-results section from saved mandate evaluations.

Chosen architecture:
- Add `GameState.ownerMandates` for durable mandate IDs, goal IDs, labels, slots, progress, and season-end evaluation.
- Persist `frontOffice.agmProfileId` and a small `frontOffice.agmImpactLog` for visible AGM identity/effect receipts.
- Create owner-handshake mirrors for active mandates so existing Monday/Handshake UI sees the promises.
- Evaluate real football outcomes in `owner-goals.ts`, apply consequences during season-end flow, and refresh progress weekly.

## Milestone 2 - Data model

Files changed:
- `packages/engine/src/types/franchise.ts`
- `packages/engine/src/save/schema.ts`
- `packages/engine/src/config/difficulty.ts`
- `packages/engine/src/save/migrations.ts`
- `packages/engine/src/save/save.test.ts`
- `packages/engine/src/save/migrations.test.ts`

Result:
- Added durable `ownerMandates` state with mandate IDs, selected goal IDs, labels, slots (`floor`, `target`, `ceiling`), progress, status, evaluation, and applied-consequence guard.
- Added durable `frontOffice.agmProfileId` and visible `frontOffice.agmImpactLog`.
- Extended handshake conditions with `owner_mandate` so mandate promises can be mirrored into existing promise surfaces.
- Bumped save version to 36 and added migration defaults for old saves.

## Milestone 3 - Goal engine

Files changed:
- `packages/engine/src/systems/owner-goals.ts`
- `packages/engine/src/systems/franchise-setup.ts`
- `packages/engine/src/systems/handshake-ledger.ts`
- `packages/engine/src/systems/franchise-week.ts`
- `packages/engine/src/systems/offseason.ts`
- `packages/engine/src/index.ts`
- Related engine tests.

Result:
- Setup finalization now installs selected onboarding goals as active owner mandates while preserving legacy `owner.goals` labels.
- Mandate progress refreshes during the season and mirrors into owner handshakes for Monday Briefing / Handshake Ledger visibility.
- Season-end flow evaluates mandates before reports/handshake settlement.
- Goal semantics now use real football outcomes where available:
  - `championship`: actual champion/playoff finish.
  - `win_division`: actual division rank.
  - `playoff_berth`: playoff qualification/seed/finish.
  - `winning_record`: final record.
  - `cap_health`: final cap space/dead-cap state.
  - `star_power`: roster star count.
  - `rebuild_progress` / `draft_well`: young and drafted-player development/contribution.
  - `no_losing_streak`: season losing-streak derivation from schedule/current streak.
- Consequences now affect owner approval, owner mood/patience, owner-record patience, and front-office owner reputation. Floor misses hurt, floor meets avoid disaster, targets reward, and ceilings reward more with highlights.

## Milestone 4 - AGM engine

Files changed:
- `packages/engine/src/systems/franchise-setup.ts`
- `packages/engine/src/systems/agm.ts`
- `packages/engine/src/systems/weekly-prep.ts`
- `packages/engine/src/systems/handshake-ledger.ts`
- Related engine tests.

Result:
- AGM identity is durable on `frontOffice.agmProfileId`.
- Marcus Webb / cap management:
  - adds a small visible setup owner/reputation edge when the user selects cap discipline;
  - improves cap-health mandate progress/accountability copy and reward/penalty tuning;
  - adds cap-mandate AGM recommendations.
- Coach D / competitive edge:
  - upgrades opponent/game-plan AGM recommendations;
  - adds a modest tested weekly-prep/game-week edge only when the plan aligns with scouting plus pressure standards;
  - raises competitive-goal accountability.
- Sandra Chen / personnel:
  - adds a small visible youth/personnel morale/chemistry setup edge for development paths;
  - improves roster/development AGM recommendations;
  - adds extra accountability for broken player-role promises and development mandate tuning.

## Milestone 5 - UI and reporting

Files changed:
- `apps/web/src/app/store/selectors.ts`
- `apps/web/src/features/owner/OwnerMood.tsx`
- `apps/web/src/features/owner/OwnerMood.test.tsx`
- `packages/engine/src/systems/season-report.ts`
- `packages/engine/src/systems/season-report.test.ts`

Result:
- Owner screen now shows active mandates with slots, status, progress bars, progress detail, AGM notes, evaluation summaries, and owner delta receipts.
- Owner screen now shows the selected AGM as the durable front-office identity plus latest impact-log receipt.
- Existing Monday Briefing / Handshake Ledger surfaces see active mandate promises through owner-handshake mirrors.
- Season Report now includes an `Owner Mandates` section with floor/target/ceiling outcomes, deltas, and AGM adjustment highlights.

## Milestone 6 - Tests and proof

Files changed:
- `packages/engine/src/systems/owner-goals.test.ts`
- `packages/engine/src/systems/franchise-setup.test.ts`
- `packages/engine/src/systems/weekly-prep.test.ts`
- `packages/engine/src/systems/handshake-ledger.test.ts`
- `packages/engine/src/systems/season-report.test.ts`
- `packages/engine/src/systems/agm.test.ts`
- `apps/web/src/features/owner/OwnerMood.test.tsx`
- `.logs/goal-progress.md`
- `STATUS.md`

Checks run:
- `pnpm --filter @mfd/engine test`: failed to start because `pnpm` is not installed in this shell (`zsh:1: command not found: pnpm`).
- Engine direct equivalent: `PATH=/Users/kevin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH ./node_modules/.bin/vitest run` in `packages/engine`: passed, 202 files, 1860 tests.
- Targeted web tests: `PATH=/Users/kevin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH ./node_modules/.bin/vitest run src/features/owner/OwnerMood.test.tsx src/features/monday-briefing/ActionCenter.test.tsx src/features/handshake-ledger/HandshakeLedger.test.tsx src/features/franchise-setup/phases/BlueprintPhase.test.tsx` in `apps/web`: passed, 4 files, 10 tests.
- `pnpm -r typecheck`: failed to start because `pnpm` is not installed.
- Direct typecheck equivalents:
  - `packages/engine`: `tsc --noEmit` passed.
  - `apps/web`: `tsc --noEmit` passed.
  - `packages/design-system`: `tsc --noEmit` passed.
- `pnpm -r lint`: failed to start because `pnpm` is not installed.
- Direct lint equivalent: `eslint packages/engine/src apps/web/src` failed with 13 pre-existing repo errors and 124 warnings, primarily `@ts-nocheck` bans in web tests, missing `react-hooks/exhaustive-deps` rule config, and older prefer-const / non-null-asserted-optional-chain violations outside this mission.
- Changed-file lint subset: passed with 0 errors and 13 warnings in pre-existing warning patterns.
- `pnpm -r build`: failed to start because `pnpm` is not installed.
- Direct build equivalents:
  - `packages/engine`: `tsc` passed.
  - `apps/web`: `vite build` passed with existing large-chunk warnings.

Repair notes:
- One interim full-engine rerun failed after a local lint cleanup accidentally changed a reassigned setup-test variable to `const`.
- Repaired immediately and reran the focused setup/handshake tests plus full engine suite successfully.
