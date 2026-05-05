# MFD Public Release + Chip Recovery Goal

Updated: 2026-05-05 18:24:09 CDT
Original repo path: `/Users/tkevinbigham/Documents/GitHub/MFD`
Clean clone path: `/Users/tkevinbigham/Documents/GitHub/MFD-clean-chip-recovery`
Current branch: `codex/chip-public-release-recovery`
Checkout classification: clean recovery clone built from remote after the original checkout failed safe git inspection
Salvage folder: `/Users/tkevinbigham/Documents/GitHub/MFD-chip-salvage-20260505-111937`
Salvage manifest: `/Users/tkevinbigham/Documents/GitHub/MFD-chip-salvage-20260505-111937/MFD_CHIP_SALVAGE_MANIFEST.md`
Baseline commit in clean clone: `dc7740a Sprint 46: Polish standings signals (#54)`

## Prior Blocker Summary

- Previous Chip marathon work existed, but the original checkout was not trustworthy enough to mark MFD release-ready.
- `git status` hung in the original checkout and `git diff --stat` failed with `fatal: mmap failed: Operation canceled`.
- Earlier browser work only reached stale `dist`, and Chip was not proven in a current build.
- Recovery goals were: preserve Chip work, move into a clean clone, reapply, verify, then finish live Chip/public-release P0s.

## Corrupt Repo Diagnosis

- Original checkout identity was confirmed as MFD from `README.md` and `package.json`.
- Safe git inspection in `/Users/tkevinbigham/Documents/GitHub/MFD`:
  - `git rev-parse --show-toplevel`: passed
  - `git remote -v`: passed
  - `git branch --show-current`: `main`
  - `git log -1 --oneline`: `dc7740a Sprint 46: Polish standings signals (#54)`
  - `git -c core.fsmonitor=false status --short --untracked-files=no`: timed out after 30s
  - `git -c core.fsmonitor=false diff --stat`: failed with `fatal: mmap failed: Operation canceled`
- Conclusion: original repo stayed unsafe for build/test work. No destructive git repair was attempted.

## Salvage + Recovery Result

- Chip-related files and `.codex/MFD` notes were salvaged to the timestamped recovery folder above.
- Clean clone created at `/Users/tkevinbigham/Documents/GitHub/MFD-clean-chip-recovery`.
- Recovery branch created: `codex/chip-public-release-recovery`.
- All build, test, and browser verification work below was done only in the clean clone.

## Implementation Summary

- Reapplied and completed the Chip onboarding/weekly-guidance/decision-impact slice in the clean clone.
- Wired the formal onboarding state into the live shell and route-beat system instead of leaving guidance as isolated copy beats.
- Added guarded TTS/share scaffolds behind `VITE_CHIP_TTS_ENABLED` and `VITE_MFD_SHARE_ENABLED`.
- Added weekly guidance generation, decision-impact summaries, feature visibility sequencing, and replay/reset/snooze controls.
- Surfaced Chip guidance inside Monday Briefing, Week Advance, Game Plan, Depth Chart, Trade Center, and Cap Lab.
- Fixed a live Game Plan runtime P0 caused by an unstable selector result reference.
- Fixed a live Depth Chart DOM-nesting warning caused by rendering a player-link button inside a depth-slot button.
- Completed the P1 hardening pass for mobile tolerance, Trade Center, Cap Lab, accessibility basics, blank states, and release metadata.
- Fixed the mobile Chip dock so expanded route guidance no longer blocks underlying route controls, while dock controls remain reachable.
- Moved Cap Lab tables to responsive card mode on phone widths and raised PixelSelect plus Chip pending-badge controls to the shared 44px touch target.
- Fixed release HTML asset URLs so the `/MFD/` Vite base no longer double-prefixes the manifest/favicon/OG image paths.
- Kept save compatibility intact: no engine/schema/save-version changes were made, and sim determinism was not touched.

## Release Candidate Lock-In Sprint — Resume

