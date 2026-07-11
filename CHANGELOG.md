# Changelog

## Post-Launch Polish (unversioned, on `main`)

### FA counterfactual receipts - 2026-07-06

- Added a web-only `buildBidCounterfactual` read-model that explains saved free-agent bid losses from persisted bid rows plus winning-team roster, cap, and posture context.
- Free Agency Hub resolved-bid rows now expose an expandable `Why they won` receipt, and FA Target Board rows show a compact saved-bid receipt when the user lost that target.
- The patch is read-only presentation: no CPU bidding behavior, market resolution, save schema, sim math, RNG, dependencies, or engine source changed.

### Team window read-model - 2026-07-06

- Added a web-only `computeTeamWindow` read-model that explains CPU clubs as `ALL IN`, `CONTEND`, `RETOOL`, or `REBUILD` from saved roster, cap space, picks, strategy, and results.
- `/team-needs` now shows the selected CPU team's competitive-window badge and receipted drivers beside the existing intent ledger.
- Trade Finder rows now show compact partner window badges with expandable drivers; no CPU behavior, offers, bids, draft logic, save schema, RNG, dependencies, or engine source changed.

### Previously-on session opener - 2026-07-06

- Monday Briefing now opens returning players with a browser-local `Previously on your dynasty` recap when Chip is enabled, with a dismissible Pixel banner fallback when Chip is disabled.
- New `buildSessionRecap` read-model derives deterministic recap beats from saved week summaries, league news, standings context, next opponent, and existing pending-item receipts.
- Last-seen state stays in browser-local convenience storage under `mfd.sessionRecap.lastSeen.v1:<dynastyId>`; no save schema, sim math, RNG, dependencies, or engine source changed.

### Dynasty callbacks read-model - 2026-07-06

- Monday Briefing now shows a read-only `This Week in Dynasty History` panel when saved history can produce callback cards.
- New `buildWeeklyCallbacks` read-model derives deterministic anniversary, draft follow-through, and milestone echo cards from existing saved receipts only.
- Sparse or young saves stay quiet; no save schema, sim math, RNG, dependencies, or engine source changed.

### Backup trust import preview - 2026-07-06

- Combined Backup is now the primary Dynasty Cartridge export/import path.
- Classic `.mfd` actions are labeled as advanced current-save-only recovery.
- Combined and sidecar imports now show a summary preview with dynasty coverage and missing-store warnings before any autosave, active-game load, or sidecar replacement.
- Older sidecar archives that do not carry rivalry heat no longer wipe existing local rivalry history.

### Publication integrity release gate - 2026-07-05

- 36-step `pnpm release:gate` is the public release contract and CI `release-gate` job.
- One-Click Combined Backup exists for the normal `.mfd` cartridge plus dynasty sidecar archive export/import.
- GitHub Pages deploy workflow now triggers only from `main` or manual dispatch, pins pnpm 9.15.9, and runs bundle-size plus built-page smoke checks after the web build.
- Release docs updated to match current release-gate, Combined Backup, and deploy-hardening truth.

### Chip companion rebuild - 2026-05-07 (PR #62)

- Chip's portrait set rebuilt on a unified procedural retro-broadcast cartoon rig in `scripts/generate-chip-v3-art.cjs`. Single source-of-truth, consistent character across every pose.
- Pose atlas expanded 17 → 36. New poses: rallying, calling-play, on-phone, head-in-hands, reviewing-tablet, pointing-at-tape, time-out, whistle-blow, coaching-crouch, coffee-sip, fist-bump, note-taking, laughing, skeptical, proud, facepalm, frustrated, tired, football-in-hand.
- 11 previously-generic surfaces wired to specific semantic poses: high-stakes events (TD/cap/trade-rumor/HOF-retirement/decision-lock), `/training-camp`, `/trade-deadline`, `/expansion-draft` route beats, halftime, recap, press, weekly dialogue, and a brand-new Chip cameo on the achievement-unlock toast.
- Cold-open CONTINUE BRIEFING button moved into Chip's column for a tighter host-and-action layout.
- Save schema, `SAVE_VERSION`, deterministic engine behavior, RNG, and deploy surfaces unchanged.

### Sprint 46 series - 2026-04-30

- Weather forecast hub (PR #52).
- Coaching tree visual polish (PR #53).
- Standings signal polish (PR #54).
- App-test conflict marker fix (PR #61).

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

- Save schema is v36 in the current working copy.
- Sprint 72 itself did not require a schema bump.
- Existing v1 -> v36 migration chain remains the public compatibility contract.

### Test Count

- Launch floor after Sprint 72: 1,838 engine tests and 812 web tests, plus 6 grading harness Node tests.

## v1.0.0-rc2 - 2026-04-25

- Sprint 70.1 fixed non-mutating roster sorts in blueprint and season-report paths.
- Save schema remained v35.
- Full launch gate passed with `pnpm playtest:all` high severity at `0`.

## v1.0.0-rc1 - 2026-04-24

- Sprint 70 launch fix-up removed dead CPU-game skip copy and raised engine coverage to the launch floor.
- Save schema remained v35.
