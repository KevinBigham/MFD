# Amended Execution Plan — MFD UI/UX Reinvention

This document records owner-approved amendments to
`docs/ui-overhaul/08_CLAUDE_OPUS_5_IMPLEMENTATION_PLAN.md`.

**Scope of the amendment:** sequencing, evidence tooling, and one typography
decision. The audit's information architecture, weekly loop, Task Ledger model,
Chip strategy, protected-contract rules, route-compatibility policy and numeric
acceptance thresholds are **unchanged and remain authoritative.**

Approved by owner on 2026-08-05 against the verified baseline in
`PROGRESS_LEDGER.md`.

---

## Why the plan is amended

The audit ran in a container that could not install dependencies, so three
repository facts were not visible to it:

1. Playwright and Storybook are declared in `apps/web/package.json` scripts but
   are **not installed** and are not in `devDependencies`. The audit's entire
   evidence model assumes a harness that does not exist.
2. The repository's real browser gate is `scripts/smoke-test-post-setup-route.mjs`
   — 8,252 lines of raw-CDP Chrome driving, 43 scenario flags, 198 body-text
   assertions, 21 button-text clicks, across 49 **old hash routes**, asserting
   exact on-screen copy. It backs 16 of the 37 release-gate steps.
3. The eager UI chunk `index-*.js` is already **275 KB gzip**, so PERF-02's
   "≤15% rise" sets a real ceiling of **316 KB** — while two shells must coexist.

---

## A1 — Pin the release gate to legacy mode for the migration

`node scripts/release-gate.mjs` continues to exercise the **legacy shell**
unchanged for the entire migration. The UI-only migration flag (WP-00) makes this
free: legacy keeps satisfying all 198 text assertions across all 49 old routes.

Consequences:

- The CDP harness becomes a continuous, zero-cost **feature-loss net** — stronger
  than the route-coverage script the audit proposed, because it asserts real
  rendered copy, not just route resolution.
- `scripts/release-gate.mjs` is a **Kevin gate** per `CLAUDE.md`. This amendment
  reduces edits to it to exactly one, at cutover.
- New-shell steps are added to the gate only at cutover, as a separate Kevin-gated
  change with its own review.

**Rule:** no packet may change legacy-shell rendered copy or legacy route
behaviour. If a packet appears to require it, stop and raise it.

## A2 — Playwright is added for the new shell only

`playwright` is added as an `apps/web` devDependency and drives the doc-09
evidence model — 12-viewport geometry matrix, screenshots, visual regression,
journeys J-01…J-12 — for the **new shell only**.

`scripts/smoke-test-post-setup-route.mjs` is **not modified, not extended, and not
replaced.** Clean split of responsibility:

| Harness | Proves |
|---|---|
| CDP smoke (existing) | Legacy shell still works; no feature lost |
| Playwright (new) | New shell meets the numeric acceptance thresholds |

Playwright is a devDependency only and must never enter a shipped bundle.

## A3 — The new shell is lazy-loaded from its first commit

Baseline eager UI chunk is 275 KB gzip; PERF-02's ceiling is 316 KB. Shell
coexistence would breach that if both shells were eager.

- Legacy remains the eager path for the whole migration.
- The new shell is loaded via dynamic import behind the migration flag.
- The eager/lazy relationship flips at cutover, after which legacy is deleted.
- Every packet records its `index-*.js` gzip delta in the ledger.

## A4 — WP-09 splits into WP-09a and WP-09b

`apps/web/src/features/monday-briefing/ActionCenter.tsx` already contains
`WeeklyBoardAction { id, what, why, consequence, where, route, accent, buttonLabel }`
plus `requiredBeforeAdvance`, and an urgent/high/medium/low → Recommended/Optional
mapping. This is a near 1:1 match for the audit's `UiTask` contract, so the Task
Ledger is an **extraction**, not a new derivation.

| Packet | Content | When |
|---|---|---|
| **WP-09a** | Pure `task-ledger.ts` presenter + fixtures + tests. No UI. | Immediately after WP-00, parallel with WP-04 |
| **WP-09b** | The Today screen that renders it. | After foundations |

