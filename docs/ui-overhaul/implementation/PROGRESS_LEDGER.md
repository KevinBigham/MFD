# MFD UI/UX Reinvention — Implementation Progress Ledger

## Environment of record

| Field | Value |
|---|---|
| Commit | `7577176aa4ae4cbcbbf092fde29347c8d4c610d6` |
| Branch | `main` |
| Working tree at baseline | Clean (only `docs/ui-overhaul/` added, untracked) |
| Node | v24.16.0 (audit container used v22.16.0) |
| pnpm | 9.15.9 (pinned in `package.json`) |
| OS | darwin 25.5.0 |
| Date | 2026-08-05 |

Production source under `apps/`, `packages/`, `scripts/`, `_canon/`, `public/` and the
root manifests was diffed byte-for-byte against `MFD_UI_UX_REINVENTION_AUDITED_REPOSITORY.zip`:
**no differences**. The audit's read-only production contract held.

---

## WP-00 — Baseline, Safety Rails, and Migration Boundary

Status: **complete** — baseline recorded, safety rails landed, committed
Branch: `feat/ui-overhaul-wp00`
Commit(s):
| SHA | Subject |
|---|---|
| `9c15d53` | `docs(ui-overhaul): land the audited UI/UX reinvention spec and progress ledger` |
| `b6833c1` | `feat(ui-migration): add legacy-default UI overhaul boundary` |
| `e8197bd` | `test(ui): add deterministic fixtures and capture the legacy geometry baseline` |
| `42aa94b` | `test(routes): enforce 79/79 route surface parity` |

`docs/ui-overhaul/evidence/baseline-legacy/*.png` is gitignored — those
captures are rewritten by every baseline run, so `geometry.json` is the durable
artifact. The audit's own one-time `evidence/runtime/` captures are committed.
Save/determinism impact: **none** — no engine, RNG, schema, migration or
mutation-action file was touched; `SAVE_VERSION` unchanged at 37

### Baseline gate results

All commands run from repo root at the commit above.

| Gate | Command | Result |
|---|---|---|
| Install | `pnpm install --frozen-lockfile` | **PASS** (exit 0) |
| Typecheck | `pnpm -r typecheck` | **PASS** (exit 0) — engine, design-system, web all clean |
| Engine tests | `pnpm --filter @mfd/engine test` | **PASS** — 247/247 files, 2374/2374 tests |
| Web tests | `pnpm --filter @mfd/web test` | **PASS** — 261/261 files, 2220/2220 tests |
| Build | `VITE_CHIP_ENABLED=true pnpm --filter @mfd/web build` | **PASS** (exit 0, 3.61s) |
| Bundle | `bash scripts/check-bundle-size.sh` | **PASS** — engine 313 KB gzip / 320 KB ceiling (WARN: within 10 KB) |
| Smoke | `bash scripts/smoke-test-built-page.sh` | **PASS** — 2 URLs, `#root` populated, no init-time JS errors |
| Release gate | `node scripts/release-gate.mjs` | **NOT RUN** — 37 steps, ~90+ min; CI's job per `CLAUDE.md` |

This resolves the audit's three environment-blocked items. In particular
`pnpm -r typecheck` — recorded as *inconclusive* in the audit — is **green**,
and the web build the audit could not reach completes cleanly.

### Test-run methodology note

A first pass ran the engine and web suites **concurrently** and reported 8 engine +
3 web failures. Every one was a `Test timed out` in a long-running full-season sim
(45 s / 60 s limits); there were zero assertion failures. Re-run serially, both
suites are fully green. **Engine and web suites must not be run concurrently on this
host** — CPU contention manufactures false failures in `playtesting/integration/*`,
`systems/season-smoke`, and `store/game-store.gameweek`.

### Bundle baseline (per-chunk gzip, for PERF-02 diffing)

| Chunk | gzip |
|---|---|
| `engine-*.js` | 312 KB (gate reads 313 KB) |
| `sim.worker-*.js` | 310 KB |
| `index-*.js` — **eager UI** | **275 KB** |
| `engine-content-*.js` | 132 KB |
| `vendor-*.js` | 113 KB |
| `design-system-*.js` | 46 KB |
| Largest lazy route chunk (`DraftBoard`) | 7 KB |
| Total JS gzip | 1365 KB |

**PERF-02 derived ceiling:** initial UI gzip may rise ≤15% from 275 KB → **316 KB**
without H1 approval. The new shell must therefore be **lazy-loaded behind the
migration flag**, so shell coexistence does not inflate `index-*.js`.

### Repository facts confirmed against the audit

| Audit claim | Verified |
|---|---|
| 79 canonical routes | **Yes** — `APP_ROUTE_REGISTRY` has exactly 79 `route(...)` rows; matrix has 79 data rows |
| `App.tsx` 2,229 lines | **Yes** |
| `MondayBriefing.tsx` 1,987 lines | **Yes** |
| Engine chunk 313 KB gzip vs 320 KB ceiling | **Yes** |
| ~4,110 inline style blocks / 199 TSX files | **Close** — 3,978 `style={{` in 173 non-test TSX files (audit counted test files too) |
| Production TSX scale | 173 non-test files, 57,871 lines; 261 test files |

