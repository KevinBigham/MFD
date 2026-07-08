# Fable GOAT Review

Review date: 2026-07-05
Reviewer: Claude Fable 5 (challenging the Codex audit packet, not re-auditing the repo)
Repo root: `/Users/kevin/Downloads/MFD/MFD-main`
Inputs: `FABLE_HANDOFF.md`, `CODEX_DEEP_AUDIT.md`, `CODEX_AUDIT_STATUS.md`, `NEXT_CODEX_SESSION_PROMPT.md`, plus direct source verification of `ci.yml`, `deploy.yml`, `release-gate.mjs`, `dynasty-combined-backup.ts`, `dynasty-sidecar-archive.ts`, `save/schema.ts`, `config/navigation.ts`, README/CHANGELOG launch-gate sections, and `AGENTS.md`.

No source files were modified. No builds, gates, smokes, playtests, or shadow runs were executed.

---

## 1. Executive Judgment: What MFD Is Trying To Become

MFD is trying to be the most trustworthy single-player browser football dynasty sim ever built: deterministic seasons, saves you can carry for 25+ years, a week-to-week command center where cap/roster/coaching/media decisions stay legible, and a companion layer (Chip) that makes it feel hosted rather than administered.

Its differentiator is **trust engineering**. Most dynasty sims are opaque; MFD's identity is seeded RNG channels, source-guarded architecture boundaries, a 36-step release gate, honest UI copy about what does and doesn't write state, and portable dynasty memory. The GOAT version of MFD is the one where that trust infrastructure stops being defensive (disclaimers, boundaries, "this doesn't change gameplay") and becomes offensive: every mechanic you can see actually bites, and every memory the game creates travels with the dynasty.

That framing drives everything below: the shortest path to GOAT is not more features — it is (a) making the publication path as disciplined as the codebase, (b) making dynasty memory truly portable with safe merge semantics, and (c) converting one honest-but-shallow mechanic at a time into a real one.

## 2. Current Release Readiness: YELLOW-GREEN

**YELLOW-GREEN for motivated testers. YELLOW for wide/public release.** I agree with Codex's rating but for a sharper reason than they gave.

Green facts:
- Typecheck, focused engine/web/design tests, Math.random ban, and bundle-size gate all passed in this checkout (Codex-verified 2026-07-05).
- Navigation, command palette, draft war-room trades, inbox consumption, and position-coach UI — the scary old audit claims — are confirmed stale/fixed.
- Combined Backup genuinely closes the old sidecar-portability hole for users who use it.

Why still yellow, in order:
1. **The publication path is unguarded in three ways** (see §5, Risk 1). CI's release-gate job exists but structurally cannot block a deploy.
2. **No uninterrupted 36/36 release-gate run** exists for this checkout, and remote CI proof for the new release-gate job has never been observed (`RELEASE_CONVERGENCE.md` G7 is still YELLOW).
3. **Backup semantics can still destroy data**: sidecar import is validate-then-replace-wholesale, and classic `.mfd` still looks like a full backup to a casual user.
4. Docs that operators and agents rely on (README launch gates, CHANGELOG, project map, `CODEX_GAME_GUIDE.md`) contradict current source in load-bearing places.

None of these are game-quality problems. The game itself is closer to green than the process around shipping it.

## 3. What Codex Got Right

Verified directly against source — Codex was accurate on every claim I checked:

1. **The stale-findings downgrade list is correct.** `nav-items.test.ts` expects only dynamic player routes outside primary nav; `App.tsx:12,178` imports and uses `getNavUnlockStatus`; the old audit claims are dead.
2. **Deploy is lighter than CI** — `deploy.yml` runs install/typecheck/test/build and uploads `apps/web/dist` with no dependency on the `release-gate` job (`ci.yml:69-88` vs `deploy.yml:32-44`). Confirmed.
3. **The schema islands are exactly as described.** `ScheduledGameSchema.result: z.any().nullable()` (schema.ts:1777), `TeamPersistedSchema` is 2 fields + `.passthrough()` (2035-2038), `owners`/`draftClass` are `z.any` (2052-2054), and `franchiseHistory`, `playerArchive`, `playerRivalries`, `farewellTours`, `eventLog`, `narrativeState.hooks`, `weekSummaries`, `playoffBracket`, `earnedDoctrines` are all permissive (2070-2114, 2214). Confirmed line-by-line.
4. **Combined Backup is real and validates both halves** — `parseDynastyCombinedBackupJson` rejects invalid cartridges and invalid sidecar payloads independently (dynasty-combined-backup.ts:105-142). Confirmed.
5. **Sidecar import is validate-then-replace-wholesale** — `importDynastySidecarArchiveJson` calls six `replace*` functions with no preview/merge (dynasty-sidecar-archive.ts:229-243). Confirmed.
6. **README launch gates omit the release gate.** README lists four older commands; `package.json` has `release:gate`; nothing tests this. CHANGELOG's post-launch section stops at 2026-05-07. The `navigation.ts:4-6` comment still says "the current app shell does not hide nav items from this table" while `App.tsx` uses `getNavUnlockStatus`. All confirmed.
7. **The prioritization instinct is sound**: release discipline > portability semantics > schema hardening > gameplay depth is the right ladder, and "honest but shallow" is the right frame for trick plays / press responses — these are next-slice opportunities, not defects.

## 4. What Codex Missed or Overstated

### Missed (all confirmed in source, all material)

1. **Deploy triggers on a stale feature branch.** `deploy.yml:5` deploys to production GitHub Pages on push to `codex/phase4a-season-loop` *and* `main`. Any push to that long-dead branch — by an agent resurrecting old work, or a fat-fingered push — publishes to production, bypassing everything. This is the single cheapest high-value fix in the repo: delete one branch name from one line. Codex quoted `deploy.yml:32-44` but never mentioned the trigger block.

2. **CI's release-gate cannot block deploy even in principle, because they are parallel workflows.** Both `ci.yml` and `deploy.yml` trigger independently on push to `main`. The deploy doesn't merely "not require" the gate — it *races* it, and typically finishes first (deploy builds one package; the gate has a 75-minute timeout). Codex framed this as "deploy is indirectly protected unless branch protection exists." The truer statement: **as currently written, the release-gate job's result is decorative for publication.** Only branch protection on merges-to-main, an environment protection rule, or restructuring deploy to `workflow_run`-after-CI can change that.

3. **Build-environment drift between CI and deploy.** `deploy.yml:25` uses pnpm `version: 9` (floating major); `ci.yml:18` pins `9.15.9`, matching `package.json`. The artifact you test and the artifact you ship can be built by different package managers. One-line fix.

4. **Deploy's build skips the two artifact checks CI's test job runs.** CI runs `check-bundle-size.sh` and `smoke-test-built-page.sh` against its build; deploy uploads its own separately-built `dist` without either. The deployed artifact is never smoke-tested, even lightly.

