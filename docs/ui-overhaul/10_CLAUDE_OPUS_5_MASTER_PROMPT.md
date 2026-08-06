# CLAUDE OPUS 5 — MFD COMPLETE UI/UX REINVENTION IMPLEMENTATION MASTER PROMPT

## Mission

You are implementing the approved Mr. Football Dynasty UI/UX reinvention in the supplied repository. This is **not** another audit and not a request to redesign the product from scratch. The attached `docs/ui-overhaul/` package is the authoritative product, design, architecture, work, and QA specification.

Your job is to execute the plan packet-by-packet while preserving the deterministic simulation, game depth, save compatibility, local-first operation, route reachability, and MFD personality.

**Preserve the simulation. Preserve the depth. Preserve the dynasty. Replace the shell.**

## Verify the target before editing

Expected repository:

- Product: Mr. Football Dynasty / package `mfd`
- Expected commit at audit: `7577176aa4ae4cbcbbf092fde29347c8d4c610d6`
- Expected branch at audit: `main`
- Canonical route count: `79`
- Key paths: `apps/web/`, `packages/engine/`, `packages/design-system/`, `scripts/`

Immediately run and record:

```bash
git rev-parse HEAD
git status --short
git branch --show-current
node --version
pnpm --version
```

If the commit differs, do not reset or discard owner work. Record the actual commit, inspect changes since the audited commit, reconcile the audit’s file/symbol assumptions with the current tree, and continue from current source. Stop only if a change creates a genuine protected-contract conflict.

## Read these in order

1. Repository governance: `AGENTS.md`, `CLAUDE.md`, `README.md`, `DESIGN.md`, project maps/audits, release contracts.
2. `docs/ui-overhaul/00_EXECUTIVE_SUMMARY.md`
3. `01_REPOSITORY_AND_RUNTIME_EVIDENCE.md`
4. `02_CURRENT_UX_AUDIT.md`
5. `03_ROUTE_AND_INFORMATION_ARCHITECTURE.md`
6. `04_RESEARCH_AND_UX_NORTH_STAR.md`
7. `05_SCREEN_BLUEPRINTS.md`
8. `06_DESIGN_SYSTEM_AND_VISUAL_SPEC.md`
9. `07_TECHNICAL_UI_ARCHITECTURE.md`
10. `08_CLAUDE_OPUS_5_IMPLEMENTATION_PLAN.md`
11. `09_QA_ACCEPTANCE_AND_TRACEABILITY.md`
12. `ROUTE_SURFACE_MATRIX.csv`
13. `BASELINE_MEASUREMENTS.json`
14. `AUDIT_MANIFEST.md`
15. `prototypes/README.md` and the prototype
16. The relevant file under `work-packets/` before each packet.

Treat the selected IA, weekly loop, visual direction, Chip strategy, adaptive policy, protected layers, and acceptance thresholds as authoritative. Do not substitute a generic dashboard, a neon reskin, an unrelated framework, or a feature-deleting simplification.

## Authoritative product decisions

### UX north star

A phase-aware football front office that always puts the next meaningful decision first, lets experts drill into the full simulation without a second navigation system, and turns each week and season into a coherent story.

### Global IA

Phone persistent destinations:

1. Today
2. Team
3. Game
4. Office
5. League

Dynasty and System are first-class but contextual on phone; expanded layouts may show Dynasty in the rail/sidebar and System/save health at its base.

Retire GM Mode versus Nerd Mode as competing navigation maps. Keep one IA. Support experts with Comfortable/Compact density, advanced sections, saved views, comparison, and command search.

### Weekly loop

```text
Understand → Resolve → Prepare → Play/Sim → Review → Advance → New Today
```

Today owns the canonical Task Ledger and readiness. Briefing, Action Center, badges, Chip, and Advance must not independently decide priority.

### Visual direction

Broadcast War Room:

- calm dark ink/navy neutrals;
- gold reserved for brand/one primary action;
- cyan for interaction/info;
- semantic status with text/icon/shape;
- readable body sans, condensed display, tabular numeric type;
- pixel type only for logo/short kicker/rare cinematic moment;
- plain sections and spacing by default, not outlined panels everywhere;
- routine calm, earned events cinematic.

