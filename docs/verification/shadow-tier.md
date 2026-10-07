# Shadow Regression and Baseline Policy

This policy was newly adopted for the October 7, 2026 consistency repair. It replaces the unavailable `READ_BEFORE_CODEX_JSON.md` §5.5 reference; it does not claim to reproduce that missing text. [AGENTS.md](../../AGENTS.md) still governs save, simulation, and approval boundaries.

## Compare stored references

From the repository root, after installing the pinned toolchain/dependencies:

```bash
pnpm test:shadow
pnpm test:shadow -- --only speedrunner-5y
```

The existing scenarios compare SPEEDRUNNER at seed 42 over 5, 10, and 20 seasons with the checked-in [canonical corpus](../../_canon/seeds/mfd/README.md). Compare mode reports differences and fails on drift or a missing reference. It does not regenerate reference files. This is a simulation workload; use it within the approved verification scope.

A matching reference proves the specified comparison. It is not a fresh certification of every persona, seed, or longer horizon. Read the report's completed seasons, anomaly severity, roster-health, and receipt-coverage fields separately.

## Baseline updates

An update is a reviewed evidence change, not a routine way to make a failed comparison pass.

1. Inspect and retain the exact comparison diff. Identify the source change that explains it.
2. Classify the difference and cite the approved specification or packet. Confirm that save-format, simulation-math, and workload changes are covered by the current authorization; request additional approval only for uncovered scope. Do not invent a classification or historical approval.
3. Deliberately set the corpus version, classification, specification citation, and update reason for that approved change in the generator. Commit the generation source first.
4. Use a clean committed checkout at the script's actual Git repository root. There must be a full commit SHA and no staged edits, tracked modifications/deletions, or nonignored untracked files. Ignored dependency and temporary-output directories do not make the checkout ineligible.
5. Keep an exclusive source window during generation. Do not let another session edit, switch, or update the source checkout while the workload runs.
6. Generate only the approved scenarios. Review report and metadata diffs independently before committing the resulting artifacts.

The update preflight validates the Git root, full HEAD, and clean status **once, before any scenario runs or baseline file is written**. Each writer receives that same captured source SHA; the first generated file must not cause a later scenario in the same update to fail its own provenance check. The recorded generation SHA identifies the clean source commit, not the later commit that adds the generated artifacts. Compare mode does not require this update-only preflight.

Only after the preceding steps and workload authorization:

```bash
pnpm test:shadow -- --update speedrunner-5y
# Update every scenario only when that whole workload is approved:
pnpm test:shadow -- --update
```

Record the source SHA, exact command, environment, corpus/schema metadata, classification, specification, rationale, completed horizons, and actual results. Update the corpus README from the resulting JSON, then record the reviewed evidence in the [current repair plan](../plans/file-consistency-2026-10-07.md#evidence-and-closeout) or the relevant approved release record.

## Historical provenance

Existing v5 metadata records `engineCommit: "unknown"`. Preserve that uncertainty unless trusted generation evidence ties those exact artifact bytes to a source commit. A nearby timestamp, the commit that first added a file, or today's HEAD is not a substitute.

The existing metadata's schema version describes historical generation. Do not change it just because the runtime save version advances. Do not regenerate canonical data merely to repair prose or fill a missing SHA. Correctable documentation, future prevention, and an unresolved historical evidence gap must be reported separately.

## Review and verification

Check that report values and metadata agree, generated artifacts are limited to the approved scenarios, and source/provenance requirements were met. A source change that only tests preflight should stub the expensive generator and writers: invalid provenance must call neither; valid provenance must be captured once and reused. Such a test does not need to run a multi-season simulation or overwrite canonical files.

The CLI implementation is [scripts/shadow-regression.ts](../../scripts/shadow-regression.ts). The related [fast tier](fast-tier.md) covers the configured five-persona ten-season command.
