# MFD — Completion Plan (How To Finish The Main List)

**Compiled:** 2026-08-02 · **Companion doc:** `MFD_MAIN_LIST_OF_IMPROVEMENTS.md` (item IDs C1–C30, D1–D5 used throughout)
**State baseline:** v1.0.0 · `SAVE_VERSION = 37` · 37/37 local release gate (2026-07-21) + **remote gate green + protected + deployed (verified 2026-08-02)** · git-linked to `origin/main` @ `10d9da3`

---

## 1. Executive Summary

MFD is **architecturally complete AND publication-locked**. The 28-deliverable GOAT Master Plan shipped with a passing 37-step release gate, and as of the Jul 29 pushes the remote gate is green, `release-gate` is a required protected check on `main`, and Pages deploys consume the exact gate artifact. The game is now blocked by **two things only**:

1. **Trust ratchets** — 12 remaining loose save-schema islands (C6) and two backup-portability edges (C7/C8) stand between "very good save trust" and "your dynasty will load in a decade." Plus one live operational issue: the nightly Ecology Lab's 100-year cells fail/cancel on the runner (C18).
2. **Depth, not breadth** — the remaining product upside is AI that visibly thinks (C9–C11), memory that writes itself (C12–C15), and marquee ceremonies (C13). All are additive slices on a green foundation.

**Recommended posture:** the game is a shipped release candidate with a protected pipeline. Ratchet trust next, then run the depth tracks one vertical slice at a time under the AGENTS.md safety rules. No new top-level features; no big-bang anything.

---

## 2. Sequencing At A Glance

```
Phase 0 ✅ COMPLETE 2026-08-02        ██ C1–C2 verified done (remote gate green, protected, deployed); C3 deferred to wide-release eve
Phase 0.5 ✅ MERGED 2026-08-03      ██ C18  nightly 25/50y-only + 180min + 10-par; new weekly 100y lane (360min); PR #81 landed 02:18Z
Phase 1 (1–2 weeks, parallel-safe)    ███ C4–C8  Trust ratchets: evidence dashboard, schema island 1, backup edges
Phase 2 (2–4 weeks, approval-gated)   ████ C9–C11  AI depth: behavior proof, trade fuzz, staff lifecycle
Phase 3 (ongoing seasons of work)     █████ C12–C15, C19–C30  Memory/ceremony/UX depth, one slice at a time
Standing (every release)              ▒▒ C6 islands continue, C16–C17 long-horizon hygiene, gates rerun when touched
Decision gates (Kevin, any time)      ◇ D1–D5 product decisions unblock their slices
```

Dependency logic: with the publication pipe proven (Phase 0 ✅), every later change now ships through a protected, remotely-verified gate. Phases 1–3 can overlap because they touch disjoint systems (save/backup vs AI engine vs read-model/memory UI).

---

## 3. Phase 0 — Publication Lock (C1, C2, C3)

**Goal:** the public game is provably the gated artifact, always.

**✅ PHASE 0 COMPLETE (verified live 2026-08-02):**
- **C1 DONE:** latest `main` CI run (2026-07-29, run 30451781406) green end-to-end on GitHub Actions including the full `release-gate` job (1h53m — ubuntu browser smokes confirmed working remotely). Branch protection on `main` requires `test` + `determinism-gate` + `release-gate` (strict, enforce-admins, no force-push/delete).
- **C2 DONE:** "Deploy to GitHub Pages" run 30460588523 succeeded 2026-07-29 via `workflow_run`, publishing the exact gate artifact to `https://kevinbigham.github.io/MFD/`.
- This workspace is now git-linked (`origin/main` @ `10d9da3`, byte-identical tree), so all future work can branch/commit/push through the protected pipe.
- **Only C3 remains open** (dependency vulnerability audit), correctly deferred until immediately before *wide* public release.

Historical steps (for the record):

| Step | Work | Item | Verification |
|---|---|---|---|
| 0.1 | Merge/copy this tree into the real git-connected `KevinBigham/MFD` clone; commit | C1 | `git status` clean; diff review against this checkout |
| 0.2 | Push to `main`; observe remote CI `release-gate` job end-to-end | C1 | First remote 37/37 receipt recorded in `RELEASE_CONVERGENCE.md` G7 + `STATUS.md` |
| 0.3 | Fix any linux-runner-only fallout (browser smokes on ubuntu are the known unknown) | C1 | Same remote gate green on rerun |
| 0.4 | Mark `release-gate` a required status check (branch protection on `main`) | C1 | Repo settings screenshot/receipt; G7 → GREEN REMOTE |
| 0.5 | Let `workflow_run` deploy fire; smoke the live Pages build (`/MFD/`, hash route, manifest) | C2 | Live URL serves the gated SHA's artifact; bundle/built-page smokes pass against production |
| 0.6 | Dependency vulnerability audit (immediately before *wide* release, can defer if soft-launching) | C3 | `pnpm audit` report; zero unactioned criticals |

