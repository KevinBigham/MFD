# MFD Public Release + Chip Recovery Goal

Updated: 2026-05-05 17:34:29 CDT
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
- Feature visibility improved: yes
- Replay/reset/snooze available: yes
- Mobile route controls usable with Chip expanded: yes
- Trade Center current-browser pass: yes
- Cap Lab current-browser pass: yes
- Accessibility/blank-state spot check: yes
- Tone acceptable: yes
- No spam or annoying repetition in the 3-week run: yes

## Engineering Audit

- Clean recovery path established: yes
- Reliable git status/diff in clean clone: yes
- Install: yes
- Typecheck: yes
- Tests: yes, including full web and design-system suites
- Build: yes
- Live onboarding/state-machine integration: yes
- Persistence/resume path: yes by state tests and local-storage-backed dock/onboarding state
- Idempotent triggers/read receipts: yes by route-beat/read-receipt tests
- Feature flags: yes for Chip, TTS scaffold, and share scaffold
- P1 browser hardening: yes, current-code phone/desktop route pass completed
- Save compatibility: yes; no save schema/version/engine changes
- Deterministic sim behavior preserved: yes; no RNG/sim-path edits

## Remaining Issues

### P0

- None confirmed after clean-clone recovery, full test/build verification, and current-code browser playthrough.

### P1

- Later-season feature-introduction coverage remains lighter than the first-three-week core loop and should remain the next release-confidence sweep.
- Save/load/settings import-export should still get a focused current-build runtime pass before broad public push.
- Bundle chunk-size warnings remain from the current app build output and should be addressed in a later performance slice if public web delivery becomes sensitive to initial load.
- Root lint remains a baseline issue outside this Chip slice in untouched engine files; it was not reopened here.

### P2

- TTS scaffold remains intentionally conservative behind `VITE_CHIP_TTS_ENABLED`.
- Share scaffold remains intentionally conservative behind `VITE_MFD_SHARE_ENABLED`.
- Additional feature-introduction variants and copy polish can continue after release recovery.

## Resume Instructions

1. Work in `/Users/tkevinbigham/Documents/GitHub/MFD-clean-chip-recovery`, not the corrupt original checkout.
2. Re-read this file and `.codex/MFD/public-release-readiness-matrix.md`.
3. If continuing release work, keep scope to MFD only and preserve `SAVE_VERSION 35`.
4. Treat the current Chip recovery plus P1 hardening slice as green on targeted tests and browser verification unless a new regression appears.
5. Next sprint should target later-season feature-introduction and save/load/settings runtime confidence, not new unrelated features.
