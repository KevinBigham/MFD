# Sprint 72 Playtest Determinism Audit

## Baseline

- Branch: `codex/sprint-72-determinism-and-prep`.
- Fetched `origin/main`: `f0a1e397bdcdfea9c2fda843d240eb783a8f95bf`.
- Latest main message: `feat(sprint-71): mascot helmet logos for all 32 franchises (#15)`.
- Starting engine gate: `pnpm --filter @mfd/engine test` passed, `199` files / `1837` tests.
- Save schema: unchanged at v35. This sprint has no save-shape work.

## Existing Playtest Memory

From `.codex/MFD/memory/project_playtest_telemetry_nondeterminism.md`:

> The `perf-budget` anomaly detector in `packages/engine/src/playtesting/anomaly-detectors.ts` measures wall-clock CPU time per simulated week against a budget threshold. CPU time is inherently non-deterministic under concurrent load (background processes, thermal throttling, OS scheduling). When a simulated week happens to take longer due to host-system noise, a `perf-budget` anomaly fires; when the same seed runs faster, it doesn't.

The same note records that Sprint 69 already stripped `perf-budget` anomalies from the determinism comparison, but not from the CLI report totals.

Related code:

- `packages/engine/src/playtesting/harness.ts:524` uses `Date.now()` through `nowMs()`.
- `packages/engine/src/playtesting/harness.ts:628` captures `startedAt`.
- `packages/engine/src/playtesting/harness.ts:644` records elapsed wall-clock time into `elapsedHistoryMs`.
- `packages/engine/src/playtesting/anomaly-detectors.ts:230` computes the p99 elapsed budget.
- `packages/engine/src/playtesting/anomaly-detectors.ts:233` emits a medium `perf-budget` anomaly.
- `packages/engine/src/playtesting/harness.ts:580` counts every anomaly, including `perf-budget`, in `anomalyCount`.
- `packages/engine/src/playtesting/integration/determinism.test.ts:4` documents the sim-state-only determinism comparison and strips `perf-budget`.

## Three-Run Reproduction

Command:

```bash
pnpm playtest:all
pnpm playtest:all
pnpm playtest:all
```

All three runs used seed `42`, `--all`, and `--seasons 10`.

| Persona | Run 1 anomalies | Run 2 anomalies | Run 3 anomalies | High severity | Drift source |
|---|---:|---:|---:|---:|---|
| CHEAPSKATE | 388 | 387 | 388 | 0 / 0 / 0 | `perf-budget` 149 / 148 / 149 |
| CHURN_ARTIST | 388 | 388 | 388 | 0 / 0 / 0 | none in sample |
| GLUTTON | 387 | 387 | 388 | 0 / 0 / 0 | `perf-budget` 148 / 148 / 149 |
| INJURY_MAGNET | 388 | 388 | 388 | 0 / 0 / 0 | none in sample |
| SPEEDRUNNER | 414 | 386 | 386 | 0 / 0 / 0 | `perf-budget` 177 / 149 / 149 |

Stable detector counts:

- `roster-minimums`: `239` for CHEAPSKATE, CHURN_ARTIST, GLUTTON, INJURY_MAGNET.
- `roster-minimums`: `237` for SPEEDRUNNER.
- `highSeverityCount`: `0` for every persona in every run.

Raw local artifacts:

- `tmp/sprint72-playtest-audit/run1-summary.json`
- `tmp/sprint72-playtest-audit/run2-summary.json`
- `tmp/sprint72-playtest-audit/run3-summary.json`

Pre-fix diff summary:

```diff
CHEAPSKATE anomalyCount 388 -> 387; perf-budget 149 -> 148
GLUTTON anomalyCount 387 -> 388; perf-budget 148 -> 149
SPEEDRUNNER anomalyCount 414 -> 386; perf-budget 177 -> 149
```

## Root-Cause Hypothesis Ranking

1. `Date.now()`-derived `perf-budget` telemetry in `harness.ts` and `anomaly-detectors.ts`: confirmed by reproduction. Only `perf-budget` counts drifted; stable sim-state detectors and high-severity counts did not drift.
2. Non-deterministic ordering in anomaly aggregation: unlikely. `sortAnomalies` sorts by step, year, phase rank, week, detector id, then detail, and tests cover the ordering.
3. `Map` / object serialization order drift: unlikely for this symptom. `canonicalJsonStringify` sorts object keys for save round-trip checks, and reproduced count drift points at a single detector rather than JSON key order.
4. `process.env`-derived fields varying between runs: no evidence. `scripts/playtest-report.ts` only parses CLI flags and writes deterministic filenames.
5. Harness `Math.random()` use: unlikely. The harness temporarily instruments `Math.random()` to count ambient calls; it does not use the value in report aggregation.

## Test Oracle

The regression should assert the canonical anomaly-count contract directly:

- Given identical input anomalies containing deterministic sim-state anomalies plus `perf-budget` anomalies, `buildPlaytestReport` should count only deterministic anomalies in `anomalyCount` / `highSeverityCount`.
- `perf-budget` may remain in a separate wall-clock telemetry channel, but it must not affect the canonical playtest anomaly count.
- Full verification after the fix: run `pnpm playtest:all` three times at seed 42 and deep-compare persona-level `anomalyCount`, `highSeverityCount`, and deterministic detector counts. Expected post-fix diff: no diff.

## v1.0.0 Release-Readiness Inventory

- `README.md`: present but still says 24 development sprints, 830+ tests, and contains a GitHub Pages setup note. Needs v1.0.0 polish and screenshot links.
- `CHANGELOG.md`: missing. Needs a reverse-chronological v1.0.0 entry.
- `apps/web/package.json`: version is `0.0.1`; must become `1.0.0`.
- Root `package.json`, `packages/engine/package.json`, and `packages/design-system/package.json`: all still `0.0.1`. Sprint 72 scope only names `apps/web/package.json`; leave workspace package versions unchanged unless explicitly expanded.
- Displayed app version: `AboutScreen` reads `__MFD_VERSION__` from `apps/web/package.json`, and `AboutScreen.test.tsx` expects `v0.0.1`. Bumping web package version will update displayed version and require the version-display test expectation to move to `v1.0.0`.
- Boot sequence: `apps/web/src/app/hooks/useBootSequence.ts` still displays `v1.0.0-beta // BUILD 28 — CONVENTION EDITION`; this is a displayed version string outside the initial file list. It should be updated only if Kevin approves broadening the edit radius beyond `apps/web/package.json` and `apps/web/index.html`.
- `apps/web/index.html`: title is `Mr. Football Dynasty`; no OG title, description, or image meta exists yet.
- `apps/web/public/screenshots/`: no screenshots directory exists. Slice 3 must create `apps/web/public/screenshots/v1/` with 4-6 refreshed images under the 1.5 MB total budget.
