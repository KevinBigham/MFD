# Codex Audit Status

Audit root: `/Users/kevin/Downloads/MFD/MFD-main`
Started: 2026-07-05
Mode: audit-only. Source, schema, build, release, and production files were not intentionally modified.
Output directory: `/Users/kevin/Downloads/MFD/MFD-main/docs/audits/`

## Current Phase

Complete - baseline, subsystem audit, verification pass, deep audit, Fable handoff, and next-session prompt are written.

## Commands Run

- `mkdir -p docs/audits` - created the allowed audit-output directory.
- `pwd` - confirmed audit root `/Users/kevin/Downloads/MFD/MFD-main`.
- `ls -la` - confirmed monorepo-like checkout with app, packages, scripts, docs, built dist, and no visible `.git`.
- `rg --files -g '!node_modules/**' -g '!.git/**' -g '!dist/**' -g '!build/**' -g '!coverage/**' | sort | sed -n '1,260p'` - mapped non-noise source/docs.
- `find . -maxdepth 1 -type d -name .git -print` - produced no output; `.git` absent.
- `node --version` - `v24.16.0`.
- `corepack pnpm --version` - `9.15.9`.
- `node scripts/release-gate.mjs --dry-run` - listed 36/36 release-gate steps without executing them.
- `node scripts/release-gate.mjs --list` - same 36-step release-gate contract.
- `bash scripts/check-math-random.sh` - passed; no unauthorized `Math.random()` usage.
- `bash scripts/check-bundle-size.sh` - passed; `engine-CEyXfJwr.js` is 291 KB gzip against 312 KB ceiling.
- `find apps packages scripts docs .github -maxdepth 3 -type f | sort | sed -n '1,320p'` - mapped main files and confirmed audit docs.
- `corepack pnpm -r --workspace-concurrency=1 typecheck` - passed across `@mfd/design-system`, `@mfd/engine`, and `@mfd/web`.
- `corepack pnpm --filter @mfd/engine test -- src/config/navigation.test.ts src/systems/draft-war-room.test.ts src/systems/trick-plays.test.ts src/systems/position-coaches.test.ts src/save/save.test.ts` - passed 5 files / 105 tests.
- `corepack pnpm --filter @mfd/web test -- src/app/nav-items.test.ts src/lib/dynasty-combined-backup.test.ts src/lib/dynasty-sidecar-archive.test.ts src/lib/hall-of-fame-archive-sync.test.ts src/features/dynasty-cartridge/DynastyCartridge.test.tsx src/features/dynasty-cartridge/DynastyCartridge.source.test.ts src/features/inbox/InboxTriage.test.tsx src/features/inbox/buildInboxMessages.test.ts src/features/watch-list/WatchListScreen.test.tsx src/features/watch-list/watchListPrefs.test.ts src/features/game-day/PressConferenceModal.test.tsx src/features/coaching/CoachingStaff.test.tsx` - passed 12 files / 100 tests.
- `corepack pnpm --filter @mfd/design-system test` - passed 17 files / 105 tests.
- `find . -type f -mmin -20 ...` - found only generated Vitest result caches plus audit docs after tests.
- `rm -f .../node_modules/.vite/vitest/.../results.json` - removed Vitest result cache files created/updated by verification.
- Completion-audit reads over `CODEX_GAME_GUIDE.md`, `CODEX_IMPROVEMENT_PLAN.md`, `CODEX_GOAT_MARATHON_PROMPT.md`, `MFD_GOAT_GAP_ANALYSIS.md`, `MFD_GOAT_HANDOFF_BIBLE.md`, `apps/web/src/app/architecture-boundaries.test.ts`, save/persistence, RNG, and current audit docs - confirmed the packet needed stronger repo-guide/GOAT evidence.
- `rg -n "getNavUnlockStatus|NAV_UNLOCK_RULES|isNavItemUnlocked|MIDSEASON_UNLOCK_WEEK" apps/web/src/app/App.tsx apps/web/src/app/nav-items.test.ts packages/engine/src/config/navigation.ts` - confirmed current source imports and uses progressive nav unlock helpers despite stale guide/source comments saying otherwise.
- Final `find . -type f -mmin -20 ...` - after cleanup, only audit docs remained recently touched.
- `apply_patch` - wrote `CODEX_DEEP_AUDIT.md`, rewrote `FABLE_HANDOFF.md`, created `NEXT_CODEX_SESSION_PROMPT.md`, and finalized this status file.

## Commands Skipped

- Full `node scripts/release-gate.mjs` - intentionally skipped because it runs production build, browser smokes, playtests, shadow regression, G4 soak, and other steps that write outside `docs/audits/`.
- `corepack pnpm --filter @mfd/web build` - skipped because it rewrites `apps/web/dist`.
- Browser smokes / G6 visual sweeps / playtest-all / shadow regression - skipped because they write `.logs`, screenshots, browser storage, generated reports, or other non-audit artifacts.
- `git status`, `git diff`, and branch/log provenance - unavailable because `.git` is absent in this extracted checkout.

