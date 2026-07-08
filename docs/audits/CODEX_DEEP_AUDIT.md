# MFD Codex Deep Audit

Audit date: 2026-07-05
Audit root: `/Users/kevin/Downloads/MFD/MFD-main`
Mode: audit-only. Source, build, release, and production files were not intentionally modified.

## 1. Executive Summary

Verdict: YELLOW-GREEN for motivated testers, YELLOW for wide/public release discipline.

The July 5 working tree is meaningfully healthier than older root audit reports. The biggest stale findings are now fixed: static route discoverability, command-palette roster cap, draft war-room trade application, owner inbox consumption, and position-coach UI wiring all have current code and tests behind them.

The remaining high-leverage risks are not "fake app" risks. They are release discipline, long-memory portability, schema hardening, and visible mechanics that are honest but still shallow. The app has strong deterministic infrastructure and a serious local release gate, but this extracted checkout cannot prove git provenance or remote CI status, and deploy can still publish after a weaker workflow than the full gate.

## 2. What Project Is Trying To Become

MFD is trying to be a single-player browser football dynasty sim with long-running save trust, deterministic seasons, dense franchise operations, and a player-facing companion layer. The product center is not a generic dashboard; it is a week-to-week command center where football, cap, roster, coaching, history, and media systems remain legible across many seasons.

Evidence:

- `README.md:24-35` describes deterministic seasons, seeded RNG, stable saves, client-side engine, cap/roster/coaching/scouting, broadcast/history surfaces, and browser-only scope.
- `DESIGN.md:14-17` frames the goals as starting and sustaining a dynasty, making weekly decisions legible, making save/load safe, and keeping cinematic presentation tied to simulation data.
- `CODEX_GAME_GUIDE.md:11-19` matches the same product/stack facts and calls `SAVE_VERSION = 36` the current source truth.
- `MFD_GOAT_HANDOFF_BIBLE.md:42-46` rates the game as locally public-release ready but says the next level is long-horizon confidence, stronger AI proof, unified dynasty memory, richer draft/staff drama, and deeper saved-input receipts.
- `README.md:37-47` and design-system tests confirm Chip is a major product affordance, not just decoration.

## 3. Current Architecture

The architecture is a TypeScript monorepo with:

- `packages/engine`: deterministic engine, save schema/migrations, football/business systems, playtesting harnesses.
- `apps/web`: React/Vite app shell, TanStack Router routes, Zustand store/actions, Dexie saves, browser-local sidecars.
- `packages/design-system`: Pixel UI primitives, Chip, command palette, tokens.
- `scripts`: release gate, browser smokes, playtest/shadow tools, bundle/RNG checks.
- `.github/workflows`: CI and Pages deploy.

Evidence:

- `package.json:1-26`, `apps/web/package.json:1-40`, `packages/engine/package.json:1-31`, and `packages/design-system/package.json:1-34` show workspace packages, scripts, and dependency boundaries.
- `CODEX_GAME_GUIDE.md:21-35` and `37-55` provide the clearest repo-local topology and hotspot map: web shell/features/lib, pure engine systems/types/save/rng/playtesting, content, design system, scripts, and workflows.
- `apps/web/src/app/App.tsx:1-88` imports the router, store selectors/actions, design-system components, engine helpers, route components, and shell lifecycle sidecar syncs.
- `packages/engine/src/rng/index.ts:1-11` states all randomness should flow through named RNG channels.
- `apps/web/src/app/architecture-boundaries.test.ts:135-212` actively guards architecture boundaries: browser runtime imports only exported engine package surfaces, production engine modules avoid browser APIs, and direct week-sim calls stay behind `apps/web/src/app/store/sim.ts`.

## 4. File/Folder Map

- `apps/web/src/app`: root app shell, route registry, store, persistence, shell lifecycle syncs.
- `apps/web/src/features`: feature routes and panels such as coaching, inbox, game plan, game day, dynasty cartridge, watch list, franchise archives.
- `apps/web/src/lib`: browser persistence sidecars, combined backup, archive sync, presenters.
- `packages/engine/src/systems`: sim and franchise domain modules.
- `packages/engine/src/save`: Zod schema, migrations, compatibility tests.
- `packages/engine/src/config`: difficulty/save version and navigation unlock metadata.
- `packages/design-system/components`: Pixel and Chip UI primitives.
- `scripts`: release/build/smoke/playtest tooling.
- `docs`, root ledgers: project status, release convergence, prior audits and plans.