### Blockers found that the audit did not record

1. **Playwright is declared but not installed.** `apps/web/package.json` defines
   `test:e2e: playwright test` and `storybook` scripts, but neither package is in
   `devDependencies` and `apps/web/node_modules/@playwright` does not exist.
   `npx playwright --version` had to download it. WP-00's required
   `apps/web/e2e/ui-overhaul-baseline.spec.ts` and the whole of doc 09's evidence
   model (12-viewport geometry matrix, visual regression, J-01…J-12) assume a
   harness that is not present. **Decision required before WP-00 can close.**

2. **The real browser gate is a custom raw-CDP harness, not Playwright.**
   `scripts/smoke-test-post-setup-route.mjs` is 8,252 lines driving headless Chrome
   over CDP, with 43 `SMOKE_*` scenario flags, 198 `waitForBodyText` assertions and
   21 button-text clicks across 49 distinct **old hash routes**. Release-gate steps
   22–37 (16 of 37) invoke it; CI runs the full gate. It asserts exact on-screen
   strings (`"Roster Sources"`, `"CBA SOURCES"`, `"Call Your Shot"`,
   `"Continue Latest Autosave"`, `"Week 14"`). Editing `release-gate.mjs` is a
   **Kevin gate** per `CLAUDE.md`. Mitigation: pin the gate to legacy mode for the
   duration of the migration; see plan.

3. **Prototype typography contradicts the visual spec.** Doc 06 specifies a
   *condensed display* face; `prototypes/prototype.css` actually ships
   `Georgia, "Times New Roman", serif` for display and a non-self-hosted `Inter`
   for body. **Decision required at WP-01.**

4. **Prototype Chip occludes content.** At 390×844 the collapsed Chip bubble covers
   task-card body text, which CHIP-01 forbids. Reference artifact defect only.

### De-risking finding

`apps/web/src/features/monday-briefing/ActionCenter.tsx` already contains
`WeeklyBoardAction { id, what, why, consequence, where, route, accent, buttonLabel }`
plus `requiredBeforeAdvance` and an urgent/high/medium/low → Recommended/Optional
mapping. This is a near 1:1 match for the audit's `UiTask` contract. **WP-09's Task
Ledger is largely an extraction, not a new derivation** — but its inputs
(`hasGamePlan`, `starterCount`, `injuredCount`, `tradeOfferCount`, `ownerApproval`)
are computed in `MondayBriefing.tsx` and must be extracted with it.

### Owner decisions taken

All three blockers were resolved by the owner on 2026-08-05 and are recorded in
`AMENDED_EXECUTION_PLAN.md`:

1. **Evidence harness** — add Playwright for the new shell only; leave the CDP
   smoke harness untouched as the legacy parity gate.
2. **Sequencing** — build Today before decomposing `App.tsx`; add an H0 gate.
3. **Typography** — editorial serif (Georgia) as the prototype ships, not a
   condensed face.

### Safety rails delivered

| File | Purpose |
|---|---|
| `apps/web/src/ui/migration/ui-overhaul-mode.ts` | UI-only migration boundary; `legacy` default; corrupt values normalize to legacy |
| `apps/web/src/ui/migration/ui-overhaul-mode.test.ts` | 7 tests incl. fresh-install default and corrupt-rehydration safety |
| `apps/web/src/app/store/ui-store.ts` | Flag wired into the existing `mfd-ui-preferences` localStorage channel |
| `apps/web/src/app/store/ui-store.test.ts` | Persisted-key allowlist extended by one key, deliberately |
| `scripts/check-ui-route-coverage.mjs` | 79/79 registry ↔ matrix ↔ surface-map parity gate, `--json` report |
| `scripts/__tests__/check-ui-route-coverage.test.mjs` | 11 tests, 6 of them negative — proves the gate fails on real breakage |
| `apps/web/src/ui/test/fixtures/ui-overhaul-fixtures.ts` | 10 deterministic lifecycle fixtures, declarative (never drives the sim) |
| `apps/web/src/ui/test/fixtures/ui-overhaul-fixtures.test.ts` | 6 tests incl. byte-identical determinism and fixture independence |
| `apps/web/e2e/ui-overhaul-baseline.pw.cjs` | Legacy geometry baseline across the full doc-09 viewport matrix |
| `apps/web/package.json` | `@playwright/test@^1.62.1` devDependency (dev only, never bundled) |

The **UiMigrationHost is intentionally not built yet.** A host that switches
between the legacy shell and nothing is dead configuration; it lands with the
first new-shell surface, lazily, per amendment A3.

### Verification of this packet