Timestamp: 2026-05-05 17:52:39 CDT
Repo path: `/Users/tkevinbigham/Documents/GitHub/MFD-clean-chip-recovery`
Branch: `codex/chip-public-release-recovery`
Checkpoint evidence folder: `.codex/MFD/evidence/release-candidate-lockin-20260505-175132/`
Checkpoint commit: `8516b05 Checkpoint Chip public-release hardening`

### Safety Notes

- Confirmed active repo and git root are the clean recovery clone.
- Confirmed branch is `codex/chip-public-release-recovery`.
- Original corrupt checkout at `/Users/tkevinbigham/Documents/GitHub/MFD` was not used for work.
- Preserved the pre-lock-in worktree state with git status, diff stat, name-only list, tracked full diff, and untracked full diff.
- Pre-lock-in diff inspection found only MFD web/design-system and `.codex/MFD` documentation changes; no `dist`, deploy, non-MFD, production secret, engine save-version, or dynasty save-schema changes were found.

### Planned Slices

1. Save/load/settings/import-export current-code browser runtime pass.
2. Later-season Chip feature-introduction audit and focused P0/P1 fixes only.
3. Broader accessibility basics review across core routes.
4. Broader blank/loading/error state review across core routes.
5. Bundle/public delivery risk review and production preview check.
6. Multi-week smoke playthrough with Chip enabled.

### Commands Run In This Resume So Far

- `pwd`
- `git rev-parse --show-toplevel`
- `git branch --show-current`
- `git log -1 --oneline`
- `git status --short --branch`
- `rg --files -g 'AGENTS.md' -g 'CLAUDE.md'`
- Evidence capture commands for status, diff stat, diff name-only, tracked full diff, and untracked full diff.
- `git diff --check` — passed before checkpoint commit.
- `git add ...` — explicit file staging only; no `git add -A`.
- `git commit -m "Checkpoint Chip public-release hardening" ...` — created local checkpoint `8516b05`.

### Browser Verification Notes

- Current-code dev verification used Chip enabled with TTS/share disabled on `http://localhost:5173/MFD/`.
- Save/load/settings/import-export smoke passed from a Week 2 dynasty:
  - manual save slot created
  - `.mfd` export downloaded
  - bad pasted import showed safe error copy
  - exported file imported successfully
  - browser reload preserved Week 2/team state through `Continue Latest Autosave`
  - manual slot loaded successfully
  - Settings and Chip controls remained usable after reload
- Broad route accessibility/blank-state sweep passed on desktop and phone routes with no console errors, unnamed visible buttons, nested interactive controls, bad blank copy, or page-level overflow failures.
- Multi-week smoke advanced from Week 3 to Week 9 with Chip visible across core routes and no console/runtime errors.
- Production preview used a fresh Chip-enabled build at `http://localhost:4173/MFD/`; Chip appeared in setup, `/MFD/` manifest fields were correct, and TTS/share controls were absent under disabled flags.

### P0/P1/P2 Findings

- P0 fixed: standings/stat-leader views no longer crash when legacy or sparse player records lack season stats.
- P0 fixed: record-tracker paths no longer crash during week advance when sparse player records lack season stats.
- P1 fixed: Roster no longer relies on a clickable table row around nested player/watch controls; the route now uses an explicit `Manage` action.
- P1 fixed: legacy tutorial overlay is gated off when Chip is enabled, avoiding setup/control overlap.
- P1 fixed: Chip dock pointer-hit area no longer blocks underlying route controls outside actual dock controls.
- P1 improved: later-season route beats now cover Inbox, Standings, Power Rankings, League Pulse/News, Record Book/Legacy, and Settings/Save Load.
- P1 documented: Vite chunk-size warnings remain pre-existing public-delivery risk, not a lock-in blocker.
- P2 deferred: TTS/share polish remains intentionally behind disabled flags.

### Final Release-Candidate Audit