High-risk spine files called out by the repo guide:

- Engine: `franchise-week.ts`, `franchise-week-helpers.ts`, `game-sim.ts`, `offseason.ts`, `draft.ts`, `contracts.ts`, `contract-helpers.ts`, `trade-*`, `cba-engine.ts`, `league-rules.ts`, `invariants.ts`, plus season/save smoke tests (`CODEX_GAME_GUIDE.md:41-45`).
- Web: `App.tsx`, `store/game-store.ts`, `store/sim.ts`, `store/persistence.ts`, route features, and browser-local sidecar helpers (`CODEX_GAME_GUIDE.md:47-49`).
- Tooling/workflows: release gate, smoke scripts, playtest/shadow reports, bundle/RNG checks, CI and deploy workflows (`CODEX_GAME_GUIDE.md:53-55`).

## 5. Main Data Flows

Primary play flow:

1. Web route/component reads from Zustand selectors in `apps/web/src/app/store`.
2. Actions clone current `GameState`, call engine systems, then commit and autosave.
3. Engine systems use seeded RNG channels and write deterministic state outputs.
4. Saves flow through Dexie slots and `.mfd` cartridge import/export.
5. Browser-local sidecars carry archive memories that are not always inside `GameState`.

Feature architecture flow:

- Route and navigation additions are high-touch: `createRoute`, route-tree registration, `NAV_ITEMS`, `NAV_GROUPS`, source tests, route coaching/Chip visibility, mobile behavior, store navigation targets, and direct-navigation proof are expected to move together (`CODEX_GAME_GUIDE.md:127-148`).
- Week advance flows from `WeekAdvance` -> store `actions.advanceWeek` -> `runAdvanceWeek` -> engine `advanceFranchiseWeek`, and only the returned `EngineOutput.nextState` is committed (`CODEX_GAME_GUIDE.md:87-95`).

Save/backup flow:

- Web import/load normalization is parse cartridge -> `migrate(raw, SAVE_VERSION)` -> `SaveStateSchema.safeParse` -> `ensureAgentsInitialized` (`apps/web/src/app/store/persistence.ts:24-41`, `CODEX_GAME_GUIDE.md:3204-3213`).
- Classic `.mfd` path: `buildCartridge` sanitizes a cloned save and serializes `mfd-cartridge.v1` (`packages/engine/src/systems/dynasty-cartridge.ts:57-105`).
- Combined backup path: web builds a valid cartridge, reads complete dynasty sidecars, packages both, and validates both on import (`apps/web/src/lib/dynasty-combined-backup.ts:78-142`).
- Sidecar archive path: Hall of Fame, scrapbook, ROY, roster continuity, career meta, and rivalries are validated together before replacement (`apps/web/src/lib/dynasty-sidecar-archive.ts:46-55`, `120-145`, `229-243`).

## 6. Best Strengths

- Determinism discipline is strong. `scripts/check-math-random.sh:14-29` bans unauthorized `Math.random()`, and the command passed. Engine RNG has explicit channels in `packages/engine/src/rng/index.ts:10-38`.
- Release-gate coverage is broad. `scripts/release-gate.mjs:88-203` defines static checks, typechecks, tests, build, bundle smoke, RNG audit, season/save smoke, playtests, shadow regression, G4, and G1/G2/G3/G5/G6 browser/mobile checks.
- Navigation convergence is substantially fixed. `apps/web/src/app/App.tsx:197-277` now has all static route nav items, `286-295` groups them, and `nav-items.test.ts:157-164` expects only dynamic player routes outside nav.
- Save portability improved a lot. Combined backup packages `.mfd` plus complete dynasty sidecars and validates both (`DynastyCartridge.tsx:189-230`, `287-311`, `449-460`).
- Draft war-room trust improved. Current accepted trades validate source-backed live assets, transfer real picks, update draft order, and record news (`draft-war-room.ts:442-474`), with focused tests passing.
- Product copy is unusually honest about boundaries. Inbox, watch list, Hall of Fame, trick plays, and press surfaces repeatedly explain what does and does not write state.

