# Changelog

## v1.0.0 - 2026-04-28

Launch build for the TypeScript rebuild.

### Highlights

- Rebuild Phases 0-4 established the monorepo, pure engine, React shell, live game state, season loop, offseason spine, and postgame cinema.
- Sprints 5-24 turned the loop into a playable franchise game: progression, trades, GM AI, awards, Hall of Fame, records, scouting, draft rooms, game day, media, injuries, facilities, analytics, commissioner systems, and broadcast presentation.
- Sprints 37-38 added the final feel layer: Call Your Shot, Contingency Gambit, Named Games, Halftime Hell, Win Probability EKG, Apology Tour, and Bloodlines continuity.
- Sprints 67-69 added the launch media cycle, storyline threads, and autonomous playtest harness.
- Sprints 70-72 closed launch polish: save-safe launch gates, mascot helmet logos for all 32 franchises, deterministic playtest anomaly counts, release screenshots, README refresh, and v1.0.0 metadata.

### Launch Gates

- `pnpm --filter @mfd/engine test`
- `pnpm --filter @mfd/web test`
- `pnpm -r typecheck`
- `pnpm --filter @mfd/web build`
- `bash scripts/check-math-random.sh`
- `bash scripts/check-bundle-size.sh`
- `bash scripts/smoke-full-season.sh`
- `pnpm playtest:all`
- `pnpm grade-season` / `pnpm grade-season-baseline` for release rubric runs

### Determinism

- Seeded sim RNG remains the only simulation randomness path.
- Sprint 72 makes playtest report anomaly counts byte-identical across repeated seed-42 `playtest:all` runs by excluding wall-clock `perf-budget` host-noise anomalies from canonical report totals.
- High-severity playtest anomaly count remains `0` across launch runs.

### Save Compatibility

- Save schema remains v35.
- No Sprint 72 schema bump.
- Existing v1 -> v35 migration chain remains the public compatibility contract.

### Test Count

- Launch floor after Sprint 72: 1,838 engine tests and 812 web tests, plus 6 grading harness Node tests.

## v1.0.0-rc2 - 2026-04-25

- Sprint 70.1 fixed non-mutating roster sorts in blueprint and season-report paths.
- Save schema remained v35.
- Full launch gate passed with `pnpm playtest:all` high severity at `0`.

## v1.0.0-rc1 - 2026-04-24

- Sprint 70 launch fix-up removed dead CPU-game skip copy and raised engine coverage to the launch floor.
- Save schema remained v35.