## Files Read

- `/Users/kevin/Downloads/codex_audit_prompt_pack/projects/MFD/CODEX_AUDIT_PLAN.md`
- `/Users/kevin/Downloads/codex_audit_prompt_pack/audits/00_START_WITH_PLAN_COMMAND.txt`
- `/Users/kevin/Downloads/codex_audit_prompt_pack/audits/01_GENERIC_GOAL_COMMAND.txt`
- `/Users/kevin/Downloads/codex_audit_prompt_pack/audits/CODEX_AUDIT_PLAN_TEMPLATE.md`
- `/Users/kevin/Downloads/codex_audit_prompt_pack/audits/RUN_ORDER_CHECKLIST.md`
- `AGENTS.md`, `README.md`, `CHANGELOG.md`, `DESIGN.md`, `STATUS.md`, `RELEASE_CONVERGENCE.md`, `CODEX_GAME_GUIDE.md`, `CODEX_IMPROVEMENT_PLAN.md`, `CODEX_GOAT_MARATHON_PROMPT.md`, `MFD_GOAT_GAP_ANALYSIS.md`, `MFD_GOAT_HANDOFF_BIBLE.md`, `MFD_PROJECT_MAP.md`, `MFD_MASTER_AUDIT_REPORT.md`, `MFD_SAVE_SYSTEM_AUDIT.md`
- `package.json`, `apps/web/package.json`, `packages/engine/package.json`, `packages/design-system/package.json`
- `scripts/release-gate.mjs`, `scripts/check-math-random.sh`, `scripts/check-bundle-size.sh`
- `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
- App shell/navigation: `apps/web/src/app/App.tsx`, `apps/web/src/app/nav-items.test.ts`, `apps/web/src/app/architecture-boundaries.test.ts`, `packages/engine/src/config/navigation.ts`, `packages/engine/src/config/navigation.test.ts`
- Persistence/backup: `apps/web/src/features/dynasty-cartridge/DynastyCartridge.tsx`, `apps/web/src/lib/dynasty-combined-backup.ts`, `apps/web/src/lib/dynasty-sidecar-archive.ts`, related tests, `packages/engine/src/systems/dynasty-cartridge.ts`, `apps/web/src/app/store/persistence.ts`
- Save schema/migrations: `packages/engine/src/save/schema.ts`, `packages/engine/src/save/migrations.ts`, `packages/engine/src/save/save.test.ts`
- Engine/RNG/systems: `packages/engine/src/config/difficulty.ts`, `packages/engine/src/rng/index.ts`, `packages/engine/src/systems/draft-war-room.ts`, `packages/engine/src/systems/trick-plays.ts`, `packages/engine/src/systems/position-coaches.ts`, `packages/engine/src/systems/progression.ts`, `packages/engine/src/systems/franchise-week.ts`, `packages/engine/src/systems/press-conference.ts`
- UI/product surfaces: `apps/web/src/features/game-plan/GamePlanSetup.tsx`, `apps/web/src/features/game-day/PressConferenceModal.tsx`, `apps/web/src/features/inbox/*`, `apps/web/src/features/coaching/CoachingStaff.tsx`, `apps/web/src/features/watch-list/*`, `apps/web/src/features/franchise/HallOfFameDirectory.tsx`

## Confirmed Findings

- Audit root is `/Users/kevin/Downloads/MFD/MFD-main`; `/Users/kevin/Downloads/MFD` is a wrapper folder.
- This checkout has no `.git`, so local branch/diff/log provenance cannot be audited here.
- CI now has a dependent `release-gate` job that runs `node scripts/release-gate.mjs` after test and determinism jobs, but Pages deploy still builds/deploys without depending on that full gate.
- Current release-gate plan has 36 steps covering static checks, typechecks, tests, production build, bundle/built-page smoke, determinism/playtest/shadow/G4, and G1/G2/G3/G5/G6 browser/mobile smokes.
- `CODEX_GAME_GUIDE.md` is the best repo-local operating map for topology, hotspots, route/store/save boundaries, and future first reads, but it still names the old `/Users/tkevinbigham/MFD/MFD-main` path and has stale progressive-nav commentary.
- Current `SAVE_VERSION` is source-confirmed as 36 in `packages/engine/src/config/difficulty.ts`; `CODEX_GAME_GUIDE.md`, `AGENTS.md`, and GOAT docs agree on this value.
- Engine/web boundaries are actively guarded: `apps/web/src/app/architecture-boundaries.test.ts` blocks private engine source imports from browser runtime code, browser APIs in production engine modules, direct week-sim calls outside `store/sim.ts`, and broad sidecar/runtime leakage.
- Navigation/direct-only findings in older root audits are stale: all static routes are now in `NAV_ITEMS`/`NAV_GROUPS`; only dynamic player routes remain contextual-only; command palette uses `visibleNavItems` plus full roster items and no 32-player cap.
- Combined backup materially fixes the old sidecar-portability gap for the main dynasty-history sidecars: `.mfd` cartridge plus Hall of Fame, scrapbook/playoff lore, ROY, roster continuity, GM career meta, and rivalries are packaged and validated together.
- Classic `.mfd` remains intentionally narrower: it exports `GameState`, strips broadcast payloads, and does not include browser-local sidecars.
- Complete sidecar import validates the archive before mutation, but then replaces the included sidecars wholesale; there is no preview/merge/conflict workflow.
- Watch list pins remain browser-local at `mfd.watchlist.v1` and outside `GameState` cartridges and the complete dynasty sidecar archive.
- Save schema v36 is broad and mostly guarded, but important long-history/payload islands remain permissive via `z.any()` or `.passthrough()` (`ScheduledGame.result`, owners, draftClass, franchiseHistory, playerArchive, playerRivalries, farewellTours, eventLog, narrative hooks, weekSummaries, playoffBracket, earnedDoctrines).
- Draft war-room trade application findings in older audits are stale/fixed: generation requires source-backed live picks; accepted offers transfer real picks, update live draft order, and record news receipts; focused engine tests passed.
- Trick plays remain intentionally planning-only: catalog and execution helpers exist, weekly prep can save planned IDs, but tests explicitly guard those helpers out of `game-sim.ts`, `game-flow.ts`, and `franchise-week.ts`.
- Position coaches are improved since older audits: UI can initialize and upgrade per role, store actions commit those changes, progression reads position coach bonuses, and season rollover advances tenure. The loop is still shallow compared with a full market/budget/development lifecycle.
- Inbox now consumes `ownerPersonalityInbox` into generated Ownership messages. Durable read receipts remain out of scope and local display state only.
- Press conference engine records can have active effects, but the player-facing postgame press response modal is quote-only and explicitly says result, owner reaction, player effects, news/social, and next-week state do not change.
- Hall of Fame sidecar sync improved: year rollover and explicit `Sync Current Save` can write the current live `game.hallOfFame` snapshot to the sidecar. Sidecar entries still never import back into `GameState`, and mismatches remain possible until rollover/manual sync.
- README and CHANGELOG are stale versus current release tooling: launch gates still list older commands and omit `pnpm release:gate` / `node scripts/release-gate.mjs`; changelog post-launch section stops at 2026-05-07 while July convergence docs carry newer truth.
- Root package version is `0.0.1` while `apps/web` and README say `1.0.0`; if automation reads root metadata, release identity remains ambiguous.
- GOAT roadmap docs converge on the same next-work ladder: refresh/prove the full 36-step gate, resolve backup/watch-list portability semantics, deepen AI behavior beyond route-local receipts, add stronger player/staff memory, and keep route/store/engine boundaries source-tested.

## Findings Downgraded As Stale / Fixed

- "CI does not run release gate" - stale for `.github/workflows/ci.yml`; now a `release-gate` job runs the full command. Still true for deploy gating.
- "Progressive unlock metadata unused by shell" - stale; app shell imports and uses `getNavUnlockStatus`.
- "`CODEX_GAME_GUIDE.md` / navigation comments say unlock metadata is not app-wired" - stale; `App.tsx` imports `getNavUnlockStatus`, and `nav-items.test.ts` expects that import/use.
- "Direct-only static routes are undiscoverable" - stale; nav tests now expect only `/player/$playerId` and `/player/$playerId/timeline` outside primary nav.
- "Command palette caps roster search to 32" - stale; current app maps the full sorted roster.
- "Draft war-room trade acceptance desyncs draft order / synthesizes picks" - stale/fixed in the audited paths and focused tests.
- "Position coach upgrade helper unused by UI" - stale; Coaching UI wires initialize/upgrade buttons.
- "Owner personality inbox store not consumed by Inbox" - stale; Inbox consumes the saved stream.
- "Hall of Fame sidecar can only sync at rollover" - partially stale; explicit sync exists. Reverse import into GameState still does not.
- "Complete sidecar archive import is paste-only" - stale for combined backups; file upload exists for combined backup. Standalone sidecar archive still has paste/copy/download controls.

## Open Questions

- No blocking questions.
- Unknown: remote GitHub Actions status for the new CI release-gate job, because this extracted checkout has no git remote/metadata and no workflow run was inspected.
- Unknown: whether deploy should be structurally blocked on the release-gate job or whether human release discipline is considered sufficient.

## Next Steps

- If implementation is approved later, start with the low-risk release-doc drift cleanup recommended in `NEXT_CODEX_SESSION_PROMPT.md`.
- If audit continues, inspect remote GitHub Actions / branch protection from a real git-connected checkout.

## What Remains Unfinished

- Full release-gate proof was not run in this audit.
- Browser screenshots/smokes were not rerun in this audit; current evidence comes from source/tests/docs and the July 5 ledger.
- No dependency vulnerability audit was performed.
- No source/build/release files were intentionally changed; audit packet files are complete under `docs/audits/`.
