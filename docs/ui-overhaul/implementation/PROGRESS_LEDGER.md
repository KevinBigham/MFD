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

---

## WP-01 — Semantic Tokens and Typography Foundation

Status: **complete** — v2 token layer landed, legacy provably unrepainted
Branch: `feat/ui-overhaul-wp00`
Save/determinism impact: **none** — CSS and one type module; no engine, RNG,
schema, migration or mutation-action file touched; `SAVE_VERSION` unchanged at 37

| SHA | Subject |
|---|---|
| `fb59155` | `feat(design-system): add the Broadcast War Room token layer` |
| `e00a0f6` | `feat(design-system): expose DensityMode as a typed scope` |
| `616a1b1` | `test(design-system): compute the contrast rather than quote it` |

### Files touched

Added: `packages/design-system/tokens/semantic-v2.css`, `typography-v2.css`,
`density-v2.css`, `semantic-v2.test.ts`; `components/density.ts` and
`density.test.ts`. Modified: `tokens/index.css` (three `@import` lines and a
header note), `components/index.ts` (one export block). Deleted: none.

**Disclosed deviations:** `components/density.ts` and `density.test.ts` are not
in the packet's file list — `DensityMode` is a named packet contract and needed
somewhere to live; putting it in the barrel alone is not possible. The suggested
commit split is by concern rather than by file, so the three CSS files landed
together: they are one token layer, and splitting them would have left a commit
whose `@import` pointed at a file that did not exist yet.

### The isolation strategy, and why it is testable

Every property is `--mfd-v2-*` and **nothing redefines a legacy `--mfd-*`
name**. That is the whole coexistence mechanism: legacy reads `--mfd-bg`, the
new shell reads `--mfd-v2-canvas`. The packet's stated risk — "unscoped token
aliases can repaint legacy screens" — is closed by a test that enumerates both
files' declarations and fails on any intersection, not by care.

Loaded eagerly rather than behind the lazy shell. Custom properties paint
nothing on their own, so the cost is bytes only, and deferring them would flash
unstyled content on the first v2 navigation.

### Decisions taken inside the packet

- **Georgia, per amendment A7.** Doc 06 asks for a condensed display family;
  the audit's own prototype ships an editorial serif and the owner chose it. It
  costs zero bytes, needs no network, and separates front-office from the
  pixel-retro broadcast layer without adding a second loud voice.
- **The pixel face has no v2 role token at all.** Not "discouraged" — absent.
  It cannot reach body, data, forms, or navigation by accident, and a test
  asserts the string never appears in the v2 layer.
- **Compact density is attribute-scoped, not a media query.** It is a
  preference, not a fact about the viewport. `@media (pointer: coarse)` restores
  44px rows underneath it, which is what makes offering compact on any device
  safe rather than a trap.
- **Chart roles reuse the status hues.** A validated categorical ramp for dense
  multi-series work is deferred to WP-19 rather than invented here; grid and
  axis are defined now because they are the quiet half and they are needed
  wherever a chart first appears.
- **`--mfd-v2-divider` is a judgement call, not an audit value.** Doc 06 names
  the role but gives no colour; `rgba(242,246,248,0.12)` is a text-tinted rule
  that reads on all four surfaces.

### Verification of this packet

