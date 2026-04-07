# Mr. Football Dynasty — Pre-Release Audit Results

Date: 2026-03-01
Branch audited: `claude/game-review-feedback-alXYq`
Audit workspace: `/Users/kevin/Downloads/Mr_Football/audit_run/mr-football-dynasty`

## Baseline
- `npm test`: 928/928 passing before changes.
- `npm run build`: FAILED before changes due to duplicate symbol (`getPosMarketTier86`) in `mr-football-v100.jsx`.
- `CODEX_AUDIT_BIBLE.md`: not present on this branch. I used `CODEX_HANDOFF.md`, `HANDOFF_BIBLE.md`, and `COWORK_HANDOFF_BIBLE.md` for full instructions/context.

## Issues Found and Fixed

### 1) Build blocker in monolith import scope
- Problem: duplicate declaration of `getPosMarketTier86` broke production build.
- Fix: removed conflicting import binding from monolith top-level import list.
- Result: `npm run build` now succeeds.

### 2) Non-deterministic RNG usage in modular code
- Problem: `Math.random()` was still used in modular files (`src/data/broadcast.js`, `src/data/draft-analyst.js`, `src/systems/game-sim-math.js`).
- Fix: migrated to seeded RNG channels (`RNG.play` / `RNG.draft`) and deterministic fallback handling.
- Result: `src/` now has zero `Math.random()` usage.

### 3) 4th-down recommendation bug
- Problem: `calcFourthDownEV995` could recommend FG even when FG was not applicable; logic also lacked stronger late-game context handling.
- Fix:
  - Non-applicable FG is excluded from recommendation selection.
  - Improved opponent EP handling for fail/miss/punt contexts.
  - Added situational adjustments for desperation/protecting game states and territory/yardage.
- Result: long-yardage deep own-territory now recommends punt; six explicit scenario tests added and passing.

### 4) Premium feature wiring gaps (partial)
- Problem: premium module existed, but gameplay wiring was incomplete.
- Fixes shipped:
  - `godMode` now initializes from `PREMIUM.isUnlocked('godMode')`.
  - `extraScouting` bonus now applied at initial scout point allocation paths.
  - `extraSaves` now enforced in save-slot store (`3` base, `8` with premium unlock).
- Result: premium wiring tests added and passing.

## New Tests Added

### Sim engine + validation
- `tests/sim-validation.test.js`
  - Season stat range assertions
  - Play distribution checks (ground vs air)
  - Scheme-counter impact validation
  - Rating→performance correlation checks
  - Clock monotonicity / bounds checks
  - NaN-propagation guard checks

### Coverage gap tests requested
- `tests/save-load-compat.test.js`
- `tests/premium-wiring.test.js`
- `tests/fourth-down-scenarios.test.js`
- `tests/scheme-counters.test.js`
- `tests/rng-channel-isolation.test.js`
- `tests/trade-ai-validation.test.js`
- `tests/cap-validation.test.js`

### Existing tests updated for corrected behavior
- `tests/contracts.test.js`
- `tests/broadcast-behavior.test.js`

## Sim Engine Validation Results (Track 1)
- Deterministic season simulation harness built around `PLAYBOOK_986.resolvePlay` + scheme matrix.
- Assertions now cover:
  - season totals in sane bounds,
  - no NaN/Infinity propagation,
  - expected directional behavior for run/pass distribution,
  - positive scheme edge outperforming negative edge,
  - higher-rated roster outperforming lower-rated roster,
  - clock decrement integrity.

## Final Verification (Codex pass)
- `npm test`: **960 passed**.
- `npm run build`: **0 errors**.

## Remaining Concerns for Kevin (Codex handoff)
1. `CODEX_AUDIT_BIBLE.md` is missing in this branch; if that file contains additional hard requirements/scenario definitions, those should be reconciled explicitly.
2. The legacy monolith (`mr-football-v100.jsx`) still contains extensive `Math.random()` usage in non-extracted paths. Modular `src/` code is now clean, but full monolith conversion to seeded RNG remains a significant follow-up.
3. Premium wiring is improved (godMode default, extra scouting, extra saves), but `quickSim` and `advancedAnalytics` are still not deeply integrated into monolith gameplay/UI pathways and should be completed in a dedicated pass.
4. Cross-browser/perf/a11y checklist items in the mission were not fully bench-tested via real browser automation in this run.

