# MFD Evolution Marathon

## Mission

Evolve Mr. Football Dynasty into a durable forever-dynasty product with faster time control, surfaced weekly media, safer saves, and stronger narrative memory.

## Current Architecture Truth

- MFD is a `pnpm` workspace.
- Engine code lives in `packages/engine`.
- Web code lives in `apps/web`.
- Shared UI lives in `packages/design-system`.
- `AGENTS.md` and `CODEX_GAME_GUIDE.md` are the active repo guidance.
- Save migrations, golden fixtures, and deterministic tests govern save and sim changes.
- This is not a `game.js` monolith or CDN/Babel three-file app.

## Observed Preflight

- Current `SAVE_VERSION`: `35` in `packages/engine/src/config/difficulty.ts`.
- Existing migration chain includes `registerMigration(34, ...)`; no `35 -> 36` migration exists at mission start.
- Fixture policy observed: fixtures currently cover `v1`, `v10`, `v20`, `v30`, `v31`, `v32`, `v33`, and `v34`; there is no separate `save-version-drift.test.ts` in this checkout.
- `CARTRIDGE_VERSION`: `mfd-cartridge.v1`.
- Kevin warning: manually export the longest dynasty before testing any forward save migration.

## Mission Board

| Wave | Status | Notes |
|---|---:|---|
| 0 Preflight, architecture truth, repo hygiene | IMPLEMENTED | Active docs read; manual QA doc created; no tracked generated dist |
| 1A Save Diet media caps | IMPLEMENTED | 35 -> 36 migration; mediaCycle histories capped at 34 |
| 1B eventLog year repair and retention | IMPLEMENTED | 36 -> 37 migration; helper, stamping, retention, consumers patched |
| 1C Loaded-save reference rehydration | IMPLEMENTED | Lightweight public engine helper; web persistence import call; identity tests |
| 1D Cartridge size guard and optional v2 dedupe | IMPLEMENTED | v2 roster-player stubs, v1 compatibility, size guard/runtime verification |
| 2 Web Worker sim boundary | IMPLEMENTED | Worker protocol, singleton fallback wrapper, boundary tests |
| 2.5 Extract post-advance finalizer | IMPLEMENTED | Shared local finalizer for advance and halftime resolution |
| 3 Sim Ahead | IMPLEMENTED | Engine loop, Worker progress, store action, WeekAdvance controls |
| 4 MFSN Weekly Show in `/newsroom` | IMPLEMENTED | Saved digest selectors and existing NewsroomDigest MFSN sections |
| 5 Matchup Radar upgrade | IMPLEMENTED | Existing WeekAdvance radar enriched from schedule/rivalry/rank/injury data |
| 6 Chip cross-season memory callbacks | IMPLEMENTED | Read-only weekly guidance callbacks from timeline/story/rivalry/history |
| 7 Save Health Meter | IMPLEMENTED | Save/load health UI in Dynasty Cartridge |
| 8 Community/share loops | IMPLEMENTED | Existing recap sharing plus cartridge challenge seed copy |
| 9 Transparency and performance polish | IMPLEMENTED | Adaptive readout and cartridge metadata memoization |
| 10 Future memory archive ADR only | IMPLEMENTED | ADR only; no `dynastyTimeline` compaction |

## Checkpoint Log

### 2026-07-07 — Wave 0 Preflight

Status: IMPLEMENTED.

Files changed:

- `MISSION.md`
- `docs/qa/MFD_EVOLUTION_MANUAL_QA.md`

Findings:

- Read `AGENTS.md`, `CODEX_GAME_GUIDE.md`, and `MFD_CODEX_MARATHON_GOAL_PROMPT.md`.
- Confirmed active architecture is workspace-based: `packages/engine`, `apps/web`, `packages/design-system`.
- Searched active docs/prompts for stale monolith, three-file, CDN/Babel, and `game.js` guidance; no active hits found.
- Found generated `apps/web/dist`, but `dist/` is already ignored and `git ls-files apps/web/dist` returned no tracked files, so no deletion was needed.
- Added manual QA checklist at `docs/qa/MFD_EVOLUTION_MANUAL_QA.md`.

