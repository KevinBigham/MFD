# MFD GOAT MASTER PLAN — The Fused Blueprint
**Prepared by:** Fable 5 (independent source audit + synthesis of 3× GPT 5.6 Sol Pro audits + MFD's own internal audit docs)
**Date:** 2026-07-21 · **Repo snapshot:** MFD-main.zip (SAVE_VERSION 36, 79 nav routes, ~5,700 LOC core sim cluster)

> **Completion status:** all 28 deliverables are complete at `SAVE_VERSION = 37`; the uninterrupted release gate passed 37/37 in 1997.8 seconds, and the independent GOAT reviewer returned **PASS**. See `MFD_GOAT_COMPLETION_REPORT.md`. The original audit snapshot above remains unchanged as the baseline that produced this plan.

---

## Part 0 — Independent Verification (I checked the code myself)

Every headline claim from the three audits was verified against source, with file:line evidence. **All 10 major claims CONFIRMED:**

| # | Claim | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | Trick plays planning-only | ✅ CONFIRMED | `executeTrickPlay`/`shouldCallTrickPlay` in `packages/engine/src/systems/trick-plays.ts` have **zero production callers**; `game-sim.ts` never imports them |
| 2 | Draft order broken 3 ways | ✅ CONFIRMED | Seed picks = `rng(1,32)` per team (dupes/gaps possible, `apps/web/src/app/store/seed.ts`); regen = `pick: index+1` (`draft.ts:487`); `buildDraftOrder` falls back to **alphabetical team id**, never standings (`offseason.ts:~203`) |
| 3 | CPU need = weakest player | ✅ CONFIRMED | `draft.ts:290-304`: `need = 90 − min(OVR at position)`. Elite QB + bad QB3 ⇒ "desperate QB need." (Ironic: the depth-aware `team-needs.ts` exists but only feeds the UI) |
| 4 | FA `.slice(0,3)` before sort | ✅ CONFIRMED | `offseason.ts:823-828` — object insertion order picks the 3 bidders, THEN sorts. Market decided by key order |
| 5 | 7 of 9 difficulty modifiers unwired | ✅ CONFIRMED | Only `injMod` + `aiBidMod` consumed. `tradeMod, ownerMod, clutchSwing, moraleMod, staffBudget, startCash, foBudget` have no consumers |
| 6 | Combined Backup import non-atomic | ✅ CONFIRMED | `DynastyCartridge.tsx:386-406`: IndexedDB save, then 6 sequential localStorage sidecar writes; crash mid-sequence = inconsistent dynasty |
| 7 | Drive-level sim; broadcast is post-hoc fiction | ✅ CONFIRMED | `simGame` loops `11 + rand(3)` drives; quarter derived from drive index; no clock/down/distance state. `generateBroadcast(result…)` runs AFTER sim |
| 8 | 79 routes, 7 gated | ✅ CONFIRMED | `App.tsx` NAV_ITEMS = 79; `navigation.ts` gates exactly 7 |
| 9 | Inconsistent injury checks in sim | ✅ CONFIRMED | `game-sim.ts` mixes `isPlayerUnavailable()` (correct) with raw `!p.injury` (treats day-to-day as OUT) at L194/326/367/501 |
| 10 | No persistent AI franchise plan | ✅ CONFIRMED | Only `team.philosophy` enum, re-derived every offseason; no durable multi-year intent object |

**Where the three audits agree (high-confidence consensus):** don't rewrite; protect determinism, browser-first saves, pixel identity, Chip, Monday Briefing; the problem is *causality and memory*, not feature count; canonical event ledger is the keystone; CPU teams need one persistent brain; compress 79 routes into rooms/modes; deploy must consume the full release gate; roster-health "anomaly budgets" ≠ league health.

**Where they diverge — my rulings:**
- **What goes first?** Sol Pro [1] says trust/deploy hygiene; [2] says receipts/compression; [3] says integrity bugs. **Ruling: integrity bugs first.** A dynasty sim's entire value proposition is a fair league. Every confirmed bug (draft order, FA market, need calc) silently corrupts 20-season saves *today*. Fixing them is cheap, testable, and compounds with everything after.
- **When does Football Core v2 start?** [1] says months out, [3] says it's THE initiative. **Ruling: build the event ledger early but in shadow mode** — it's the keystone, but never let it block the integrity patch or ship as a big-bang engine swap.
- **My addition the audits under-weight:** MFD's *internal* docs (MFD_WIRING_AUDIT, MFD_MASTER_AUDIT_REPORT) already found most of this. The real risk isn't ignorance — it's **half-wired features shipping as read-models that explain but don't change behavior**. The plan below enforces a hard rule against that.

---

## Part 1 — The Constitution (non-negotiables for every PR)

1. **No new top-level features until Phase 1 integrity gate passes.** Feature freeze on breadth.
2. **Every emotionally-marketed choice must change saved state** — or be visibly labeled "flavor" or removed. No more trick-play-class promises.
3. **One source of truth per fact.** Standings → draft order. Ledger → broadcast. Needs model → both UI and CPU AI.
4. **Determinism is sacred.** Same seed + same inputs = byte-identical league, forever. Every fix ships with a seeded regression test.
5. **Shadow before swap.** New sim/AI systems run alongside old ones over thousands of seeded games before becoming canonical.
6. **Receipts everywhere.** Any system that changes state must be able to say *why* in one sentence with real numbers.
7. **Protect the jewels:** deterministic engine, TypeScript package boundaries, browser-local portable saves, save migrations, pixel-broadcast identity, Chip, Week Advance as transaction boundary, the testing culture.

---

## Part 2 — Phase 1: League Integrity Patch (Weeks 1–3) 🔴 P0

Small diffs, huge trust. Each item = one PR with a seeded test.

- [x] **1.1 Draft order from standings.** Build `computeDraftOrder(finalStandings, playoffResults)`: reverse record → strength-of-schedule tiebreak → playoff finish for postseason teams. Invariant test: every year, picks 1–32 unique per round, traded picks preserved. Fix seed generation (no `rng(1,32)` dupes) AND yearly regen (`draft.ts:487`).
- [x] **1.2 Unified TeamNeedsModel.** Promote the depth-aware `team-needs.ts` logic to the engine and make CPU draft/FA/trade consume it. Delete the min-OVR heuristic. Add reason codes (`"QB2 is 58 OVR and QB1 is 31 years old"`).
- [x] **1.3 Fair free agency.** Rank ALL eligible CPU bids first, then take top N (N = 2–5 varying by player tier, seeded). Kill the pre-sort `.slice(0,3)`.
- [x] **1.4 One availability API.** `getGameAvailability(player): 'available' | 'questionable' | 'out'` in injury-system; replace all four raw `!p.injury` checks in `game-sim.ts`.
- [x] **1.5 Difficulty honesty.** Wire `tradeMod` (CPU trade acceptance threshold), `ownerMod` (patience), `startCash`/`foBudget` (seed), `staffBudget` (coaching market) — these four are cheap. For `clutchSwing`/`moraleMod`: wire or remove from the settings screen. Zero unwired toggles visible to players.
- [x] **1.6 Atomic Combined Backup import.** Stage all writes (save + 6 sidecars) into a journal object; commit with a single "import complete" flag written last; on load, detect incomplete journal and roll back. Test: kill mid-import, verify old dynasty intact.
- [x] **1.7 Deploy consumes the gate.** GitHub Pages deploy pulls the exact artifact produced by the full 37-step release gate — no independent lighter path. Fix doc drift (36→37, Node version, package version) in the same PR.
- [x] **1.8 Trick plays: wire it (don't delete it).** Minimum honest version: during `simulateDrive`, if a planned trick play's situation matches, call `executeTrickPlay` with bounded outcomes (big-play upside, turnover downside, tendency-burn cost), log it to the drive result, and surface it in the broadcast + postgame receipt. This is the single loudest trust win available.

**Exit gate:** 10 seeds × 25-season sims with invariant checks: unique draft slots every year, draft order correlates with inverse standings, FA winners correlate with best offers, zero unwired settings, import crash-test passes.

---

## Part 3 — Phase 2: The Causal Spine (Weeks 4–10) 🟠

The keystone all three audits converge on — built incrementally, not big-bang.

- [x] **2.1 Canonical `LeagueEvent` ledger (append-only).** Start with *transactions*, not snaps: signings, trades, cuts, draft picks, injuries, firings, awards, records. Every event: `{id, seasonWeek, type, actors, payload, causeIds[]}`. Existing `eventLog`, `txLog`, and sidecars become *derived views* of this ledger over time (strangler pattern — don't migrate everything at once).
- [x] **2.2 Universal `DecisionReceipt`.** One schema: `{decision, drivers[] (with real numbers), outcome, counterfactual (1 line), eventRefs[]}`. Attach to: user game plans (postgame "your run-heavy plan → 34 carries, 5.1 ypc"), CPU transactions ("Harbor traded up because their FranchisePlan window is 2027–29"), development, owner decisions. Surface in Monday Briefing.
- [x] **2.3 `FranchisePlan` — one durable CPU brain.** Per CPU team, persisted in save: `{windowYears, ownerMandate, capPosture, priorityPositions[], protectedAssets[], expendableAssets[], draftCapitalStrategy, riskTolerance, changeTriggers[], publicNarrative, planHistory[]}`. Rules: created at dynasty seed, *updated* (not regenerated) each offseason, only changeTriggers cause pivots (new coach, owner mandate, missed window). ALL CPU decisions — trades, FA, draft, extensions, cuts, staff — consume this one object with receipts. `philosophy` enum becomes a derived label.
- [x] **2.4 Press conferences get bounded consequences.** Owner approval ±1/±2, locker-room morale nudge, media reputation tag, one memory tag that can return as a callback. Small, honest, receipt-backed.
- [x] **2.5 Roster-health certification (separate from regression baseline).** New gate: across a 4-season sentinel run, **zero** game-weeks where a team fields below healthy-starter floor. To pass it: depth buffers above minimums in `ensureMinimumRosterFloors`, injury-aware CPU roster planning (via FranchisePlan), deterministic emergency signings + practice-squad elevation, in-season checks (not just offseason).

**Exit gate:** every CPU transaction in a 10-season sim has a receipt tracing to a FranchisePlan; roster-health cert passes at zero shortages; a player can answer "why did that happen?" for any transaction from inside the game.

---

## Part 4 — Phase 3: Compression — Five Rooms (Weeks 8–14, overlaps Phase 2) 🟡

The 79-route museum becomes a GM's office. UI-only — no engine risk, so it can run in parallel.

- [x] **3.1 Single route registry.** One typed registry generating routes, nav, gating, unlock metadata, and command-palette entries. Freeze top-level growth permanently.
- [x] **3.2 Five rooms:** **Briefing** (Monday hub) · **Football Ops** (roster/cap/staff/scouting) · **Game Week** (plan/sim/results) · **League** (standings/news/rivals/transactions) · **Legacy** (history/records/HOF/archive). All 79 existing screens survive as tabs/drawers/deep-links inside rooms.
- [x] **3.3 Two modes:** **GM Mode** (default; contextual nav, progressive unlock) and **Franchise Nerd Mode** (full current map). One toggle, remembered per dynasty.
- [x] **3.4 Briefing decision budget:** ≤3 Must-Do + ≤3 Recommended cards weekly; each card deep-links to the exact action; each closed card produces a receipt next week.
- [x] **3.5 Onboarding:** Instant / Guided / Full GM start; target <90 seconds from "New Dynasty" to first meaningful decision.

---

## Part 5 — Phase 4: Football Core v2 — Snap Truth (Months 3–6) 🟢

The authenticity ceiling — done the safe way.

- [x] **4.1 Pure `PossessionState` model:** down, distance, clock, field position, timeouts, personnel, score state. Pure functions, engine package, zero UI coupling.
- [x] **4.2 Shadow mode:** new engine runs beside `simGame` over thousands of seeded games. Calibration harness compares scoring distributions, play mix, stat lines, upset rates vs. the 20-season frozen baseline. Old engine stays canonical until distribution gates pass.
- [x] **4.3 Snap ledger feeds everything:** broadcast/PBP become *reads of what actually happened* — no more post-hoc fiction. Win probability, film room, records, capsules all derive from the same events. Trick plays, contingencies, and game plans become real ledger events.
- [x] **4.4 Coach Mode (optional layer):** interactive 4th downs, two-minute drill, halftime adjustments — for players who want it. Fast Sim stays instant and remains the default. Never force it.
- [x] **4.5 Game Capsules:** compact per-game summary (key plays, receipts, turning point, star performances) persisted for dynasty memory at tiny storage cost.

**Exit gate:** byte-identical determinism per seed; distributions within tolerance of baseline; broadcast text provably derived from ledger events; Fast Sim wall-time not regressed >10%.

---

## Part 6 — Phase 5: Living Memory & Ecology (Months 6–12) 🔵

- [x] **5.1 Dynasty memory graph** over the ledger: people ↔ games ↔ decisions ↔ rivalries. Powers "Previously On," anniversary callbacks, retrospectives, auto-authored season documentaries, named games ("The Snow Bowl Heist, 2031").
- [x] **5.2 Recognizable rival franchises:** FranchisePlan public narratives leak into media ("Harbor is all-in on the 2029 window"); beat them and their plan history records it.
- [x] **5.3 GOAT Ecology Lab:** 10 seeds × 5 personas × 25/50/100-season matrix in CI (nightly, not per-PR). Certification thresholds, not anomaly budgets.
- [x] **5.4 State & perf strangler:** normalize the hottest GameState regions, harden one `z.any()` schema island per release, measure clone/autosave cost before optimizing, Web Worker seam for sim if measurements demand it.
- [x] **5.5 `SimulationContext`:** replace any mutable global RNG channels with explicit context passed down — locks determinism in forever.

---

## Part 7 — The First Vertical Slice (do this the very first week)

**"One Fair Draft Night."** Fix 1.1 + 1.2 + seeded tests + a `DecisionReceipt` on every CPU pick ("Harbor took the LT at #4: their plan protects a 2027 window and LT was priority #1"). One slice that touches integrity, the CPU brain seed, and receipts — proving the whole architecture in a PR-sized bite. Then 1.3 (FA) as slice two, 1.8 (trick plays) as slice three.

## Sequencing at a glance

```
Wk 1-3   ██ Phase 1: Integrity Patch (P0 bugs, deploy gate, atomic import, trick plays)
Wk 4-10  ████ Phase 2: Causal Spine (ledger, receipts, FranchisePlan, roster cert)
Wk 8-14  ███ Phase 3: Five Rooms + modes (parallel, UI-only)
Mo 3-6   ██████ Phase 4: Football Core v2 (shadow → swap)
Mo 6-12  ████████ Phase 5: Memory graph, ecology lab, perf strangler
```

## Success metrics (the GOAT scoreboard)

- **Trust:** 0 unwired player-visible features; 0 draft-slot collisions in 100-season sims; deploy = gate artifact, always.
- **Fairness:** FA winner = best offer ≥95% (rest explained by receipts); draft order ↔ inverse standings correlation ≥0.9.
- **Causality:** 100% of CPU transactions receipt-backed; player can answer "why?" for any outcome in ≤2 clicks.
- **Health:** 0 healthy-starter shortages in 4-season sentinel; 50-season saves load in <3s.
- **Feel:** <90s to first decision; ≤3 Must-Do cards/week; weekly loop playable in 10 minutes, deep-diveable for hours.

## Anti-goals (unchanged from consensus — do NOT do)

No engine rewrite. No 3D/licensed spectacle. No multiplayer. No new top-level routes. No feature work during Phase 1. No big-bang sim swap. No receipts that explain behavior the engine doesn't actually have.

---

**The one-sentence thesis:** MFD stops being a museum of 79 respectable exhibits and becomes a consequence engine where every decision leaves a receipt, changes real football, provokes a believable rival response, and comes back years later as a story.
