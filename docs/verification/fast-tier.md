# Verification — Fast Tier (`test:perft`)

The fast tier is the deterministic regression suite that runs on every Stop hook and is the gate for accepting any sim-touching change.

## Run it

```
pnpm test:perft       # alias for pnpm playtest:all
```

Equivalent to: `pnpm --filter @mfd/engine playtest:all`, which invokes `mfd/scripts/playtest-report.sh --all --seed 42 --seasons 10`.

## Contract

Five personas each advance 10 seasons at seed `42`. The serialized `PlaytestReport` is already canonical, with host-noise detectors stripped, and must be byte-identical run-to-run on identical engine code:

| Persona        | Anomalies | High severity |
|----------------|-----------|---------------|
| CHEAPSKATE     | 239       | 0             |
| CHURN_ARTIST   | 239       | 0             |
| GLUTTON        | 239       | 0             |
| INJURY_MAGNET  | 239       | 0             |
| SPEEDRUNNER    | 237       | 0             |

All anomalies at the v1.0.0 baseline are `roster-minimums` (medium severity). Any high-severity anomaly fails the run (`process.exitCode = 1` in `scripts/playtest-report.ts`).

## Architecture

- **Harness** — `mfd/packages/engine/src/playtesting/harness.ts`. `runPlaytest(persona, seed, seasons)` wraps `advanceFranchiseWeek` in a deterministic loop, captures per-step frames, runs every detector, and returns a `PlaytestReport`.
- **Personas** — `mfd/packages/engine/src/playtesting/personas.ts`. Each is a frozen `AIBiasConfig`. Add via `createPersona(...)` in `PLAYTEST_PERSONAS`.
- **Detectors** — `mfd/packages/engine/src/playtesting/anomaly-detectors.ts`. Each detector is a pure function `PlaytestDetectorContext -> PlaytestDetectorVerdict`. Registered in `PLAYTEST_DETECTORS`.
- **Host-noise** — exported `HOST_NOISE_DETECTOR_IDS` in `harness.ts` and the playtesting/root engine barrels. Detector ids in this set are excluded from canonical counts. Currently: `['perf-budget']` (wall-clock p99). Add new timing- or host-dependent detectors to this set so they don't gate the perft signature.
- **Reporter** — `mfd/scripts/playtest-report.ts` runs each persona and writes `mfd/tmp/playtest-report-<persona>-<seed>.json`.

## Adding a new persona scenario

1. Append a `createPersona(...)` call in `PLAYTEST_PERSONAS` (`personas.ts`). The bias config must be deterministic — no Math.random, no Date.now, no host clock reads.
2. Run `pnpm test:perft`. The new persona shows up in the table; capture its anomaly count + high-severity count for the new baseline row.
3. Update the table in this doc and in `.codex/MFD/status.md`.
4. Bake the new counts into the next sprint's expected output. **Never auto-update the existing five personas' counts** — that's a regression masquerading as a baseline refresh. See `READ_BEFORE_CODEX_JSON.md` §5.5.

## Adding a new detector

1. Implement in `anomaly-detectors.ts` as a pure `PlaytestDetector`.
2. Register in `PLAYTEST_DETECTORS`.
3. If the detector is wall-clock or host-dependent, add its id to `HOST_NOISE_DETECTOR_IDS` in `harness.ts` so it stays diagnostic, not signature-gating. Keep diagnostic timing fields out of serialized `PlaytestReport` JSON.
4. Add co-located tests in `anomaly-detectors.test.ts` (5 minimum per CLAUDE.md).
5. Run `pnpm test:perft`. The new detector may shift the canonical anomaly counts for some personas — if so, classify per §5.5 baseline_update_protocol before rebaselining.

## Why this exists

Determinism is a public contract in MFD: `same seed + same inputs -> identical output`. The fast tier is the proof. v1.0.0 (Sprint 72) ratified the canonical signature; every subsequent sprint inherits it.

The slow tier (`test:shadow`) runs the same engine over multi-decade horizons (5 / 10 / 20 years) to catch drift the 10-season run misses. Downstream determinism tests should compare canonical `PlaytestReport` JSON directly rather than re-filtering it. See `shadow-tier.md`.

## Stop-hook integration

`mfd/.claude/hooks/shadow-corpus-check.sh` runs `test:perft` on every Claude Code session close. On failure, the hook prints the exact reproduction command and blocks the session. Bypass with `CLAUDE_SKIP_HOOKS=1` if you must (and you shouldn't).
