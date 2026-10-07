# Verification — Fast Tier (`test:perft`)

The fast tier is the configured deterministic playtest command for sim-touching work. Follow [AGENTS.md](../../AGENTS.md) for the applicable verification requirement and workload authorization.

## Run it

From the repository root with the pinned toolchain and installed dependencies:

```bash
pnpm test:perft
```

The root command aliases `pnpm playtest:all`, then `pnpm --filter @mfd/engine playtest:all`. The engine script invokes `scripts/playtest-report.sh --all --seed 42 --seasons 10`: five personas, ten requested seasons each, seed 42. This is a simulation workload, not a free static check.

The serialized `PlaytestReport` excludes the registered host-noise detectors. Compare canonical reports directly when proving deterministic replay; inspect completed seasons, anomaly severity, roster-health certification, and receipt coverage for the exact executed source.

## Historical Sprint 72 reference

The following counts are retained from the original Sprint 72/v1.0.0 record. They are **historical counts, not expected outputs for every later engine revision**:

| Persona | Anomalies | High severity |
| --- | ---: | ---: |
| CHEAPSKATE | 239 | 0 |
| CHURN_ARTIST | 239 | 0 |
| GLUTTON | 239 | 0 |
| INJURY_MAGNET | 239 | 0 |
| SPEEDRUNNER | 237 | 0 |

The original anomalies were medium-severity roster-minimum reports. Record a new run's actual outputs with its source SHA; do not rewrite this historical table to make a changed result appear unchanged. The separately frozen [shadow corpus](../../_canon/seeds/mfd/README.md) has its own stored values and comparison contract.

## Architecture

- [Harness](../../packages/engine/src/playtesting/harness.ts): `runPlaytest` advances the real franchise loop and builds the report.
- [Personas](../../packages/engine/src/playtesting/personas.ts): deterministic bias configurations in `PLAYTEST_PERSONAS`.
- [Detectors](../../packages/engine/src/playtesting/anomaly-detectors.ts): registered `PLAYTEST_DETECTORS` inspect captured state.
- `HOST_NOISE_DETECTOR_IDS` in the harness excludes `perf-budget` from canonical counts. New host-dependent measurements must stay out of deterministic report signatures.
- [Reporter](../../scripts/playtest-report.ts): runs the selected scenarios and writes results under ignored `tmp/`.

## Changing a persona or detector

1. Inspect the owning types, writers, and existing tests. Keep simulation inputs deterministic; do not introduce a host clock or unseeded randomness into the decision path.
2. Add behavior-focused coverage for the new scenario or detector, including its failure case and canonical/host-noise boundary as applicable.
3. Run the authorized focused checks and the required perft command. Record the actual source, commands, completed horizons, counts, and limits in the [current work record](../plans/file-consistency-2026-10-07.md#evidence-and-closeout).
4. If a frozen shadow reference differs, follow the [baseline-update policy](shadow-tier.md#baseline-updates). Inspect/classify the difference before any approved regeneration. Do not auto-update a baseline just to remove a failure.

No ignored local `.codex` file is required for this workflow, and the current instructions do not impose an arbitrary minimum test count.

## Actual enforcement

The checked-in [Claude settings](../../.claude/settings.json) configure:

- **PreToolUse:** the protected-document guard.
- **PostToolUse:** the Math.random source check after matching edits.

There is **no committed Stop hook running perft or blocking session close**. Do not infer that a session exit ran any simulation test. Run the required command explicitly and retain its actual result. [CI](../../.github/workflows/ci.yml) and the [release gate](../../scripts/release-gate.mjs) provide their declared checks; inspect the exact run rather than assuming a hook supplied evidence.

For five-/ten-/twenty-season stored comparisons, use the [shadow-tier guide](shadow-tier.md).