Commands/tests run:

- `rg --files` — PASS, repo shape inspected.
- `rg -n "SAVE_VERSION|registerMigration|..." packages apps docs scripts` — PASS, live values located.
- `rg -n "game\.js monolith|single-file browser sim|three-file delivery|legacy copy|sync check|CDN/Babel|..." AGENTS.md CODEX_GAME_GUIDE.md README.md docs .codex` — PASS, no active stale-language hits.
- `git ls-files apps/web/dist` — PASS, no tracked generated dist artifacts.

Blockers:

- None.

Next checkpoint:

- Wave 1A: media-cycle caps with a 35 -> 36 save migration.

### 2026-07-07 — Wave 1A Save Diet Media Caps

Status: IMPLEMENTED with some broad tests blocked by local runner hangs.

Files changed:

- `packages/engine/src/config/difficulty.ts`
- `packages/engine/src/save/migrations.ts`
- `packages/engine/src/save/migrations.test.ts`
- `packages/engine/src/save/golden-saves.test.ts`
- `packages/engine/src/save/save.test.ts`
- `packages/engine/src/systems/franchise-week.ts`
- `packages/engine/src/systems/franchise-week-media-cycle.test.ts`
- `packages/engine/src/systems/long-running-save-collections.ts`
- `packages/engine/src/systems/long-running-save-collections.test.ts`
- `AGENTS.md`
- `CODEX_GAME_GUIDE.md`
- `README.md`
- `MISSION.md`

Implemented:

- Bumped `SAVE_VERSION` from `35` to `36`.
- Added `trimMediaCycle()` and `trimLongRunningSaveCollections()` with `MEDIA_CYCLE_HISTORY_LIMIT = 34`.
- Added `trimLongRunningSaveCollectionsRecord()` for migration use.
- Added `registerMigration(35, ...)` to trim oversized `mediaCycle.weeklyDigests` and `mediaCycle.powerRankingHistory`.
- Applied runtime trimming immediately after weekly digest and power-ranking snapshot append in `advanceFranchiseWeek`.
- Preserved `dynastyTimeline`; no compaction or trimming was added.
- Updated active save-version guidance in `AGENTS.md`, `CODEX_GAME_GUIDE.md`, and `README.md`.

Commands/tests run:

- `pnpm --version` — PASS (`11.7.0`).
- `pnpm --filter @mfd/engine test -- save migrations franchise-week-media-cycle` — BLOCKED: pnpm dependency verification attempted registry retries and was interrupted.
- `pnpm --config.offline=true --filter @mfd/engine test -- save migrations franchise-week-media-cycle` — BLOCKED: installed cached deps but pnpm halted on ignored `esbuild` build approval.
- `./node_modules/.bin/vitest run src/save/migrations.test.ts src/save/golden-saves.test.ts src/systems/long-running-save-collections.test.ts` — PASS: 3 files, 21 tests.
- `./node_modules/.bin/vitest run src/systems/franchise-week-media-cycle.test.ts` — BLOCKED/HUNG: no result before manual interrupt.
- `./node_modules/.bin/vitest run src/systems/franchise-week-media-cycle.test.ts -t "caps media-cycle histories"` — BLOCKED/HUNG: no result before manual interrupt.
- `./node_modules/.bin/vitest run src/save/save.test.ts -t "save version 36"` — BLOCKED/HUNG: no result before manual interrupt.
- `./node_modules/.bin/tsc --noEmit` from `packages/engine` — BLOCKED/HUNG: no output before manual interrupt.

Notes:

- The passing migration test verifies oversized v35 media histories trim to 34 and week/year/phase stay unchanged.
- The passing helper test verifies media trimming does not touch `dynastyTimeline`.
- The runtime append point is patched, but the existing `franchise-week-media-cycle.test.ts` file could not be completed in this environment.

Next checkpoint:

- Wave 1B: event-log year repair and retention helper, stamping, migration retention, and focused tests.

### 2026-07-07 — Wave 1B eventLog Year Repair and Retention

Status: IMPLEMENTED with broad test/search gates still blocked by local hangs.

Files changed:

