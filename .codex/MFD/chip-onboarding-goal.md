# MFD Chip Onboarding Goal Checkpoint

Date: 2026-05-05
Repo: `/Users/tkevinbigham/Documents/GitHub/MFD`
Branch: `main`
Baseline: `dc7740a Sprint 46: Polish standings signals (#54)`

## Active Goal Summary

Perfect the Chip-guided onboarding and weekly guidance loop so Chip becomes the main player-facing guide layer for Mr. Football Dynasty. The work must improve first-time orientation, weekly next-action guidance, decision-impact clarity, replay/reset/snooze controls, and safe TTS/share scaffolding behind feature flags.

## Resume 2026-05-05 09:45:09 CDT

Current objective: finish Slice 9 honestly by verifying the current Chip implementation, diagnosing local blockers, fixing P0/P1 issues found in the continuation, and completing the first-3-week onboarding audit against actual runtime behavior.

Verification plan:

1. Reconfirm repo rules, package scripts, current branch, and safe git state without destructive git operations.
2. Diagnose the `git status` / `git diff` hang using time-boxed read-only commands.
3. Inspect Chip onboarding, weekly guidance, decision-impact, dock controls, TTS, share, route coaching, feature flags, and mount paths.
4. Reproduce the hanging targeted tests one file at a time with explicit timeouts and verbose output.
5. Diagnose typecheck hangs with repo-standard and targeted package commands before attempting fixes.
6. Start the app with Chip enabled and complete browser/manual or equivalent runtime verification; document exact blocker if browser tooling fails.
7. Update this checkpoint with commands, results, blocker root causes, and remaining P0/P1/P2 issues.

Blocker diagnosis:

- `git status` / `git diff`: reproduced. `git rev-parse --show-toplevel`, branch, and inside-work-tree checks return immediately, and no `.git/index.lock` exists. Both `git -c core.fsmonitor=false status --short --untracked-files=no` and `git -c core.fsmonitor=false diff --stat` time out after 30s. Follow-up read-only checks show `.git/objects/pack/pack-7e55b47cf628dd9df812d78dfb6410f37d6f870f.pack` repeatedly errors as `far too short to be a packfile`, and `git diff --cached --stat --no-ext-diff --no-renames` exits 128 with `fatal: unable to read 39cbc7bc99415d388a173e44d4cad585f3519bf9`. No `.git` repair has been attempted.
- `dockControls.test.ts`: blocked before file-specific execution. Direct Vitest bootstrap via bundled Node (`node .../vitest/vitest.mjs run ...`) produced no runner output after 180s and sat at 0% CPU inside Node dependency loading; killed only that spawned process.
- TSX/component suites: root cause is at least partly filesystem/local install level. `apps/web/src/features/week-advance/WeekAdvance.tsx` was a regular 14 KB file by `stat`, but `sed`, `wc`, and `dd` all blocked trying to read the working-tree inode. The unreadable inode was moved to `.codex/MFD/evidence/WeekAdvance.tsx.unreadable-20260505-1008`, the source was recreated from `git show HEAD:...`, and the Chip decision-impact panel was reapplied. `WeekAdvance.test.tsx` is now readable and still expects the panel copy.
- `tsc --noEmit`: still blocked after WeekAdvance repair. Direct bundled Node command `node .../typescript/lib/tsc.js --noEmit --project apps/web/tsconfig.json --pretty false` produced no diagnostics after 180s; `ps` showed 0% CPU and `lsof` showed Node blocked while reading dependency declarations such as `vite/types/hmrPayload.d.ts`.
- Browser/manual playthrough: fresh Vite build/dev is blocked before startup. Existing stale `apps/web/dist` can be served only by stripping the `/MFD` base path; the stale build loads with no console errors but has Chip disabled and cannot count as current Chip verification.

Commands run during resume:

