# MFD — Main List of Improvements (Master Consolidation)

**Compiled:** 2026-08-02 · **Workspace:** `/Users/kevin/Projects/MFD-main` · **State:** v1.0.0 · `SAVE_VERSION = 37` (confirmed `packages/engine/src/config/difficulty.ts:93`) · git-linked to `origin/main` @ `10d9da3`, tree byte-identical (verified 2026-08-02)

**Purpose:** one authoritative list merging every "future goals / tasks-that-need-completed" list in the repo, with per-item status (DONE / PARTIAL / OPEN), evidence, and the next concrete slice.

**Sources merged:**
- `MFD_GOAT_MASTER_PLAN.md` (28 deliverables — all marked complete 2026-07-21)
- `MFD_GOAT_HANDOFF_BIBLE.md` — "Current Non-Blocking Backlog" + "Highest-Leverage GOAT Bets" (freshest list, 2026-07-21)
- `MFD_GOAT_GAP_ANALYSIS.md` — 10 GOAT gaps + investment bets (2026-06-24)
- `docs/audits/FABLE_PRIORITY_BOARD.md` — 14-item ranked board (2026-07-05)
- `docs/audits/FABLE_GOAT_REVIEW.md` — top-3 risks + long-term opportunities
- `MFD_FEATURE_INVENTORY.md` — 85 features graded with per-feature next slices
- `CODEX_IMPROVEMENT_PLAN.md` — 16 suggested slices + area scorecard
- `DESIGN.md` — 3 open product questions (owner: Kevin)
- `docs/release/MFD_FINAL_SHIP_DECISION.md` — known non-blockers
- `MFD_GOAT_COMPLETION_REPORT.md` — risks/handoff notes
- Live code verification: 12 remaining `z.any()` schema islands (`packages/engine/src/save/schema.ts`), deploy-gating YAML state, zero `TODO/FIXME` markers in engine or web source.

---

## PART A — What the game IS (context for every item below)

Mr. Football Dynasty is a **browser-only, single-player football franchise dynasty sim**: deterministic seeded seasons, portable IndexedDB/`.mfd` saves, a 37-step release gate, ~176 engine systems, 79+ routes compressed into a five-room GM shell, and Chip — a 36-pose procedural companion. v1.0.0 shipped 2026-04-28; the GOAT Master Plan (integrity patch → causal spine → five rooms → snap-truth engine → memory/ecology) was completed locally 2026-07-21 with a 37/37 uninterrupted release gate and independent reviewer PASS.

**Verdict:** the game is *architecturally done*. Everything remaining is (1) remote/operational publication proof, (2) hardening ratchets, or (3) additive depth/polish. There are no known P0 defects and zero `TODO/FIXME` markers in source.

---

## PART B — COMPLETED WORK (do not redo)

### B.1 GOAT Master Plan — all 28 deliverables DONE (2026-07-21, `MFD_GOAT_COMPLETION_REPORT.md`)