- `packages/engine/src/config/difficulty.ts`
- `packages/engine/src/index.ts`
- `packages/engine/src/save/migrations.ts`
- `packages/engine/src/save/migrations.test.ts`
- `packages/engine/src/save/golden-saves.test.ts`
- `packages/engine/src/save/save.test.ts`
- `packages/engine/src/systems/event-log-retention.ts`
- `packages/engine/src/systems/event-log-retention.test.ts`
- `packages/engine/src/systems/franchise-week.ts`
- `packages/engine/src/systems/franchise-week-helpers.ts`
- `packages/engine/src/systems/off-field-events.ts`
- `packages/engine/src/systems/press-conference.ts`
- `packages/engine/src/systems/gm-strategies.ts`
- `packages/engine/src/systems/progression.ts`
- `packages/engine/src/systems/coaching-carousel.ts`
- `packages/engine/src/systems/coach-retention.ts`
- `packages/engine/src/systems/coaching-market.ts`
- `packages/engine/src/systems/coach-retirement.ts`
- `packages/engine/src/systems/history.ts`
- `packages/engine/src/systems/coaching-legacy.ts`
- `apps/web/src/app/store/game-store.ts`
- `AGENTS.md`
- `CODEX_GAME_GUIDE.md`
- `README.md`
- `MISSION.md`

Implemented:

- Bumped `SAVE_VERSION` from `36` to `37`.
- Added `event-log-retention.ts` with `readGameEventYear`, known-ID inference, `withEventDate`, logical timestamps, metadata backfill, and retention taxonomy.
- Added v36 -> v37 migration to backfill `eventLog.data.year/week` and trim old eventLog noise.
- Retention keeps current-year events, `coach_retirement`, and `trade_deadline_resolved`; keeps latest 500 semantic prior-year events and latest 100 disposable/unknown prior-year events.
- Patched event creation in weekly/playoff result helper, off-field events, press conferences, GM strategy shifts, player retirements, coach retirement/market/carousel/retention paths, and web trade-deadline resolution.
- Replaced `Date.now()` deadline timestamp with logical game-time timestamp.
- Updated `history.ts` and `coaching-legacy.ts` to use `readGameEventYear`.
- Exported event-log helpers through `@mfd/engine` for the web persistence boundary.
- Applied retention only in migration and end-of-advance engine path; no web `commitGame()` retention hook was added.

Commands/tests run:

- `./node_modules/.bin/vitest run src/systems/event-log-retention.test.ts src/save/migrations.test.ts src/save/golden-saves.test.ts` — PASS: 3 files, 27 tests.
- `./node_modules/.bin/vitest run src/systems/event-log-retention.test.ts src/systems/long-running-save-collections.test.ts src/save/migrations.test.ts src/save/golden-saves.test.ts` — PASS: 4 files, 28 tests.
- `bash scripts/check-math-random.sh` — BLOCKED/HUNG: printed header but no result before manual interrupt.

Notes:

- Focused tests cover data.year precedence, known ID inference, timestamp fallback, metadata backfill, current-year preservation, disposable trimming, forever receipts, semantic receipts, and v36 -> v37 migration behavior.
- `franchise-week-media-cycle.test.ts`, `save.test.ts`, engine `tsc --noEmit`, and `check-math-random.sh` still hang in this local environment as noted above. Re-run after local dependency/build-script approval issues are resolved.

Next checkpoint:

- Wave 1C: loaded-save reference rehydration helper, engine barrel export, web persistence call, and identity tests.

### 2026-07-07 — Wave 1C Loaded-save Reference Rehydration

Status: IMPLEMENTED with web-specific Vitest runner blocked by local hang.

Files changed:

- `packages/engine/src/systems/game-state-references.ts`
- `packages/engine/src/systems/franchise-week-helpers.ts`
- `packages/engine/src/systems/franchise-week-helpers.test.ts`
- `packages/engine/src/index.ts`
- `apps/web/src/app/store/persistence.ts`
- `apps/web/src/app/store/persistence.test.ts`
- `MISSION.md`

Implemented:

- Added lightweight `game-state-references.ts` with `syncPlayers` and `rehydrateGameStateReferences`.
- Kept `franchise-week-helpers.ts` compatible by importing/re-exporting the reference helpers while avoiding the heavy module as the public import path.
- Exported `rehydrateGameStateReferences` from the engine barrel through the lightweight module.
- Updated web cartridge/save import normalization to run `ensureAgentsInitialized(game)` and then `rehydrateGameStateReferences(game)` after migration and schema validation.
- Added a web persistence regression for cartridge imports that verifies roster player objects are the same references as `game.players[id]`.
- Added a focused engine regression proving the rehydration helper replaces stale player-map objects with canonical roster references.

Commands/tests run:

- `./node_modules/.bin/vitest run src/systems/franchise-week-helpers.test.ts --reporter verbose` — PASS: 1 file, 1 test.
- `./node_modules/.bin/vitest run src/systems/event-log-retention.test.ts src/systems/long-running-save-collections.test.ts src/save/migrations.test.ts src/save/golden-saves.test.ts` — PASS: 4 files, 28 tests.
- `./node_modules/.bin/vitest run src/app/store/persistence.test.ts -t rehydrates --reporter verbose` — BLOCKED/HUNG: no banner or diagnostics after 60 seconds; manually interrupted.
- `./node_modules/.bin/tsc --noEmit --pretty false src/systems/game-state-references.ts src/systems/franchise-week-helpers.test.ts` — BLOCKED/HUNG: no diagnostics after extended wait; manually interrupted.

Notes:

- The public rehydration import path was moved out of `franchise-week-helpers.ts` because importing the heavy helper module caused slow/hanging collection in this environment.
- The actual web import code path is patched, but the web Vitest harness did not produce a result locally.

Next checkpoint:

- Wave 1D: cartridge size guard first; optional v2 dedupe only if safe.

### 2026-07-07 — Wave 1D Cartridge Size Guard and v2 Dedupe

Status: IMPLEMENTED with Vitest runner instability documented.

Files changed:

- `packages/engine/src/systems/dynasty-cartridge.ts`
- `packages/engine/src/systems/dynasty-cartridge.test.ts`
- `MISSION.md`

Implemented:

- Bumped portable cartridge envelopes from `mfd-cartridge.v1` to `mfd-cartridge.v2`.
- Added export-time roster-player dedupe: rostered entries in `save.players` are serialized as `{ $roster: teamId }` stubs.
- Added v2 parse-time rehydration so `save.players[playerId]` points back to the matching `team.roster` object before downstream schema validation.
- Kept v1 cartridges parsing unchanged.
- Preserved persisted `SaveState` / IndexedDB shape; dedupe only touches the portable cartridge envelope.
- Added cartridge tests for sizeBytes reporting, v2 stub export, v2 parse identity, v1 compatibility, and v2 size reduction.

Commands/tests run:

- In-memory TypeScript runtime harness over `src/systems/dynasty-cartridge.ts` — PASS: v2 stub export, v2 parse identity, v1 compatibility, sizeBytes equality, guard size `554969`, v2 size `50644`, v1-style size `91108`.
- `./node_modules/.bin/vitest run src/systems/dynasty-cartridge.test.ts --reporter verbose` — BLOCKED/HUNG: no banner or diagnostics after 60 seconds; manually interrupted.
- `./node_modules/.bin/tsc --noEmit --pretty false src/systems/dynasty-cartridge.ts src/systems/dynasty-cartridge.test.ts` — BLOCKED/HUNG: no diagnostics after 30 seconds; manually interrupted.
- `./node_modules/.bin/vitest run src/systems/franchise-week-helpers.test.ts src/systems/event-log-retention.test.ts src/systems/long-running-save-collections.test.ts src/save/migrations.test.ts src/save/golden-saves.test.ts --reporter verbose` — BLOCKED/HUNG: no banner or diagnostics after 60 seconds; manually interrupted.
- `./node_modules/.bin/vitest run src/systems/event-log-retention.test.ts src/systems/long-running-save-collections.test.ts src/save/migrations.test.ts src/save/golden-saves.test.ts` — BLOCKED/HUNG on rerun: no banner or diagnostics after 60 seconds; manually interrupted. Same command passed earlier in Wave 1C.

