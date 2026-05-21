# Goal Progress - UI/UX Command Shell Pass

Date: 2026-05-21

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