## 7. Biggest Risks / Weaknesses

### P1 - Deploy Can Still Publish Without The Full Gate

Evidence:

- CI now has a real `release-gate` job at `.github/workflows/ci.yml:69-88`.
- Deploy still runs install, typecheck, tests, and web build, then uploads `apps/web/dist` (`.github/workflows/deploy.yml:32-44`) without requiring that `release-gate` job.
- The full gate is broad and expensive (`scripts/release-gate.mjs:88-203`), and was intentionally not run in this audit because it writes outside `docs/audits/`.
- `RELEASE_CONVERGENCE.md:24` still calls G7 YELLOW until one uninterrupted 36/36 local run and remote CI proof exist.

Inference:

CI is no longer the old weak point, but release publication is still only indirectly protected. If deploy triggers on `main`, a public artifact can be built after the lighter deploy workflow unless branch protection or environment rules externally require the release-gate result.

### P1 - Long-Memory Portability Is Better, But Still Split

Evidence:

- Combined backups include cartridge and complete sidecars (`DynastyCartridge.tsx:449-460`).
- Classic `.mfd` still strips broadcast payloads and serializes only the sanitized save (`packages/engine/src/systems/dynasty-cartridge.ts:52-79`, `84-105`).
- Complete sidecar import validates first but then replaces Hall of Fame, scrapbook, ROY, roster continuity, career meta, and rivalries wholesale (`dynasty-sidecar-archive.ts:229-243`).
- Watch List is explicitly localStorage-only at `mfd.watchlist.v1` and outside GameState cartridges (`watchListPrefs.ts:1-18`, `WatchListScreen.tsx:156-164`).

Inference:

The old sidecar omission is no longer a blocker if users use Combined Backup. Risk remains when users use classic `.mfd`, import sidecar archives over newer local history, or expect convenience pins/watch lists to travel with the dynasty.

### P1/P2 - Save Schema Still Has Permissive Long-History Islands

Evidence:

- `ScheduledGameSchema.result` is `z.any().nullable()` (`schema.ts:1774-1778`).
- Teams are `.passthrough()` after only philosophy/gmStrategy (`schema.ts:2035-2038`).
- Owners and draft classes use `z.any` (`schema.ts:2052-2054`).
- Franchise history, player archive, rivalries, farewell tours, event log, narrative hooks, week summaries, playoff bracket, and earned doctrines remain permissive (`schema.ts:2070-2074`, `2100-2113`, `2214`).

Inference:

The current save system is good enough for early release, but multi-decade trust will improve most from replacing high-value `z.any` areas with typed schemas and migration tests.

### P2 - Some Visible Mechanics Are Honest But Shallow

Evidence:

- Trick plays have an 8-play catalog and deterministic helpers (`trick-plays.ts:52-157`, `187-267`) but source tests ensure they are not in `game-sim.ts`, `game-flow.ts`, or `franchise-week.ts` (`trick-plays.test.ts:198-231`). UI copy says the same (`GamePlanSetup.tsx:625-628`).
- Press conference engine records can add effects (`press-conference.ts:77-91`, `93-155`), but player response choices only save quote/tier (`game-store.ts:2685-2693`) and modal copy says gameplay does not change (`PressConferenceModal.tsx:119-129`).
- Position coaches now initialize/upgrade and affect progression (`CoachingStaff.tsx:602-669`, `772-805`; `progression.ts:209-230`), but upgrade is instant replacement via helper/store actions rather than a budgeted hiring or development market (`position-coaches.ts:204-217`, `game-store.ts:2516-2551`).

Inference:

These are not hidden broken systems; they are next-slice opportunities. The product has truthful copy, but repeatedly telling users "this does not change gameplay" is a ceiling on emotional payoff.