- `pwd`: `/Users/tkevinbigham/Documents/GitHub/MFD`.
- `git rev-parse --show-toplevel`: `/Users/tkevinbigham/Documents/GitHub/MFD`.
- `git branch --show-current`: `main`.
- `git rev-parse --is-inside-work-tree`: `true`.
- `ls -la .git/index.lock 2>/dev/null || true`: no lock file output.
- `git -c core.fsmonitor=false status --short --untracked-files=no`: timeout after 30s.
- `git -c core.fsmonitor=false diff --stat`: timeout after 30s.
- `git config --show-origin --get-regexp 'core.fsmonitor|core.untrackedCache|diff.external|filter|lfs'`: only LFS filter config found.
- `ls -lh .git/index`: 133K.
- `git count-objects -vH`: one pack, reported 89.05 MiB.
- `git -c core.fsmonitor=false -c core.untrackedCache=false status --porcelain=v1 --untracked-files=no --no-renames`: timeout after 20s.
- `git -c core.fsmonitor=false -c core.untrackedCache=false diff --name-only --no-ext-diff --no-renames`: timeout after 20s with repeated corrupt-pack errors.
- `git diff --cached --stat --no-ext-diff --no-renames`: exit 128 after corrupt-pack errors.
- `git ls-files -m`: timeout after 20s.
- `git show HEAD:apps/web/src/features/week-advance/WeekAdvance.tsx`: succeeds in subprocess capture and was used only to recover the unreadable working-tree file.
- `dd if=apps/web/src/features/week-advance/WeekAdvance.tsx of=/dev/null bs=1048576`: blocked before file recovery.
- `wc -l apps/web/src/features/week-advance/WeekAdvance.tsx`: after recovery, succeeds with 352 lines.
- `git diff -- apps/web/src/features/week-advance/WeekAdvance.tsx .codex/MFD/chip-onboarding-goal.md --stat`: targeted diff succeeds and shows the WeekAdvance decision-impact patch; full diff still blocks.
- `git fsck --no-progress`: timeout after 30s.
- `node .../vitest/vitest.mjs run src/features/week-advance/WeekAdvance.test.tsx --reporter=verbose --pool=forks`: no runner output after 180s; process sampled at 0% CPU while loading Node dependencies.
- `node .../typescript/lib/tsc.js --noEmit --project apps/web/tsconfig.json --pretty false`: no diagnostics after 180s; process sampled at 0% CPU while reading dependency declarations.
- `node .../vite/bin/vite.js build --mode production`: produced no output and exited/killed with code -1 before Vite startup output in this desktop shell.
- Static stale preview: `python3` server mapping `/MFD/` to `apps/web/dist` plus in-app browser loaded the old build with no console errors, but Chip was not enabled in that build.

## Preflight Repo State

- `git status --short`: clean at start.
- `git branch --show-current`: `main`.
- `git log -1 --oneline`: `dc7740a Sprint 46: Polish standings signals (#54)`.
- Repo rules: no checked-in `AGENTS.md` or `CLAUDE.md` found in this checkout; applying Kevin's supplied AGENTS instructions from the prompt.
- Existing `.codex/MFD`: `sprint71-resume-audit.md` only.
- `pnpm --version`: unavailable (`pnpm: command not found`).
- `node_modules`: missing.
- Fallback expected for test commands: `npx --yes pnpm@9.15.9 ...`.
- Save schema baseline: `packages/engine/src/config/difficulty.ts` exports `SAVE_VERSION = 35`.
- Initial dirty files: none.

## Existing Chip / Guidance Audit

### Components and Stores

- `packages/design-system/components/Chip/`: Chip SVG primitive, poses, dialogue bubble, reduced-motion behavior.
- `apps/web/src/features/companion/ChipHost.tsx`: setup/onboarding overlay, `VITE_CHIP_ENABLED` gate, legacy localStorage skip key `mfd.chip.onboarding`.
- `apps/web/src/features/companion/ChipDock.tsx`: persistent post-setup dock, controls, route beat/live beat rendering, quiet controls, `What now?`, `Where am I?`, pending decision badge.
- `apps/web/src/features/companion/store.ts`: Zustand Chip state, pose priority windows, dialogue fields, read receipts, basic `advance/dismiss/reset`.
- `apps/web/src/features/companion/dockPersistence.ts`: local dock preferences at `mfd.chip.local`.
- `apps/web/src/features/companion/readReceipts.ts`: additive web-only read receipts at `mfd.chip.read.v1`.
- `apps/web/src/features/companion/useChipEvents.ts` and `eventBridge.ts`: week rollover Chip events, weekly dialogue selection, pose reactions, quiet and spam guards.
- `apps/web/src/features/route-coaching/routeBeatRegistry.ts`: route coaching beats for roster, staff, cap lab, draft, trade center, scouting.
- `apps/web/src/features/route-coaching/useActiveRouteBeats.ts`: resolves route beat eligibility using store receipts.

