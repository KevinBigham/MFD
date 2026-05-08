<goal>
Make the franchise-setup choices that currently have NO downstream effect actually matter during the season, and make the choices that already DO matter visible to the player. Three priority outcomes, in order:

1. **AGM hire becomes a real, season-long signal.** The chosen `agmProfileId` (and its `expertise` / `personality`) drives at least one tangible, deterministic, save-safe gameplay effect that lasts through Week 1+. The player can both *feel* the AGM in the sim and *see* the AGM speaking up across the season.
2. **Season goals become a tracked contract.** The existing-but-unwired `evaluateGoals()` function fires automatically each week, drives a per-goal progress UI in monday-briefing, and triggers owner-approval feedback when a goal is on track / at risk / missed at season end.
3. **Choices that already have real engine effects (culture mandate, cap strategy, scheme) get surfaced to the player at moments they can connect to the choice.** No new engine effects here — purely revealing what the engine already does.

If any of the three blow scope or risk save-schema instability, ship outcome 1 alone with full evidence and document the gating. Partial wins are encouraged over wide-but-shallow.
</goal>

<context>
- Repo: `/Users/tkevinbigham/Documents/GitHub/MFD/` (origin) or a clean sibling clone if one is available — your call. Branch off latest `main` (`168265d` at time of writing).
- Stack: TypeScript monorepo. Engine is pure (`packages/engine/`), web is React 19 + Zustand + Vite (`apps/web/`). Save state is Dexie/IndexedDB, current schema `v35`. Determinism is sacred — seeded RNG only.
- Audit findings (do NOT redo this audit; trust it):
  - **AGM (`decisions.agmProfileId`):** zero engine consumers in season simulation. `assistant-gm.ts:313-361` only rewrites setup-phase narration tone. After cold-open the AGM disappears.
  - **Season goals (`decisions.seasonGoals`):** stored to `team.owner.goals = { floor, target, ceiling }` at `packages/engine/src/systems/franchise-setup.ts:2619-2624`. `packages/engine/src/systems/owner-goals.ts:104-114` exports `evaluateGoals()` but it is never called. Owner approval never moves based on goal progress.
  - **Culture mandate:** real `TimedEffect` for 4 weeks (`franchise-setup.ts:2520-2551`), but never re-named in any UI surface mid-season.
  - **Cap strategy (`capPosture`):** real `capSpace` / `deadCap` / `owner.approval` delta (`franchise-setup.ts:2504-2518`), but the chosen package label is never shown again.
  - **Scheme:** real transition penalty + install progress (`scheme-install.ts:62-87`), already partially shown.
  - **Blueprint narrative:** decorative only; do not bother wiring this — the audit confirmed it's intentionally one-shot lore.
- Companion + briefing surfaces that should reference the AGM going forward: `apps/web/src/features/companion/dialogue/weekly.ts`, `apps/web/src/features/monday-briefing/MondayBriefing.tsx`, `apps/web/src/features/route-coaching/routeBeatRegistry.ts`, `apps/web/src/features/game-day/RecapChipReaction.tsx`, `apps/web/src/features/game-day/PressConferenceModal.tsx`. The Chip companion atlas (36 poses) shipped in PR #62 — reuse those poses, do not add new ones.
- Engine entrypoints to study before changing anything: `packages/engine/src/systems/franchise-setup.ts` (decision → game state), `packages/engine/src/systems/assistant-gm.ts` (existing AGM helpers — extend rather than replace), `packages/engine/src/systems/owner-goals.ts` (`evaluateGoals` is your wire-target), `packages/engine/src/types/franchise.ts` (where to add new optional fields).
- Save schema: do **not** bump `SAVE_VERSION` unless absolutely required. Prefer additive optional fields with sensible defaults derived from existing state. If a bump is unavoidable for outcome 2 (goal progress tracking), follow the existing migration chain pattern in `packages/engine/src/systems/save-migrations.ts` (or wherever the v34→v35 migration lives) and add a v35→v36 step that fills `goalProgress` from current `owner.goals` and `team.record`.
- This is RC-shipped game (v1.0.0). No risky refactors. No new RNG paths. No new file structure unless trivially additive.
</context>