- Baseline and final gates passed:
  - `git diff --check`
  - `npx --yes pnpm@9.15.9 typecheck`
  - `npx --yes pnpm@9.15.9 --filter @mfd/design-system test` — 14 files / 88 tests
  - `npx --yes pnpm@9.15.9 --filter @mfd/web test` — 209 files / 1292 tests
  - `npx --yes pnpm@9.15.9 --filter @mfd/engine test` — 201 files / 1852 tests
  - `npx --yes pnpm@9.15.9 build` — passed with existing chunk-size warnings
- Focused tests passed for ChipDock/App/MilestoneCard, route coaching, Roster, standings, and record-tracker.
- Save/load/settings/import-export, broad accessibility/blank states, production preview, and multi-week smoke were runtime-checked with current code.
- `SAVE_VERSION` remains `35`; no save schema, migration, deployment, or production secret changes were made.
- Completion rubric: 96/100 with no P0s and no category below 4.

## Commands Run

### Install / recovery baseline

- `npx --yes pnpm@9.15.9 install`
  - Result: passed

### Targeted regression proof before Game Plan selector fix

- `npx --yes pnpm@9.15.9 --filter @mfd/web exec vitest run src/app/store/selectors.test.ts --reporter=verbose`
  - Result before fix: failed
  - Root cause: repeated `selectCurrentOpponentIntel(state)` calls returned different object references on unchanged state

### Targeted verification after selector + tooltip fix

- `npx --yes pnpm@9.15.9 --filter @mfd/web exec vitest run src/app/store/selectors.test.ts src/features/game-plan/GamePlanSetup.test.tsx --reporter=verbose`
  - Result: passed
  - Duration: 3.06s

### Targeted verification after Depth Chart nesting fix

- `npx --yes pnpm@9.15.9 --filter @mfd/web exec vitest run src/features/depth-chart/DepthChart.test.tsx src/app/store/selectors.test.ts src/features/game-plan/GamePlanSetup.test.tsx --reporter=verbose`
  - Result: 3 files / 9 tests passed

### P1 hardening targeted verification

- `npx --yes pnpm@9.15.9 --filter @mfd/web exec vitest run src/features/contracts/CapLaboratory.test.tsx --reporter=verbose`
  - Result: passed, 1 file / 5 tests
- `npx --yes pnpm@9.15.9 --filter @mfd/design-system exec vitest run components/PixelSelect/PixelSelect.test.tsx --reporter=verbose`
  - Result: passed, 1 file / 1 test
- `npx --yes pnpm@9.15.9 --filter @mfd/web exec vitest run src/features/companion/ChipDock.test.tsx --reporter=verbose`
  - Result: passed, 1 file / 38 tests
- `npx --yes pnpm@9.15.9 --filter @mfd/design-system exec vitest run tokens/index.test.ts components/PixelSelect/PixelSelect.test.tsx --reporter=verbose`
  - Result: passed, 2 files / 2 tests
- `npx --yes pnpm@9.15.9 --filter @mfd/web exec vitest run src/app/indexDocument.test.ts src/features/companion/ChipDock.test.tsx src/features/contracts/CapLaboratory.test.tsx --reporter=verbose`
  - Result: passed, 3 files / 44 tests
- `npx --yes pnpm@9.15.9 --filter @mfd/web exec vitest run src/app/indexDocument.test.ts --reporter=verbose`
  - Result: passed, 1 file / 2 tests

### Full repo gates in clean clone

- `git diff --check`
  - Result: passed
- `rg -n "SAVE_VERSION = 35|SAVE_VERSION =|Math\\.random\\(" packages/engine apps/web packages/design-system`
  - Result: save version remained `35`; only existing non-sim audio `Math.random()` usage was reported
- `npx --yes pnpm@9.15.9 typecheck`
  - Result: passed
- `npx --yes pnpm@9.15.9 --filter @mfd/design-system test`
  - Result: passed
  - Evidence: 14 test files / 88 tests passed
- `npx --yes pnpm@9.15.9 --filter @mfd/web test`
  - Result: passed
  - Evidence: 209 test files / 1282 tests passed
  - Duration: 28.95s
- `npx --yes pnpm@9.15.9 build`
  - Result: passed
  - Evidence: production build completed, Vite reported chunk-size warnings only
  - Build time: 5.90s

