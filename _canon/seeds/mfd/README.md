# MFD shadow-tier baselines

Frozen multi-decade `PlaytestReport` outputs. The shadow tier (`pnpm test:shadow`) re-runs each scenario and refuses to pass if the output drifts.

Current corpus: `v5` for all three horizons, classified as `intended` under `MFD_GOAT_MASTER_PLAN.md:110`. The v5 reports freeze save schema 37 after the canonical game, injury, off-field, waiver, and offseason chain moved from mutable global RNG channels to an explicit `SimulationContext` with an isolated week RNG. The corpus was regenerated only after inspecting the complete v4 diff and passing the full engine suite, explicit-context isolation tests, five-persona 10-season certification, GOAT release sentinel, save round-trip, roster-health certification, and long-horizon checks.

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

`speedrunner-20y` requests 20 seasons and completes all 20 before the harness's `MAX_PLAYTEST_STEPS = 800` cap. The v5 baseline captures 593 weeks, 504 medium anomalies, 0 high-severity anomalies, 0 healthy-starter-shortage game-weeks, and 16,902/16,902 CPU transactions backed by receipts. The 5- and 10-season reports are also hard-certified: 0 shortages, 0 high anomalies, and complete receipt coverage (2,469/2,469 and 6,916/6,916).

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
