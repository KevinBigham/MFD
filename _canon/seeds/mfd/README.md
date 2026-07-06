# MFD shadow-tier baselines

Frozen multi-decade `PlaytestReport` outputs. The shadow tier (`pnpm test:shadow`) re-runs each scenario and refuses to pass if the output drifts.

Current corpus: `v2` for `speedrunner-5y` / `speedrunner-10y` and `v3` for `speedrunner-20y`, classified as `intended`. The v2 reports were regenerated after the synthetic playtest fixture started syncing truthful team cap totals from scaled contract inputs before benchmark/shadow runs. The v3 `speedrunner-20y` report refreshes the long-horizon baseline after the current harness completes the requested 20 seasons under the default 800-step guard, replacing the stale truncated report that carried post-year-10 phase-boundary high anomalies while preserving the shadow tier's frozen determinism role.

## Files

| File                       | Contents                                                         |
|----------------------------|------------------------------------------------------------------|
| `<id>.json`                | Canonical `PlaytestReport` JSON for the scenario.                |
| `<id>.meta.json`           | Generation metadata (engine SHA, schema version, command, etc.). |
| `README.md`                | This file.                                                       |

## Scenarios

| ID                  | Persona     | Seed | Seasons requested | Seasons completed | Notes                                                                       |
|---------------------|-------------|------|-------------------|-------------------|-----------------------------------------------------------------------------|
| `speedrunner-5y`    | SPEEDRUNNER | 42   | 5                 | 5                 | Short horizon — catches contract math + roster turnover regressions.        |
| `speedrunner-10y`   | SPEEDRUNNER | 42   | 10                | 10                | Mid horizon — overlaps the fast tier's signature for sanity correlation.    |
| `speedrunner-20y`   | SPEEDRUNNER | 42   | 20                | 20                | Long horizon — catches HoF, records, retirement, and generational drift.     |

### 20y completion

`speedrunner-20y` requests 20 seasons and now completes all 20 seasons before the harness's `MAX_PLAYTEST_STEPS = 800` cap. The v3 baseline captures the full current long-horizon report: 20 completed seasons, 593 weeks advanced, 376 medium roster-minimum anomalies, and 0 high-severity anomalies.

This is **intentional** as a frozen reference. The shadow tier exists to detect drift, not to certify steady-state behavior. Any change to the sim that shifts what happens between step 0 and the completed 20-year horizon will surface as a diff. If a future sprint legitimately changes the long-horizon report again, classify the resulting diff as `intended` per §5.5 and regenerate the affected baseline with a new corpus version + spec citation.

If a sprint needs a longer-than-20-season shadow baseline, it must either add another shadow scenario or use an opt-in GOAT benchmark with an explicit higher cap. Either change is scoped as engine work, not corpus maintenance.

## Updating a baseline

**Never regenerate without classification.** See `READ_BEFORE_CODEX_JSON.md` §5.5.

```
# Inspect the diff first.
pnpm test:shadow -- --only speedrunner-5y

# If divergence is intended (with sprint-line citation):
pnpm test:shadow -- --update speedrunner-5y

# Regenerate everything (rare; usually only on a schema bump):
pnpm test:shadow -- --update
```

The metadata sidecar (`<id>.meta.json`) is rewritten on every update with: `corpusVersion`, `classification`, `specCitation`, `updateReason`, `engineCommit`, `schemaVersion`, `generatedAt`, and `generationCommand`. Commit message must cite the spec line that authorized the change.

## Why three durations

A single 10-year run misses:

- **5-year drift** — contract math, roster minimums, depth-chart turnover. Frequent enough to mask gradual regressions in shorter scopes.
- **20-year drift** — record book overflow, hall-of-fame accumulation, retirement / generational replacement systems. The 10-year fast tier never reaches steady state for these.

Three baselines triangulate the regression source: a 5-year pass with a 20-year fail points at long-horizon systems; a 5-year fail points at sim-step or contract math.