---

## Claude Code Review — Second Pass (2026-03-01)

Independent review of the Codex audit pass. All commits on `claude/game-review-feedback-alXYq`.

### Issues Found in Codex Audit

**1. Math.random() in monolith left unaddressed (22 gameplay calls)**
- Codex fixed `src/` modules but left 22 gameplay-affecting `Math.random()` calls in the monolith.
- Fixed calls span: penalty logic (8), injury logic (5), OOB check (1), FG/XP/2PT outcome (3), challenge overturn (1), draft Gaussian sampler (2), AI onside kick + XP/2PT choice (2).
- 21 remaining calls are UI-only (coin toss display, commentary, parallel game scores) — intentionally left.
- Commit: `fix: replace 22 gameplay Math.random() calls with seeded RNG channels`

**2. Fourth-down test scenarios didn't match Kevin's required table**
- All 6 scenarios were replaced to match Kevin's canonical table exactly.
- S2 (4th & 1 own 30, tied Q2 → punt) and S5 (4th & 2 opp 4, trailing 3 Q4 → go) required two new situational adjustments to `calcFourthDownEV995`: own-territory short-yardage punt bias, and red-zone trailing-by-FG go bias.
- Commit: `fix: update fourth-down scenarios to Kevin's exact required table`

**3. quickSim and advancedAnalytics not wired into monolith**
- Codex confirmed godMode was wired but called out quickSim and advancedAnalytics as incomplete.
- Wired `quickSim`: theater replay delay set to 0 when `PREMIUM.isUnlocked('quickSim')`.
- Wired `advancedAnalytics`: DVOA/EPA dashboard gated behind `PREMIUM.isUnlocked('advancedAnalytics')`.
- 2 new premium-wiring tests added and passing.
- Commit: `fix: wire quickSim + advancedAnalytics premium features into monolith`

### Additional Fixes (Beyond Codex Scope)

**4. Rating-correlation test floor raised to 90%**
- Added explicit test: 99-rated team vs 50-rated team, 30 games, asserts ≥ 90% win rate.
- Test passes at 100% win rate (seed 9999).
- Commit: `test: deepen sim-validation — rating correlation floor now asserts 90% win rate`

**5. safeDiv helper added**
- Added `safeDiv(n, d, fallback=0)` at line 1275 near the existing utility belt.
- Applied to 7 callsites: 5× punt average (replacing verbose `punts>0?x/punts:0`) and 2× FG%.
- All existing guards were sound; safeDiv now provides a canonical zero-safe division pattern.
- Commit: `fix: add safeDiv helper, apply to punt avg and FG% stat denominators`

**6. prefers-reduced-motion CSS media query added**
- Appended `@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}` to existing `<style>` block.
- Covers all 6 `@keyframes` animations defined in the monolith.
- Commit: `fix: add prefers-reduced-motion media query to CSS animations`

**7. React key props audit**
- Searched monolith and all `src/` JSX files.
- All `.map()` returns that produce JSX/React.createElement already have `key` props set.
- No fixes needed.

**8. Sim play rate spot-check**
- Sack rate: pressureThresh 3–28%, 50% convert to sacks → ~7% per pass drive. NFL avg ~6.5–7% ✅
- INT rate: base 7.5% per pass drive, clamped 1.5–16% → ~0.75–0.9 INTs per team per game ✅
- Fumble rate: 10% on run drives that go 3-and-out (not per play) ✅
- FG at 50yd: 50% for avg kicker. NFL avg ~60–65% (acceptable in drive-level model) ✅
- No probability weight fixes needed.

### Final State
- Tests: **963 passed (222 test files)** — +3 from Codex baseline of 960
- Math.random() in monolith: 21 remaining (UI/flavor only; gameplay: 0)
- Premium features wired: godMode ✅ | extraScouting ✅ | quickSim ✅ | extraSaves ✅ | advancedAnalytics ✅
- Build: 0 errors (unchanged)
- safeDiv helper: added ✅
- prefers-reduced-motion: added ✅
- React key props: all clean ✅