### Dialogue and Onboarding

- `apps/web/src/features/companion/dialogue/onboarding.ts`: 9 setup beats oriented around franchise setup. Current copy is stronger for setup identity than post-setup weekly play.
- `apps/web/src/features/companion/dialogue/weekly.ts`: short deterministic weekly dialogue variants by outcome.
- `apps/web/src/features/monday-briefing/MondayBriefing.tsx`: existing Chip commentary around briefing.
- `apps/web/src/features/onboarding/TutorialOverlay.tsx` and `packages/engine/src/systems/tutorial.ts`: older generic tutorial/help surfaces.

### Decision and Weekly Surfaces

- `apps/web/src/features/week-advance/WeekAdvance.tsx`: readiness checklist, matchup radar, stakes panel, advance button.
- `apps/web/src/features/contracts/ContractsCap.tsx`: contract detail modal with consequence list for cuts.
- `apps/web/src/features/contracts/CapLaboratory.tsx`: cap sandbox, queued moves, projection, consequence list.
- `apps/web/src/features/trades/TradeCenter.tsx`: incoming/proposal trade workflow with value comparison and confirmation.
- `apps/web/src/features/depth-chart/DepthChart.tsx` and `apps/web/src/features/game-plan/GamePlanSetup.tsx`: high-priority route targets for first-ten-minute guidance.

### Feature Flags and Persistence

- Existing Chip gate: `VITE_CHIP_ENABLED === 'true'`.
- No TTS scaffold found.
- Existing share/export helpers exist for season recap and scrapbook via `apps/web/src/features/season/recap-share.ts`, but no Chip share-event scaffold found.
- Chip persistence is browser-local only and does not touch dynasty save schema.

### Existing Tests

- Companion: `ChipHost.test.tsx`, `ChipDock.test.tsx`, `store.test.ts`, `eventBridge.test.ts`, `useChipEvents.test.ts`, `readReceipts.test.ts`, route coaching tests.
- Weekly dialogue determinism: `dialogue/weekly.test.ts`.
- Onboarding dialogue validation: `dialogue/onboarding.test.ts`.
- Week advance, contracts, cap lab, trades each have focused component tests.

## Current Journey vs Target Journey

Current:
- Setup Chip is present and visually strong, but it is mostly a setup companion.
- Post-setup Chip gives short weekly outcome remarks and route coaching on a few routes.
- `What now?` replays the last weekly line instead of producing a ranked next action.
- Decision impact exists in isolated UI pieces, but there is no common immediate/season/future/risk language.
- Skip/read receipts suppress repetition, but there is no formal onboarding progress state machine or clear reset/replay/snooze workflow.
- TTS and share-card scaffolding are absent.

Target:
- Chip has explicit onboarding progress, beat IDs, route/context gates, idempotent trigger handling, resume, reset, replay, and snooze.
- First-time players get a concise first-10-minute arc: chair framing, weekly loop, briefing, roster/depth, game plan, advance, post-advance debrief, decision impact, and advanced-system map.
- After week advance, Chip explains what changed, why it matters, top next actions, risks, feature links, and confidence.
- Major decision surfaces share concise impact explainers: immediate, this season, future, risk/uncertainty, and difficulty/severity where available.
- Player can replay/reset onboarding, snooze Chip temporarily, and ask what to do now without being trapped.
- TTS/share scaffolds are feature-flagged and default safe.

## Slice Checklist

- [x] Slice 1: Preflight safety check, repo rule scan, current Chip audit.
- [x] Slice 1: Create checkpoint file.
- [x] Slice 2: Formal Chip onboarding state machine and tests.
- [x] Slice 3: First-10-minute arc copy/context upgrades and tests.
- [x] Slice 4: Deterministic weekly guidance ranking and tests.
- [x] Slice 5: Decision impact explainers on highest-impact surfaces and tests.
- [x] Slice 6: Replay/reset/snooze/re-enable controls and tests.
- [x] Slice 7: TTS scaffold behind `VITE_CHIP_TTS_ENABLED` and tests.
- [x] Slice 8: Share scaffold behind `VITE_MFD_SHARE_ENABLED` and tests.
- [ ] Slice 9: QA, targeted/full verification, manual playthrough, final completion audit.

## Files Touched Per Slice