Notes:

- The runtime harness transpiled the actual cartridge source with the installed TypeScript compiler and executed it in-memory to avoid the local Vitest collection hang.
- Future broad CI should run the checked-in `dynasty-cartridge.test.ts`; the implementation itself is covered by the runtime harness in this environment.

Next checkpoint:

- Wave 2: web Worker sim boundary.

### 2026-07-07 — Wave 2 Web Worker Sim Boundary

Status: IMPLEMENTED with local web test/tooling hangs documented.

Files changed:

- `apps/web/src/app/store/sim-protocol.ts`
- `apps/web/src/app/store/sim.worker.ts`
- `apps/web/src/app/store/sim.ts`
- `apps/web/src/app/store/sim.test.ts`
- `apps/web/src/app/architecture-boundaries.test.ts`
- `MISSION.md`

Implemented:

- Added serializable request-id Worker protocol for `advanceWeek` and `previewHalftimeDecision`.
- Added `sim.worker.ts` that imports engine simulation functions inside the Worker boundary and returns `done` / `error` responses.
- Rewrote `sim.ts` to use a singleton module Worker with fallback when `Worker` is unavailable or construction throws.
- Kept `runAdvanceWeek` and `runPreviewHalftimeDecision` signatures unchanged for the store.
- Added focused tests for no-Worker fallback, construction-failure fallback, and request-id Worker messaging.
- Added an architecture-boundary test that allows direct engine sim imports only from `sim.ts` and `sim.worker.ts`.

Commands/tests run:

- `./node_modules/.bin/vitest run src/app/store/sim.test.ts src/app/architecture-boundaries.test.ts --reporter verbose` — BLOCKED/HUNG: no banner or diagnostics after 60 seconds; manually interrupted.
- `./node_modules/.bin/tsc --noEmit --pretty false src/app/store/sim.ts src/app/store/sim.worker.ts src/app/store/sim.test.ts src/app/architecture-boundaries.test.ts` — BLOCKED/HUNG: no diagnostics after 30 seconds; manually interrupted.
- Node TypeScript transpile/static scan fallback — BLOCKED/HUNG while loading package tooling; manually interrupted.
- Pure Node full-tree static scan — BLOCKED/HUNG on source traversal; manually interrupted.

Notes:

- Direct source inspection confirmed `game-store.ts` calls only `runAdvanceWeek` and `runPreviewHalftimeDecision`; the new boundary test formalizes the allowlist for CI.
- Worker protocol does not pass callbacks through `postMessage`.

Next checkpoint:

- Wave 2.5: extract shared post-advance finalizer in `game-store.ts`.

### 2026-07-07 — Wave 2.5 Shared Post-advance Finalizer

Status: IMPLEMENTED with local web test runner still blocked.

Files changed:

- `apps/web/src/app/store/game-store.ts`
- `MISSION.md`

Implemented:

- Extracted shared `finalizeAdvancedGame(previousGame, nextGame, options)` helper inside `game-store.ts`.
- Reused the helper from `advanceWeek` and `resolveHalftimeDecision`.
- Preserved existing behavior for governance repair, trade deadline routing, expansion draft routing, CBA routing, user-team system fit, postgame UI queues, breaking news, playoff lore staging, recap prompt reset, career meta sync, tutorial completion, commit/autosave, and returned weekly summary.
- Preserved halftime-specific behavior by clearing `pendingHalftimeDecision` before interruption routing only when resolving a halftime decision.
- Left `finalizeDeadline` behavior unchanged because it intentionally performs a narrower post-deadline path.

Commands/tests run:

- Direct source inspection of modified `game-store.ts` sections — PASS: duplicate blocks replaced by helper calls.
- Focused web Vitest/tsc commands remain blocked by the local web runner/tooling hangs documented in Wave 2; no additional successful web test signal was available in this environment.

Next checkpoint:

- Wave 3: Sim Ahead engine, Worker protocol, store action, and WeekAdvance UI.

### 2026-07-07 — Wave 3 Sim Ahead

Status: IMPLEMENTED with local runner hangs documented.