### P2 - Documentation And Prior Audits Are Stale In Important Places

Evidence:

- README launch gates list older commands and omit `release:gate` (`README.md:74-81`).
- CHANGELOG post-launch section stops at 2026-05-07 and older launch-gate list (`CHANGELOG.md:3-12`, `32-42`) despite July convergence work.
- `MFD_PROJECT_MAP.md:19-20`, `107-116` still says dry-run was 35 steps and CI/deploy do not run the full gate; current release gate is 36 steps and CI now has the gate.
- `packages/engine/src/config/navigation.ts:4-6` says the current app shell does not hide nav items from the table, while `App.tsx:177-193` now uses `getNavUnlockStatus`.
- `CODEX_GAME_GUIDE.md:3-9` and GOAT docs still use the old `/Users/tkevinbigham/MFD/MFD-main` path; the audit root here is `/Users/kevin/Downloads/MFD/MFD-main`.
- `CODEX_GAME_GUIDE.md:139` repeats the now-stale claim that the web shell does not import progressive unlock helpers, while current `App.tsx:12` and `178` do import/use `getNavUnlockStatus`.

Inference:

Docs are useful as historical ledgers, but Fable/Claude should treat older root audits and project maps as hypotheses until verified against current source.

## 8. Bugs / Likely Bugs

- Deploy gating gap: likely release process bug unless branch protection externally requires CI release-gate before Pages deploy.
- Stale docs/comments: README, CHANGELOG, MFD_PROJECT_MAP, and navigation comments can mislead future agents/operators.
- Classic `.mfd` expectation risk: users may still choose "Download .mfd" and believe all dynasty memory moved, despite combined backup copy explaining the split.
- Sidecar replacement risk: importing a complete sidecar archive can overwrite newer local sidecar history because import is validated but not merge/preview based.
- Watch list portability gap: player pins are convenience state, but they now live in a visible route and are not in combined backup.

## 9. Missing Tests / Validation Gaps

Already strong:

- Focused tests passed for nav, backup/sidecar import, HOF sync, inbox boundaries, watch list, press modal, coaching, draft war-room, trick plays, position coaches, save schema, and design system.

Still missing or not rerun in this audit:

- One uninterrupted default `node scripts/release-gate.mjs` 36/36 run in this exact checkout.
- Remote GitHub Actions proof for the new `release-gate` CI job.
- Browser screenshot/route proof from this audit; July 5 ledger claims 81/81 routes and 162 screenshots, but this audit did not regenerate them.
- 25/50-year trust proof and fresh long-run save import/export corpus.
- Merge/preview tests for sidecar import, because the feature does not exist yet.
- Tests asserting README/CHANGELOG release commands match package scripts and release-gate contract.

## 10. Security / Privacy

- App is browser-only and not a multiplayer or server-backed game (`README.md:35`), reducing remote service/security exposure.
- Save import paths parse JSON and validate through cartridge/schema or sidecar-specific validators. Combined backup rejects invalid cartridges and invalid sidecar payloads (`dynasty-combined-backup.test.ts:117-153`).
- Main privacy risk is local export content: combined backups and sidecar archives package long-running local history into JSON files. That is expected for a local game but should remain clear in UI copy.
- No dependency vulnerability audit, secret scan, CSP review, or npm advisory scan was performed in this audit.

## 11. Performance

- Bundle size gate passed in this audit: `engine-CEyXfJwr.js` is 291 KB gzip against a 312 KB ceiling.
- Release docs note existing Vite large-chunk warnings in build runs, but this audit intentionally did not rebuild `apps/web/dist`.
- G4/full web test evidence in `STATUS.md:40-48` is strong but was not regenerated here.
- High-value next performance proof is the full release gate plus a periodic 25/50-year opt-in run, not micro-optimizing current code without failing evidence.

## 12. UX / Product

Strengths:

- Navigation is now discoverable and grouped across the app shell.
- Command palette searches full roster and visible nav.
- Combined Backup copy is explicit and trust-oriented.
- Inbox/watch list/HOF/press/trick-play surfaces honestly say what state they do or do not change.
- July 5 status claims broad mobile/reduced-motion/screenshot proof (`STATUS.md:40-48`).