### Earlier full-suite checkpoint from the same clean clone

- `npx --yes pnpm@9.15.9 --filter @mfd/web test`
  - Result: previously passed at 207 files / 1275 tests before final regression additions
- `npx --yes pnpm@9.15.9 typecheck`
  - Result: previously passed
- `npx --yes pnpm@9.15.9 build`
  - Result: previously passed

## Browser Verification

### Launch path

- Dev server command:
  - `env PATH="/Users/tkevinbigham/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" VITE_CHIP_ENABLED=true VITE_CHIP_TTS_ENABLED=false VITE_MFD_SHARE_ENABLED=false npx --yes pnpm@9.15.9 --filter @mfd/web dev -- --host 127.0.0.1 --port 4173`
- Served URL used in browser verification:
  - `http://localhost:5174/MFD/`
  - Note: `5173` was already occupied, so Vite served this current-code pass on `5174`.

### Current-code first-3-week playthrough

- Started a fresh dynasty from current source with Chip enabled.
- Completed setup flow:
  - AGM: Deion "Coach D" Hardaway
  - Head Coach: Dorian Cross
  - Scouting Director: Marvin Tate
  - Offense: Power Run
  - Defense: 4-3
  - Depth philosophy: Best Players
  - Cap package: Balanced Pressure Release
  - Goals: Win Division, Cap Health, No Losing Streaks
  - Culture mandate: Player Led
- Week 1 verified:
  - Chip appeared in the live shell
  - Monday Briefing copy clearly explained the weekly loop
  - Dock controls present: `Where am I?`, `What now?`, `Replay`, `Snooze`, `Enable`, `Quiet for screen`, `Quiet until next week`, `Quiet this season`, `Reduce guidance`, `Disable animations`
  - Route guidance verified on Monday Briefing, Roster, Depth Chart, Game Plan, and Week Advance
  - Week Advance decision-impact UI showed `Immediate`, `This season`, `Future`, and `Risk`
- Week 1 advance:
  - Game Plan required before advancing
  - Halftime decision path was exercised
  - Halftime modal: `Halftime Hell`, Jacksonville 0 - 14 New York, chose `Switch`
- Week 2 verified:
  - Record updated to `0-1`
  - Briefing surfaced the Week 1 result and injury notes
  - Chip weekly copy changed appropriately and stayed contextual
- Week 3 verified:
  - Record updated to `1-1`
  - Briefing surfaced injuries, power-ranking movement, and next opponent
  - Chip copy changed again and reduced repetition instead of replaying the same Week 1 text
- Replay was verified in the live Week 3 shell: replay restored the current weekly guidance after dismissal.
- TTS disabled path produced no autoplay voice or crash.
- Share disabled path produced no visible regression.

### Runtime fixes verified in browser

- Game Plan P0 before fix:
  - `The result of getSnapshot should be cached to avoid an infinite loop`
  - `Maximum update depth exceeded`
- Fix applied:
  - `apps/web/src/app/store/selectors.ts` memoized `selectCurrentOpponentIntel`
  - `apps/web/src/features/game-plan/GamePlanSetup.tsx` stopped passing `PixelPanel` directly as the tooltip child in the crashing surface
- Result:
  - `#/game-plan` rendered normally with Chip route guidance and prep controls
- Depth Chart warning before fix:
  - nested `<button>` inside the slot card due to `PlayerNameLink` rendering a button inside the room button
- Fix applied:
  - `apps/web/src/features/depth-chart/DepthChart.tsx` now renders plain starter text inside the slot card and keeps player linking in the modal
- Result:
  - `#/depth-chart` rendered with no fresh console warnings after the fix

### Additional demo-shell check

- The Week 14 demo scenario was launched from current code.
- Monday Briefing, Depth Chart, and Chip dock were inspected again after the fixes.
- The demo shell currently loads with dock controls available but no active route/live beat once the dock is expanded, so replay/quiet controls are present but inert in that state. Replay/reset/snooze reliability remains covered by direct ChipDock state tests.