Files changed:

- `packages/engine/src/systems/sim-ahead.ts`
- `packages/engine/src/systems/sim-ahead.test.ts`
- `packages/engine/src/index.ts`
- `apps/web/src/app/store/sim-protocol.ts`
- `apps/web/src/app/store/sim.worker.ts`
- `apps/web/src/app/store/sim.ts`
- `apps/web/src/app/store/sim.test.ts`
- `apps/web/src/app/store/game-store.ts`
- `apps/web/src/features/week-advance/WeekAdvance.tsx`
- `MISSION.md`

Implemented:

- Added public engine `simulateWeeks(game, target, onProgress?)` with targets `next_user_game`, `trade_deadline`, `end_regular_season`, `playoffs`, and `{ weeks }`.
- Added stop reasons: `target_reached`, `user_game`, `trade_deadline`, `expansion_draft`, `cba_interrupt`, `phase_changed`, `user_injury`, and `safety_guard`.
- Added serializable progress frames with year, week, phase, weeks simmed, user record, latest summary headline, and optional stop reason.
- Enforced the two-class model: `next_user_game` stops before a user game; other fast-forward targets may sim through user games but stop on trade deadline, expansion draft, CBA interrupt, phase boundary, severe/season-ending user injury, or safety guard.
- Extended Worker protocol with `simulateWeeks`, progress responses, and final done response.
- Added `runSimAhead` in the web sim wrapper with Worker fallback.
- Added `simAhead(target, onProgress?)` store action that commits/autosaves once at the final frame through the shared finalizer and does not persist partial progress frames.
- Added WeekAdvance controls for My Next Game, Trade Deadline, End Regular Season, Playoffs, and 4 Weeks with progress/status ticker.
- Added focused engine and web tests for target pre-stop and Worker progress behavior.

Commands/tests run:

- `./node_modules/.bin/vitest run src/systems/sim-ahead.test.ts --reporter verbose` — BLOCKED/HUNG: no banner or diagnostics after 60 seconds; manually interrupted.
- `./node_modules/.bin/vitest run src/app/store/sim.test.ts --reporter verbose` — BLOCKED/HUNG: no banner or diagnostics after 60 seconds; manually interrupted.
- Direct source inspection of Sim Ahead engine, sim wrapper, and WeekAdvance changes — PASS: no obvious syntax/flow issue found by inspection.

Notes:

- Sim Ahead disables halftime pauses by going straight through `advanceFranchiseWeek`; the normal single-week action still owns halftime preview/pause behavior.
- Progress is transient UI state; no partial Sim Ahead state is committed or autosaved.

Next checkpoint:

- Wave 4: MFSN Weekly Show in existing `/newsroom`.

### 2026-07-07 — Wave 4 MFSN Weekly Show

Status: IMPLEMENTED with local web Vitest blocked.

Files changed:

- `apps/web/src/app/store/selectors.ts`
- `apps/web/src/features/newsroom/NewsroomDigest.tsx`
- `apps/web/src/features/newsroom/NewsroomDigest.test.tsx`
- `MISSION.md`

Implemented:

- Added selectors for `selectWeeklyDigests`, `selectLatestWeeklyDigest`, `selectLatestDigestPowerRankings`, and `selectLatestDigestUserTeamSegment`.
- Enhanced the existing `NewsroomDigest` route/component; no duplicate `/newsroom` route was created.
- Added saved-media sections for This Week on MFSN, Opening Headlines, Analyst Desk, Power Ranking Movement, and Your Team Segment.
- Added CTAs to Week Advance, Game Plan, and Power Rankings.
- Kept media read-only during render by reading `game.mediaCycle.weeklyDigests`; no render-time media generation was added.
- Preserved existing league wire, rankings ticker, and storyline board sections.
- Updated tests/mocks and added coverage for empty MFSN state and populated saved weekly digest rendering.

Commands/tests run:

- `./node_modules/.bin/vitest run src/features/newsroom/NewsroomDigest.test.tsx --reporter verbose` — BLOCKED/HUNG: no banner or diagnostics after 60 seconds; manually interrupted.
- Direct source inspection of selectors and NewsroomDigest changes — PASS: selectors read saved media only and component enhances existing route.