- Slice 1:
  - `.codex/MFD/chip-onboarding-goal.md`
- Slice 2:
  - `apps/web/src/features/companion/onboardingMachine.ts`
  - `apps/web/src/features/companion/onboardingMachine.test.ts`
- Slice 3:
  - `apps/web/src/features/companion/dialogue/onboarding.ts`
  - `apps/web/src/features/companion/dialogue/onboarding.test.ts`
  - `apps/web/src/features/route-coaching/routeBeatRegistry.ts`
  - `apps/web/src/features/route-coaching/routeBeatRegistry.test.ts`
  - `apps/web/src/features/route-coaching/useActiveRouteBeats.ts`
  - `apps/web/src/features/route-coaching/useActiveRouteBeats.test.ts`
  - `apps/web/src/features/companion/featureVisibilityMatrix.ts`
  - `apps/web/src/features/companion/featureVisibilityMatrix.test.ts`
- Slice 4:
  - `apps/web/src/features/companion/weeklyGuidance.ts`
  - `apps/web/src/features/companion/weeklyGuidance.test.ts`
  - `apps/web/src/features/companion/eventBridge.ts`
  - `apps/web/src/features/companion/eventBridge.test.ts`
  - `apps/web/src/features/companion/useChipEvents.ts`
  - `apps/web/src/features/companion/useChipEvents.test.ts`
- Slice 5:
  - `apps/web/src/features/companion/decisionImpact.ts`
  - `apps/web/src/features/companion/decisionImpact.test.ts`
  - `apps/web/src/features/week-advance/WeekAdvance.tsx`
  - `apps/web/src/features/week-advance/WeekAdvance.test.tsx`
  - `apps/web/src/features/contracts/CapLaboratory.tsx`
  - `apps/web/src/features/contracts/CapLaboratory.test.tsx`
  - `apps/web/src/features/trades/TradeCenter.tsx`
  - `apps/web/src/features/trades/TradeCenter.test.tsx`
- Slice 6:
  - `apps/web/src/features/companion/dockControls.ts`
  - `apps/web/src/features/companion/dockControls.test.ts`
  - `apps/web/src/features/companion/ChipDock.tsx`
  - `apps/web/src/features/companion/ChipDock.test.tsx`
- Slice 7:
  - `apps/web/src/features/companion/chipVoice.ts`
  - `apps/web/src/features/companion/chipVoice.test.ts`
- Slice 8:
  - `apps/web/src/features/companion/chipShare.ts`
  - `apps/web/src/features/companion/chipShare.test.ts`

## Tests Run Per Slice

- Slice 1:
  - Not applicable; audit/checkpoint only.
- Slice 2:
  - `npx --yes pnpm@9.15.9 --filter @mfd/web exec vitest run src/features/companion/onboardingMachine.test.ts`
  - Result: PASS, 4 tests.
- Slice 3:
  - `npx --yes pnpm@9.15.9 --filter @mfd/web exec vitest run src/features/route-coaching/routeBeatRegistry.test.ts src/features/route-coaching/useActiveRouteBeats.test.ts`
  - Result: PASS, 18 tests.
  - `npx --yes pnpm@9.15.9 --filter @mfd/web exec vitest run src/features/companion/dialogue/onboarding.test.ts`
  - Result: PASS, 8 tests.
- Slice 4:
  - `npx --yes pnpm@9.15.9 --filter @mfd/web exec vitest run src/features/companion/weeklyGuidance.test.ts`
  - Result: PASS, 4 tests.
  - `npx --yes pnpm@9.15.9 --filter @mfd/web exec vitest run src/features/companion/useChipEvents.test.ts src/features/companion/eventBridge.test.ts`
  - Result: PASS, 24 tests.
- Slice 5:
  - `npx --yes pnpm@9.15.9 --filter @mfd/web exec vitest run src/features/companion/decisionImpact.test.ts`
  - Result: PASS, 3 tests.
  - `npx --yes pnpm@9.15.9 --filter @mfd/web exec vitest run src/features/week-advance/WeekAdvance.test.tsx src/features/contracts/CapLaboratory.test.tsx src/features/trades/TradeCenter.test.tsx`
  - Result: BLOCKED/HUNG locally before output; killed only the spawned Vitest worker/npm process after no runner output.