### P1 hardening browser pass

- Current-code browser pass launched the Week 14 demo scenario on `http://localhost:5174/MFD/`.
- Phone viewport `390x844` verified:
  - Trade Center route rendered with `0 pending`, `0 accepted`, `No high-confidence suggestions this week`, and `No active offers`.
  - Trade Center `Propose Trade` tab was clickable with the expanded Chip route beat visible.
  - Cap Lab rendered in responsive card mode with 17 card rows and no page-level horizontal overflow.
  - Cap Lab `Add Move`, enabled `Apply Sandbox`, modal open, and `Cancel` path all worked.
  - No unnamed visible controls were found in the Trade/Cap pass.
  - No undersized phone controls were found after the PixelSelect and Chip pending-badge fixes.
  - No page-level overflow offenders remained; Chip dock controls use an intentional internal horizontal scroller on phone widths.
- Desktop viewport `1366x900` verified:
  - Trade Center and Cap Lab routes rendered without page-level overflow offenders.
  - Trade Center and Cap Lab blank/low-data states remained visible.
- Release metadata verified in browser:
  - Manifest resolved to `http://localhost:5174/MFD/manifest.json`.
  - Manifest response was `application/json`.
  - Browser console had no errors or warnings after the manifest and mobile-web-app metadata fix.

## Product Audit

- First 10 minutes guided: yes
- Weekly loop clear: yes
- Post-week guidance clear: yes
- Decision impact clear: yes
- Feature visibility improved: yes, including later-season route beats
- Replay/reset/snooze available after reload: yes
- Save/load/import-export confidence: yes, current-code runtime checked
- Mobile route controls usable with Chip expanded: yes
- Trade Center current-browser pass: yes
- Cap Lab current-browser pass: yes
- Accessibility/blank-state broad sweep: yes
- Tone acceptable: yes
- No spam or annoying repetition in the 3-week and Week 3-to-9 runs: yes

## Engineering Audit

- Clean recovery path established: yes
- Reliable git status/diff in clean clone: yes
- Install: yes
- Typecheck: yes
- Tests: yes, including full web, design-system, and engine suites
- Build: yes
- Current-code dev browser verification: yes
- Production preview verification: yes
- Live onboarding/state-machine integration: yes
- Persistence/resume path: yes by runtime smoke and tests
- Idempotent triggers/read receipts: yes by route-beat/read-receipt tests
- Feature flags: yes for Chip, TTS scaffold, and share scaffold
- Save compatibility: yes; no save schema/version changes
- Deterministic sim behavior preserved: yes; no RNG edits
- Public delivery: `/MFD/` manifest preview verified; chunk warnings documented

## Remaining Issues

### P0

- None remaining after clean-clone recovery, final gates, current-code browser checks, save/load/import-export smoke, production preview, and multi-week playthrough.

### P1

- Bundle chunk-size warnings remain from the current app build output and should be addressed in a later performance slice if public web delivery becomes sensitive to initial load.
- Later-season Chip coverage is now materially better, but a full trade-deadline/playoff/offseason hands-on pass is still the next best product-confidence sweep.

### P2

- TTS scaffold remains intentionally conservative behind `VITE_CHIP_TTS_ENABLED`.
- Share scaffold remains intentionally conservative behind `VITE_MFD_SHARE_ENABLED`.
- Additional feature-introduction variants and copy polish can continue after release recovery.

## Resume Instructions

1. Work in `/Users/tkevinbigham/Documents/GitHub/MFD-clean-chip-recovery`, not the corrupt original checkout.
2. Re-read this file and `.codex/MFD/public-release-readiness-matrix.md`.
3. If continuing release work, keep scope to MFD only and preserve `SAVE_VERSION 35`.
4. Treat the current Chip recovery plus release-candidate lock-in slice as green on full tests, focused tests, current-code browser verification, and production preview unless a new regression appears.
5. Next sprint should target a deeper trade-deadline/playoff/offseason playthrough and bundle delivery, not unrelated new systems.