Next checkpoint:

- Wave 5: Matchup Radar upgrade in existing WeekAdvance surface.

### 2026-07-07 — Wave 5 Matchup Radar Upgrade

Status: IMPLEMENTED with source-inspection verification.

Files changed:

- `apps/web/src/features/week-advance/WeekAdvance.tsx`
- `MISSION.md`

Implemented:

- Enhanced the existing WeekAdvance Matchup Radar panel; no new route or save schema changes.
- Added opponent power-rank badge from existing rankings.
- Added rivalry heat and revenge badges from existing league rivalry data.
- Added weather/dome and primetime/broadcast context from the scheduled matchup.
- Added major user starter injury context from the current roster.
- Added a deterministic “why this game matters” line using existing matchup, rivalry, ranking, injury, and primetime data.

Commands/tests run:

- Direct source inspection of `WeekAdvance.tsx` radar block — PASS: existing data only, no save schema changes.
- Focused web Vitest remains blocked by local runner hangs documented in prior waves.

Next checkpoint:

- Wave 6: Chip cross-season memory callbacks.

### 2026-07-07 — Wave 6 Chip Cross-season Memory Callbacks

Status: IMPLEMENTED with local web Vitest blocked.

Files changed:

- `apps/web/src/features/companion/weeklyGuidance.ts`
- `apps/web/src/features/companion/weeklyGuidance.test.ts`
- `MISSION.md`

Implemented:

- Added `memoryCallbacks` to Chip weekly guidance.
- Added read-only callback extraction from `dynastyTimeline`, active `storylineThreads`, `leagueRivalries`, and `franchiseHistory`.
- Updated formatted Chip weekly guidance text to include the first memory callback when available.
- Kept the tone warm and witness-like; no save schema change and no mutation of memory sources.
- Added deterministic test coverage for crafted dynasty memory.

Commands/tests run:

- `./node_modules/.bin/vitest run src/features/companion/weeklyGuidance.test.ts --reporter verbose` — BLOCKED/HUNG: no banner or diagnostics after 60 seconds; manually interrupted.
- Direct source inspection of `weeklyGuidance.ts` — PASS: callbacks are read-only and deterministic.

Next checkpoint:

- Wave 7: Save Health Meter.

### 2026-07-07 — Wave 7 Save Health Meter

Status: IMPLEMENTED with local web Vitest blocked.

Files changed:

- `apps/web/src/features/dynasty-cartridge/DynastyCartridge.tsx`
- `apps/web/src/features/dynasty-cartridge/DynastyCartridge.test.tsx`
- `MISSION.md`

Implemented:

- Added Save Health Meter to the existing Dynasty Cartridge save/load surface.
- Surfaced save version versus engine `SAVE_VERSION`, current cartridge `sizeBytes`, validation/integrity status, latest local slot age, latest autosave age, and manual export recency.
- Used existing `buildCartridge`, `validateGameState`, local save slots, autosave slots, and `lastPortableExportYear`; no save schema change.
- Added test coverage for the health meter rendering and updated engine mocks.

Commands/tests run:

- `./node_modules/.bin/vitest run src/features/dynasty-cartridge/DynastyCartridge.test.tsx --reporter verbose` — BLOCKED/HUNG: no banner or diagnostics after 60 seconds; manually interrupted.
- Direct source inspection of `DynastyCartridge.tsx` — PASS: health meter uses existing data and avoids schema changes.

Next checkpoint:

- Wave 8: community/share loops.

### 2026-07-07 — Wave 8 Community/share Loops

Status: IMPLEMENTED with local web Vitest blocked.

Files changed:

- `apps/web/src/features/dynasty-cartridge/challenge-share.ts`
- `apps/web/src/features/dynasty-cartridge/challenge-share.test.ts`
- `apps/web/src/features/dynasty-cartridge/DynastyCartridge.tsx`
- `apps/web/src/features/dynasty-cartridge/DynastyCartridge.test.tsx`
- `MISSION.md`

Implemented:

- Confirmed Season Recap already supports PNG export and text copy through existing `recap-share.ts` and `SeasonRecapCard`.
- Added formatted Dynasty Cartridge challenge seed sharing.
- Added “Copy Challenge Seed” action to the Dynasty Cartridge save/load surface using `buildCartridge` and current v2 cartridge compatibility.
- Added pure formatter test coverage and updated Dynasty Cartridge render expectations.
- No new dependency was added.

Commands/tests run:

- `./node_modules/.bin/vitest run src/features/dynasty-cartridge/challenge-share.test.ts --reporter verbose` — BLOCKED/HUNG: no banner or diagnostics after 60 seconds; manually interrupted.
- Direct source inspection of challenge formatter and Dynasty Cartridge button — PASS: uses existing cartridge export flow.

Next checkpoint:

- Wave 9: transparency and performance polish.

### 2026-07-07 — Wave 9 Transparency and Performance Polish

Status: IMPLEMENTED with local Vite/esbuild test startup failure.

Files changed:

- `apps/web/src/features/settings/Settings.tsx`
- `apps/web/src/features/settings/Settings.test.tsx`
- `apps/web/src/features/dynasty-cartridge/DynastyCartridge.tsx`
- `MISSION.md`

Implemented:

- Added read-only Adaptive Difficulty Readout in Settings with league slider, current user streak, recent sample size, and adjustment count.
- Did not change adaptive difficulty balance logic.
- Stabilized Dynasty Cartridge export metadata with `useMemo` so cartridge size/health calculations and export callbacks do not depend on a freshly allocated metadata object each render.
- Updated Settings test expectations for the transparency panel.

Commands/tests run:

- `./node_modules/.bin/vitest run src/features/settings/Settings.test.tsx --reporter verbose` — FAIL/BLOCKED: Vite config load failed with esbuild startup error `The service was stopped`.
- Direct source inspection — PASS: readout is display-only and performance change is memoization only.

Next checkpoint:

- Wave 10: future dynastyTimeline archive ADR only.

### 2026-07-07 — Wave 10 Future Memory Archive ADR

Status: IMPLEMENTED.

Files changed:

- `docs/adr/0001-future-dynasty-timeline-archive.md`
- `MISSION.md`

Implemented:

- Added ADR for future `dynastyTimeline` archive/compaction design.
- Preserved landmark and major memory constraints in the proposal.
- Documented migration sketch, future UI implications, and rollback.
- Did not implement timeline compaction or change save schema.

Commands/tests run:

- Direct source/doc inspection — PASS: ADR only; no `dynastyTimeline` compaction code added.

Next checkpoint:

- Final mission review, manual QA doc check, git diff/status, and final summary.

## Test Log

- Wave 0 docs/hygiene checks passed.
- Wave 1A focused migration/golden/helper tests passed.
- Wave 1A broad engine/media tests are blocked by local test runner hangs as detailed above.
- Wave 1B focused event-log/migration/golden/helper tests passed.
- Wave 1C focused reference-rehydration engine test passed; web persistence runner hung locally.
- Wave 1D cartridge runtime harness passed; checked-in cartridge Vitest and broad reruns hung locally.
- Wave 2 Worker-boundary tests were added, but local web Vitest/tsc/static-scan commands hung before diagnostics.
- Wave 2.5 finalizer extraction completed by source inspection; web test runner remained blocked.
- Wave 3 Sim Ahead tests were added, but focused engine/web Vitest runs hung before diagnostics.
- Wave 4 NewsroomDigest tests were updated, but local web Vitest hung before diagnostics.
- Wave 5 Matchup Radar verified by source inspection; web runner remained blocked.
- Wave 6 Chip memory callback test was added, but local web Vitest hung before diagnostics.
- Wave 7 Save Health Meter test was updated, but local web Vitest hung before diagnostics.
- Wave 8 challenge-share test was added, but local web Vitest hung before diagnostics.
- Wave 9 Settings test reached Vite startup and failed on local esbuild service stop.
- Wave 10 ADR completed by source/doc inspection; no runtime tests needed.

## Restart Point

- Final review: inspect diff/status, confirm manual QA doc, and summarize verification/tooling blockers.