### Chip

Preserve art, personality, route/event wiring, onboarding value, pending-decision awareness, and “Where am I?” behavior. Replace permanent dock clearance with a 44–48 px labeled trigger; phone bottom sheet; desktop on-demand panel. Chip consumes the same Task Ledger/context as Today/readiness, can minimize/mute/reopen, and does not repeat routine visible guidance.

### Technical path

Keep React 19, Vite, TanStack Router, Zustand, Dexie, design-system package, hash routing/GitHub Pages, and local-first persistence. Use semantic v2 tokens, CSS Modules, screen archetypes, pure presenters/view models, route-surface metadata, compatibility wrappers, an overlay manager, and a reversible UI-only migration boundary.

## Protected contracts

Do not casually modify:

- `packages/engine/src/systems/**`
- `packages/engine/src/rng/**`
- deterministic event ordering or RNG consumption
- save schemas/migrations/slots/autosaves/export/import/complete backup/sidecars
- core domain types and league/content generation
- game outcome logic
- store actions that mutate simulation state
- persistence behavior

Solve UI needs through pure selectors, presenters, metadata, adapters, UI-only state, compatibility wrappers, and new design-system components.

If a packet appears to require an engine/save change, write a mini-RFC with requirement, why adapter is insufficient, determinism/save impact, tests, fixture hashes, and rollback. Mark only that packet `blocked-protected-contract`, continue unrelated packets where safe, and do not silently change behavior.

## Baseline gate — WP-00 is mandatory

The audit environment could not perform a fresh Linux build because the archive node_modules lacked `@rollup/rollup-linux-x64-gnu` and pnpm was unavailable. Treat retained runtime screenshots as audit evidence, not a release baseline.

On your correctly provisioned environment, before production UI changes:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm -r typecheck
pnpm --filter @mfd/engine test
pnpm --filter @mfd/web test
pnpm --filter @mfd/web build
bash scripts/check-bundle-size.sh
bash scripts/smoke-test-built-page.sh
node scripts/release-gate.mjs
```

Record exact results, commit, versions, screenshots, save fixtures, bundle chunks, and limitations in `docs/ui-overhaul/implementation/PROGRESS_LEDGER.md`.

Create the UI-only migration boundary and route/visual baseline defined by WP-00. The new mode must default safely; legacy remains a rollback until release approval. Do not bump the dynasty save schema for the flag.

## Execution order

Critical path:

```text
WP-00
 → WP-01 / WP-02 / WP-03
 → WP-04
 → WP-05
 → WP-06 / WP-07
 → WP-09 (defines Task Ledger)
 → WP-08 (binds Chip to it)
 → WP-10
 → WP-11
 → H1 complete first-ten-minutes + weekly-loop proof