| Check | Result |
|---|---|
| `pnpm -r typecheck` | **PASS** — all 3 projects |
| `vitest run src/ui` | **PASS** — 13/13 |
| `vitest run --exclude src/app/store/g4-multi-year-trust.test.ts` (the gate's own command) | **PASS** — 262/262 files, 2232/2232 tests, exit 0 |
| `node --test scripts/__tests__/check-ui-route-coverage.test.mjs` | **PASS** — 11/11 |
| `node scripts/check-ui-route-coverage.mjs` | **PASS** — 79/79 |
| `playwright test ui-overhaul-baseline` | **PASS** — 48 captures across 12 viewports × 4 routes |
| `vite build` + `check-bundle-size.sh` | **PASS** — engine 313 KB (unchanged), eager `index-*.js` 275 KB (**+0 KB**) |

The migration flag ships in the eager chunk (`ui-store` imports it) and cost
**0 KB gzip** — it is a type, a constant and two guards.

### A second methodology finding: `pnpm --filter @mfd/web test` is not the gate

The raw web test script includes `src/app/store/g4-multi-year-trust.test.ts`, a
10-season soak that takes **~22.6 minutes**. Release-gate step 11 deliberately
excludes it. On a loaded machine the raw command can exit 1 with a vitest worker
RPC error (`Timeout calling "onTaskUpdate"`) **while every test passes** —
observed here as 263/263 files and 2233/2233 tests green alongside exit 1.

For per-packet verification use the gate's own command:

```bash
pnpm --filter @mfd/web exec vitest run --exclude src/app/store/g4-multi-year-trust.test.ts
```

`CLAUDE.md`'s documented default (`pnpm --filter @mfd/web test`) remains correct
for full local verification, but budget ~25 minutes and read the test counts, not
just the exit code.

### Legacy geometry baseline

`docs/ui-overhaul/evidence/baseline-legacy/geometry.json` — 48 captures, plus
screenshots at 390×844 and 1440×900.

| Surface @ 390×844 | Measured here | Audit figure | Agreement |
|---|---|---|---|
| Briefing | 11,945 px / 14.15 vp | 11,788 / 14.0 | within 1.3% |
| Roster | 11,771 px | 11,802 | within 0.3% |
| Contracts | 9,701 px | 9,700 | exact |
| Settings | 8,883 px | 8,548 | within 4% |

Independent corroboration of the audit's central evidence on different hardware.

New facts the audit did not have:

- **No horizontal overflow at any of the 12 required viewports** — LAY-01 already
  passes on the legacy shell and must not regress.
- **Phone fixed chrome is 383–425 px** against LAY-06's 152 px target — the single
  largest first-viewport cost, and it is measured, not estimated.
- **Landscape 844×390 Briefing is 19.02 viewports** — worse than portrait's 14.15.
  Compact-height is the worst case, not phone portrait.
- **Body text is already 16 px** — READ-01's body rule passes today. The real
  readability debt is the 214–247 sub-12 px elements per surface.

### Rollback

Delete `apps/web/src/ui/`, `scripts/check-ui-route-coverage*.mjs`,
`apps/web/e2e/ui-overhaul-baseline.pw.cjs`; revert the two `ui-store` files and
the `@playwright/test` devDependency. No simulation, save, schema or engine state
is involved, so nothing user-facing changes.

---

## WP-04 — Route-Surface Metadata and Deep-Link Compatibility

Status: **complete** — 79/79 modelled, compatibility resolver and return-to-task
origin landed, no route deleted
Branch: `feat/ui-overhaul-wp00`
Save/determinism impact: **none** — no engine, RNG, schema, migration or
mutation-action file touched; `SAVE_VERSION` unchanged at 37

| SHA | Subject |
|---|---|
| `937cecc` | `feat(ui-routes): model the future surface of all 79 canonical routes` |
| `b8179e8` | `feat(ui-routes): resolve old deep links and restore return-to-task origin` |
| `9834af6` | `feat(ui-routes): split the current location and roll badges up to hubs` |

### Files touched (enumerated, per the packet's anti-glob rule)

Added:

| File | Purpose |
|---|---|
| `apps/web/src/ui/routes/href.ts` | `normalizePath`, `splitHref` — the one href parser |
| `apps/web/src/ui/routes/route-surface-types.ts` | `HubId`, `SurfaceType`, `RouteSurfaceMeta`, frequency/urgency enums |
| `apps/web/src/ui/routes/route-surface-map.ts` | 79 entries + `routeSurface` / `hubForLegacyPath` / `routesInHub` / `routeUnlock` |
| `apps/web/src/ui/routes/route-compatibility.ts` | `resolveCompatibleRoute`, `isResolvable` |
| `apps/web/src/ui/routes/navigation-origin.ts` | `NavigationOrigin` encode/decode, `withNavigationOrigin`, `returnToOriginHref` |
| `apps/web/src/ui/routes/href.test.ts` | 5 tests — normalization, and cross-module agreement |
| `apps/web/src/ui/routes/route-surface-map.test.ts` | 9 tests — registry parity + field-level matrix equality |
| `apps/web/src/ui/routes/route-compatibility.test.ts` | 15 tests |
| `apps/web/src/ui/routes/navigation-origin.test.ts` | 20 tests |
| `scripts/generate-route-surface-map.mjs` | Regenerates the 79-row map from the matrix; output is byte-identical to the committed file |
| `scripts/check-ui-route-coverage.d.mts` | Types for the gate's `parseCsv`, reused by the parity test |

Modified: `apps/web/src/app/currentAppRoute.ts` (+ its test),
`apps/web/src/app/navBadges.ts` (+ its test). Deleted: none.

**Deviations from the packet's file list, disclosed:** the packet names
`route-surface-map.test.ts` as the only test file; three more were added beside
their modules (`href`, `route-compatibility`, `navigation-origin`) because the
packet's own "Automated tests" section demands coverage that spans all of them.
`href.ts`, the generator, and the `.d.mts` are not in the packet's list either.
`ROUTE_SURFACE_MAP` is keyed by legacy path rather than "canonical route IDs";
the registry has no id field, and the legacy path *is* the stable key. WP-04's
three required before/after screenshots were **not produced** — the surfaces they
would show do not exist until WP-05/06, so they move to that packet.

### Deviations from the packet, and why

1. **No per-route `compatibility` field.** All 79 matrix rows carry the same
   decision — alias until H2 — so the field would have been a column of
   identical values with a `retired` branch no test could reach. Kept in the
   CSV, enforced non-empty by the gate. Retirement is WP-23 and lands with its
   own failing test.
2. **`lifecycle_phase` is not modelled at runtime.** *Corrected after review:* an
   earlier draft justified this by saying the registry already carries the same
   data. It does not. `/depth-chart` is `unlockWeek: 'always'` with no
   `unlockPhase`, yet its `lifecycle_phase` reads *"preseason / regular season"*;
   the column holds 22 distinct free-text values across 79 rows
   (`"game day / postgame"`, `"trade deadline"`, `"multi-season"`) with no
   registry counterpart. The real reason to drop it is that it is unnormalized
   prose that no consumer can act on, and normalizing 22 descriptive phrases into
   a runtime enum would be inventing a taxonomy the audit did not decide. It
   remains in the CSV. `routeUnlock()` separately exposes the registry's actual
   gating (`unlockWeek` / `unlockPhase`), which is a different thing and the only
   one that governs access. **This is an unmet scope line, not a substitution.**
   Whoever needs lifecycle grouping should normalize it deliberately, in the
   packet that needs it.

Corrected after review — the third deviation no longer exists. `splitHref` was
briefly duplicated in `currentAppRoute.ts` on the theory that importing it would
pull the surface map into the error boundary and the Chip dock. That was wrong:
`App.tsx` → `navBadges.ts` → `route-surface-map` already puts the map in the
eager chunk, so there was no boundary to protect and the second parser bought
nothing but drift risk. The parser now lives in `apps/web/src/ui/routes/href.ts`,
depends on nothing, and is the single implementation behind route lookup,
deep-link resolution, and "where am I now".

### Facts the model surfaced

- **`/dynasty` is a genuine collision.** It is the legacy Save/Load screen and
  belongs to **System** (`/system/saves`), while the new Dynasty hub owns
  `/dynasty/*`. Prefix matching would silently reroute Save/Load into Dynasty.
  Resolution is exact-match, and both halves are pinned by tests.
- **Canonical paths do not always sit under their hub.** `/scenarios` stays
  `/scenarios` under Dynasty and `/faq` becomes `/help` under System, so no code
  may infer a hub from a path prefix.
- **Two routes legitimately share one canonical path.** `/` and `/week-advance`
  both land on `/today`; the second is a panel (`?panel=readiness`). The
  canonical index resolves the query-less entry as the hub root.
- All 79 registry paths resolve to a hub, and resolution is a **fixed point** —
  resolving an already-resolved href changes nothing. That is what "no circular
  mappings" has to mean operationally.
- **Lookup and resolution disagreed at the edges.** `resolveCompatibleRoute`
  normalized `/roster/` and `roster`; `routeSurface` and `hubForLegacyPath` did
  exact key lookups and returned `undefined` for the same input. Found in review.
  Both now go through `href.ts`, and `href.test.ts` asserts agreement across all
  79 routes × 5 decorations.

### Verification of this packet

| Check | Result |
|---|---|
| `pnpm -r typecheck` | **PASS** — all 3 projects |
| `vitest run src/ui src/app/navBadges.test.ts src/app/currentAppRoute.test.ts src/app/architecture-boundaries.test.ts` | **PASS** — 79/79 |
| Full web suite (gate's `--exclude` command) | **PASS** — 265/265 files, 2279/2279 tests, exit 0 (superseded by the review pass below) |
| `node scripts/check-ui-route-coverage.mjs` | **PASS** — 79/79/79, now three-way |
| `node --test scripts/__tests__/check-ui-route-coverage.test.mjs` | **PASS** — 11/11 |
| `pnpm lint` | **PASS** — 0 errors; 42 pre-existing warnings, none in WP-04 files |
| `vite build` + `check-bundle-size.sh` | **PASS** — engine 313 KB unchanged |

**PERF-02:** eager `index-*.js` 275.8 KB gzip against the 275 KB baseline and the
316 KB ceiling — **≈ +0.8 KB**, roughly 40 KB of headroom left. The surface map
is eager by necessity: any deep link must resolve before the shell picks a tree.

Engine and design-system suites were **not** re-run — no file in either package
was touched, and the boundary test proves the new modules import only
`@mfd/engine/config`.

### Rollback

Delete `apps/web/src/ui/routes/` and `scripts/check-ui-route-coverage.d.mts`;
revert `currentAppRoute.ts` and `navBadges.ts`. The coverage gate returns to
matrix-only mode on its own, since the surface map is optional when absent. The
canonical registry was never touched and no route was deleted, so legacy routing
is unaffected either way.

---

## WP-09a — Canonical Task Ledger (pure presenter extraction)

Status: **complete** — one derivation, consumed by the legacy board, zero copy
change
Branch: `feat/ui-overhaul-wp00`
Save/determinism impact: **none** — no engine, RNG, schema, migration or
mutation-action file touched; `SAVE_VERSION` unchanged at 37

This is the WP-09 split from amendment A4: the presenter lands on its own, ahead
of the Today screen, so the migration's largest packet starts from a tested
contract instead of a blank file.

### Files touched

Added: `apps/web/src/ui/tasks/task-ledger.ts`, `task-ledger-input.ts`,
`task-ledger.test.ts` (20 tests), `task-ledger-input.test.ts` (7 tests).
Modified: `apps/web/src/features/monday-briefing/ActionCenter.tsx`,
`ActionCenter.test.tsx`, `MondayBriefing.tsx`. Deleted: none.

### What actually moved

`ActionCenter.tsx` held three things at once: the derivation of what needs doing
this week, the copy explaining it, and the board that renders it. The first two
are now `buildTaskLedger()` and `OPTIONAL_TASKS` in `ui/tasks/`; only rendering
stayed behind. `MondayBriefing.tsx` no longer computes the board's inputs inline
— it spreads `selectTaskLedgerInput({ game })`, which composes the existing store
selectors. That removed a `selectTradeOffers` store subscription and a roster
scan from a 1,987-line component.

**No rendered copy changed.** Every string was moved verbatim, and the existing
`ActionCenter.test.tsx` — which renders to static markup and asserts on-screen
text — passes unmodified except for one deliberate change: its copy guard now
reads both `ActionCenter.tsx` and `task-ledger.ts`, so an extraction cannot
smuggle a reword past it.

### Deliberate boundaries

- **Card ids are a save-visible contract, and eight of them are `UiTask.id`.**
  The board persists card ids in `leagueEvents` as `action_center.closed`
  payloads. The Must Do and Recommended lanes build theirs from a lane index
  (`must-{index}-{route}`), so that construction stayed in the component. But
  *corrected after review:* all seven `OPTIONAL_TASKS` ids and
  `noRecommendationsTask()`'s `recommended-clear` are passed through **verbatim**
  as the card id. An earlier draft claimed `UiTask.id` was a separate key with no
  save exposure — wrong for those eight, and the exact failure the section
  existed to prevent.

  *Corrected a second time, and in the other direction:* the second review pass
  showed the Optional lane renders no Close control at all (it is the one
  `WeeklyBoardLane` call passing neither `lane` nor `onCloseAction`), so the
  seven `optional-*` ids have never actually reached a save. Only
  `recommended-clear` is genuinely persisted today. The exposure is latent, not
  present — the ledger overstated it. The pins stand either way, because the day
  Optional gains a Close button those ids become frozen retroactively for every
  player who uses it.
- **`dedupeKey`, `availability`, `isComplete` and `source` from doc 07's
  `UiTask` are not implemented.** Nothing consumes them yet, and a dedupe key
  without a deduper is decoration. They arrive with WP-09b, which is where
  collapsing an AGM recommendation against a duplicate must-do actually happens.
- **AGM recommendations stay in the component.** They come from
  `getAGMWeeklyRecommendations(game)` and are engine output, not a UI
  derivation; folding them into the ledger is WP-09b's call, with dedupe.

### Facts the extraction surfaced

- **The board's destination labels agree with `APP_ROUTE_REGISTRY` everywhere
  except `/owner`** — the board says "Owner", the registry says "Owner Suite".
  Unifying them would change rendered copy, which A1 forbids. A test asserts
  `/owner` is the *only* divergence, so a second one cannot appear quietly.
- **Every task destination resolves to a covered hub.** Tested against WP-04's
  resolver across all task sources, which turns "Today will not send you into a
  dead end" into a gate rather than a hope.
- Owner-approval and full-lineup checks are boundaries (`< 50`, `< 22`), not
  thresholds — pinned by tests, since an off-by-one here silently changes which
  tasks a player sees.

### Two coverage holes the review found, and how they were closed

Both were introduced by this packet and both passed the entire suite. Each fix
was verified by re-applying the mutation and watching it fail.

1. **Severity had no test on either hop.** On `main` each item carried a literal
   accent; this packet replaced that with ledger `severity` → `SEVERITY_ACCENT` →
   rendered colour. Flipping `depth-chart-incomplete` from `warning` to `info`
   changed the card gold→cyan and could flip the whole panel gold→green, and
   **125 tests passed**. Now: `task-ledger.test.ts` pins the severity of every
   state-derived and optional task, and `ActionCenter.test.tsx` reads the accent
   straight off the rendered card. The mutation now fails 2 files.
2. **The label-divergence test only caught additions.** Deleting
   `'/depth-chart': 'Depth Chart'` made the board render the raw path
   `/depth-chart` in its "Where" cell, and **190 tests passed** — the divergence
   predicate filters the fallback case out by construction. Now the full 17-entry
   label table and the action verbs are pinned. The mutation fails.

### Verification of this packet

| Check | Result |
|---|---|
| `pnpm -r typecheck` | **PASS** — all 3 projects |
| `vitest run src/ui src/features/monday-briefing` | **PASS** — 14 files, 114 tests |
| `ActionCenter.test.tsx` (14 rendered-markup tests) | **PASS** — original assertions unchanged |
| Full web suite (gate's `--exclude` command) | **PASS** — 267/267 files, 2301/2301 tests, exit 0 (superseded by the review pass below) |
| `pnpm lint` | **PASS** — 0 errors; 42 pre-existing warnings, none in WP-09a files |
| `vite build` + `check-bundle-size.sh` | **PASS** — engine 313 KB unchanged |
| Release gate `--only g1-full-setup-desktop` (raw CDP) | **PASS** in 25.1s — full setup from cleared storage, no browser errors |
| Release gate `--only g6-chip-receipts-desktop` (raw CDP) | **PASS** in 16.3s — demo save, route navigation, persistence after hard reload |

**What the CDP evidence is and is not.** Both steps pass, but neither renders the
weekly board: g1 completes new-dynasty setup, g6 exercises Chip receipts on
`/league/weather`. `scripts/smoke-test-post-setup-route.mjs` contains no
`waitForBodyText` for `Command Queue`, `Living week action plan`, or
`Ready for Advance Week` — its only Action Center assertion is a Chip intro line.
**For this packet the CDP harness is not the feature-loss net;
`ActionCenter.test.tsx` is**, and it holds: 13 tests rendering to static markup
against unchanged copy assertions. Amendment A1's claim that the smoke harness
is a continuous zero-cost net is true for the 49 routes it asserts text on, and
the weekly board is not one of them. Worth knowing before leaning on it again.

**PERF-02:** eager `index-*.js` 278.3 KB gzip (was 275.8 after WP-04) against the
316 KB ceiling — **+2.5 KB**, ~38 KB headroom. The task copy moved rather than
multiplied; the cost is module-boundary overhead, since exported symbols survive
minification that inlined literals did not.

One test needed updating, and it is worth naming: `App.test.tsx`'s
"command-deck route object targets" guard scrapes `ActionCenter.tsx` for
`route: '...'` literals and checks each against the registry. The literals moved,
so the guard silently narrowed to four routes and its `arrayContaining`
assertion caught it. It now also scrapes `taskDestination('...')` calls in the
ledger. **Source-scraping guards in this repo are coupled to file layout** — any
extraction packet should expect to move them, and should move them rather than
weaken them.

### A third methodology finding: the Briefing is not geometrically reproducible

Re-running the WP-00 geometry capture after this packet showed the Briefing
moving ±18–56 px against the recorded baseline, with **identical** interactive
and small-text element counts. That pattern says text reflow, not structure — so
before attributing it to the extraction, the same capture was run twice against
one unchanged build. Those two runs disagreed by up to **93 px**:

| Surface @ two runs of identical code | Δ |
|---|---|
| `briefing` phone-320×568 | +93 px |
| `briefing` phone-430×932 | −74 px |
| `briefing` phone-390×844 | +56 px |
| `roster` / `contracts` / `settings`, all 12 viewports | **0 px** |

Root cause: `apps/web/src/app/NewGameScreen.tsx:229` seeds the demo scenario from
`Date.now()`, so "Launch Demo Scenario" builds a different dynasty every click.
Different players means different name lengths and different generated prose,
which reflows the Briefing. Table-driven surfaces have fixed row heights, so they
do not move.

This is correct product behaviour — a demo *should* be fresh, and `apps/web` is
not bound by the engine's `Date.now()` ban. But it makes the demo launcher unfit
as a fixture for the numeric acceptance model in doc 09:

- **Briefing/Today heights from the demo launcher are a magnitude, not a
  measurement.** The WP-00 baseline's 11,945 px is real and lands inside the
  observed band (a repeat run hit exactly 11,945), but it carries ~±100 px.
- **LAY-04's 2.5-viewport Today budget must be asserted against a pinned
  fixture**, not the demo button — otherwise the gate flickers near the
  threshold. The WP-00 fixtures exist precisely for this.
- Non-Briefing surfaces stay valid for exact assertions, so the audit's roster,
  contracts, and settings figures need no caveat.

`ui-overhaul-baseline.pw.cjs` now documents this at the top of the file. Adding
fixture-backed capture is folded into WP-09b, ahead of H0.

### Open items carried forward, named rather than left implicit

- **"One derivation" is not yet true.** `recommendationDeadline()` copy and
  `PRIORITY_ACCENT` still live in `ActionCenter.tsx`, so the AGM lane bypasses
  the ledger. WP-09b folds it in, with dedupe.
- **`selectTaskLedgerInput({ game: null })` returns `starterCount: 22`; the old
  inline props produced `0`** and would have rendered "Fill depth chart (0/22
  starters)" with a gold panel. Unreachable in production — the router is gated
  on `initialized`, which is only ever set alongside a non-null game — so it is
  not an A1 breach, but it is a divergence and the test enshrines the new value.
  Recorded here so nobody rediscovers it as a bug.
- **`route-surface-map.test.ts`'s field-for-field check is a ratchet, not
  independent verification.** The map was machine-generated from the same CSV
  with the same surface-type table the test uses, so it could not have failed at
  authoring time. Its value is forward-looking: it fails on any later drift.
  `scripts/generate-route-surface-map.mjs` is now committed and its output is
  byte-identical to the committed map, so the provenance is checkable instead of
  claimed. The genuinely failable route tests are 79/79 parity, the fixed-point
  test, and the no-circular test — all three break on the `/dynasty` bug class.
- **WP-04's adapters have no non-test callers yet** — `computeHubBadges`,
  `resolveCurrentAppLocationParts`, and all of `route-compatibility` /
  `navigation-origin`. WP-00 declined to ship `UiMigrationHost` on the grounds
  that it would be dead configuration, and that standard deserves restating
  rather than quietly dropping: a *host that switches between the legacy shell
  and nothing* is configuration with no second state, whereas these are tested
  pure functions the packet exists to deliver and WP-05/06/09b consume directly.
  If WP-06 lands without using them, that is the signal the distinction failed.

### Rollback

Revert the four modified files and delete `apps/web/src/ui/tasks/`. The ledger is
additive — the legacy board's behaviour, copy, and persisted card ids are
byte-identical either side of it.

---

## Review pass — WP-04 + WP-09a (goat-reviewer, 2026-08-05)

Verdict on first submission: **FAIL**, two blocking findings. Both were real,
both were introduced by these packets, and both passed the full suite. Every
ledger claim the reviewer checked reproduced; the failures were coverage holes
and two ledger statements that were factually wrong.

| Finding | Resolution |
|---|---|
| **Blocking** — 8 `UiTask.id` values *are* persisted card ids; the ledger said the opposite | Labelled SAVE-VISIBLE in `task-ledger.ts`; all 8 pinned by name in tests; ledger corrected |
| **Blocking** — severity → accent had no test on either hop; a severity flip passed 125 tests | Severities pinned in `task-ledger.test.ts`; rendered accent read off the card in `ActionCenter.test.tsx`; mutation now fails 2 files |
| Label-divergence test caught additions only; deleting a label passed 190 tests | Full 17-entry label table and action verbs pinned; mutation now fails |
| `splitHref` duplication justified by a chunk boundary that does not exist | Duplication removed; one parser in `ui/routes/href.ts`, imported by all three consumers |
| `lifecycle_phase` deviation rationale was factually wrong | Corrected — it is unnormalized prose with no registry counterpart, and it is an **unmet scope line**, not a substitution |
| Undisclosed deviations from the packets' file lists | Enumerated in both packet sections, including the three unproduced WP-04 screenshots |
| Uncommitted generator left the 79-row map hand-maintained | `scripts/generate-route-surface-map.mjs` committed; output byte-identical to the committed map |
| `--only g1,g6` is weaker A1 evidence than implied | Stated plainly: for the weekly board the CDP harness is not the net, `ActionCenter.test.tsx` is |
| `decodeNavigationOrigin` accepted an unbounded label from a user-editable URL | `ORIGIN_LABEL_MAX = 120` enforced on decode, with a test either side of the limit |
| `routeSurface` exact-keyed while `resolveCompatibleRoute` normalized | Both normalize through `href.ts`; agreement asserted across 79 routes × 5 decorations |
| `selectTaskLedgerInput({ game: null })` diverges from the old inline props | Unreachable in production; recorded as a known divergence rather than left to be rediscovered |
| "One derivation" not yet true — the AGM lane bypasses the ledger | Named as an open item carried into WP-09b |

### Verification after the fixes

| Check | Result |
|---|---|
| `pnpm -r typecheck` | **PASS** — all 3 projects |
| Full web suite (gate's `--exclude` command) | **PASS** — 268/268 files, 2314/2314 tests, exit 0 |
| `node scripts/check-ui-route-coverage.mjs` | **PASS** — 79/79/79 |
| `node --test scripts/__tests__/check-ui-route-coverage.test.mjs` | **PASS** — 11/11 |
| `pnpm lint` | **PASS** — 0 errors, 42 warnings (the pre-existing count) |
| `vite build` + `check-bundle-size.sh` | **PASS** — engine 313 KB; eager `index-*.js` 278.3 KB vs 316 KB ceiling |
| Generator ↔ committed map | **Byte-identical** |
| Mutation re-check (severity flip, label deletion) | **Both now fail** |

---

## Second review pass — WP-04 + WP-09a (goat-reviewer, 2026-08-05)

Verdict: **PASS**. All eleven prior findings verified closed, both mutations
re-run and confirmed failing, and A1 proved mechanically rather than argued —
a byte-for-byte `renderToStaticMarkup` diff of `ActionCenter` against `main`
across 9 scenarios came back identical, as did the captured `action_center.closed`
payloads and `navigateTo` sequences across 5.

The pass came with nine risks. Seven were worth acting on immediately.

| Risk | Action |
|---|---|
| The SAVE-VISIBLE claim was **stronger than the code** — the Optional lane has no Close control, so those 7 ids have never reached a save | Ledger and code comment corrected to "latent, not present". Pins kept: the exposure becomes real the day Optional gains a Close button |
| A **second href splitter survived** in `navigation-origin.ts` (`splitDestination`), contradicting `href.ts`'s "exactly one implementation" | Deleted; both call sites use `splitHref`. Test added for `/roster/` and `#/roster` destinations |
| `ORIGIN_LABEL_MAX` was **asymmetric** — encode emitted up to 512, decode rejected over 120, so a legitimate 121–480 char label silently lost the whole breadcrumb | Encode clamps to the same limit. A long label now loses its tail, not the breadcrumb |
| Normalising lookups made `routeSurface('')` resolve to Today instead of `undefined`, weakening the unknown-destination signal | Pinned by test as the deliberate reading of an empty path |
| Generator byte-identity was **not gated**, and the parity test carried its own copy of the generator's surface-type table | `scripts/__tests__/generate-route-surface-map.test.mjs` asserts byte-identity; the vitest parity test now imports `SURFACE_TYPES` from the generator instead of restating it |
| Label deletion was caught **only by a unit test** — the rendered board would have shown a raw `/depth-chart` with the render suite green | `ActionCenter.test.tsx` now asserts the Where cell names a screen and never a route path |
| Stale test counts, and the undisclosed `ui/presenters/` → `ui/tasks/` path deviation | Counts corrected; path deviation disclosed below |

Two were acknowledged rather than changed:

- **The cross-implementation pin is now near-tautological.** Both sides of
  `currentAppRoute.test.ts`'s comparison call `splitHref`, which is the point of
  the fix. What it still covers is that `resolveCurrentAppRoute`'s hash
  extraction and deploy-base stripping survive the split; the test is renamed to
  say so rather than keep implying more.
- **PERF-02 numbers were self-reported.** Re-measured after every fix round:
  engine 313 KB, eager `index-*.js` 278.3 KB against the 316 KB ceiling.

**Disclosed path deviation:** WP-09 specifies
`apps/web/src/ui/presenters/task-ledger.ts`; it landed at
`apps/web/src/ui/tasks/`. WP-09's declared `TaskLedger` / `selectTaskLedger`
contracts do not exist either — the exported surface is `UiTask[]`,
`buildTaskLedger`, and `selectTaskLedgerInput`. `selectors.ts` is in WP-09's
modify list and was not touched, because the input selector composes the
existing selectors rather than adding one.

### Verification after the second fix round

| Check | Result |
|---|---|
| `pnpm -r typecheck` | **PASS** — all 3 projects |
| Full web suite (gate's `--exclude` command) | **PASS** — 268/268 files, 2318/2318 tests, exit 0 |
| `node --test scripts/__tests__/{check-ui-route-coverage,generate-route-surface-map}.test.mjs` | **PASS** — 16/16 |
| `node scripts/check-ui-route-coverage.mjs` | **PASS** — 79/79/79 |
| `pnpm lint` | **PASS** — 0 errors, 42 warnings (pre-existing count) |
| `vite build` + `check-bundle-size.sh` | **PASS** — engine 313 KB; eager `index-*.js` 278.3 KB vs 316 KB ceiling |