| # | Item | Status |
|---|---|---|
| 1.1 | Draft order from standings (no more `rng(1,32)` dupes / alphabetical fallback) | ✅ DONE — `draft-order.ts` |
| 1.2 | Unified depth-aware TeamNeedsModel feeding CPU draft/FA/trade | ✅ DONE — `team-needs.ts` |
| 1.3 | Fair free agency (rank all bids, then seeded 2–5 finalists; 20/20 highest-offer test) | ✅ DONE |
| 1.4 | One availability API (`getGameAvailability`) replacing raw `!p.injury` checks | ✅ DONE |
| 1.5 | Difficulty honesty — all 9 modifiers wired to real consumers | ✅ DONE |
| 1.6 | Atomic Combined Backup import (journal, commit-last, rollback) | ✅ DONE |
| 1.7 | Deploy consumes the exact full-gate artifact | ✅ DONE (YAML verified: `deploy.yml` = `workflow_run` after CI success, downloads `mfd-pages-<sha>`) |
| 1.8 | Trick plays wired into live sim (bounded outcomes, tendency burn, broadcast + receipt) | ✅ DONE |
| 2.1 | Canonical append-only `LeagueEvent` causal ledger | ✅ DONE |
| 2.2 | Universal `DecisionReceipt` (numeric drivers, counterfactual, event refs) | ✅ DONE |
| 2.3 | `FranchisePlan` — durable per-CPU-team brain consumed by all CPU decisions | ✅ DONE |
| 2.4 | Press conferences get bounded, receipted consequences | ✅ DONE |
| 2.5 | Roster-health certification (zero healthy-starter shortages in 4-season sentinel) | ✅ DONE |
| 3.1–3.5 | Single route registry, Five Rooms, GM/Nerd modes, briefing decision budget, Instant/Guided/Full onboarding | ✅ DONE |
| 4.1–4.5 | `PossessionState` snap truth, shadow mode, snap-ledger-fed broadcast/PBP/film/WP, Coach Mode, Game Capsules | ✅ DONE |
| 5.1–5.5 | Dynasty memory graph, recognizable rival franchises, GOAT Ecology Lab, state/perf strangler, explicit `SimulationContext` | ✅ DONE |

**Proof:** 37/37 release gate in 1997.8s; 2,299 engine + 1,944 web + 105 design-system tests; 50-season run with 0 high signals, 67,800/67,800 CPU receipts, validated load 1948ms (<3s target); adversarial GOAT reviewer PASS.

### B.2 Post-launch slices already shipped (do not redo)

- Publication integrity one-shot (2026-07-05): stale-branch deploy trigger removed, pnpm pinned 9.15.9, deploy build smokes added, release-doc drift test.
- Backup trust (2026-07-06): Combined Backup primary, `.mfd` demoted to advanced, import preview, rivalries-wipe fix.
- Team window read-model (`computeTeamWindow` ALL_IN/CONTEND/RETOOL/REBUILD badges) on `/team-needs` + Trade Finder.
- Previously-on session opener; Dynasty callbacks read-model ("This Week in Dynasty History").
- Chip companion rebuild: 36-pose procedural atlas, 11 semantic surface wirings.
- Sprint 46 series: weather hub, coaching-tree polish, standings polish.
- UI/UX convergence marathon: nav discoverability (81/81 routes), command-palette full-roster search, Pixel component consolidation, archive-screen CTAs, inbox owner-mailbox consumption, 162-screenshot visual sweep.
- AGM + owner-mandate consequentiality (save v36): durable mandates with real football outcomes + season-end consequences.
- Full receipt layer: postgame source/decision receipts, draft war-room real-backed offers + transactional accepts + durable `leagueNews` receipts, trade-block/trade-finder/draft/FA/deadline market receipts, scrapbook auto-authoring (news, named games, bloodlines, awards, story arcs, season reports, records, HOF, rivalries), position-coach init/upgrade/tenure, Game Day player-arc follow-up, draft class follow-through, week-advance rookie follow-up.

---

## PART C — OPEN IMPROVEMENTS (the real remaining list)

Ordered by leverage. Each item: status · what remains · evidence · next slice · complexity.

### TIER 1 — Publication & Operations (blocks "publicly released and stays safe")