<constraints>
- Three commits expected, in this order: `engine:` (any engine + types changes), `wire:` (UI + companion surfaces consuming the new state), `polish:` (copy, art reuse, minor tweaks). Each commit must build & typecheck on its own.
- Touch save schema only if outcome 2 forces it. If you bump, write the migration AND a vitest covering an old-save → new-save round-trip.
- Reuse the existing 36-pose Chip atlas. No new pose generation. No second pipeline. If a moment needs a pose you don't have, pick the closest existing one.
- AGM effect must be **deterministic and small**. One concrete bonus per expertise — e.g. `cap_management` → minor cap-renegotiation luck (small `ownerApprovalDelta` improvement on cap moves), `personnel` → tiny scout accuracy boost, `offense` → +1 install-progress nudge to the offense lane only, `defense` → same on defense, no profile gets +OVR. Tune so the swing across 4 expertises is ≤2% of any seasonal stat — felt, not gamebreaking.
- Goal progress evaluation runs at most once per week-rollover. Fire it from the existing season-loop step that already does week-end housekeeping; do not introduce a new tick.
- Owner approval response to goal progress: small, signed deltas (e.g. ≤±3 per evaluation, capped 0–100 same as today). End-of-season writes a one-time approval delta based on floor/target/ceiling outcome.
- Surface-only outcome (goal 3): no new engine effects, no new TimedEffects, only render existing data. The simplest possible string lookups.
- Determinism gate: no new `Math.random()` paths. `pnpm grade-season` and `pnpm grade-season-baseline` must produce byte-identical reports for seed 42 before-and-after.
- No work in `/Users/tkevinbigham/Documents/GitHub/MFD/` if it has uncommitted changes — stash or use a clean clone first. Document which clone you chose.
- No push to remote, no PR open. Kevin and Claude do that.
</constraints>

<done_when>
A. **Outcome 1 (AGM real consequence) — verifiable:**
  - `git grep -n agmProfileId packages/engine/src/systems` shows reads in at least one season-simulation system (not just franchise-setup.ts and assistant-gm.ts setup helpers).
  - A new vitest in `packages/engine/src/systems/` proves: same seed + same team + only `agmProfileId` differing → at least one game-state field differs after Week 1 (e.g. `team.schemeOff.installProgress`, `team.cap.space`, an owner approval read).
  - At least one UI surface (monday-briefing, weekly dialogue, route beat, or recap) renders a string that references the AGM by name OR expertise after Week 1. Search hit must include `agmProfileId` or `selectedAGM` in a non-setup file.
  - No new RNG. `pnpm grade-season --seed 42` byte-identical to baseline if the same AGM is chosen; produces *different* report if a different AGM is chosen.

B. **Outcome 2 (goal progress) — verifiable:**
  - `evaluateGoals` (or its new wrapper) is called at week rollover. `git grep "evaluateGoals\|evaluateOwnerGoals"` shows a call site in `packages/engine/src/systems/season-loop*` or wherever week-rollover lives — not just the export.
  - Game state carries a `goalProgress` shape (per-goal: id, status of `on_track | at_risk | missed | hit`, evidence value). Additive optional field; default for old saves is recomputable from existing `team.owner.goals` + `team.record`.
  - `apps/web/src/features/monday-briefing/MondayBriefing.tsx` renders a "Goal Progress" panel listing each of the 3 goals with status color. Snapshot/test confirms presence.
  - End-of-season hook adjusts `team.owner.approval` based on hit/missed goals.
  - If schema bumped to v36: migration test in `packages/engine` proves a fixture v35 save loads cleanly.

C. **Outcome 3 (surface real consequences) — verifiable:**
  - Blueprint phase or post-Week-1 recap shows the picked **culture mandate label** and the picked **cap strategy package label** as readable text (not just narrative wrapping).
  - Mid-season scheme-fit score is exposed in monday-briefing or route-beats once.
  - Each surface has a vitest snapshot or DOM-presence assertion.

D. **Gates (all three outcomes share these):**
  - `pnpm -r typecheck` clean.
  - `pnpm --filter @mfd/engine test` clean.
  - `pnpm --filter @mfd/web test` clean.
  - `pnpm --filter @mfd/web build` clean.
  - `pnpm playtest:all` high-severity anomaly count remains `0`.
  - Save schema either unchanged, or bumped exactly once with migration test passing.

E. **Evidence dropped at `.codex/MFD/evidence/setup-consequences-<timestamp>/`:**
  - `audit-before.md` summarizing what wasn't wired.
  - `final-report.md` listing which files changed, which gates passed, the chosen schema strategy.
  - 3 screenshots: monday-briefing showing goal progress, blueprint/recap showing culture+cap labels, weekly dialogue or route beat showing AGM reference.