WP-09a is pure, fully testable, carries zero UI regression risk, and unblocks the
two hardest critical-path packets (WP-08 Chip adapter and WP-09b Today) before
either begins.

Caveat: the presenter's inputs (`hasGamePlan`, `starterCount`, `injuredCount`,
`tradeOfferCount`, `ownerApproval`) are currently computed inside
`MondayBriefing.tsx` and must be extracted alongside it as pure selectors.

## A5 — Today is built before `App.tsx` is decomposed

The audit orders WP-05 (XL; rewires the 2,229-line shell every route depends on)
before Today. That spends the largest regression budget in the project before the
direction has been proven on real data.

Inverted: mount a new `/today` route behind the migration flag, rendering the
WP-09a presenter against **real save data**, before touching `App.tsx`.

This is feasible because `App.tsx` composes its route tree with
`createRootRoute`/`createRoute`; adding one flag-gated lazy branch is a small
contained change, whereas WP-05 decomposes the legacy shell itself.

## A6 — New H0 gate

**H0 — Direction proof.** Owner opens the new Today on a real save at 390×844 and
1440×900 and confirms the direction before the WP-05/06/07 spend.

H0 is deliberately cheaper and earlier than H1. H1 is unchanged: the complete
weekly-loop proof after WP-10/WP-11.

## A7 — Typography: editorial serif, not condensed

`06_DESIGN_SYSTEM_AND_VISUAL_SPEC.md` specifies a condensed display face, but the
approved prototype actually ships `Georgia, "Times New Roman", serif`. The
prototype is authoritative.

Rationale: zero bundle cost against 41 KB of eager headroom, present on every
target platform, no license/subset/preload work, and it already demonstrably
delivers the Broadcast War Room character at 390×844.

Doc 06's display-face row is amended to match. All other typography rules —
16 px phone body, ≥12 px essential labels, tabular numerics, pixel face restricted
to logo/kicker/rare cinematic — are unchanged.

---

## Amended critical path

```text
WP-00  Baseline, safety rails, migration boundary
   │
   ├─→ WP-04   Route surface metadata + 79/79 compatibility
   ├─→ WP-09a  Pure Task Ledger presenter (extraction)      ← moved earlier
   │
   ├─→ WP-01   Semantic tokens + typography  (A7 applies)
   ├─→ WP-02   Adaptive viewport primitives
   └─→ WP-03   Interaction / focus / a11y foundation
        │
        ↓
   Today on real data, lazy, behind the flag                ← moved earlier
        │
        ↓  ══════════ H0 — direction proof ══════════
        │
   WP-05 Shell decomposition → WP-06 Nav → WP-07 Overlays → WP-08 Chip
        │
        ↓
   WP-09b Today (full) → WP-10 Readiness/Advance → WP-11 Entry & setup
        │
        ↓  ══════════ H1 — weekly-loop proof ══════════
        │
   WP-12…WP-21 cluster migration (parallel streams)
        │
        ↓
   WP-22 style cleanup → WP-23 release hardening → H2 (if retiring) → H3
```

## Unchanged from the audit

- Five-hub IA: Today / Team / Game / Office / League, with Dynasty and System
  first-class but contextual.
- Broadcast War Room direction, colour roles, accent budget, density model.
- Chip strategy: 44–48 px trigger, phone bottom sheet, desktop on-demand panel,
  zero permanent clearance, fed by the same Task Ledger.
- Protected layers: engine systems, RNG, save schemas/migrations, domain types,
  game outcome logic, mutating store actions, persistence.
- Route-compatibility policy and the 79/79 feature-loss ledger.
- All numeric acceptance thresholds in doc 09.
- H1, H2, H3 as defined (H0 is additive).

## Standing constraints for every packet

1. Engine and web test suites **must not run concurrently** on this host — CPU
   contention manufactures false timeout failures. Run serially.
2. Record the `index-*.js` gzip delta in the ledger every packet.
3. Never change legacy rendered copy or legacy route behaviour (see A1).
4. No save-schema change for presentation state.
5. No production UI edit without the packet's preflight tests recorded first.