Risks:

- Honest boundary copy is useful but can feel like implementation disclaimers if left permanently on gameplay-facing screens.
- Classic `.mfd` vs Combined Backup still asks users to understand two portability levels.
- Trick plays, press responses, and some archive screens are visible enough that users may expect deeper effects.

## 13. Code Quality

Strong patterns:

- Store actions clone before mutation and commit through centralized paths.
- Source-boundary tests use file reads to prevent regression in route/nav/sidecar behaviors.
- `architecture-boundaries.test.ts` is a useful safety net for engine/web separation, private engine imports, direct week-sim boundaries, and sidecar leakage, but it is still source-pattern-based rather than runtime proof.
- Engine systems have many focused Vitest suites and deterministic helper injection.

Risks:

- Many engine systems and web routes are broad; source-boundary tests reduce drift but can become brittle string assertions.
- Save schema permissiveness means some consumers must still defensively handle arbitrary payloads.
- Older docs can misdirect future agents if they are not revalidated.

## 14. Dependency / Configuration

- Root pins `pnpm@9.15.9` (`package.json:5`), and `corepack pnpm --version` resolved `9.15.9`.
- Node in this audit is `v24.16.0`; package engines only require Node `>=20` (`package.json:23-25`), while GitHub Actions uses Node 20 (`ci.yml:20-23`, `deploy.yml:27-30`).
- Root package version is `0.0.1` (`package.json:1-4`), web app version is `1.0.0` (`apps/web/package.json:1-4`), and README says v1.0.0 (`README.md:7`). This is likely intentional private monorepo metadata, but it is ambiguous for automation.
- No dependency vulnerability or license audit was performed.

## 15. Git / Branch / Release Risks

- `.git` is absent in this extracted checkout; `git status`, diff, branch, log, and remote proof are unavailable.
- `RELEASE_CONVERGENCE.md:7-12` documents the same no-git fact and says CI release-gate exists.
- Without git metadata, this audit cannot distinguish user edits, generated assets, or uncommitted changes except by direct file evidence and mtimes.
- Pages deploy workflow is still a release risk unless repository settings require the CI release-gate before deploy.

## 16. Highest-Leverage Improvements

1. Make release-gate a hard publication dependency. Either require the CI `release-gate` job through branch protection/environment rules, or refactor deploy to consume a release-gated artifact.
2. Make Combined Backup the default/primary export and visually demote classic `.mfd` to advanced/legacy.
3. Add sidecar import preview/merge/selected-dynasty restore before replacing local archives.
4. Replace the top `z.any` save fields with typed schemas and migration tests, starting with scheduled game result, owners, draft class, event log, playoff bracket, and player archive.
5. Wire one honest-but-shallow mechanic end-to-end, preferably trick plays into live drives with receipts or press responses into bounded morale/owner/social effects.

## 17. Quick Wins

- Update README launch gates to include `pnpm release:gate` / `node scripts/release-gate.mjs`.
- Add a docs/test assertion that README/CHANGELOG release command snippets mention the current release-gate script.
- Fix stale comment in `packages/engine/src/config/navigation.ts:4-6`.
- Update `MFD_PROJECT_MAP.md` or mark it superseded by July 5 audit status.
- Add Watch List to combined backup, or explicitly label it as convenience state outside dynasty portability.
- Clarify package version policy: root private workspace `0.0.1` vs web/release `1.0.0`.

## 18. Medium-Term Upgrades

- Sidecar merge/preview flow with per-dynasty import, conflict summaries, and no-write parse preview.
- Strict schemas for core long-history fields plus old-save fixtures.
- Release workflow split into required chunks if full gate is too long for every PR, while keeping default release proof as one named contract.
- Browser proof generated from route registry, with contact sheets and reduced-motion mobile evidence as a reproducible command.
- Position-coach market/budget/development loop rather than instant generated upgrades.

## 19. Long-Term GOAT-Level Evolution