| Check | Result |
|---|---|
| `pnpm -r typecheck` | **PASS** — all 3 projects |
| `pnpm --filter @mfd/design-system test` | **PASS** — 19/19 files, 137/137 tests |
| Full web suite (gate's `--exclude` command) | **PASS** — 268/268 files, 2318/2318 tests, exit 0 |
| `pnpm lint` | **PASS** — 0 errors, 42 warnings (pre-existing count) |
| `vite build` | **PASS** — `@import` chain resolves; design-system CSS 8.7 → **10.1 KB gzip** (+1.4 KB), total CSS 20.5 → 21.9 KB |
| Mutation: dim `text-secondary` below AAA | **FAILS** as designed |
| Mutation: declare `--mfd-bg` in the v2 layer | **FAILS** as designed (2 tests) |

**A1 proved, not argued.** Re-ran the WP-00 geometry capture and diffed the
three deterministic surfaces — `roster`, `contracts`, `settings` — across all 12
viewports on document height, small-text count, interactive count, bordered-
element count, fixed-chrome height, body font size, and horizontal overflow:
**36/36 captures identical to the WP-00 legacy baseline.** For a change that
loads new CSS globally, that is the evidence that matters. `briefing` is
excluded because it carries the known ±100 px demo-seed variance.

The per-capture comparison is committed at
`docs/ui-overhaul/evidence/a1-regression/wp01-token-layer.json` — review
correctly pointed out that the claim was otherwise unreproducible without a
12-viewport CDP run.

Engine suite not re-run: no file under `packages/engine` was touched.

### Rollback

Remove the three `@import` lines from `tokens/index.css`; delete the three v2
CSS files, `components/density.ts`, and the two tests; drop the export block
from `components/index.ts`. Legacy tokens were never edited, so the legacy shell
is unaffected either way.

---

## WP-02 — Adaptive Viewport and Screen Archetype Primitives

Status: **complete** — five primitives, zero bundle cost until something imports them
Branch: `feat/ui-overhaul-wp00`
Save/determinism impact: **none** — layout components and one global CSS rule;
no engine, RNG, schema, migration or mutation-action file touched;
`SAVE_VERSION` unchanged at 37

| SHA | Subject |
|---|---|
| `5a9143f` | `feat(ui-layout): add adaptive viewport primitives` |
| `23771a8` | `feat(ui-layout): add single-scroll and sticky-action contracts` |
| `ccc4527` | `test(ui-layout): cover safe area, compact height, and the chrome budget` |

### Files touched

Added: `apps/web/src/ui/layout/{AdaptiveViewport,AppFrame,PageScroll,StickyActionDock,PaneLayout}.tsx`,
`layout.module.css`, `layout.test.tsx` (26 tests). Modified:
`apps/web/src/app/a11y.css`. Deleted: none. **This is the packet's exact file
list with no additions.**

### Design decisions worth the ledger

- **Compact height is a dimension, not a width consequence.** `844×390` is
  asserted as *medium* width **and** compact height in the same test, because
  that combination is precisely what width-only breakpoints miss — and the
  WP-00 baseline showed it is this application's worst case at 19.02 viewports.
- **The layout environment is published as data attributes, not just context.**
  Hashed CSS-module class names are invisible to Playwright and to the geometry
  harness. Every LAY- acceptance assertion in doc 09 needs something to select
  on; `data-mfd-v2-mode` is it.
- **The pure/impure split is forced by the toolchain, and is better for it.**
  `apps/web` has no jsdom and no testing-library — component tests render to
  static markup. So `resolveLayoutEnvironment` and `resolvePaneColumns` are pure
  exported functions with the hook as a thin `useSyncExternalStore` wrapper,
  which makes every boundary testable without a browser.
- **`PageScroll`'s `contained` mode requires a `reason`, enforced by the type.**
  A second scroll container cannot be added without writing down why, at the
  call site, where review sees it.
- **The dock measures itself.** A `ResizeObserver` publishes the real height
  into `--mfd-v2-dock-measured`, defaulting to `0px`. The legacy shell reserves
  198px of Chip clearance plus a 64px nav pad unconditionally; that plus the
  header is the 383–425px of fixed chrome the baseline measured against
  LAY-06's 152px budget.
- **CSS-module class names in vitest were probed, not assumed.** With `css`
  disabled (this repo's default) vitest returns a proxy that yields
  `_frame_772440` for `styles.frame` — usable but hashed. That is why the tests
  assert data attributes and stylesheet text rather than class names.

### A1 impact

`a11y.css` is a global stylesheet, so it is the only part of this packet a
legacy user loads. The added rule is `[data-mfd-v2-viewport] :focus-visible` —
that attribute is emitted only by `AdaptiveViewport`, which nothing imports yet,
so **no legacy element can match the selector**. The legacy
`outline: 3px solid var(--mfd-cyan)` rule is untouched and asserted intact.

Everything else in the packet has no importer, so it is absent from the module
graph entirely: eager `index-*.js` is **278.3 KB, unchanged**.

### Verification of this packet

| Check | Result |
|---|---|
| `pnpm -r typecheck` | **PASS** — all 3 projects |
| `vitest run src/ui/layout` | **PASS** — 26/26 |
| Full web suite (gate's `--exclude` command) | **PASS** — 269/269 files, 2344/2344 tests, exit 0 |
| `pnpm lint` | **PASS** — 0 errors, 42 warnings (pre-existing count) |
| `vite build` + `check-bundle-size.sh` | **PASS** — engine 313 KB; eager `index-*.js` **278.3 KB, +0 KB**; index CSS 11.8 → 11.9 KB |

Screenshots are deferred with the packet's own logic: these primitives render
nothing on their own, and the first screen built from them is WP-09b's Today,
which is where H0 captures them at 390×844 and 1440×900.

### Rollback

Delete `apps/web/src/ui/layout/` and revert the appended block in `a11y.css`.
Nothing imports either, so removal is inert.

---

## WP-03 — Interaction, Focus, Dialog, and Accessibility Foundation

Status: **complete** — five v2 primitives; the legacy dialog defect recorded, not patched
Branch: `feat/ui-overhaul-wp00`
Save/determinism impact: **none** — design-system components and two scoped CSS
blocks; no engine, RNG, schema, migration or mutation-action file touched;
`SAVE_VERSION` unchanged at 37

| SHA | Subject |
|---|---|
| `0b4e8be` | `feat(design-system): add v2 interaction primitives` |
| `9cd9814` | `feat(a11y): standardize focus and overlay behavior for the new shell` |
| `69e090a` | `test(a11y): cover keyboard, motion, target size, and semantics` |

### Files touched

Added: `MfdButtonV2/{MfdButtonV2.tsx,.module.css,.test.tsx}`,
`MfdStateFrame/{MfdStateFrame.tsx,.module.css}`,
`MfdBottomSheet/{MfdBottomSheet.tsx,.module.css}`,
`MfdLocalNav/{MfdLocalNav.tsx,.module.css}`,
`MfdStickyAction/{MfdStickyAction.tsx,.module.css}`, `components/css-modules.d.ts`.
Modified: `components/index.ts`, `packages/design-system/tsconfig.json`,
`apps/web/src/app/a11y.css`. Deleted: none.

### A finding that outranks the packet: the legacy dialog has no focus management

`packages/design-system/components/PixelModal/PixelModal.tsx` sets
`role="dialog"` and `aria-modal="true"` — and stops. There is **no focus trap,
no focus restore, no Escape handler, and no background inertness**; dismissal is
a scrim click and a close button. `MfdDialog` is a verbatim pass-through, and
**24 files import one or the other**.

*Corrected after review:* "every dialog in the app" was an overstatement. Seven
further `role="dialog"` implementations exist outside `PixelModal`
(`MobileBottomTabBar`, `DraftPickReveal`, `ChampionshipParade`,
`CelebrationOverlay`, `EraTransitionReveal`, `ChampionshipParadeEmitter`,
`ChipHost`), and `ChipHost` has its own focus call and Escape handler. The
defect is `PixelModal`'s 24 consumers, which is bad enough without inflating it.

Worth knowing before that fix is scoped: **`@radix-ui/react-dialog` is already a
declared dependency with zero importers.** A correct focus-trapped dialog
primitive is paid for and unused.

WP-03 lists `MfdDialog.tsx` and `MfdTooltip.tsx` as files to modify, and both
were deliberately **left untouched**:

- Fixing it changes legacy *behaviour*, which amendment A1 puts off limits for
  the duration of the migration. A focus trap changes what is reachable, and
  the CDP harness drives 21 button-text clicks across 49 legacy routes.
- The blast radius is every dialog in the app, which makes it a change that
  deserves its own packet and its own gate — not a side effect of a foundation
  commit.
- `MfdTooltip` is Radix-backed and already handles focus and Escape correctly.
  *Corrected after review:* "nothing to standardise" was wrong. A Radix tooltip
  opens on hover and keyboard focus only, so its content is unreachable by
  touch — exactly what WP-03's own non-scope ("do not make hover essential")
  forbids. Nothing essential may live in a tooltip, and no test enforces that
  yet. Carried into WP-21.

The contract is implemented in `MfdBottomSheet` for the new shell.
**Recommendation: fix `PixelModal` as a standalone, Kevin-gated change**, since
it benefits every player today rather than only after cutover.

### A bug the tests caught before it shipped

`nextFocusIndex(-1, -1, length)` returned `length - 2`. A negative index means
focus is *outside* the trap — `indexOf` returns -1 for an element the sheet does
not contain — and plain modular arithmetic reads that as "one before index 0".
Shift+Tab from outside would have dropped the player into the middle of the
sheet instead of its last control.

It was catchable only because the arithmetic is a pure exported function. This
repo has no jsdom anywhere; component tests render to static markup. **Logic
reachable only through real DOM events is logic that never gets tested here**,
which is the constraint that shaped every primitive in WP-02 and WP-03.

### Deviations, disclosed

- `MfdDialog.tsx` / `MfdTooltip.tsx` not modified — see above.
- The packet lists no test file; `MfdButtonV2.test.tsx` (31 tests) covers all
  five primitives, because its "Automated tests" section requires coverage the
  file list has nowhere to live in.
- Four extra `.module.css` files — the packet names one for `MfdButtonV2`, and
  doc 07 forbids layout-critical inline styles in new-shell files, so the other
  four components follow the same pattern rather than regressing to inline.
- `components/css-modules.d.ts` and a one-line `tsconfig.json` include: this
  package has no Vite config, so it cannot inherit CSS-module typings from
  `vite/client` the way `apps/web` does.

### Verification of this packet

| Check | Result |
|---|---|
| `pnpm -r typecheck` | **PASS** — all 3 projects |
| `pnpm --filter @mfd/design-system test` | **PASS** — 20/20 files, 168/168 tests |
| Full web suite (gate's `--exclude` command) | **PASS** — 269/269 files, 2344/2344 tests, exit 0 |
| `pnpm lint` | **PASS** — 0 errors, 42 warnings (pre-existing count) |
| `vite build` + `check-bundle-size.sh` | **PASS** — engine 313 KB; eager `index-*.js` **278.3 KB, +0 KB**; design-system CSS 10.1 → 11.2 KB, index CSS 11.9 → 12.0 KB |

**A1 impact.** *Corrected after review — the first version of this paragraph
was wrong about what ships.*

**JavaScript:** absent. Nothing imports the v2 components, so they are not in
the module graph at all; the eager chunk is unchanged at 278.3 KB, and
`resolveButtonState`, `nextFocusIndex`, `MfdBottomSheet`, `resolveNavItemState`
and `AdaptiveViewport` appear in no built asset.

**CSS: it does ship.** All five component stylesheets are compiled into
`design-system-*.css`, which every legacy user loads — that is the +1.1 KB in
the bundle row below, and the earlier claim that "the only thing a legacy user
loads is the appended `a11y.css` block" contradicted it. Rendering is still
unaffected, but the argument that holds is a different one: every rule is
compounded onto a hashed CSS-module class (`_button_*`, `_scrim_*`) that no
legacy markup carries, and the two `a11y.css` blocks are gated on
`[data-mfd-v2-viewport]`, an attribute emitted solely by `AdaptiveViewport`,
which nothing imports yet.

The residual risk is real and now named: a single `:global` in a v2 module
would ship globally with no gate, and `design-system/package.json` declares no
`sideEffects`, so v2 CSS reaches legacy users the moment a component joins the
barrel — importer or not.

### Rollback

Delete the five `Mfd*V2`/`Mfd*` v2 component directories and
`components/css-modules.d.ts`, revert the export block in `components/index.ts`,
the `tsconfig.json` include line, and the two appended blocks in `a11y.css`.
Nothing imports any of it.

---

## Review pass — WP-01 + WP-02 + WP-03 (goat-reviewer, 2026-08-06)

Verdict on first submission: **FAIL**. Every claimed number reproduced; the
failures were two guards that could not fail, one shipped contrast defect, and
four ledger statements that were wrong on the facts.

### The two guards that could not fail

1. **Selector scoping was unguarded.** The isolation test matched only
   line-start class selectors (`/^\.([\w-]+)/gm`). Appending
   `body { font-family: var(--mfd-v2-font-display); }` and
   `table td { font-size: 9px; }` to `typography-v2.css` **restyled the entire
   application and 27/27 tests passed.** A compound selector
   (`.mfd-v2-body .pixel-card, div.legacy-card`) passed too. The WP-01 ledger
   claimed the repaint risk was "closed by a test … not by care"; that was true
   for custom-property shadowing and false for the half that actually repaints
   pixels. Now: every selector in all three v2 sheets is extracted — including
   compound and comma-separated ones — and must carry a `.mfd-v2-*` class or a
   `data-mfd-v2-*` attribute. Both mutations now fail.
2. **All three width breakpoints were tautological.** `layout.test.tsx` derived
   its expectations from the constants it was meant to guard, so `medium`
   600→700, 600→840, `expanded` 1024→900 and `wide` 1440→1900 each passed
   26/26. `medium` is the phone/not-phone boundary and could have drifted
   anywhere in (320, 844] undetected — precisely the risk WP-02 names. Now: the
   values are pinned literally, and every viewport in the doc-09 matrix is
   asserted to classify as the audit classifies it. 600→840 now fails 3 tests.

### A shipped contrast defect

`--mfd-v2-text-muted` on `--mfd-v2-surface-2` is **4.29:1** — below AA. The
test asserted canvas, surface-1 and surface-3 and **skipped surface-2**, while
its own comment claimed muted "fails on surface-3" as though that were the only
failure. A v2 screen putting metadata on surface-2 would have shipped a
contrast failure under a suite advertising contrast enforcement.

Now the test enumerates all four surfaces and asserts the passing set is exactly
`[canvas, surface-1]`, so the boundary cannot move without the test moving.
`semantic-v2.css` documents both failing surfaces. Raising the token to
`#8a99aa` now fails.

Related: `contrast()` rounded to two places **before** comparing, so a true
4.495:1 presented as 4.50 and cleared an AA assertion it failed. Rounding
removed. And the function itself is now checked against known WCAG reference
pairs (`#000/#fff` = 21, `#767676/#fff` = 4.54, `#595959/#fff` = 7.0,
`#ffff00/#000` = 19.56) plus symmetry — previously every contrast claim in the
suite trusted an unverified implementation.

### Defects found outside the graded list, and fixed

| Defect | Fix |
|---|---|
| `.scrim { opacity: 0.98 }` — opacity inherits to the sheet inside it and creates a stacking context, so the sheet faded with its own backdrop. The `rgba(` ban in my own test structurally forced this. | Added `--mfd-v2-scrim` as a token; the scrim uses `background`, and a test asserts `.scrim` declares no `opacity`. |
| **Background inertness was missing** — WP-03 names it as part of the overlay contract, and only three of four parts were implemented. | `selectInertTargets` (pure, tested) marks every top-level sibling that does not contain the sheet `inert`, plus a body scroll lock. |
| `MfdLocalNav` delivered `lockedReason` solely through `title=`, which is hover-only — the locked section explained itself to everyone except a phone. And the test asserting "its explanation is reachable" passed on a substring of that attribute. | Reason moves into the accessible name; the test now asserts no `title=` is emitted at all. |
| `MfdButtonV2` returned a fragment, making the description a **sibling** of the button — any flex or grid parent, including `.actionDock > * { min-height: 48px }`, would have sized the explanation like a second control. | Wrapped in a single element; a test asserts exactly one wrapper and that the markup starts with it. |
| `getFocusable`'s `[hidden]` / `aria-hidden` filtering — the entire point of the function — was never executed by any test. | Tested against a stub container, since there is no jsdom. |
| `density-v2.css` used bare `[data-mfd-density='compact']` selectors, unscoped. Harmless in fact, but it made the isolation claim literally false. | Renamed to `data-mfd-v2-density` everywhere, including `DENSITY_ATTRIBUTE`. |
| Commit `ccc4527` claimed to cover "the chrome budget"; no test asserted LAY-06's 152px. | Added: nav + dock must fit the budget, and each must clear the touch floor. |
| The "36/36 identical captures" claim had **no committed artifact**. | `docs/ui-overhaul/evidence/a1-regression/wp01-token-layer.json` — per-capture, seven metrics, with the excluded surface and its reason. |

### Four ledger claims corrected in place

- WP-03's A1 paragraph said the only thing a legacy user loads is the `a11y.css`
  block. **False** — all five v2 component stylesheets compile into
  `design-system-*.css`, which is exactly the +1.1 KB the bundle row reports one
  paragraph below. The argument that actually holds is hashed CSS-module class
  names, and it is now stated.
- "Every dialog in the shipped application" **overstated** the `PixelModal`
  defect: seven other `role="dialog"` implementations exist, one with its own
  focus and Escape handling. The real number is 24 importing files.
- "`MfdTooltip` — nothing to standardise" was **wrong**. Radix tooltips open on
  hover and keyboard focus only, so their content is unreachable by touch,
  which WP-03's own non-scope forbids. Carried into WP-21.
- The selector-scoping half of the isolation claim was asserted as tested when
  it was not.

### Accepted without change, and why

- **The cross-implementation and mode-boundary tests still lean on stylesheet
  string matching.** With no jsdom in the monorepo, `MfdBottomSheet`'s keydown
  handler, focus restore, and `StickyActionDock`'s ResizeObserver have no
  coverage. That is a real ceiling on this packet's evidence, not a claim to
  argue around; the DOM half of the overlay contract gets its proof from the
  Playwright layer at H0.
- **`nextFocusIndex(-1, 1, 3) === 0` passes under the buggy implementation
  too.** True; the Shift+Tab case at the line below is what discriminates, and
  it is the one that caught the bug.

### Verification after the fixes

| Check | Result |
|---|---|
| `pnpm -r typecheck` | **PASS** — all 3 projects |
| `pnpm --filter @mfd/design-system test` | **PASS** — 20/20 files, 174/174 tests |
| Full web suite (gate's `--exclude` command) | **PASS** — 269/269 files, 2348/2348 tests, exit 0 |
| `pnpm lint` | **PASS** — 0 errors, 42 warnings (pre-existing count) |
| `vite build` | **PASS** — eager `index-*.js` **278.3 KB, unchanged** |
| Mutations: bare element selector, compound legacy selector, `medium` 600→840, `text-muted` → `#8a99aa` | **All four now fail** |

One methodology note, again: the first sweep ran the design-system suite, the
web suite and a production build back to back and produced a single
`game-store.gameweek` timeout with zero assertion failures — the contention
artifact WP-00 recorded. Re-run serially: 269/269 and 2348/2348, exit 0.

---

## Today — direction proof (pre-H0)

The amended plan's own sequencing step, not a numbered packet: *"mount a new
`/today` route behind the migration flag, rendering the WP-09a presenter
against real save data, before touching `App.tsx`."* It is the first thing in
this migration a player can see, and it is what H0 grades.

Scope taken deliberately narrower than WP-09b-full: one screen, one route, the
ledger's AGM lane, and the geometry harness the budget needs. Nav badges, Chip,
and Week Advance still read their own sources; unifying them is WP-09b-full,
after WP-05/06/07.

### Files added

| File | What it is |
|---|---|
| `apps/web/src/ui/today/phase-vocabulary.ts` | The one place the app names a season phase and says what it is for |
| `apps/web/src/ui/today/today-presenter.ts` | `presentToday` — pure, JSX-free view model |
| `apps/web/src/ui/today/today-input.ts` | `selectTodayInput` — the only impure edge, composed from existing selectors |
| `apps/web/src/ui/today/TodayScreen.tsx` | The screen. Takes a view model and a navigate function; touches no store |
| `apps/web/src/ui/today/today.module.css` | Tokens only, no legacy `--mfd-*` name |
| `apps/web/src/ui/today/TodayRoute.tsx` | Route container: reads the store, gates on the migration flag |
| `apps/web/src/ui/today/today-presenter.test.ts` | 30 tests |
| `apps/web/src/ui/today/TodayScreen.test.tsx` | 23 tests |
| `apps/web/src/ui/today/today-route.test.ts` | 9 tests — the migration boundary |
| `apps/web/e2e/ui-overhaul-today.pw.cjs` | The geometry harness LAY-04 needs |
| `docs/ui-overhaul/evidence/today/geometry.json` + 2 PNGs | H0 evidence |
| `docs/ui-overhaul/evidence/a1-regression/wp09b-agm-fold-in.json` | A1 proof for the ledger change |

### Files modified

`apps/web/src/ui/tasks/task-ledger.ts` (+`source`, `dedupeKey`, `agmTask`,
`mergeTaskLedger`) · `apps/web/src/features/monday-briefing/ActionCenter.tsx`
(consumes the AGM lane from the ledger; `SEVERITY_ACCENT` exported for the
round-trip proof) · `apps/web/src/features/monday-briefing/PhaseIndicator.tsx`
(reads the shared vocabulary, keeps its own palette) ·
`apps/web/src/app/App.tsx` (lazy `/today`; the new shell escapes the legacy
chrome; the legacy Chip dock is suppressed on `/today`) ·
`apps/web/src/app/a11y.css` (body margin reset, conditioned on the v2 frame) ·
`packages/design-system/components/MfdStickyAction/MfdStickyAction.module.css`
(stops printing the blocked reason twice) · four test files.

### The AGM lane was bypassing the ledger

WP-09a's entry recorded this as unfinished: *"'One derivation' is not yet true.
`recommendationDeadline()` copy and `PRIORITY_ACCENT` still live in
`ActionCenter.tsx`, so the AGM lane bypasses the ledger."* It does not any more.
`agmTask()` maps an `AGMRecommendation` to a `UiTask`, and the board reads it
through the same `taskToBoardAction` as everything else.

The colour contract is proved, not asserted. `AGM_SEVERITY` is chosen so that a
recommendation routed through `TaskSeverity` and back out through the board's
`SEVERITY_ACCENT` lands on the accent the deleted `PRIORITY_ACCENT` table
produced, and the test walks all four priorities to check it. Changing one
entry in either table fails.

**One thing found on the way in: the engine never emits `priority: 'low'`.** No
branch in `packages/engine/src/systems/agm.ts` sets it, so the fourth arm of
`recommendationDeadline()` has always been unreachable. Its copy is now pinned
in `task-ledger.ts` so that if a future engine branch does emit `low`, it
inherits the wording the audit approved rather than getting new copy by
accident. Recorded rather than deleted.

### The deduper has a real job

`dedupeKey` arrived in WP-09a's scope and was left out on purpose — *"a dedupe
key without a deduper is decoration."* `mergeTaskLedger` is the deduper, and
the duplication it collapses is not hypothetical:

| Key | What was competing |
|---|---|
| `roster-moves` | `injuries-unresolved` (state) · AGM `injury_watch` · AGM `sandra_development_mandate` · `optional-roster-training-medical` |
| `game-plan` | `game-plan-missing` (state, blocking) · AGM `next_opponent` · `optional-prep` |
| `cap` | AGM `cap_trouble` · `optional-cap` |
| `depth-chart` | `depth-chart-incomplete` (state) · `optional-depth` |

On the demo save at 390×844 that is 12 task candidates rendering as **8 rows**.

Two decisions worth naming:

- **Merging is lossless.** The losers travel on the winner as `merged` and the
  screen renders them inside the row's disclosure. "No feature data deleted" is
  discharged by construction rather than by remembering.
- **Keys are authored per task, not derived from the route.** The AGM's cap
  mandate and the owner-approval warning both point at `/owner` and are
  genuinely different work; its injury advisory and the state-derived injury
  task both point at `/roster` and are genuinely the same. A route-derived key
  gets one of those two wrong. An AGM id with no key gets a unique one and
  never merges — a recommendation the engine grows later shows up as its own
  row rather than being absorbed into something unrelated.

### A1: the legacy board is byte-identical

`docs/ui-overhaul/evidence/a1-regression/wp09b-agm-fold-in.json`. `ActionCenter`
rendered through `renderToStaticMarkup` on `main` (7577176) and on this branch,
five scenarios, seeded fixture 424242: **all five identical, sha256 for sha256**,
covering `urgent`, `high` and `medium` recommendations.

Disclosed with it: the AGM modal body is **not** in that diff. `PixelModal`
renders nothing while closed, its open state is component-local, and there is no
jsdom here — so `renderToStaticMarkup` cannot reach it. The three mappings that
changed inside it (card accent, badge word, title/reason) are covered by
assertions in `task-ledger.test.ts` instead of by a render diff. That is weaker
evidence and it is labelled as such.

### Two changes to legacy files that are not legacy behaviour

Both are branches no canonical route can reach, and `today-route.test.ts` pins
that by walking `APP_ROUTE_REGISTRY`:

1. **`RootLayout` returns a bare `<Outlet />` on `/today`.** `AppFrame` budgets
   all fixed chrome at 152px; the legacy shell spends 383–425px of it on phone
   before a screen renders anything. Nesting one inside the other measures the
   sum and proves nothing.
2. **The legacy Chip dock does not render on `/today`.** It is a sibling of the
   router, so it renders on every route. Measured on Today before the change:
   **193px of sticky clearance plus a 91–246px fixed panel**, on top of a 152px
   budget — the audit's own permanent-clearance finding, reproduced inside the
   thing built to fix it. WP-08 replaces it with a Chip fed by this ledger.

### The 2.5-viewport budget, measured properly

WP-00 recorded the blocker: the baseline harness seeds state by clicking "Launch
Demo Scenario", which builds a dynasty from `Date.now()`, and two runs of
identical code differ by up to 93px. The new harness **freezes `Date.now`
before the app boots**, which makes the demo seed a constant, and then runs the
entire viewport matrix twice and requires identical geometry. It is not a claim
that the state is pinned; it is a test that fails if it is not.

That assertion earned its keep immediately: the first passing run failed on the
repeat, `visibleTextCount` 55 vs 59 at 844×390, because a fixed 400ms wait let a
lazy chunk land inside the window on the warm second pass. Replaced with a
settle loop that waits for the DOM to stop changing.

**LAY-04 is `content.scrollHeight`, not `document.scrollHeight`.** `AppFrame`
is a fixed-height grid, so the document never scrolls and
`document.scrollHeight / innerHeight` is 1.0 at any content depth — asserting on
it would have passed at every depth and measured only that the frame exists.
doc 09 states the criterion in absolute pixels, and that is what is asserted.

| Viewport | Today content | Content viewports | Legacy Briefing | Ratio | Shell chrome | Dock |
|---|---|---|---|---|---|---|
| 390×844 (LAY-04's viewport) | **1,512 px** (budget 2,110) | 1.79 | 11,945 px | **7.9×** | 76 px | 89 px |
| 320×568 | 1,700 px | 2.99 | 13,449 px | 7.9× | 75 px | 141 px |
| 430×932 | 1,488 px | 1.60 | 11,590 px | 7.8× | 76 px | 89 px |
| 844×390 (compact height) | 1,288 px | 3.30 | 7,416 px | 5.8× | 76 px | 89 px |
| 768×1024 | 1,344 px | 1.31 | 7,396 px | 5.5× | 76 px | 89 px |
| 1440×900 | 1,296 px | 1.44 | 6,273 px | 4.8× | 76 px | 89 px |

Every viewport: **0 sub-44px targets, 0 sub-12px text, 1 scroll owner**.

Two things this table says plainly rather than by omission:

- **The 2.5-viewport ratio holds at 390×844 and at every viewport above it. It
  does not hold at 320×568 (2.99) or at 844×390 (3.30).** LAY-04 names 390×844
  and states its budget in absolute pixels, which is what is asserted; those
  two viewports are recorded as over the ratio rather than quietly dropped. The
  content is *smaller* at both (1,700 px and 1,288 px) — the ratio moves
  because the viewport shrinks, not because the screen grew.
- **LAY-06 is two numbers, not one.** The criterion reads "phone shell fixed
  chrome envelope ≤152 px … action dock accounted separately without overlap",
  so the shell envelope (76 px) and the dock (89 px, 141 px at 320) are
  asserted separately and their sum is asserted to equal total permanent
  chrome. Legacy's envelope alone measures 383–429 px on phone.

Mutation-checked, so the numbers are not decoration:

| Mutation | Result |
|---|---|
| `min-height: 320px` on the Today header | **fails** — shell envelope 287 px against 152 px |
| `OPTIONAL_VISIBLE` 0 → 7 (uncollapse the standing lane) | **fails** — over the 2,110 px budget |
| Body margin reset disabled | **fails** — 2 scroll owners at 320×568 |
| `RECOMMENDED_VISIBLE` 3 → 5, and 3 → 2 | **both fail** |
| Primary task prefers advice over blockers | **fails** |
| Week label shown in every phase | **fails** |
| Merge skipped | **fails** |

### Two defects the geometry found

- **`MfdStickyAction` printed the blocked reason twice.** It renders the reason
  in its own status line *and* passes it to `MfdButtonV2` as `disabledReason`,
  which renders it again as a visible description 8px below. Duplicated copy on
  screen, and 16px of a 152px budget. The button's copy is now visually hidden
  and still `aria-describedby`-linked, so the reason stays reachable from the
  control. Measured: 161px → 145px at 320px.
- **The document was a second scroller at every viewport.** The user agent's
  `body { margin: 8px }` adds 16px under a `100dvh` frame. One scroll owner is
  the archetype's one hard rule. Fixed with a reset conditioned on the v2 frame
  being mounted, so the legacy shell keeps rendering inside that margin.

### Deviations, disclosed

- **File paths.** The packet names `ui/presenters/` and `ui/screens/today/`.
  WP-09a already put the ledger in `ui/tasks/`, and this follows that shape:
  `ui/today/` holds the presenter, the screen and the route together. One
  concept, one folder, consistent with what already shipped.
- **`availability`, `isComplete`, `completionExplanation` and `entityRef` from
  doc 07's `UiTask` are still not implemented.** Same reasoning that kept
  `dedupeKey` out of WP-09a: none of them has a producer yet. `isComplete`
  needs a previous-ledger snapshot to diff against, which is WP-06's
  return-to-task work; `availability` needs a locked task, and the ledger emits
  none. They arrive with the packets that give them a job.
- **Desktop is a single column.** The blueprint specifies a task column plus a
  context rail. `PaneLayout` exists and is still unused. The split needs
  WP-06's navigation rail to be worth building against, and a half-built
  two-column desktop is worse evidence for H0 than an honest one-column one.
- **The screen is not yet the source for nav badges, Chip, or Week Advance.**
  The packet's definition of done requires that. This is the direction proof;
  WP-09b-full does the unification after WP-05/06/07.
- **`/today` is registered through `CONTEXTUAL_ROUTE_PATHS`, not the registry.**
  Adding it to `APP_ROUTE_REGISTRY` would make the canonical surface 80 routes
  and put it in legacy navigation. It is documented in
  `nav-items.test.ts`'s direct-only reasons and marked deliberately uncoached in
  `useActiveRouteBeats.test.ts` — route coaching is the legacy Chip's
  explanation system, and the new shell explains itself in the task rows.

### Rollback

Set `uiOverhaulMode` back to `legacy` and `/today` renders a locked state.
Revert the route commit and it 404s. Nothing else changes: the ledger additions
are pure, the `ActionCenter` change is proved byte-identical, and the
`PhaseIndicator` change is a lookup-table extraction whose four tests pin every
label and tip it renders.

---

## Review pass — Today direction proof (goat-reviewer, 2026-08-06)

**FAIL**, eight findings. All fixed. The three that mattered most were a gate
that measured nothing, a guard that let a wrong dedupe key through, and a
correctness bug that deleted a task from the screen.

### The LAY-06 gate measured nothing

`fixedChromeHeight` summed elements with `position: fixed | sticky`. `AppFrame`
is a three-row grid: the header row is `position: relative` and only the dock is
sticky, so the header counted as **zero**. Adding `min-height: 320px` to the
Today header left the reported number at 89 px while the content region
collapsed to 64 px at 844×390 — the gate said "in budget" for a screen showing
one line of Today.

Replaced with `viewport height − scroller client height`, split into the shell
envelope and the separately-accounted dock, with their sum asserted to equal the
total. The same mutation now fails at 287 px.

The ledger's earlier "89 px vs 383–425 px" comparison was also not like-for-like
— the legacy baseline's header *is* `position: sticky` and *was* counted. The
table above is corrected: 76 px of shell envelope against legacy's 383–429 px,
with the dock stated separately on both sides.

### A wrong dedupe key could ship silently

`task-ledger.test.ts` asserted only that each AGM id had *a* key, never which
one. Pointing `cap_trouble` at `save` merged "Over the cap — you have $0K of cap
space" into "Save slot and backup export", removed it from the Recommended lane,
and **300 tests passed**. The mapping is now pinned entry by entry.

**And one shipped key was already wrong.** `sandra_development_mandate` is an
active owner mandate whose failure costs patience at season end — structurally
identical to `marcus_cap_mandate`, which was deliberately given its own key
*because* sharing a route is not sharing a job. Sandra's carried `roster-moves`,
so any injured player absorbed it into "N injured players" and it lost its row,
its link and its at-risk accent. Now `development-mandate`, with a test.

### A task could be deleted from the screen entirely

`presentToday` filtered the two synthetic all-clear rows by
`destination.route === '/week-advance'`. `agmTask` sends a recommendation with
no `targetRoute` to exactly that route. An urgent recommendation without a route
was absent from all three lanes **and** from every `merged` payload, while
readiness reported "Nothing is waiting on you." Now filtered by key
(`ALL_CLEAR_KEYS`), with a test that renders a routeless urgent recommendation.

All six of today's engine recommendations set a route, so this was latent — and
`targetRoute` is optional in the engine type, so it would not have stayed that
way.

### Five more, all real

- **"Merging is lossless" was false as rendered.** The screen printed each
  merged task as `title — reason` and dropped its consequence, its destination
  and its link. Merged tasks now render in full; they sit inside a closed
  `<details>`, which is `display: none`, so they cost nothing against LAY-04.
- **The severity accent had no textual equivalent.** The stylesheet claimed the
  bar was "paired with the severity's own word"; the words appeared **zero**
  times in rendered markup, and the test asserted the `data-` attribute, which
  surfaces to no user. Blocking and warning rows now print the word. The test
  walks every row and requires the word exactly where the severity warrants it.
- **The repeat-run determinism check omitted the metric LAY-04 is judged on.**
  It compared `document.scrollHeight`, which the fixed-height frame pins to the
  viewport height by construction. `content.scrollHeight` and the chrome numbers
  are now in the comparison.
- **The ChipDock suppression branch had zero coverage**, and pointing it at
  `/roster` deleted the legacy Chip dock from a canonical route — a direct A1
  violation — with **834 tests passing**. Now pinned.
- **The two `/today` branches used different resolvers.** `RootLayout` compares
  TanStack's `pathname`; `PostSetupApp` compares `resolveCurrentAppRoute`, which
  returns the raw hash including any query string. `#/today?panel=x` matched one
  and not the other, so the new shell would have rendered with the legacy Chip
  dock and its 193 px of clearance on top of it. Both now go through
  `isTodayRoute`, tested against queries, fragments and trailing slashes.

### A defect the review's own gap-filling found

Writing the missing `today-input.ts` test surfaced a product bug: `Today` named
an opponent during the offseason. `selectCurrentMatchup` matches
`schedule.week === game.week` with no regard for phase, so in offseason week 1
it returns *next* season's week-1 game — the context block would have read "vs
Pittsburgh Steel City Iron Smelters" while the player was signing free agents.
The matchup lookup now gates on `phaseHasGames`, which is the same predicate the
week label already used.

### Fixed from the risk list

- **No `main` landmark anywhere in the new shell.** The skip link landed on a
  `div`. `PageScroll` takes a `landmark` prop and `AppFrame` sets it, so the
  page scroller is now `<main>`; a contained scroller is never main, enforced by
  the type.
- **`TodayOpponent.hasGame` was produced, asserted, and consumed by nothing.**
  Deleted.

### Accepted without change, and why

- **Route-change focus does not happen on `/today`.** `App.tsx` focuses a
  `mainContentRef` that the early return never mounts, and nothing in `AppFrame`
  focuses the heading. Real gap. `/today` currently has no in-shell navigation
  to change *from*, and focus restoration is WP-06's return-to-task contract —
  building half of it here would mean rebuilding it there. Recorded as an unmet
  scope line rather than a substitution.
- **Desktop is still a single column.** Unchanged from the original disclosure.

### Claims the review checked and confirmed

Recorded because they were checked adversarially, not because they were claimed:

- **A1 reproduces independently.** The reviewer extracted `ActionCenter.tsx`
  verbatim from `7577176`, rendered it against HEAD's across the same five
  seeded scenarios, and got identical sha256 in all five.
- **The disclosed "not covered" gap is clean too.** Forcing the AGM modal open
  in both implementations raised the payload from 36 kB to 44 kB — the body does
  render — and all five scenarios were still byte-identical. The stated
  justification ("`renderToStaticMarkup` cannot reach it") understated what a
  two-character probe could reach; the modal body is byte-identical.
- The geometry evidence is reproducible: an independent run regenerated
  `geometry.json` and both PNGs byte-for-byte identical.
- The `RootLayout` branch is genuinely unreachable from all 79 canonical routes.
- `getAGMWeeklyRecommendations` is RNG-free, so rendering Today consumes no
  simulation randomness.

The A1 evidence file was a one-off artifact nobody could re-derive. It is now
backed by `ActionCenter.a1.test.tsx`, which re-renders the five scenarios every
run and fails if a hash moves — the evidence is a standing gate rather than a
snapshot of a claim.

### Verification after the fixes

| Check | Result |
|---|---|
| `pnpm -r typecheck` | **PASS** — all 3 projects |
| `pnpm --filter @mfd/design-system test` | **PASS** — 20/20 files, 175/175 tests |
| Full web suite | **PASS** — 275/275 files, 2,446/2,446 tests, exit 0 |
| `node scripts/check-ui-route-coverage.mjs` | **PASS** — 79/79, 79 surface-map keys |
| `bash scripts/check-math-random.sh` | **PASS** |
| `node --test scripts/__tests__/*.mjs` | **PASS** — 95/95 |
| `pnpm lint` | **PASS** — 0 errors, 42 warnings (pre-existing count) |
| `playwright test ui-overhaul-today` | **PASS** — matrix identical across two runs |
| PERF-02 | eager `index-*.js` **280.0 KB gzip** against the 316 KB ceiling (278.3 KB before this packet); `/today` chunk **4.2 KB gzip**, lazy |
| `SAVE_VERSION` | 37, unchanged |
| Protected paths touched | **0** — `packages/engine`, `.github`, `release-gate.mjs`, the CODEX trio |

---

## The shell and its navigation (WP-05 new-shell half + WP-06)

**H0 passed.** The owner opened Today on a real save at 390×844 and 1440×900 and
confirmed the direction, which is what the amended plan gates the WP-05/06/07
spend on.

Today was one screen that happened to render standalone: `RootLayout` returned a
bare `Outlet` for one hardcoded path, and the screen built its own `AppFrame`.
That works for exactly one route. This packet turns it into a shell — a route
set, a navigation, a frame that changes shape, and a composition point every
migrated screen renders inside.

### Files added

| File | What it is |
|---|---|
| `apps/web/src/ui/navigation/navigation-model.ts` | Pure: destinations, active hub, badges |
| `apps/web/src/ui/navigation/navigation-model.test.ts` | 19 tests |
| `apps/web/src/ui/navigation/AdaptivePrimaryNav.tsx` | One navigation, three shapes |
| `apps/web/src/ui/navigation/navigation.module.css` | Bar / rail / sidebar |
| `apps/web/src/ui/navigation/AdaptivePrimaryNav.test.tsx` | 21 tests |
| `apps/web/src/ui/shell/MfdAppShell.tsx` | The migration host's shell |
| `apps/web/src/ui/shell/MfdAppShell.test.tsx` | 8 tests |

### Files modified

| File | Change |
|---|---|
| `apps/web/src/ui/migration/ui-overhaul-mode.ts` | `isTodayRoute` → `V2_SHELL_ROUTES` + `isV2ShellRoute` |
| `apps/web/src/app/App.tsx` | Both branches read the route set (3 lines) |
| `apps/web/src/ui/layout/AppFrame.tsx` | `nav` slot, `resolveFrameLayout` |
| `apps/web/src/ui/layout/layout.module.css` | Named grid areas, two frame shapes |
| `apps/web/src/ui/layout/StickyActionDock.tsx` | Measurement machinery deleted |
| `apps/web/src/ui/today/TodayScreen.tsx` | Renders `MfdAppShell`, not `AppFrame` |
| `apps/web/src/ui/today/TodayRoute.tsx` | Builds the navigation model |
| `apps/web/src/ui/today/today-presenter.ts` | Exposes `ledger` — the rows on screen |
| `apps/web/e2e/ui-overhaul-today.pw.cjs` | Nav geometry, overlap, occlusion, fit, two behaviour tests |
| `apps/web/src/ui/layout/layout.test.tsx` | Frame layout, grid areas, safe-area accounting, skip link |
| `apps/web/src/ui/migration/ui-overhaul-mode.test.ts` | Route-set ownership and path normalisation |
| `apps/web/src/ui/today/TodayScreen.test.tsx` | Badge/row agreement, current-page state |
| `apps/web/src/ui/today/today-route.test.ts` | The guard now covers the whole route set |

### The navigation is derived, not declared

`permanentNav` in the WP-04 surface map already records which route earns a slot
in permanent navigation, and it marks **exactly one route per phone hub** —
`/` (today), `/roster`, `/game-day`, `/front-office`, `/standings`. Dynasty and
System carry none, which is the map agreeing with the audit that they are
exposed deliberately rather than squeezed into a five-slot bar.

So the nav reads the map. Moving a screen between hubs in the matrix moves it in
the navigation, and there is no second list to keep in step. The test asserts the
*property* the derivation depends on — one nominated route per primary hub, zero
for the secondaries — rather than the five paths it currently produces.

Two things are authored, and both are flagged in the source: the Dynasty and
System landings. Ranking the hub's routes by frequency and urgency to avoid
writing two strings produces the wrong answer for System — the most urgent route
there is save recovery, which you arrive at from a task, not browse to. They are
`/franchise` and `/settings`, pinned by a test that reads their hub back out of
the surface map.

### The migration switch is a data structure

`V2_SHELL_ROUTES` is the strangler boundary. A destination links to its canonical
path when the shell owns it and to its legacy path otherwise:

```ts
const canonical = normalizedCanonical(entry);
return isV2ShellRoute(canonical)
  ? { route: canonical, migrated: true }
  : { route: entry.legacyPath, migrated: false };
```

Today that is 1 migrated and 4 unmigrated, and the test asserts exactly that
split against the set rather than against a literal. When a hub's screen lands
and its canonical path joins the set, the nav starts pointing at the new path
with no edit to the navigation, and neither branch in the 2,276-line `App.tsx`
is touched again.

Four of five destinations currently cross back into the legacy shell. That is the
pattern working, not a defect. `data-mfd-v2-nav-migrated` records it **for the
tests** — it is a data attribute, invisible to sighted users and to assistive
technology alike, so it is not a signal to a player and the first version of this
entry overclaimed by calling it "surfaced". Four of five taps still swap the
entire chrome with nothing a player can perceive telling them why. Naming the
boundary in the interface is open work.

### Badges come from the rows Today holds

`presentToday` now returns `ledger` — every row the three lanes render, in lane
order — and the navigation counts *that*, not the ledger it was handed. The
difference is what makes the audit's one-derivation rule structural: a badge
cannot count a job Today does not hold.

**Holds, not shows.** The recommended lane renders three rows and puts the rest
behind a disclosure, so a hub with nine recommended jobs badges 9 while three are
in view. That is the intended reading — the badge counts open work, and a summary
the player has not opened has closed none of it — but it is a different claim
from "the rows on screen", and the first version of this entry made the wrong
one.

The check runs against the running app, not against a test that builds the
navigation model for itself: the geometry harness reads `data-mfd-v2-nav-badge`
off each tab and `data-mfd-v2-hub` off each row in the two lanes that badge, and
requires the two maps to be equal at every viewport.

Two exclusions, both deliberate. The always-available lane does not badge — a
count that never reaches zero teaches players to ignore counts. The two synthetic
all-clear rows are already filtered, so "Ready to advance" does not also read as
one open job. Bounded at `9+` with the true number spoken: `11 open jobs`.

### LAY-06 with navigation in it

| Viewport | Frame | Nav | Shell chrome | Dock | Content | vs legacy Briefing |
|---|---|---|---|---|---|---|
| 320×568 | stacked | bar, 5, 45px | **120** | 141 | 1,576 | 8.5× |
| 390×844 | stacked | bar, 5, 65px | **141** | 89 | 1,440 | 8.3× |
| 430×932 | stacked | bar, 5, 65px | **141** | 89 | 1,416 | 8.2× |
| 844×390 | sided | rail, 7, 114px wide | **76** | 89 | 1,264 | 5.9× |
| 768×1024 | sided | rail, 7, 114px wide | **76** | 89 | 1,296 | 5.7× |
| 1440×900 | sided | sidebar, 7, 208px wide | **76** | 89 | 1,224 | 5.1× |

Budgets: shell chrome ≤152, content ≤2,110 at 390×844. Nav/dock overlap **0 px**
at every viewport, sub-44px targets **0**, sub-12px text **0**, scroll owners
**1**. The rail costs width, not height, which is why the frame changes shape
instead of the navigation changing contents.

### Three defects the measurement found

**The rail did not fit, and hid it by scrolling.** At 844×390 the seven-item rail
overflowed and became a second scroll owner. `overflow-y: auto` is deliberate —
a rail that cannot fit its destinations must scroll rather than drop one, because
a dropped destination is feature loss — so the harness now records `navScrolls`
separately from the scroll-owner count, and the failure names the cause instead
of reporting "2". Two fixes: short windows take the rail rather than the sidebar
(seven 56px two-line rows need 392px), and the arithmetic below.

**`content-box`.** The v2 layer has no global box-sizing reset, so a 64px
`min-height` with 4px of padding is a 72px bar. That put the phone envelope at
**149 of 152** — inside budget, three pixels from not being — and overflowed the
390px-tall rail by 14px. `box-sizing: border-box` is now scoped to the
navigation, which took the envelope to 141.

**72px of empty scroll on every screen.** The content row added the dock's
measured height to its own `padding-bottom`, on the assumption that content could
scroll underneath it. It cannot: the dock is a row of the frame's grid. Measured
by deleting the reservation and re-running the matrix — 390×844 went from 1,512px
to 1,440px with nothing rendered differently, and every viewport but the shortest
moved by exactly 72. The reservation is gone, and so is the `ResizeObserver` and
the custom property that fed it: with nothing consuming the measurement,
`StickyActionDock` is a plain component again.

The same accounting fixed a second double-charge: the dock and the phone bar both
defaulted to `safe-bottom`, spending the home-indicator inset twice. It is now
scoped to the case where the dock is actually the bottom-most element.

### Deviations from the packet, disclosed

**WP-05's legacy half is not done.** The packet's definition of done includes
"App.tsx becomes composition-oriented". It does not, and this is deliberate:
amendment A1 forbids changing legacy rendered output for the whole migration, so
decomposing the 2,276-line shell delivers no player-visible change while spending
the largest regression budget in the project. It stays a separate, revertible
refactor. `App.tsx` gained three changed lines this packet, all inside branches
that are unreachable from all 79 canonical routes.

**One navigation component, not four.** WP-06 names `AdaptivePrimaryNav`,
`MobileHubBar`, `NavigationRail` and `DesktopSidebar`. What differs between the
three shapes is position, density, and whether the secondary hubs have room — all
layout. What must *not* differ is the destinations, their order, their labels,
their badges and their current-page semantics, and three components rendering the
same list is three copies of that contract. The width rule stays in TypeScript
(`resolveNavVariant`) so it is testable without a browser.

**No icons.** The v2 layer has no icon system, and the packet forbids icon-only
navigation, so every destination is a visible text label. Asserted at all three
variants.

**`ReturnToTask` and command-palette integration are not in.** Both need
navigation origin across a route change, and there is one route in the new shell
— there is nothing to return *from* yet. They land with the second migrated hub.

### Route-change focus

`shouldMoveFocus` is pure and tested: not on first paint (the player's focus is
wherever the browser put it, and pulling it into the content region on arrival is
a steal), not on a re-render reporting the same route (store notifications would
eject a player mid-keystroke), and yes on an actual change. `PageScroll` already
carried `tabIndex={-1}` for exactly this.

Navigation sits before content in the DOM, placed visually by the grid. That is
right at `sided`, where the rail is visually first, and it is the standard
bottom-bar trade at `stacked`: the skip link is the first tab stop precisely so a
keyboard user reaches content in one press rather than through five links.
Reordering the DOM at the breakpoint instead would move focus on resize.

### Still open, and why

- **Desktop Today is one wide column.** The sidebar landed; the two-column split
  is WP-09b-full. Prose is already bounded to 68ch by `.mfd-v2-body`, so this is
  card width, not line length. The 1440×900 screenshot in
  `evidence/today/` is the evidence for the next packet, not a claim of done.
- **Dynasty is not reachable from the new shell on phone.** System is: the
  standing save task points at `/dynasty`, which the surface map places in the
  System hub, and Today renders it in the optional lane at every viewport. The
  first version of this entry said neither was, which was wrong. Dynasty has no
  task, no event and no contextual entry pointing at it yet, so on phone it is
  reachable only from the legacy shell — which it remains throughout.
- **An AGM recommendation aimed at a Dynasty or System route would badge a tab
  no phone player can see**, because the bar variant drops the secondary hubs.
  Latent: all six `targetRoute` values in `packages/engine/src/systems/agm.ts`
  land in team, office or game.

### The boundary is exercised, not asserted from source

Four of five destinations hand the player back to the legacy shell, and that
hand-off is the one behavioural claim no unit test can make — it needs a real
router, a real hash change, and both shells in one page. A second Playwright test
does it: from `/today`, click Team, land on `#/roster` with the legacy shell
mounted and **zero** new frames; navigate back and get the new shell with **zero**
legacy shells. Both mounted at once is the failure the route set exists to stop.

The same test checks the legacy Chip dock is absent on `/today` and *present* on
`/roster`. Asserting only the absence would pass if the Chip were disabled
outright, which is not the claim.

### Verification

Both bundle numbers are `vite build` with default env, measured on this tree and
on `b863887` in a throwaway worktree — a like-for-like delta rather than a
comparison against a number taken a different way.

| Check | Result |
|---|---|
| `pnpm -r typecheck` | **PASS** — design-system, engine, web |
| Full web suite | **PASS** — 278/278 files, 2,516/2,516 tests |
| `pnpm --filter @mfd/design-system test` | **PASS** — 20/20 files, 175/175 tests |
| `node scripts/check-ui-route-coverage.mjs` | **PASS** — 79/79, 79 surface-map keys |
| `bash scripts/check-math-random.sh` | **PASS** |
| `node --test scripts/__tests__/*.mjs` | **PASS** — 95/95 |
| `playwright test ui-overhaul-today` | **PASS** — 3/3: matrix identical across two runs, boundary crossing both ways, skip link |
| `pnpm lint` | **PASS** — 0 errors, 42 warnings (pre-existing count) |
| PERF-02 | eager `index-*.js` **279.2 KB gzip** against the 316 KB ceiling, **+0.2 KB**; `/today` chunk 4.2 → **5.3 KB**, still lazy |
| `SAVE_VERSION` | 37, unchanged |
| Protected paths touched | **0** — `packages/engine`, `.github`, `release-gate.mjs`, the CODEX trio |

### Rollback

`git revert` the commits independently: the boundary generalisation, the
navigation, and the shell — which also carries the dock-reservation fix, since
both live in `layout.module.css`. Setting the mode to `legacy` makes all of it
inert without reverting anything.

---

## Review pass — shell and navigation (goat-reviewer, 2026-08-06)

**FAIL, 11 findings.** All fixed or corrected below. The reviewer re-ran every
suite serially, reproduced `geometry.json` byte-identically across all six
viewports, reproduced both PERF-02 numbers, and confirmed the packet touches
nothing under `packages/engine`, `.github`, `release-gate.mjs` or the CODEX trio.

### The skip link navigated away from the screen

`AppFrame` rendered `<a href="#mfd-v2-content">`. The app runs on
`createHashHistory`, so that is not a fragment jump — it is a route change to
`/mfd-v2-content`. Measured in a real browser at 390×844 on a pinned save:

```
BEFORE hash = #/today
AFTER  hash = #mfd-v2-content
AFTER  v2 frames = 0 · legacy shells = 1 · today screens = 0
```

The player was ejected out of the new shell into the legacy one on a route that
does not exist. The link predates this packet, but this packet made it
load-bearing: `AppFrame` had no navigation before, so the mitigation cost one tab
stop; it now costs five, and the source comment, the ledger and a new test all
cited it as the reason navigation may come first in the DOM.

The `href` stays — the control keeps its link role and its accessible name — and
the default is now cancelled with focus moved directly, which is what the
fragment would have done under a history router. A third Playwright test presses
Tab, presses Enter, and asserts the hash is unchanged, the screen is still
mounted, no legacy shell appeared, and `document.activeElement.id` is the content
region. Reverting the handler fails it.

### The LAY-06 gate was blind to overlay chrome

The previous review found this gate measuring nothing because it summed
`position: fixed | sticky` and the header is `relative`. The replacement —
`viewportHeight - content.clientHeight` — has the opposite hole. Making the
header `position: fixed; min-height: 260px`, a 261px band over the top of every
screen, *improved* the reported envelope from 141px to 65px and the whole harness
passed.

Chrome that costs no layout still costs the player the content underneath it, so
occlusion is now measured directly: the intersection area of every out-of-flow
element with the content region, asserted at zero. In-flow grid rows contribute
nothing by construction, which is the point. The mutation above now fails at the
first viewport.

Three mutations the previous metric already killed still do: a 300px nav link, a
320px header, and rewriting the sided template from a nav column to a nav row.

### The packet's headline wiring had no test at all

`TodayRoute.tsx:51` is the one production line joining the badges to the rendered
ledger. Replacing `view.ledger` with `[]` there left **every** unit test and
**both** Playwright tests green while every badge disappeared. The tests that
claim to prove badge/row agreement build the navigation model themselves, so they
cannot see the route's wiring, and the harness collected `badgedHubs` without
asserting on it.

Rows now carry `data-mfd-v2-hub` and lanes carry `data-mfd-v2-lane`, and the
harness compares the badge map against the row map at every viewport. Both
mutations now fail.

### Eight more

| # | Finding | Resolution |
|---|---|---|
| 4 | "Badges count exactly the rows a player can see" is false — 9 recommended jobs badge 9 with 3 in view | Claim corrected in the source docstring and above; a test pins that hidden rows *do* count |
| 5 | The safe-area test asserted a selector substring; tripling the inset inside the rule passed | Asserts the declaration; a second test allows exactly one `safe-bottom` on a bottom edge in the whole stylesheet |
| 6 | The "keeps structural query state" test was vacuous — the only migrated entry has no query | `destinationRoute` exported and exercised on a constructed entry that has one |
| 7 | Route-change focus untested past the pure predicate; a wrong `contentId` would not be caught | Source guard pins that the effect and the frame take the same binding. The effect is dormant until a second route joins the shell — stated, not hidden |
| 8 | Focus order does not match visual order on phone: five bottom-bar stops before content | Accepted, with the skip link as the mitigation — which is why finding 1 had to be fixed first |
| 9 | `data-mfd-v2-nav-migrated` claimed as "surfaced" | Corrected above: it is a test hook, not a player-visible signal |
| 10 | "Dynasty and System are unreachable from Today on phone" is false — System is, via the standing save task | Corrected above |
| 11 | `resolveActiveHub`'s legacy-first lookup order had no guard | The precondition is pinned instead: no path, legacy or canonical, is claimed by two hubs — so the order cannot matter |

### Risks the review raised, recorded rather than fixed

- **LAY-06's split accounting hides the total.** At 320×568 the shell spends
  120px of chrome and 141px of dock — 261px of a 568px window, 46% — and both
  halves are individually in budget. doc 09 accounts them separately, so the
  criterion cannot see the sum. `DOCK_BUDGET = 152` is this packet's number, not
  doc 09's.
- **PERF-02 has no CI gate.** `scripts/check-bundle-size.sh` gates only
  `engine-*.js`. The 316 KB eager ceiling is asserted by hand in this ledger.
- **A1 across the 49 legacy routes is not verified locally.** The local evidence
  is `ActionCenter.a1.test.tsx` alone; the real net is the CDP smoke harness in
  release-gate steps 22–37, which is CI's job. The reviewer did verify by reading
  that `isTodayRoute` → `isV2ShellRoute` is behaviourally identical on every
  input the two call sites can produce, with one divergence — a bare `today`
  without a leading slash now matches — that has no call site.
- **`:has()`** is unsupported on Safari < 15.4 and Firefox < 121. The fallback is
  double safe-area padding, and `env(safe-area-inset-bottom)` resolves to 0 in
  headless Chromium, so no browser measurement can detect either state. The unit
  assertion above is the only guard there is.

### Confirmed in the packet's favour

The boundary test is load-bearing: disabling the `RootLayout` branch fails both
Playwright tests. Fourteen of twenty mutations the reviewer tried were already
killed, including dropping the `permanentNav` filter, counting the optional lane,
an off-by-one on the badge bound, always-on `aria-current`, removing the
screen-reader count, removing the nav's accessible name, moving the nav after the
content, un-filtering the all-clear rows, and adding `/roster` to the shell's
route set. Evidence and bundle numbers reproduce exactly.