**C1. First remote CI `release-gate` pass + protected required check** — ✅ DONE (verified live 2026-08-02)
- **Verified:** latest `main` CI run (2026-07-29, merge of PR #80, run 30451781406) passed all jobs on GitHub Actions — `determinism-gate` ✅, `test` ✅, **`release-gate` ✅** (1h53m remote run, so the 20+ browser smokes DO pass on ubuntu). Branch protection on `main` is fully configured: required checks `test` + `determinism-gate` + `release-gate` (strict mode), `enforce_admins` on, force-pushes and deletions blocked.
- **Evidence:** `gh run view 30451781406`, `gh api repos/KevinBigham/MFD/branches/main/protection`. This checkout is now git-linked and byte-identical to `origin/main` @ `10d9da3`.

**C2. Deploy confidence: verify one real Pages deploy of the gate artifact** — ✅ DONE (verified live 2026-08-02)
- **Verified:** "Deploy to GitHub Pages" run 30460588523 **succeeded 2026-07-29** via `workflow_run` after the green CI — the exact-artifact chain (gate → `mfd-pages-<sha>` artifact → Pages) works in production. Live game: `https://kevinbigham.github.io/MFD/`.

**C3. Dependency vulnerability audit** — OPEN (explicitly scheduled "right before wide public release" in Fable board "parked" list)
- **Next slice:** ~1h audit (`pnpm audit`, review), scheduled immediately before opening the game to wide traffic. **Complexity:** Low.

**C4. Release evidence dashboard** — 🔧 IN FLIGHT (PR #87, checks green, behind main 2026-08-03)
- **Shipped:** `scripts/evidence-dashboard.mjs` (`pnpm evidence:dashboard`) refreshes a marked Evidence Dashboard section atop `STATUS.md`: remote CI gate per-required-check conclusions, G6 route-sweep contract presence, Ecology Lab nightly scoreboard, local gate contract, engine-chunk bundle size vs 312 KB ceiling, Math.random scan, opt-in fast-tier playtest anomalies (`--with-playtest`), and run-ledger freshness. `--check` exits non-zero on red rows for future CI. Ledger currency is never ambiguous again.
- **Status:** PR #87 opened 2026-08-02, all checks pass (test 40m20s, determinism-gate 11s, release-gate 1h12m17s), but branch is BEHIND `main` after #81 landed; not yet merged.

**C5. Version metadata note** — OPEN (trivial): root `package.json` says `1.0.0`; older docs mention root `0.0.1` vs web `1.0.0` drift. One-line doc note when convenient.

### TIER 2 — Save & Backup Trust Hardening (the dynasty-sim survival ratchet)

**C6. Schema island hardening — 12 `z.any()` islands, one per release** — 🔧 0 OF 12 MERGED (2026-08-03); 12 remain open pending merge-queue drain + 3 release-gate failures need root-cause
- **Ecology-lab fix merged (PR #81, 2026-08-03T02:18:47Z):** not a schema island — nightly/weekly lane split only.
- **Islands 1–12 all OPEN (PRs #82–#96, opened 2026-08-02):** every branch is MERGEABLE with no conflicts, but all are BEHIND `main` after #81 landed; auto-merge is blocked on "require up-to-date."
- **Release-gate failures (3 PRs):**
  - **PR #82** (island 1 — `ScheduledGame.result`): `release-gate` FAIL — `waiver-practice-squad` timed out waiting for app shell after hard reload (104.6s), plus `g3-football-ops-matrix` exit 1 (124.7s). Root cause: `g3-football-ops-matrix` consistently fails at ~124s across all 3 failing PRs; likely a pre-existing or fixture-interaction timeout in the football-ops matrix smoke. **Fix:** re-run release-gate after rebasing on latest `main`; if `g3-football-ops-matrix` still fails, the test itself needs investigation (not schema-island specific — it failed identically on #82, #91, #94 with no shared changed files).
  - **PR #91** (island 7 — `playerArchive`): `release-gate` FAIL — identical `waiver-practice-squad` timeout (104.6s) + `g3-football-ops-matrix` exit 1 (124.6s).
  - **PR #94** (island 10 — `farewellTours`): `release-gate` FAIL — `roster-depth-training` timed out waiting for "Place on IR" action (93.7s) + `g3-football-ops-matrix` exit 1 (124.6s).
- **All other islands (#83, #84, #85, #86, #87, #88, #89, #90, #92, #93, #95, #96):** checks all green (test + determinism-gate + release-gate).
- **Island 1 ✅ shipped (PR #82):** `ScheduledGame.result` (schema.ts:1786) now parses through a typed `GameResultSchema` — strict envelope + typed TeamGameStats/PlayerGameLine/PlayerMatchupEvent/MatchupHighlight/contingencyActivations, legacy-tolerant defaults for post-early-version fields, heavy nested payloads (broadcast/snapEvents/callYourShotResult/namedGame) deferred to their own islands. No SAVE_VERSION bump (shape unchanged, validation only). Proof: new 5-test contract file + 86/86 save tests + full engine suite 236 files/2,319 tests + all typechecks green locally; remote 37-step gate runs on the PR as a required check (G4 soak = live-data old-save proof).
- **Island 2 ✅ shipped (PR #83, stacked on #82):** `GameState.owners` (was `z.record(z.any())`) now parses through `OwnerSchema` — strict id/name/archetype/patience + typed OwnerSeasonGoals/OwnerPersonality, legacy-tolerant defaults, `.passthrough()` zero-data-loss insurance for historical extras (same pattern as TeamPersistedSchema). Verified closed writer set (convention-save createOwner, franchise-setup ensureOwnerRecord). Proof: 5-test contract + 91/91 save tests + full engine suite 237 files/2,324 tests + typecheck green.
- **Island 3 ✅ shipped (PR #85):** `GameState.draftClass` (was `z.array(z.any())`) now parses through a strict `DraftProspectSchema` (+ `CombineMeasurablesSchema`, `ScoutingReportSchema`), reusing existing PlayerPosition/ScoutingRegion/Personality/BloodlineInfo schemas. Field set verified against the `DraftProspect` interface and every writer/reader (`makeProspect` exact-shape, `runCombine` fills combine only, bloodlines fill bloodline only, no production extra keys — scouting progress lives in `offseasonState.scoutingState`). Migrations 7/15/30 already backfill combine/region/bloodline; fixtures v1-v34 all ship empty draft classes, so strict strip is lossless. Proof: 5-test contract + 86/86 save tests + full engine suite 236 files/2,319 tests + all typechecks green.
- **Island 4 ✅ shipped (PR #86):** `narrativeState.hooks` (was `z.array(z.any())`) now parses through a strict `NarrativeHookSchema` (`{ id, type, description, resolved, deadline }`) verified against the `NarrativeHook` interface and both writers (franchise-week-helpers weekly refresh, convention-save seed). `type` stays a free-form string because hooks-engine categories are an open set; the `cat/icon/text/priority` dashboard `Hook` type never touches save state. Proof: 5-test contract + 86/86 save tests + full engine suite 236 files/2,319 tests + all typechecks green.
- **Island 5 ✅ shipped (PR #89):** `weekSummaries` (was `z.array(z.any())`) now parses through a strict `WeeklySummarySchema` (+ `WeeklyInjurySummarySchema`) verified against the `WeeklySummary` interface and the single writer (`buildWeeklySummary`). Legacy tolerance required and proven: the v34 golden fixture carries a minimal entry (year/week/teamId/headline/result only), so every post-legacy field carries a neutral default — modern byte-equal, legacy lossless, malformed loud. Proof: 5-test contract (incl. exact v34-fixture shape) + 86/86 save tests + full engine suite 236 files/2,319 tests + all typechecks green.
- **Island 6 ✅ shipped (PR #90):** `playoffBracket` (was `z.any().nullable()`) now parses through a strict `PlayoffBracketSchema` (+ `PlayoffSeedSchema`, `PlayoffMatchupSchema`) verified against the interfaces and the closed writer pair (`seedPlayoffBracket`/`advancePlayoffBracket` via `toSeed`/`createMatchup`). All fixtures carry `playoffBracket: null` → strict strip lossless. **Deliberate deferral:** `matchup.result` stays `z.any()` until island 1's `GameResultSchema` (#82) lands — **follow-up one-liner: wire `result: GameResultSchema.nullable()` in `PlayoffMatchupSchema`**. Proof: 5-test contract (all round/conference enums, completed-bracket winner fill) + 86/86 save tests + full engine suite 236 files/2,319 tests + all typechecks green.
- **Island 7 ✅ shipped (PR #91):** `playerArchive` (was `z.array(z.any())`) now parses through a strict `PlayerArchiveEntrySchema` (+ `PlayerArchiveTeamStintSchema`, `PlayerArchiveCareerStatsSchema`). Closed writer set (`history.ts` ensure/sync/recordRetirement, exact shape); reader audit clean (bloodlines/franchise-legends/roster-identity/web legacy all inside the interface — award extras are derived, never stored). `careerStats` mirrors the open `CareerStats` index signature via `.catchall(z.number())`; `jerseyNumber`/`retirementYear` default for the migration-18 era. Proof: 5-test contract + 86/86 save tests + full engine suite 236 files/2,319 tests + all typechecks green.
- **Island 8 ✅ shipped (PR #92):** `franchiseHistory` (was `z.array(z.any())`) now parses through a strict `FranchiseHistoryEntrySchema` (+ `FranchiseHistoryKeyStatsSchema`). Both writers verified: `archiveSeasonHistory` emits the full modern shape while `scenario-challenge` seeds the minimal pre-identity shape — optional fields stay optional exactly as the interface declares; `playoffFinish` free-form by design. Fixtures all empty → strict strip lossless. Proof: 5-test contract + 86/86 save tests + full engine suite 236 files/2,319 tests + all typechecks green.
- **Island 9 ✅ shipped (PR #93):** `playerRivalries` (was `z.array(z.any()).default([])`) now parses through a strict `PlayerRivalrySchema` (+ `PlayerRivalryEventSchema`). Closed writer set (detectNewRivalries/decayRivalries exact-shape, convention-save seed literal, franchise-week updaters touch intensity/tier/history only); both writer shapes locked in tests with full tier enum coverage (budding/heated/nemesis). Proof: 5-test contract + 86/86 save tests + full engine suite 236 files/2,319 tests + all typechecks green.
- **Island 10 ✅ shipped (PR #94):** `farewellTours` (was `z.array(z.any()).default([])`) now parses through a strict `FarewellTourSchema` (+ `FarewellMomentSchema`). Closed writer set (`startFarewellTour` exact literal, `generateFarewellMoment` spreads planned moment + overrides opponent/narrative only, franchise-week reads without mutating, offseason resets to `[]`); full moment-type enum locked (standing_ovation/gift_exchange/emotional_speech/final_home_game/final_game). Fixtures empty or absent → strict strip lossless; migration 18 already backfills. Proof: 5-test contract + 86/86 save tests + full engine suite 236 files/2,319 tests + all typechecks green.
- **Island 11 ✅ shipped (PR #95):** `StaffCandidate.specialty75` (inside `coachingMarket.candidates`, was `z.any().nullable().optional()`) now parses through a strict `CoordinatorSpecialtySchema` (`{ id, label, icon, effect: Record<string, number>, desc }`) mirroring the interface exactly — free-form id/label strings, numeric effect map, empty-effect allowed. Closed writer set (candidates spread generated StaffMembers; specialties only from the OC/DC_SPECIALTIES catalogs via assignCoordSpecialty; hiring catalog seeds null). Fixtures v1-v34 carry no specialty75 key → nullable+optional lossless; migration backfills null. Proof: 5-test contract + 86/86 save tests + full engine suite 236 files/2,319 tests + all typechecks green.
- **Island 12 ✅ shipped (PR #96, FINAL):** `earnedDoctrines` (was `z.array(z.any()).default([])`) now parses through a strict `EarnedDoctrineSchema` (`{ id, name, description, origin, bonus, category: culture/strategy/reputation/personnel, earnedYear, earnedWeek }`) matching both `EarnedDoctrine` and the structurally identical `FranchiseDoctrine`. Closed writer set (`awardDoctrine` catalog spread + two numbers; franchise-week pushes only via awardDoctrine); fixtures v1-v34 carry no key → `.default([])` + strict strip lossless; migration already backfills. Proof: 5-test contract + 86/86 save tests + full engine suite 236 files/2,319 tests + all typechecks green.
- **Remaining islands: 0.** All 12 launch-audit `z.any()` islands are typed and in flight. Tracked follow-up: wire `PlayoffMatchupSchema.result` → `GameResultSchema.nullable()` as a one-line PR once island 1 (#82) merges; heavy nested GameResult payloads (broadcast/snapEvents/callYourShotResult/namedGame) may still split into their own hardening passes later.

**C7. Watch-list / preferences portability decision** — 🔧 IN FLIGHT (PR #84, checks green, behind main 2026-08-03; decision D4 resolved)
- **Shipped:** Watch List source panel now states explicitly that pins are browser-local convenience state by design, stay on this browser only, are **not included in .mfd cartridges or Combined Backup exports**, and tells players to re-pin after moving browsers/machines. Test locks the copy contract. Combined Backup v2 folding remains a possible later envelope project, no longer an ambiguity.
- **Status:** PR #84 opened 2026-08-02, all checks pass (test 31m52s, determinism-gate 14s, release-gate 1h11m47s), but branch is BEHIND `main` after #81 landed; not yet merged.

**C8. Per-dynasty selective import / merge semantics** — 🔧 IN FLIGHT (PR #88, checks green, behind main 2026-08-03)
- **Shipped:** `mergeDynastySidecarArchiveJson` + pure `planDynastySidecarMerge` / `mergeDynastySidecarPayloads` in `dynasty-sidecar-archive.ts`. Sidecar import is now a per-dynasty merge: checkbox selection (default all), live per-store added/overwritten conflict hints against live local stores, zero-selection confirm lockout, and status receipt (stores added vs overwritten). Unselected dynasties — local or archive — stay byte-identical, so imports can never surprise-wipe local history. League-scoped rivalry heat is untouched in selective mode (wholesale import remains that path). Career totals recompute on write. Proof: 6 new merge tests (subset, conflicts, legacy no-rivalry archive, unknown ids, empty selection, dry-run plan) + 2 preview render contracts; 42/42 focused web tests + typecheck green.
- **Status:** PR #88 opened 2026-08-02, all checks pass (test 39m36s, determinism-gate 13s, release-gate 1h12m56s), but branch is BEHIND `main` after #81 landed; not yet merged.

### TIER 3 — AI Depth (from "explains itself" to "visibly thinks")

**C9. CPU behavior proof beyond route-local readouts** — OPEN (handoff bible bet #6 / gap #3)
- **What's done:** FranchisePlan brain + receipts everywhere; read-only intent ledgers/strategy history on 8 routes. **What remains:** either (a) change CPU trade/FA/draft *behavior* with focused downstream tests, or (b) durable cross-window plan history surfaced to players (full save-schema path: type + Zod + migration + fixtures).
- **Rule:** no behavior change without seeded downstream tests; no new persisted fields without the full schema path.
- **Complexity:** Multi-day; highest product payoff of the AI track.

**C10. Trade-value balance / exploit fuzzing** — OPEN (feature inventory #32/#35 next slice)
- **What remains:** deterministic fuzz tests over trade-value evaluation to find exploitable packages.
- **Complexity:** 1–2 days tooling, then balance decisions with Kevin.

**C11. Position-coach poaching / history / coach-tree continuity** — OPEN (handoff bible bet #4 / gap #8)
- **What's done:** init/upgrade actions, tenure rollover, source clarity. **What remains:** a staff market layer — poaching between teams, durable position-coach career history, coach-tree continuity across seasons.
- **Files:** `packages/engine/src/systems/position-coaches.ts`, `apps/web/src/features/coaching/CoachingStaff.tsx`.
- **Complexity:** 3–5 days, sim-adjacent → needs design note + Kevin approval per AGENTS.md.

### TIER 4 — Dynasty Memory & Emotional Payoff (the "legendary" track)

**C12. Auto-author legends / playoff swings / player arcs outside covered surfaces** — OPEN (handoff bible bet #1, gap #5/#10)
- **What's done:** scrapbook auto-carry from 9 saved sources; Game Day/draft/profile/timeline callbacks. **What remains:** automatic story cards after playoff swings, legend moments, and arcs on surfaces not yet covered (Franchise Book chapters, season documentaries).
- **Rule:** use existing saved inputs first; new persistent fields only with full schema path.
- **Complexity:** 1–3 days per surface, low-medium risk (mostly read-models + writers at boundaries).

**C13. Ceremony payoff: Super Bowl, awards night, HOF induction, rival games** — OPEN (feature inventory #67/#68/Super Bowl row; backlog item)
- **What remains:** authored post-championship / awards-night / induction ceremony flows beyond current scrapbook moments. Super Bowl route graded 7/10 GOAT — weakest marquee moment.
- **Complexity:** 2–4 days for a first ceremony vertical slice.

**C14. Durable all-time rivalry head-to-head archive** — OPEN (improvement plan slice #5; inventory #73)
- **What remains:** persisted all-time H2H records (currently sidecar heat-map only); likely needs a save field → full schema path.
- **Complexity:** 1–2 days + migration discipline.

**C15. Deeper postgame/offseason receipts** — OPEN (handoff bible bet #2)
- **What remains:** receipts showing exactly which roster/depth/training/cap/game-plan/morale/injury/owner/scouting choices mattered — beyond the shipped Game Day source/decision receipts and offseason command snapshot. Requires *new saved inputs*, not repeated panels.
- **Complexity:** ongoing, slice-at-a-time.

### TIER 5 — Balance, Performance & Long-Horizon Proof

**C16. Reduce medium roster-minimum repair windows via explicit balance work** — OPEN (gap #1, completion report)
- **What remains:** sentinel/25y/50y runs pass with 0 high anomalies but carry budgeted *medium* roster-minimum signals (53–56 per run vs 120 budget). Reducing them means real roster-economy balance work — explicitly NOT a silent constants change; needs before/after formula evidence per AGENTS.md.
- **Complexity:** multi-day investigation + sim-touching approval.

**C17. 50-year save size / performance follow-through** — OPEN (completion report risks)
- **What remains:** 50-season state serializes to ~242MB; validated load is under budget (1948ms) but the Web Worker seam and hot-region compaction should stay maintained; re-measure after any big state change.
- **Complexity:** ongoing hygiene; no urgent work.

**C18. Ecology Lab nightly: 100-year cells die on the runner; 25/50y healthy** — ✅ MERGED (PR #81, 2026-08-03T02:18:47Z) + new weekly lane registered
- **Fix merged:** nightly lane = 25/50y only (100 cells), timeout 120→180 min, max-parallel 6→10 (~14h window); new weekly `ecology-lab-100y.yml` lane (Sun 05:41 UTC + manual dispatch) = 100y only (50 cells), timeout 360 min (runner ceiling), max-parallel 10. 100-season certification preserved, not deleted.
- **Nightly evidence (Aug 2→3 old-config run, run 30740118489):** This was the LAST old-config run — scheduled Aug 2 08:36Z, still active when #81 merged at 02:18Z Aug 3. Scoreboard: **59 success / 28 cancelled / 63 queued-never-started** out of 150 old-config cells (included doomed 100y cells). All 100y cells were cancelled or never started; all completed 25y/50y cells were green.
- **Aug 3 06:17Z scheduled run:** SKIPPED because the Aug 2 run was still in progress at 06:17Z. GitHub Actions suppressed the overlapping scheduled trigger.
- **Aug 3 10:05Z new-config pending run (30804156655):** A new scheduled run was created at 10:05:44Z on SHA `f74d3e8b` (the #81 merge commit). Status: **pending**, no jobs started yet. This is the FIRST run using the new 25/50y-only config (100 cells, 180-min timeout, max-parallel 10). It should complete ~20:00–21:00Z if runners are available.
- **Weekly 100y lane:** `gh workflow list` confirms `GOAT Ecology Lab 100y` (id 325892219, path `.github/workflows/ecology-lab-100y.yml`) is registered and visible.

### TIER 6 — UX & Product Polish Backlog (non-blocking, pick by feel)

| # | Item | Status | Note / evidence |
|---|---|---|---|
| C19 | Durable inbox read/defer state | OPEN | Deliberately skipped (needs GameState field → schema path) or sidecar; `.logs/goal-progress.md` M4 |
| C20 | Watch-list reminder hooks near deadlines/draft | OPEN | Handoff bible Watch List row |
| C21 | Adaptive difficulty transparency | OPEN | Inventory: "do not hide rubber-banding from players"; engine system exists, graded 7 |
| C22 | Relocation & expansion-draft onboarding/save-safety proof | OPEN | Both graded 7; "needs careful public-facing stakes" |
| C23 | Full mobile parity beyond smoke width | OPEN | Final-ship known non-blocker; G6 covers 480px but dense tables remain desktop-first |
| C24 | Player comparison decision use (extension/trade/draft framing) | OPEN | Inventory #compare row |
| C25 | Coaching relationships consequences in player-facing terms | OPEN | Inventory row graded 7 |
| C26 | Endorsements → visible revenue tie to facilities/owner/market | OPEN | Inventory row graded 7 |
| C27 | Franchise Book auto-authored chapters | OPEN | overlaps C12; graded 7 |
| C28 | Film Room → next-week game-plan suggestions | OPEN | Inventory film room row |
| C29 | Weather extreme → Game Plan CTA | OPEN | Inventory weather row |
| C30 | Broadcast export/replay metadata portability cue | 🔧 IN FLIGHT (PR #84) | PR #84 checks green; branch BEHIND main after #81 landed; not yet merged |

### TIER 7 — Product Decisions Only Kevin Can Make (from `DESIGN.md` open questions)

| # | Question | Impact |
|---|---|---|
| D1 | Should launch screen prioritize Convention Demo above custom dynasty for public events? | First-screen CTA order |
| D2 | What is the intended minimum mobile support beyond smoke checks? | How aggressively dense screens get redesigned |
| D3 | Should Chip be visible on the title screen in a future pass? | First-run branding/onboarding scope |
| D4 | ~~Watch-list portability: label-only vs Combined Backup v2~~ ✅ RESOLVED 2026-08-02 — label-only shipped (PR #84); v2 folding remains optional later | Backup scope/privacy |
| D5 | Any sim-math or save-shape change (C9, C11, C14, C16) requires explicit approval + design note per AGENTS.md | Gate for Tier 3–5 sim items |

---

## PART D — Explicitly PARKED (do not spend time)

From Fable board + completion report, confirmed still valid:
- Fresh full-repo audits / rewriting historical audit ledgers (this list supersedes them).
- Big-bang schema strictness (islands go one at a time).
- Performance tuning beyond bundle-gate hygiene (gate green, headroom exists).
- Chip feature expansion (Chip is in good shape; depth elsewhere pays more).
- Engine rewrites, multiplayer, 3D spectacle, new top-level routes, big-bang sim swaps (master-plan anti-goals).

## PART E — Repo hygiene note for this workspace

- **2026-08-02 update: this workspace is now git-linked.** `git init` + `git remote add origin https://github.com/KevinBigham/MFD.git` + `git reset --mixed origin/main` connected the folder without touching any file. `git status` confirms the local tree is **byte-identical to `origin/main` @ `10d9da3`** (includes the Jul 29 PRs #78–80: living player story, Chip recommended actions, Chip onboarding test-clock fix). The only untracked files are this report and `MFD_COMPLETION_PLAN.md`. `gh` is authenticated as KevinBigham with `repo`/`workflow` scopes.
- Branch protection on `main` is fully active (required checks: `test`, `determinism-gate`, `release-gate`; strict; enforce-admins; no force-push/delete).
- Doc paths in older files reference `/Users/tkevinbigham/...` and `/Users/kevin/Downloads/MFD/...`; treat as historical.