- 25/50-year trust corpus with deterministic replay snapshots, save export/import cycles, schema validation, and anomaly budgets.
- Full dynasty memory portability model: `GameState`, sidecars, preferences, watch lists, and archive restore semantics documented and testable.
- Gameplay-facing versions of currently boundary-copy systems: live trick plays, press consequences, richer staff rooms, deeper archive callbacks into active decisions.
- Release evidence dashboard that reports latest local gate, remote gate, browser route sweep, bundle size, and playtest high anomaly count.

Repo roadmap evidence:

- `CODEX_IMPROVEMENT_PLAN.md:47-70` is the current scorecard-style backlog. It prioritizes save/persistence, determinism, route shell, decision clarity, weekly loop, acquisition/AI, dynasty memory, Chip/UX, tooling, and architecture refactors.
- `MFD_GOAT_GAP_ANALYSIS.md:37-46` ranks the main GOAT gaps as long-horizon gate refresh, backup portability edges, AI explainability beyond route-local receipts, draft/player attachment, weekly guidance, shallow high-drama mechanics, staff depth, release channel enforcement, and dynasty archive authorship.
- `MFD_GOAT_GAP_ANALYSIS.md:73-82` names the compounding bets: full gate refresh, AI behavior proof, franchise/scrapbook authorship, transactional draft/trade receipts, progressive weekly guidance, and staff/position-coach lifecycle.
- `CODEX_GOAT_MARATHON_PROMPT.md:31-50` requires future implementation sessions to read `AGENTS.md`, `CODEX_GAME_GUIDE.md`, `CODEX_IMPROVEMENT_PLAN.md`, `STATUS.md`, `DESIGN.md`, and source files before editing, then classify the slice by save/sim/store/UI/content/tooling risk.

## 20. Specific Recommendations Next Coding Session

Recommended next session order:

1. Re-read `AGENTS.md`, `CODEX_GAME_GUIDE.md`, `CODEX_IMPROVEMENT_PLAN.md`, `MFD_GOAT_GAP_ANALYSIS.md`, `MFD_GOAT_HANDOFF_BIBLE.md`, and this audit packet; treat their old home-directory paths and stale nav-helper comments as doc drift.
2. Patch release documentation and stale comments only: README launch gates, CHANGELOG post-launch note, navigation comment, `CODEX_GAME_GUIDE.md` nav-helper line, and project-map supersession note.
3. Add a small release-doc drift test so `README.md` cannot omit `release:gate` again.
4. Decide whether deploy should depend on release-gate. If yes, modify workflow or repository settings; if no, document manual release policy.
5. Implement sidecar import preview/merge or add Watch List to combined backup, depending on whether user-facing portability or convenience-pin portability is more important.
6. Start save-schema hardening with `ScheduledGame.result` because it is central to replay/game-day consumers.

## 21. Verification Commands Run / Results

Passed:

- `node scripts/release-gate.mjs --dry-run` - 36 steps listed, no execution.
- `node scripts/release-gate.mjs --list` - 36 steps listed.
- `bash scripts/check-math-random.sh` - pass.
- `bash scripts/check-bundle-size.sh` - pass, 291 KB gzip vs 312 KB ceiling.
- `corepack pnpm -r --workspace-concurrency=1 typecheck` - pass across design-system, engine, web.
- Focused engine tests - 5 files / 105 tests passed.
- Focused web tests - 12 files / 100 tests passed.
- Design-system tests - 17 files / 105 tests passed.

Cleanup:

- Vitest wrote generated result caches under `node_modules/.vite/vitest/.../results.json`. Those generated cache files were removed after the run. A final recent-file check showed only `docs/audits` files recently touched.

Skipped:

- Full release gate, web build, browser smokes, visual sweeps, playtest-all, and shadow regression because they write outside `docs/audits/`.
- Git provenance commands because `.git` is absent.

## 22. Things Not Fully Audited

- Full app UX in a browser.
- Current remote CI status and branch protection.
- Deployed GitHub Pages artifact.
- Dependency vulnerability posture.
- All engine systems end-to-end.
- Full multi-year/25-year/50-year simulation trust.
- All docs beyond the high-signal root ledgers and directly relevant files.