</done_when>

<workflow>
1. **Branch off latest `main`.** Name it `codex/setup-consequences`. Confirm `git rev-parse origin/main` matches starting commit.
2. **Pick the engine surface for AGM expertise effect.** Prefer adding to `assistant-gm.ts` an `applyAGMSeasonModifiers(game, decisions)` helper that returns small deltas, called from `finalizeSetup()` once. Keep it data-driven (a `const AGM_EXPERTISE_MODIFIERS` table) so future expertise tweaks are one-line changes. Commit `engine: AGM expertise season modifier`.
3. **Wire `evaluateGoals` to week rollover.** Add `goalProgress` to game state as additive optional field. Call evaluator at week-end. Add end-of-season approval delta. If schema must bump, add migration + test. Commit `engine: wire goal progress to week rollover and end-of-season approval`.
4. **UI/companion wires.** Render goal progress panel in monday-briefing. Add AGM reference line(s) to weekly dialogue (1-2 variants) and one route-beat that already exists (e.g. cap-lab → AGM cap_management voice if expertise matches). Add culture+cap labels to blueprint or recap. No new files unless truly necessary. Commit `wire: surface AGM, goal progress, culture, cap to season UI`.
5. **Run full gate stack.** Typecheck, engine tests, web tests, web build, playtest:all, grade-season for seed 42 with two different AGM picks (must produce different reports). Capture before/after report deltas.
6. **Capture evidence.** Run a short Playwright or vite-evidence harness like the chip-full-wire one to grab the 3 required screenshots. Drop into `.codex/MFD/evidence/setup-consequences-<timestamp>/`.
7. **Stop. Do not push, do not PR.** Output the verdict using the existing format and Kevin will hand the branch to Claude for verification.
</workflow>

<verification_loop>
After each commit:
- `pnpm --filter @mfd/engine test` — engine still passes.
- `pnpm --filter @mfd/web typecheck` — types are clean before moving on.
- After commit 3: full web test run + build + playtest:all.

If a gate fails: roll the failing change back to a smaller surface and re-attempt. Do not skip a gate to keep moving.

For determinism specifically, run `pnpm grade-season` twice with the same seed and the same AGM pick — diff must be empty. Then run with a different AGM pick — diff must be non-empty (proves the AGM choice now actually changes outcomes).
</verification_loop>

<missing_context_gating>
Stop and report-without-shipping if any of these is true:
- The week-rollover hook for owner-side bookkeeping doesn't have a clean place to call `evaluateGoals` and you'd need to refactor the season loop.
- Adding `goalProgress` to game state forces a schema bump AND `save-migrations.ts` doesn't have a clean v35→v36 slot.
- An expertise-modifier landing point would force changes in playcalling/sim hot paths (those are off-limits in this slice).
- Any UI surface you'd touch is in flight on another branch (check `git log --oneline origin/main..` and recent uncommitted state).

In any of those cases: deliver outcome 1 only (AGM modifier + 1 UI reference) and document the gating in `final-report.md`.
</missing_context_gating>

<output_contract>
Reply with:
```
VERDICT: Setup Consequences <Verified|Partial|Blocked>

REPO STATE:
Branch: codex/setup-consequences
Base: <main sha>
End commits: <engine sha>, <wire sha>, <polish sha or n/a>
Files changed: <count> committed paths

OUTCOMES SHIPPED:
1. AGM real consequence: <yes|no>
2. Goal progress: <yes|no>
3. Surface existing: <yes|no>

SCHEMA:
SAVE_VERSION before/after: v35 / <v35 or v36>
Migration test: <pass|n/a>

GATES:
typecheck (web|engine|all): <pass>
vitest engine: <files/tests>
vitest web: <files/tests>
vite build: <pass + time>
playtest:all high-severity: <0|>0>
grade-season seed 42: <byte-identical when AGM same | differs when AGM differs>

DETERMINISM:
New RNG paths added: <none|details>

EVIDENCE DIR:
.codex/MFD/evidence/setup-consequences-<timestamp>/

RISKS:
<short list>

KEVIN NEXT ACTION:
<concrete 1-2 lines on what to eyeball — e.g. open monday-briefing, see goal progress panel; pick a different AGM and watch X change>
```
Do not push. Do not open a PR. Stop after the verdict.
</output_contract>