5. **The sidecar rivalries fallback is a silent data-wipe path.** `parsePayload` at dynasty-sidecar-archive.ts:129 treats a *missing* `rivalries` key as `emptyRivalryPayload()`. Because import then calls `replaceRivalries(...)` (line 238), importing any archive exported before rivalries existed — or any combined backup built from one — **silently erases all local rivalry history**. This is a concrete, reproducible instance of the "replace wholesale" risk Codex described abstractly, and it should shape the merge/preview design (never replace a store the archive didn't actually carry).

### Overstated or under-hedged

6. **"CI now runs the full release gate" deserves a bigger asterisk.** The gate's 20+ browser/mobile smoke steps have never been observed passing on a remote ubuntu runner (Codex says so in §22, but the executive framing still credits CI with the gate). Until one remote green run exists, treat the CI release-gate job as *written*, not *working*. This matters for sequencing: gating deploy on a job that may not pass remotely would silently freeze all deploys.

7. **The docs-cleanup-first recommendation is slightly miscalibrated.** Codex's recommended first slice is docs-only (README/CHANGELOG/comments). Docs truth matters, but the stale deploy branch trigger and pnpm drift are the same size fix with strictly higher stakes. The first patch should carry both (see §13).

8. **Watch-list portability is listed as a P1-adjacent risk; it's a P3 decision.** Pins are convenience state. One labeling sentence in the UI resolves it until Combined Backup v2. Fair to track; not fair to sit next to deploy gating in the risk list.

## 5. Top 3 Shipping Risks

1. **Unguarded publication path** — stale branch trigger + parallel-workflow race + unpinned pnpm + unsmoked deploy artifact. A bad build can reach players while the release gate is still running, or from a branch nobody remembers. *Fix cost: ~10 lines of YAML + a policy decision.*

2. **Backup semantics that can destroy long-memory** — validate-then-replace sidecar import (including the rivalries empty-fallback wipe), plus classic `.mfd` still presenting as a complete backup. The users this hurts most are the exact multi-season players MFD is built for; each incident is unrecoverable trust damage. *Fix cost: UX hierarchy is hours; merge/preview is 1–2 days.*

3. **Unproven release-gate contract** — 36 steps defined, never once green end-to-end in this checkout or remotely. Until one uninterrupted 36/36 run exists (local, then remote), every "the gate covers that" claim is aspirational, and G7 stays honest-yellow. *Fix cost: one authorized full run + fixing whatever it finds.*

## 6. Top 3 Long-Term GOAT Opportunities

1. **Unified dynasty memory with real merge semantics.** One export artifact (Combined Backup as the only primary), per-dynasty selective import, preview-before-write, never-replace-what-wasn't-carried. When a player can move 30 years of history between browsers without fear, MFD has something no browser sim has.

2. **Close the honesty gap one mechanic at a time.** Trick plays into live drives with receipts; press responses into small, bounded, receipted consequences (morale/owner/social deltas); position coaches into a market/budget lifecycle. Every "this does not change gameplay" disclaimer that gets deleted because it became false is a direct emotional-payoff win. These are sim-touching changes: each needs its own design note, before/after formulas, and Kevin's explicit approval per `AGENTS.md` — never casual.

3. **The 25/50-year trust corpus as a product claim.** Deterministic replay snapshots, save export/import cycles across versions, anomaly budgets, schema strictness ratcheting up island-by-island (starting with `ScheduledGame.result`). This converts the existing determinism discipline into a marketable promise: "your dynasty will still load in a decade."

## 7. Decision: What Goes First

**Release/deploy + doc-truth cleanup first.** Then backup portability. Then schema hardening. Gameplay depth runs as the parallel multi-week arc, gated on Kevin's design approval.

Reasoning:
- The deploy fixes are the highest ROI-per-line in the repo, zero product risk, and every subsequent patch ships through that pipe. Fixing the pipe first makes everything after it safer.
- Backup portability is next because it's the only current path to *unrecoverable user harm* (data wipe), and the rivalries fallback makes that concrete, not hypothetical.
- Schema hardening is high-value but save-shape-adjacent: per house rules it needs explicit approval, migration tests, and old-save fixtures per island. It should proceed island-by-island behind that discipline, not as a big bang.
- Gameplay depth is the real GOAT payoff but the wrong *first* move: shipping it through an unguarded deploy pipe with wipeable backups would be building the penthouse before the foundation inspection.

## 8. Ranked Improvement Board

Full board with scoring in `FABLE_PRIORITY_BOARD.md`. Top of the board:

| # | Item | ROI | Risk | Effort | Conf. | First files |
|---|------|-----|------|--------|-------|-------------|
| 1 | Deploy integrity: drop stale branch, pin pnpm 9.15.9, add bundle+built-page smoke to deploy build | Very high | Low | ~1h | High | `.github/workflows/deploy.yml` |
| 2 | Release-doc truth + drift test: README gates, CHANGELOG note, `navigation.ts` comment, guide nav line | High | Low | ~1–2h | High | `README.md`, `CHANGELOG.md`, `packages/engine/src/config/navigation.ts`, `CODEX_GAME_GUIDE.md`, new `scripts/__tests__/release-docs.test.mjs` |
| 3 | One authorized full 36/36 release-gate run (local), then one remote CI run; record in RELEASE_CONVERGENCE | High | Low | 2–4h wall | High | `RELEASE_CONVERGENCE.md`, `STATUS.md` |
| 4 | Structurally gate deploy on CI success (workflow_run or merged workflow) — only after #3 proves remote green | High | Med | 2–4h | Med | `.github/workflows/deploy.yml`, `.github/workflows/ci.yml` |
| 5 | Combined Backup as primary CTA; classic `.mfd` demoted to "Advanced: current save only" | High | Low | 2–3h | High | `apps/web/src/features/dynasty-cartridge/DynastyCartridge.tsx` + tests |
| 6 | Sidecar import preview + no-replace-absent-stores (fixes rivalries wipe) → then per-dynasty merge | High | Med | 1–2d | Med-high | `apps/web/src/lib/dynasty-sidecar-archive.ts`, `DynastyCartridge.tsx` |
| 7 | Schema hardening island 1: typed `ScheduledGame.result` + old-save fixtures (needs explicit approval) | High | Med-high | 1–2d | Med | `packages/engine/src/save/schema.ts`, `migrations.ts`, `save.test.ts` |
| 8 | Watch-list portability decision: label as local convenience state (or fold into Combined Backup v2) | Med | Low | 1–2h | High | `apps/web/src/features/watch-list/*` |
| 9 | Press responses → bounded receipted consequences (design note + Kevin approval first) | High | Med | 2–4d | Med | design doc first; then `press-conference.ts`, `game-store.ts`, `PressConferenceModal.tsx` |
| 10 | Trick plays into live sim with receipts (design note + approval; biggest sim risk) | Very high | High | 1–2wk | Low-med | design doc first; then `trick-plays.ts`, `game-sim.ts` boundary tests |
| 11 | Position-coach market/budget lifecycle | Med | Med | 3–5d | Med | `position-coaches.ts`, `CoachingStaff.tsx` |
| 12 | Schema islands 2+: owners, draftClass, eventLog, playoffBracket (one island per patch) | Med-high | Med | ongoing | Med | `schema.ts`, `migrations.ts` |
| 13 | 25/50-year trust corpus refresh + anomaly budget | Med (long) | Low | 2–3d | Med | `scripts/`, playtest harnesses |
| 14 | Release evidence dashboard (latest gate, remote gate, sweep, bundle, anomalies) | Med | Low | 1–2d | Med | `scripts/`, `STATUS.md` |

## 9. 2-Hour Plan

1. (~45 min) **Patch 1 — deploy integrity + doc truth** (the single best first patch, §13): `deploy.yml` trigger/pin/smokes, README launch gates, CHANGELOG note, `navigation.ts` comment, `CODEX_GAME_GUIDE.md` nav line + path caveat, release-doc drift test.
2. (~30 min) Verify: `corepack pnpm -r --workspace-concurrency=1 typecheck`, drift test, `node scripts/release-gate.mjs --dry-run` (still 36 steps), engine `navigation.test.ts`.
3. (~30 min) Update `RELEASE_CONVERGENCE.md` + `STATUS.md`: record the deploy-race finding, the rivalries-wipe finding, and mark `MFD_PROJECT_MAP.md` superseded by the July 5 packet.
4. (~15 min) Write the approval ask for the full release-gate run (it writes generated artifacts — needs Kevin's explicit go).

## 10. 2-Day Plan

**Day 1 — publication trust.** Morning: 2-hour plan above. Afternoon: with approval, one uninterrupted local `node scripts/release-gate.mjs` 36/36; fix only what it flags; record evidence. If a git-connected checkout is available: push, observe remote CI release-gate, then Board #4 (structurally gate deploy) plus branch-protection recommendation.

**Day 2 — backup trust.** Board #5: Combined Backup becomes the primary export/import CTA; classic `.mfd` relabeled "Advanced — current save only, excludes dynasty archives." Board #6 phase 1: import preview (counts + dynasties shown before any write; explicit confirm) and the no-replace-absent-stores fix for the rivalries wipe. Board #8: watch-list labeled as browser-local convenience state. All with focused tests; no schema or sim changes.

## 11. 2-Week GOAT Roadmap

**Week 1 — trust foundation locked.**
- Days 1–2: as above (publication + backup trust).
- Day 3: Board #6 phase 2 — per-dynasty selective import / merge semantics with conflict summary; tests for merge, absent-store, and older-archive fixtures.
- Day 4: Board #7 with Kevin's explicit approval — typed `GameResult` schema for `ScheduledGame.result`, migration, old-save fixtures. One island only.
- Day 5: Board #13 kickoff — regenerate long-run corpus (25-year opt-in run), record anomaly budget; buffer for gate fallout.

**Week 2 — depth, by approval.**
- Days 6–7: Press-consequence design note (exact deltas, caps, receipts, before/after examples) → Kevin approves/rejects → implement the bounded version if approved. This deletes the first "does not change gameplay" disclaimer.
- Days 8–9: Trick-play live-sim design note (which of the 8 plays, trigger conditions, RNG channels, failure modes, receipt format, boundary-test changes). Design only unless approved early; this is the highest-risk sim change on the board.
- Day 10: Schema island 2 (owners or draftClass), release evidence snapshot in `STATUS.md`, and a re-scored priority board.

Exit state: publication is structurally gated, dynasty memory is portable and merge-safe, the first schema island is typed, one shallow mechanic is real, and there is a design-approved path for the second.

## 12. What NOT To Spend Time On Yet

- **Any fresh full-repo audit.** The packet is current and verified; re-auditing is pure burn.
- **Big-bang schema strictness.** One island per patch with fixtures, or old saves break. Never all islands at once.
- **Trick-play implementation before its design note is approved.** Highest sim risk on the board; boundary tests exist precisely to stop casual wiring.
- **Rewriting historical audit ledgers** (`MFD_PROJECT_MAP.md`, `MFD_MASTER_AUDIT_REPORT.md`, etc.). One supersession line each; they're history, not docs.
- **Performance work.** Bundle gate passes with 21 KB of headroom; no failing evidence exists.
- **Chip/companion feature expansion.** Chip is in good shape; depth elsewhere pays more.
- **Root-vs-web version metadata cleanup, dependency audit, engine refactors** — real, minor, later. (Dependency audit becomes worth an hour right before wide public release.)
- **Durable inbox read receipts** — out of scope by design; leave it.

## 13. The Single Best First Patch

**"Publication Integrity + Release-Doc Truth"** — one patch, zero product-behavior change, closes the most dangerous gap in the repo and stops docs from lying to the next agent:

1. `deploy.yml`: remove `codex/phase4a-season-loop` trigger; pin pnpm `9.15.9`; add bundle-size + built-page smoke after the build (artifact parity with CI).
2. `README.md`: launch gates lead with `pnpm release:gate` (36-step contract), keeping the focused commands as diagnostics.
3. `CHANGELOG.md`: short post-launch entry for July convergence (release gate, CI job, combined backup, deploy hardening).
4. `packages/engine/src/config/navigation.ts`: fix the stale "shell does not hide nav items" comment.
5. `CODEX_GAME_GUIDE.md`: fix the stale progressive-nav line; add old-path caveat.
6. New `scripts/__tests__/release-docs.test.mjs` drift test: README must mention `release:gate`; deploy.yml must not list non-main branch triggers and must pin the same pnpm as `package.json`.

Why this over Codex's docs-only slice: same effort class, and it also disarms a live production footgun (stale-branch deploy) instead of only fixing prose. Why not include deploy-gating-on-CI: gating on a remotely-unproven 75-minute job could silently freeze deploys — that's Board #4, sequenced after one remote green run.

## 14. Paste-Ready Implementation Prompt

The full prompt is in `docs/audits/FABLE_NEXT_PATCH_PROMPT.md`. Paste that file's contents into a fresh Claude Code session after approving implementation.
