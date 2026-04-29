# MFD shadow-tier baselines

Frozen multi-decade `PlaytestReport` outputs. The shadow tier (`pnpm test:shadow`) re-runs each scenario and refuses to pass if the output drifts.

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
| `speedrunner-20y`   | SPEEDRUNNER | 42   | 20                | 10 (truncated)    | Long horizon — see "20y truncation" below.                                  |

### 20y truncation

`speedrunner-20y` requests 20 seasons but the harness's `MAX_PLAYTEST_STEPS = 800` cap stops the loop at step 800 (~10 completed seasons + ~507 post-cap weeks). The baseline captures whatever the engine produces *up to that cap*, including any anomalies the engine generates past year 10's first offseason→playoffs cycle.

This is **intentional** as a frozen reference. The shadow tier exists to detect drift, not to certify steady-state behavior. Any change to the sim that shifts what happens between step 0 and step 800 will surface as a diff. If a future sprint legitimately fixes post-year-10 behavior (e.g., reduces high-severity anomalies past the cap), classify the resulting diff as `intended` per §5.5 and regenerate the baseline with a new corpus version + spec citation.

If a sprint needs a true 20-season baseline, it must either bump `MAX_PLAYTEST_STEPS` (out-of-scope for verification rails work) or add a new shadow scenario with an explicit higher cap. Either change is scoped as engine work, not corpus maintenance.

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

The metadata sidecar (`<id>.meta.json`) is rewritten on every update with: `engineCommit`, `schemaVersion`, `generatedAt`, `generationCommand`. Commit message must cite the spec line that authorized the change.

## Why three durations

A single 10-year run misses:

- **5-year drift** — contract math, roster minimums, depth-chart turnover. Frequent enough to mask gradual regressions in shorter scopes.
- **20-year drift** — record book overflow, hall-of-fame accumulation, retirement / generational replacement systems. The 10-year fast tier never reaches steady state for these.

Three baselines triangulate the regression source: a 5-year pass with a 20-year fail points at long-horizon systems; a 5-year fail points at sim-step or contract math.