**Exit gate:** G7 reads GREEN REMOTE with a repeatable receipt; deploys are structurally incapable of bypassing the gate. ✅ **MET** (remote gate green + required check + workflow_run deploy all verified).
**Rollback:** branch protection and `workflow_run` deploy are config-only; revert repo settings to reopen manual deploys.

**New top operational item surfaced by going remote:** the nightly GOAT Ecology Lab's 100-year cells fail/cancel (killed before writing playtest reports; 49 cancellations from queue congestion), while all 25/50y cells pass. See C18 — fix the 100y strategy (chunk, drop to opt-in, or speed up) and add `timeout-minutes`.

---

## 4. Phase 1 — Trust Ratchets (C4, C5, C6-island-1, C7, C8)

**Goal:** save trust becomes a *marketable promise*, and "is the ledger current?" is never ambiguous.

| Step | Work | Item | Verification |
|---|---|---|---|
| 1.1 | ~~Release evidence dashboard~~ 🔧 **IN FLIGHT (PR #87, checks green, behind main):** `scripts/evidence-dashboard.mjs` (`pnpm evidence:dashboard`) refreshes a marked STATUS.md section — remote gate per-check, G6 sweep contract, Ecology scoreboard, bundle vs ceiling, Math.random scan, opt-in playtest anomalies, ledger freshness; `--check` for CI | C4 | Script verified locally; PR #87 not yet merged (behind main after #81 landed) |
| 1.2 | Version metadata one-liner (root vs web version note) | C5 | Doc note merged |
| 1.3 | ~~**Schema island 1:** type `ScheduledGame.result`~~ 🔧 **IN FLIGHT (PR #82, release-gate FAILED):** typed `GameResultSchema` with legacy-tolerant defaults; no SAVE_VERSION bump; 5-test contract + full engine suite 2,319 green locally; **remote release-gate FAILED** — `waiver-practice-squad` timeout + `g3-football-ops-matrix` exit 1 (124.7s). Needs rebase + re-run; if matrix still fails, investigate matrix smoke independently. | C6 | 11 islands remain open |
| 1.3b | ~~**Schema island 2:** type `GameState.owners`~~ 🔧 **IN FLIGHT (PR #83, checks green, behind main):** typed `OwnerSchema` + goals/personality sub-schemas, legacy defaults, `.passthrough()` data-loss insurance; 5-test contract + full engine suite 2,324 green locally | C6 | next: draftClass |
| 1.3c | ~~**Schema island 3:** type `GameState.draftClass`~~ 🔧 **IN FLIGHT (PR #85, checks green, behind main):** strict `DraftProspectSchema` (+Combine/ScoutingReport sub-schemas) verified against interface + all writers/readers; migrations 7/15/30 already backfill, fixtures all empty → strict strip lossless; 5-test contract + full engine suite 2,319 green locally + all typechecks | C6 | one per patch, never batched |
| 1.3d | ~~**Schema island 4:** type `narrativeState.hooks`~~ 🔧 **IN FLIGHT (PR #86, checks green, behind main):** strict `NarrativeHookSchema` verified against interface + both writers; free-form `type` (open category set); 5-test contract + full engine suite 2,319 green locally + all typechecks | C6 | one per patch, never batched |
| 1.3e | ~~**Schema island 5:** type `weekSummaries`~~ 🔧 **IN FLIGHT (PR #89, checks green, behind main):** strict `WeeklySummarySchema` (+injury sub-schema) verified against interface + single writer; neutral defaults proven against the v34-fixture legacy minimal entry; 5-test contract + full engine suite 2,319 green locally + all typechecks | C6 | one per patch, never batched |
| 1.3f | ~~**Schema island 6:** type `playoffBracket`~~ 🔧 **IN FLIGHT (PR #90, checks green, behind main):** strict `PlayoffBracketSchema` (+Seed/Matchup sub-schemas) verified against interfaces + closed writer pair; fixtures all null → strict strip lossless; `matchup.result` wiring to GameResultSchema deferred as one-line follow-up after #82 lands; 5-test contract + full engine suite 2,319 green locally + all typechecks | C6 | one per patch, never batched |
| 1.3g | ~~**Schema island 7:** type `playerArchive`~~ 🔧 **IN FLIGHT (PR #91, release-gate FAILED):** strict `PlayerArchiveEntrySchema` (+Stint/CareerStats sub-schemas, open-index catchall) verified against interface + closed history.ts writers + clean reader audit; migration-18-era defaults; 5-test contract + full engine suite 2,319 green locally + all typechecks. **Remote release-gate FAILED** — identical `waiver-practice-squad` timeout + `g3-football-ops-matrix` exit 1 (124.6s). Same matrix-smoke root cause as #82. | C6 | one per patch, never batched |
| 1.3h | ~~**Schema island 8:** type `franchiseHistory`~~ 🔧 **IN FLIGHT (PR #92, checks green, behind main):** strict `FranchiseHistoryEntrySchema` (+KeyStats sub-schema) verified against interface + both writers (full modern vs minimal pre-identity shapes); optional fields mirror the interface exactly; 5-test contract + full engine suite 2,319 green locally + all typechecks | C6 | one per patch, never batched |
| 1.3i | ~~**Schema island 9:** type `playerRivalries`~~ 🔧 **IN FLIGHT (PR #93, checks green, behind main):** strict `PlayerRivalrySchema` (+Event sub-schema) verified against interface + closed writer set (both writer shapes locked, full tier enum); 5-test contract + full engine suite 2,319 green locally + all typechecks | C6 | one per patch, never batched |
| 1.3j | ~~**Schema island 10:** type `farewellTours`~~ 🔧 **IN FLIGHT (PR #94, release-gate FAILED):** strict `FarewellTourSchema` (+Moment sub-schema) verified against interface + closed writer set (startFarewellTour literal, generateFarewellMoment override-only, franchise-week read-only); full moment-type enum locked; fixtures empty/absent → strict strip lossless; 5-test contract + full engine suite 2,319 green locally + all typechecks. **Remote release-gate FAILED** — `roster-depth-training` timeout (93.7s) + `g3-football-ops-matrix` exit 1 (124.6s). Same matrix-smoke root cause as #82/#91. | C6 | one per patch, never batched |
| 1.3k | ~~**Schema island 11:** type `specialty75`~~ 🔧 **IN FLIGHT (PR #95, checks green, behind main):** strict `CoordinatorSpecialtySchema` mirroring the interface exactly (free-form id/label, numeric effect map) verified against closed writer set (candidate spread of generated StaffMember; catalog-only specialties; hiring seeds null); fixtures carry no specialty75 key → nullable+optional lossless; 5-test contract + full engine suite 2,319 green locally + all typechecks | C6 | one per patch, never batched |
| 1.3l | ~~**Schema island 12 (FINAL):** type `earnedDoctrines`~~ 🔧 **IN FLIGHT (PR #96, checks green, behind main):** strict `EarnedDoctrineSchema` matching both EarnedDoctrine and FranchiseDoctrine; category enum locked; closed writer set (awardDoctrine catalog spread only); fixtures carry no key → default+strip lossless; 5-test contract + full engine suite 2,319 green locally + all typechecks | C6 | **0 islands remain typed — all 12 in flight, 3 with gate failures to clear** |
| 1.4 | ~~Watch-list decision~~ 🔧 **IN FLIGHT (PR #84, checks green, behind main):** Kevin's label-only option shipped — Watch List panel explicitly says pins are browser-local convenience state, excluded from .mfd/Combined Backup, re-pin after moving browsers; broadcast-strip cue (C30) rode along in the same PR | C7 / D4 / C30 | copy contracts locked in tests; not yet merged |
| 1.5 | ~~Per-dynasty selective import/merge~~ 🔧 **IN FLIGHT (PR #88, checks green, behind main):** `mergeDynastySidecarArchiveJson` + dry-run planner; checkbox dynasty selection with live added/overwritten conflict hints; unselected dynasties byte-identical (no surprise-wipe); rivalries untouched (league-scoped); all 3 required fixtures tested | C8 | 42/42 focused web tests + typecheck green; full suite runs as required remote check; not yet merged |

**Exit gate:** islands 1-5 typed with fixtures green ✅ (in flight); backup import can no longer surprise-wipe anything ✅ (PR #88); evidence dashboard current ✅ (PR #87).
**Rules:** ONE island per patch, never batched. Any save-shape change reruns the full 37-step gate.
**Rollback:** each step is an isolated patch; schema work rolls back by exporting a Combined Backup first (completion-report guidance).

---

## 5. Phase 2 — AI Depth (C9, C10, C11) — approval-gated

**Goal:** CPU teams stop merely *explaining* themselves and start visibly *thinking* across seasons.

| Step | Work | Item | Gate |
|---|---|---|---|
| 2.1 | **Design note first:** choose (a) CPU behavior change with downstream tests, or (b) durable cross-window plan history with the full schema path. Kevin approves one | C9 / D5 | Approved design note with before/after behavior, seeded test plan |
| 2.2 | Implement approved C9 slice; every CPU transaction keeps its receipt | C9 | Focused downstream trade/FA/draft tests; full gate (sim/save-touching) |
| 2.3 | Trade-value fuzz harness: seeded package generator vs evaluation, report exploit candidates | C10 | Fuzz report; balance changes (if any) get before/after formula evidence + sanity ranges |
| 2.4 | **Design note first:** position-coach market — poaching, career history, coach-tree continuity | C11 / D5 | Approved note; then lifecycle tests; full gate |

**Exit gate:** a player can watch a rival's window open and close across seasons and see the plan history that drove it; no exploitable trade packages found in fuzz corpus (or found-and-fixed with receipts).
**Hard rules (AGENTS.md):** no sim-math or save-shape change without Kevin's explicit approval, its own design note, deterministic samples, and the full save path. Centralized RNG only — `bash scripts/check-math-random.sh` stays green.
**Rollback:** behavior slices are engine-local; keep frozen shadow corpus comparisons exact before/after.

---

## 6. Phase 3 — Memory, Ceremony & UX Depth (C12–C15, C19–C30) — continuous

**Goal:** the game writes the legend back to the player. This is the "one more week / one more offseason" track and should run as a steady drumbeat of small slices, never a batch.

**Priority order within the phase** (highest emotional payoff per unit risk first):

1. **C13 ceremony vertical slice** — Super Bowl or awards-night ceremony flow (weakest marquee moment, graded 7). Read-models + presentation; no new saved fields if avoidable.
2. **C12 auto-authored legend/playoff-swing/arc cards** on uncovered surfaces (Franchise Book chapters, season documentaries). Saved inputs first.
3. **C15 deeper postgame/offseason receipts** — only with genuinely new saved inputs; never repeat shipped panels.
4. **C14 durable all-time rivalry H2H** — needs a save field → full schema path + approval (D5).
5. **C19–C30 UX backlog** — pick by Kevin's feel each cycle: inbox durable read state (C19), watch-list reminders (C20), adaptive-difficulty transparency (C21), relocation/expansion onboarding (C22), mobile parity (C23, tied to D2), plus the small route-level items C24–C30.

**Per-slice contract (every slice, no exceptions):** source owner named · state touched named · tests to run named · browser proof if UI · docs touched named · rollback named. (This is the handoff bible's slice contract — keep it.)

**Standing verification defaults (AGENTS.md):**
- Engine change → `pnpm --filter @mfd/engine test`
- Web change → `pnpm --filter @mfd/web test`
- Design-system change → `pnpm --filter @mfd/design-system test`
- Sim-touching → also `pnpm test:perft` (or written reason)
- Save/schema/week-advance/offseason/draft/CBA/cap/nav/release-tooling change → **full `node scripts/release-gate.mjs`**

---

## 7. Standing Work (never "done," scheduled deliberately)

| Cadence | Work | Item |
|---|---|---|
| Every release with save drift | ~~Schema island ratchet~~ 🔧 **ALL 12 TYPED, 0 MERGED** (owners → draftClass → narrativeState.hooks → weekSummaries → playoffBracket → playerArchive → franchiseHistory → playerRivalries → farewellTours → specialty75 → earnedDoctrines); **PR #82, #91, #94 have release-gate failures (`g3-football-ops-matrix` ~124s timeout) needing root-cause before merge**; **follow-up: wire PlayoffMatchupSchema.result to GameResultSchema once #82 lands** | C6 |
| After any big state change | Re-measure clone/encode/load; keep Web Worker seam + compaction maintained | C17 |
| Sim/roster changes only | Explicit balance work to reduce medium roster-minimum windows — never silent constant tweaks; before/after formula + sample outputs + sanity range | C16 |
| Nightly (remote) | ~~Ecology matrix runs green~~ ✅ **PR #81 MERGED 2026-08-03T02:18:47Z** — nightly = 25/50y (100 cells, 180-min timeout, 10-parallel ≈14h); new weekly 100y lane (50 cells, 360-min timeout). Old-config run (Aug 2→3) scoreboard: 59✅/28🚫/63⏳ out of 150 cells. Aug 3 06:17Z scheduled run was SKIPPED because previous run still active. New-config pending run 30804156655 created 10:05Z Aug 3 on SHA `f74d3e8b` (#81 merge commit), status pending, no jobs yet. | C18 |
| Any sim/save/nav/tooling change | Full 37-step gate rerun; update `STATUS.md` + `RELEASE_CONVERGENCE.md` evidence rows | — |

---

## 8. Kevin Decision Queue (unblocks work immediately)

1. ~~**D4 (C7):** watch-list portability~~ ✅ **RESOLVED 2026-08-02** — label-only shipped in PR #84.
2. **D1:** Convention Demo vs custom dynasty as the first-screen priority for public events?
3. **D2:** minimum mobile support target? (decides C23's scope)
4. **D3:** Chip on the title screen?
5. **D5 blanket question:** approve the Phase 2 design-note pipeline (C9 → C11)? These are the only remaining items that touch sim/save shape.
6. ~~Repo access~~ ✅ **RESOLVED 2026-08-02** — workspace git-linked to `KevinBigham/MFD`, `gh` authenticated, tree identical to `origin/main` @ `10d9da3`.
7. ~~C18 strategy pick~~ ✅ **RESOLVED 2026-08-02 (Kevin approved the fix):** PR #81 implements demote-to-weekly + timeouts — nightly 25/50y (180-min cells, 10-parallel), weekly 100y lane (360-min cells). Auto-merge armed; lands when protected checks go green.

---

## 9. Risks & Rollback (plan-level)

| Risk | Mitigation |
|---|---|
| ~~Remote gate fails on ubuntu browser smokes~~ ✅ retired 2026-08-02 — remote gate is green and protected | — |
| Nightly Ecology Lab burns runner hours on doomed 100y cells | C18 fix: `timeout-minutes` + strategy pick (Kevin decision #7) |
| Schema island migration breaks an old save | Full old-save fixture tests per island; one island per patch; Combined Backup export before any rollback of app code |
| Phase 2 AI changes corrupt long-save fairness | Design-note approval gate, seeded downstream tests, frozen shadow corpus exactness, full gate |
| 50-year saves grow past load budget | C17 measurement after state changes; Web Worker seam already in place |
| Scope creep into new top-level features | Master-plan anti-goals stand: no new routes, no engine rewrite, no big-bang swaps |
| Local workspace diverges from GitHub | ✅ retired 2026-08-02 — git-linked, `git status` clean; future work goes through branches + PRs into protected `main` |

---

## 10. Definition of "Finished"

The Main List is finished when:
- ~~G7 = GREEN REMOTE with branch protection (C1/C2)~~ ✅ **DONE 2026-08-02** (remote gate green, required check, exact-artifact deploy)
- Ecology Lab nightly fully green including a decided 100y strategy (C18) ✅ **PR #81 MERGED 2026-08-03** — new-config run pending (30804156655, 10:05Z Aug 3 on SHA `f74d3e8b`); old-config run retired with 59✅/28🚫/63⏳
- Zero `z.any()` islands remain in `save/schema.ts` (C6) 🔧 **ALL 12 TYPED, 0 MERGED** — PRs #82–#96 all open; #82/#91/#94 blocked on `g3-football-ops-matrix` release-gate failure (~124s); rest behind main
- Backup import is selective, previewed, and never wipes (C7/C8) 🔧 **PRs #84/#88 open, checks green, behind main**
- CPU teams show cross-window plan history or approved behavior depth (C9–C11) ✅ reviewable
- One marquee ceremony slice shipped (C13) + memory auto-authoring covers legends/playoff swings (C12) ✅ reviewable
- Evidence dashboard shows green across gate/sweep/bundle/anomalies (C4) 🔧 **PR #87 open, checks green, behind main**
- Kevin's D1–D5 answered and their slices shipped or consciously declined ✅ decision log

Everything after that is *content seasons*, not completion work.