- Slice 6:
  - `npx --yes pnpm@9.15.9 --filter @mfd/web exec vitest run src/features/companion/ChipDock.test.tsx`
  - Result: BLOCKED/HUNG locally before output; killed only the spawned Vitest worker/npm process after no runner output.
  - `npx --yes pnpm@9.15.9 --filter @mfd/web exec vitest run src/features/companion/dockControls.test.ts`
  - Result: BLOCKED locally. After removing a TSX import from the control reducer, this isolated suite still exits/hangs without diagnostics in this shell. Production build covers the module syntactically, but this test file has not produced a clean pass locally.
- Slice 7:
  - `./node_modules/.bin/vitest run src/features/companion/dockControls.test.ts src/features/companion/chipVoice.test.ts src/features/companion/chipShare.test.ts src/features/companion/featureVisibilityMatrix.test.ts --reporter=verbose`
  - Partial result before manual stop: `chipVoice.test.ts` PASS, 4 tests. Combined command then stalled on `dockControls.test.ts`.
- Slice 8:
  - `./node_modules/.bin/vitest run src/features/companion/dockControls.test.ts src/features/companion/chipVoice.test.ts src/features/companion/chipShare.test.ts src/features/companion/featureVisibilityMatrix.test.ts --reporter=verbose`
  - Partial result before manual stop: `chipShare.test.ts` PASS, 4 tests; `featureVisibilityMatrix.test.ts` PASS, 4 tests. Combined command then stalled on `dockControls.test.ts`.
- Slice 9:
  - `./node_modules/.bin/vite build --mode production`
  - Result: PASS. Built 2,511 modules and completed in 11m 22s; existing large-chunk warning remains.
  - `./node_modules/.bin/tsc --noEmit --project tsconfig.json --pretty false`
  - Result: BLOCKED/HUNG locally; no diagnostics after >150s, killed only that MFD `tsc` process.
  - Dev server smoke: `VITE_CHIP_ENABLED=true ./node_modules/.bin/vite --host 127.0.0.1 --port 5173`
  - Result: server reached ready state at `http://127.0.0.1:5173/MFD/`, but browser tooling blocked. Playwright connector returned `Transport closed`; Playwright CLI wrapper stalled under `npm exec`; HTTP `curl` requests hung while Vite repeatedly restarted on watched config/package files. Manual browser playthrough not completed.

## Feature Visibility Matrix

Implemented as `apps/web/src/features/companion/featureVisibilityMatrix.ts`.

- First-ten-minute features: Monday Briefing, Roster, Depth Chart, Game Plan, Week Advance.
- Weekly/post-result features: Inbox, Schedule, Standings, League Pulse, Film Room, Team Needs.
- Pressure-window features: Injuries, Contracts, Cap Lab, Trades, Waivers, Practice Squad.
- Offseason/draft features: Scouting, Draft, Free Agency.
- Deep-dive/legacy features: Coaching, Power Rankings, Analytics, Record Book, Settings/Save Load.

The matrix records route/entry point, purpose, why it matters, best introduction moment, first-time action, advanced note, and verification status.

## Completion Audit Status

- Product audit: partially passing by code inspection and build. First-10-minute arc, weekly loop, route coaching expansion, decision-impact model, replay/reset/re-enable controls, feature matrix, TTS scaffold, and share scaffold are implemented. Browser/manual confirmation is blocked.
- Engineering audit: partially passing. State machine, idempotent progress, browser-local persistence, reset/replay/snooze controls, weekly guidance tests, decision-impact pure tests, safe flags, and production build are present. `dockControls.test.ts`, TSX component tests, typecheck, git status/diff, and browser manual pass remain blocked locally.
- Commands/evidence audit: build passed; many targeted tests passed before the local runner instability. Latest `git status`/`git diff` attempts hang with no output in this desktop session, while a GitHub Desktop git status process is also present in the repo.
- Manual playthrough: blocked. Dev server reached ready state but HTTP/browser inspection did not complete because Vite repeatedly restarted under watcher activity and both Playwright connector/CLI paths were unavailable.

## Resume Instructions

If context compacts or the run pauses:

1. Re-read this file.
2. Re-run `git status --short`.
3. Continue from the highest-priority incomplete slice above.
4. Keep persistence browser-local unless a save-schema change becomes unavoidable.
5. Use `npx --yes pnpm@9.15.9 ...` if global `pnpm` is still unavailable.
6. Do not mark complete until the final completion audit passes against current repo state.