```

After H1, use the dependency graph in `08_CLAUDE_OPUS_5_IMPLEMENTATION_PLAN.md` for WP-12 through WP-23. Do not mass-migrate routes before H1.

## Packet protocol

For every packet:

1. Read the packet in full.
2. Confirm dependencies and current tree.
3. List exact files/symbols before editing.
4. Run narrow preflight tests.
5. Implement the smallest complete behavior slice.
6. Preserve old paths and feature behavior through the route compatibility layer.
7. Run unit/component/route/viewport/input/a11y tests.
8. Run relevant engine/save regression tests.
9. Capture required deterministic screenshots.
10. Measure bundle/DOM/render changes.
11. Update route coverage and inline-style ledger.
12. Make intentional atomic commits.
13. Update progress ledger with commands, results, limitations, rollback, and unlocked dependencies.

Never replace a packet with another broad audit. Never claim completion without evidence.

## First vertical slice acceptance

H1 requires all of this on 390×844 and 1440×900:

- Start/Continue is clear in viewport one.
- Setup steps preserve Back choices and fit within 1.5 phone viewports.
- Today first viewport shows team, season/week/phase, opponent/event, required count, next action, and readiness.
- Default Today is at most 2.5 phone viewports before optional expansion.
- Required depth/Game Plan task is one interaction from Today.
- The workflow saves through existing game actions.
- Return to Today restores the task and shows completion.
- Readiness lists exact blockers/warnings/consequences.
- Play/sim/advance produces the same deterministic behavior as legacy.
- Chip agrees with Today, reserves no permanent viewport, and can minimize/mute/reopen.
- No core target is under 44×44; 48 is the nominal target.
- No unintended overflow, nested-scroll trap, focus occlusion, hover/drag-only control, or essential pixel-font copy.
- Touch, keyboard, reduced motion, 200% zoom, and direct old paths work.

## Route and feature protection

Use `ROUTE_SURFACE_MATRIX.csv` as the feature-loss ledger. Create `ROUTE_SURFACE_MAP` with exact key equality to the 79 canonical registry paths. Every old path must resolve with availability, parameters/entity, destination, focus, back/return behavior, and capability intact.

Do not delete an old route or duplicate surface until:

- replacement is green;
- all entry points use canonical metadata;
- old URL behavior is documented/tested;
- reference/import proof is clean;
- H2 is recorded if permanent retirement occurs.

## Responsive and accessibility rules

Required viewports:

- 320×568, 360×800, 390×844, 430×932
- 667×375, 844×390, 932×430
- 768×1024, 1024×768
- 1280×720, 1440×900, 1600×1000

Also test safe areas/dynamic chrome, 200% zoom/large text, reduced motion, coarse pointer/touch, keyboard, mouse, network blocked/offline, CPU throttle, new/returning saves, regular season, deadline, playoffs, offseason, FA, draft, long dynasty, and Chip states.

Product thresholds:

- no unintended horizontal overflow;
- one primary scroll owner per archetype;
- no essential content/focus obscured;
- phone body ≥16 px; essential labels ≥12 px;
- routine targets ≥44 px, 48 nominal;
- reflow at 320 CSS px; usable at 200% zoom;
- no essential hover/drag/color/motion/landscape dependency;
- modal/sheet focus trap/restore and background inertness;
- color plus non-color status;
- charts have text/data alternatives;
- no generic table-to-all-field-card mobile fallback.

## Performance and bundle

- Existing audit build engine chunk: 313 KB gzip; release ceiling 320 KB. Do not add UI code to engine chunk.
- No new eager UI chunk >100 KB gzip without evidence/owner review.
- Initial UI gzip increase ≤15% from clean WP-00 baseline unless H1 approves.
- Keep route clusters lazy.
- Avoid broad icon/chart/animation/font dependencies.
- Virtualize/paginate large complex lists using the QA thresholds unless profiling documents a better value.
- Measure; do not claim.

## Atomic commits and rollback

Separate tests/baseline, presenter/contracts, component/screen, route wrapper, style migration, and deletion where practical. Never combine engine rules, save migration, shell rewrite, and visual restyle in one commit.

The rollback path remains:

1. UI-only mode to legacy;
2. compatibility old paths;
3. cluster-scoped commit revert;
4. unchanged saves/engine.

Prove rollback before final release.

## Progress updates

Work continuously. Keep `PROGRESS_LEDGER.md` current after every packet and important gate. Surface a discovered blocker immediately with evidence and the safest continuation. Do not stop for broad preferences already decided by the audit. Stop only at H1, H2 when truly required, H3, or a genuine protected-contract conflict that cannot be isolated.

## Final completion report

Do not say “done” without reporting:

- actual commit/branch and all implementation commits;
- packets complete/blocked;
- H1/H2/H3 status;
- 79/79 route report;
- findings/traceability status;
- exact test/build/bundle/release results;
- save/determinism proof;
- viewport/a11y/input results;
- screenshots and artifact paths;
- bundle/performance deltas;
- files deleted and proof;
- known limitations;
- rollback procedure;
- final owner playtest command/instructions.

## Begin

Read the audit package, verify the repository, then execute **WP-00 — Baseline, Safety Rails, and Migration Boundary**. Do not edit production UI before WP-00’s baseline and rollback gate are recorded.
