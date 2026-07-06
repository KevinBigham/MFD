# MFD Release-Convergence `/goal` Prompt

This replaces the open-ended slice marathon with a gate-based finish contract. It captures the current vision: a polished public release, a normal New Dynasty that survives multiple seasons and offseasons, a flexible Living Week, complete football-operations coverage, durable governance/CBA behavior, and Chip as an optional guide rather than a nuisance.

## Compact Paste Prompt

Character count: **3968** including `/goal`.

```text
/goal Continue Mr. Football Dynasty in `/Users/tkevinbigham/MFD/MFD-main`.

Mission: finish MFD for public release through measurable gates—not endless isolated slices. The game must feel cohesive and beautiful, let a player start a New Dynasty and progress through years without errors or dead ends, and make every week understandable without limiting team-building freedom.

Read: `AGENTS.md`, `DESIGN.md`, `README.md`, latest/top `STATUS.md` ledgers, and targeted `CODEX_GAME_GUIDE.md` / `CODEX_IMPROVEMENT_PLAN.md` sections. Source/tests are truth; search the historical STATUS only when needed.

Kickoff: confirm `pwd`, `.git`, live `SAVE_VERSION`, package manager/binaries, and build artifact. Create/update `RELEASE_CONVERGENCE.md` as the concise RED/YELLOW/GREEN gate scoreboard with evidence, failures, commands, and next action; treat `STATUS.md` as history.

Ordered gates:
G1 FULL SETUP: from cleared storage, complete every Full Setup phase through normal New Dynasty and reach playable Year 1 Week 1. Fix blockers, confusing choices, invalid defaults, stale Chip targets, persistence issues, console errors, and mobile failures. This is first.
G2 LIVING WEEK: Monday Briefing/Chip must separate Must Do, Recommended, and Optional actions. Each says what, why, consequence/deadline, and where. Preserve freedom to make any legal roster, depth-chart, training, game-plan, cap, trade, waiver, practice-squad, free-agency, scouting, coaching, facility, or medical change each week. Only true blockers prevent advance; guidance refreshes after actions and never becomes parallel stale state.
G3 FOOTBALL OPS: browser-prove and persist every major path: standard/Post-June-1 cuts, extensions, tag, restructure, backload/void years, Cap Lab batch, trade/counter/block, waiver, practice squad, FA bid/sign/re-sign, IR, depth chart, training, prep, draft, staff/facility/medical, save slot, cartridge export/import, and hard reload.
G4 MULTI-YEAR TRUST: a clean New Dynasty reaches Year 4 Week 1 through three full seasons/offseasons. Add a deterministic 10-season soak validating state after every advance/phase, same-seed replay, save round trips, and no uncaught errors, impossible states, or repair hacks.
G5 GOVERNANCE/CBA: prove negotiations, votes, effective-year rules, labor interruptions, cap refreshes, and old-save compatibility across the run. Fix schema/type/default/migration/UI drift completely.
G6 CHIP + UX: Chip explains what matters now, why, and where; never blocks play; respects receipts; and has obvious one-click quiet/mute that stays quiet. Polish hierarchy, keyboard/focus, 480px mobile playability, loading/empty/error/success states, reduced motion, and zero console errors.
G7 RELEASE: create one repeatable release command or CI workflow covering tests, typecheck, production build, deterministic audits/soak, save compatibility, browser golden path, all football-ops smokes, and mobile/console checks.

Rules:
- Work gates in order and continue until a real external blocker; do not stop after one tiny slice.
- Pause stadium/content expansion. Reject source-panel, receipt-copy, route-coaching, and docs-only micro-slices unless they directly fix a failing gate or materially misleading high-frequency state.
- Reuse existing engine/store/selectors before parallel systems.
- Change formulas, balance, save schema, or architecture only when a gate requires it; then require type + Zod + defaults + migration + old-save/import + determinism + before/after sanity coverage and rollback.
- Every meaningful change gets focused tests, relevant typecheck/build, live browser evidence, concise docs, and rollback. Keep `RELEASE_CONVERGENCE.md` current; add STATUS ledgers only for meaningful gate progress.
- A gate is GREEN only with repeatable evidence. Do not call MFD release-ready until all seven are GREEN.

Final response exactly: Understanding, Gate Scoreboard, Patch, Verification, Remaining Release Blockers, Risks / Rollback.
```

## Strategic Shift

The previous marathon prompt rewarded safe, independent slices. That produced substantial guardrails, receipts, source labels, save/import smokes, and two contract mutation smokes, but it did not force the complete player journey to converge. The release-convergence prompt changes the optimization target:

1. **Journey over inventory.** A clean New Dynasty through Year 4 Week 1 is the central proof.
2. **Gates over slice count.** Work is only valuable when it turns a release gate green.
3. **Behavior over explanation.** Read-only panels, route coaching, and content expansion pause unless they repair a release-blocking problem.
4. **Weekly agency over hand-holding.** Living Week distinguishes true blockers from recommendations and optional team-building work.
5. **Evidence over confidence.** Browser workflows, persisted state, deterministic replay, multi-year validation, mobile checks, and a repeatable release command are mandatory.

## Gate Acceptance Reference

### G1 — Full Setup

Green means a clean browser profile can use the normal **Full Setup** path, complete every phase, survive reload at a meaningful checkpoint, and enter playable Year 1 Week 1. Chip targets and setup copy must remain accurate. No console errors, invalid defaults, stuck transitions, or hidden required choices.

### G2 — Living Week

Green means the weekly command experience presents:

- **Must Do:** only actions that genuinely block progression.
- **Recommended:** high-value actions with a reason and consequence.
- **Optional:** legal team-building choices the player can freely explore.

Actions must route to the correct screen, refresh guidance after the underlying state changes, and disappear or change priority when resolved. The player can still advance when only optional work remains.

### G3 — Football Operations

Green means each named operation has repeatable browser evidence for eligibility, action, visible result, persisted state after reload, and no console error. The matrix should include negative/ineligible cases where they matter, not merely successful button clicks.

### G4 — Multi-Year Trust

Green means the production-shaped New Dynasty reaches **Year 4 Week 1** through three seasons and offseasons. Repetitive weeks may be accelerated only through the same production state-transition owners. Browser checkpoints must cover setup completion, regular season, playoffs/season end, each major offseason phase, save/reload, and Year 4 entry. A separate 10-season deterministic soak validates every transition and exact same-seed replay.

### G5 — Governance/CBA

Green means at least one full governance/CBA cycle is exercised across years: proposal or negotiation, voting, effective-year application, labor interruption handling where applicable, downstream cap/rule refresh, save/reload, and old-save migration/default compatibility.

### G6 — Chip and UI/UX

Green means Chip tells the player what matters, why, and where without blocking play or repeating resolved advice. Quiet/mute is obvious, one click, browser-persistent, and reversible. Golden-path screens receive desktop and 480px visual review with screenshots, keyboard/focus checks, readable hierarchy, clear disabled reasons, calm save/import errors, reduced-motion behavior, and no browser-console errors.

### G7 — Release Gate

Green means one documented command or CI workflow runs the release evidence in a stable order and fails loudly. It must not treat a frozen shadow baseline with known anomalies as proof that the simulation is clean. The final report links each gate to exact test/smoke output and lists any deliberately accepted non-blocking risk.

## Documentation Decision

Create `RELEASE_CONVERGENCE.md` in the repository and use it as the current one-page scoreboard. Keep `STATUS.md` as the historical ledger; do not force every new Codex window to digest the full archive or append another large entry for cosmetic work.
