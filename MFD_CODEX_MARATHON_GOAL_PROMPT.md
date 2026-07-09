# MFD Codex Marathon `/goal` Prompt

Paste everything below into Codex as one `/goal` request.

```txt
/goal
You are Codex acting as a senior TypeScript game-engine architect, save-system engineer, and React product engineer for Mr. Football Dynasty (MFD).

MISSION MODE: MARATHON.
Work continuously through the mission board below. Do not stop after one patch. Do not only plan. Implement, test, fix, update MISSION.md, then continue to the next safe checkpoint until every non-blocked task is complete. If the environment has execution limits, complete as much as possible in dependency order and leave a precise restart point in MISSION.md.

PRIMARY OBJECTIVE:
Evolve MFD from a strong deterministic dynasty engine into a durable “forever dynasty” product with faster time control, surfaced weekly media, safer saves, and stronger narrative memory.

NON-NEGOTIABLES:
1. Read AGENTS.md first. Then read CODEX_GAME_GUIDE.md and any repo-specific implementation guidance they reference.
2. This is the MFD pnpm workspace, not the old game.js monolith. Do not use or preserve stale game.js / CDN / three-file delivery assumptions in active docs or prompts.
3. Save compatibility is sacred. Old saves must migrate forward. Do not change SaveState schema shapes unless a task explicitly says to and tests prove migration safety.
4. Migrations are immutable once used by real saves. If SAVE_VERSION is still 36 and no 36→37 migration has shipped, implement the v37 wave as described. If SAVE_VERSION is already above 36 or a 36→37 migration already exists, do not rewrite it; create the next migration version and update fixture policy accordingly.
5. Determinism is sacred. No Math.random() in engine sim paths. No Date.now() in engine sim paths. Do not change RNG consumption order unless a task explicitly requires it and tests prove compatibility.
6. Do not compact dynastyTimeline in this mission. It is the emotional memory layer. Create an ADR/spec for a future v38+ memory archive if useful, but do not ship timeline compaction without a separate design.
7. Do not blindly trim eventLog with slice(-200). eventLog is a mixed stream: disposable sim noise plus important dynasty receipts.
8. Do not call eventLog retention from web commitGame(). Retention must run only in engine-safe end-of-advance paths and migrations.
9. Do not create duplicate UI routes when an existing route can be enhanced. MFSN Weekly Show belongs in the existing /newsroom surface unless repo inspection proves otherwise.
10. Do not weaken, delete, or skip tests to pass. Fix code or write honest blockers.
11. Prefer small safe checkpoints, but keep going. After each checkpoint: run focused tests, fix failures, update MISSION.md, then proceed.
12. Use the repo’s required final response shape: Understanding / Plan / Patch / Verification / Risks-Rollback.

FIRST ACTIONS:
1. Inspect repo root.
2. Read AGENTS.md.
3. Read CODEX_GAME_GUIDE.md.
4. Inspect package scripts, SAVE_VERSION, save migrations, fixtures, and architecture-boundary tests.
5. Create or update MISSION.md at repo root with:
   - mission title
   - current SAVE_VERSION and fixture policy observed
   - dependency-ordered task checklist
   - checkpoint log
   - test log
   - blockers/restart point
6. From here forward, update MISSION.md after every checkpoint.

MISSION.md MUST INCLUDE THIS MISSION BOARD:

MISSION BOARD

Wave 0 — Preflight, architecture truth, repo hygiene
[ ] Confirm current workspace architecture and active docs.
[ ] Remove/repair active stale monolith/three-file/CDN/Babel prompt language.
[ ] Add a short “Current Architecture Truth” section to active handoff docs if missing.
[ ] Inspect repo bloat from generated artifacts. Update .gitignore and remove clearly generated tracked artifacts only if safe. Do not delete user data or unclear historical docs.
[ ] Add/keep a warning for Kevin: manually export longest dynasty before testing any forward save migration.

Wave 1A — Save Diet media caps
[ ] Cap mediaCycle.weeklyDigests to 34.
[ ] Cap mediaCycle.powerRankingHistory to 34.
[ ] Add migration for current save version bump.
[ ] Follow fixture drift policy exactly. If SAVE_VERSION 36 → 37, likely add v35.json and update checkedInFixtureVersions, not v37.json.
[ ] Do not touch dynastyTimeline.

Wave 1B — eventLog year repair and retention
[ ] Add event-log-retention helper module.
[ ] Implement readGameEventYear(event, currentYear) with data.year → known ID pattern → clamped timestamp fallback.
[ ] Implement inferEventYearFromKnownIdPattern safely.
[ ] Implement withEventDate(data, year, week).
[ ] Stamp data.year/data.week on new eventLog events.
[ ] Fix deadlineResolvedEvent Date.now timestamp to logical game-time timestamp.
[ ] Update history.ts and coaching-legacy.ts to prefer readGameEventYear.
[ ] Implement trimEventLogForRetention(game) with full taxonomy below.
[ ] Apply retention only in migration and safe end-of-advance engine paths.
[ ] Add full tests below.

Wave 1C — Loaded-save reference rehydration
[ ] Add public engine helper rehydrateGameStateReferences(game) or normalizeRuntimeGameReferences(game).
[ ] Internally call syncPlayers(game).
[ ] Export from @mfd/engine barrel.
[ ] Call from web persistence after successful schema parse and agent initialization.
[ ] Add reference-identity tests.

Wave 1D — Cartridge size guard and optional v2 cartridge dedupe
[ ] First add cartridge size/regression tests or diagnostic guard.
[ ] Then, only if safe and fully tested, implement CARTRIDGE_VERSION 2 dedupe:
     export rostered players in players map as { $roster: teamId } stubs;
     in parseCartridge, rehydrate v2 players map from team rosters before SaveStateSchema validation;
     v1 cartridges still parse unchanged;
     persisted SaveState stays unchanged.
[ ] If v2 is not provably safe in this run, ship the guard and write docs/spec with exact blocker. Continue mission.

Wave 2 — Web Worker sim boundary
[ ] Add apps/web/src/app/store/sim.worker.ts.
[ ] Implement request-ID protocol for advanceWeek and previewHalftimeDecision.
[ ] Rewrite sim.ts wrapper to use singleton Worker with fallback.
[ ] Update architecture-boundaries.test.ts allowlist for sim.worker.ts.
[ ] No callbacks through postMessage.
[ ] No new dependency unless repo already has an approved pattern requiring it.

Wave 2.5 — Extract post-advance finalizer
[ ] Extract shared finalization/routing logic from advanceWeek and resolveHalftimeDecision in game-store.ts.
[ ] Keep helper local to store unless repo architecture strongly suggests otherwise.
[ ] Preserve behavior exactly.
[ ] Do not add Sim Ahead until this is done and tested.

Wave 3 — Sim Ahead
[ ] Add engine simulateWeeks in packages/engine/src/systems/sim-ahead.ts.
[ ] Add target types and stop reasons below.
[ ] Add Worker protocol support with serializable progress frames.
[ ] Add runSimAhead in sim.ts.
[ ] Add game-store action simAhead(target), committing/autosaving once at final frame.
[ ] Add WeekAdvance UI controls and progress ticker.
[ ] Use two-class product model: “My Next Game” stops before user game; true fast-forward targets may sim through user games but must stop on interrupts/major user injury.

Wave 4 — MFSN Weekly Show in /newsroom
[ ] Add selectors for weeklyDigests/latest digest/user-team digest segment.
[ ] Enhance existing NewsroomDigest, not a duplicate route.
[ ] Surface latest weekly digest, headlines, hot takes, power rankings, user-team segment, storyline board, CTAs.
[ ] Do not generate media during render; read saved engine output only.

Wave 5 — Matchup Radar upgrade
[ ] Enhance existing WeekAdvance matchup panel/card.
[ ] Add rivalry/revenge/weather/primetime/opponent power rank/user injury context/why-this-game-matters.
[ ] Use existing engine data where possible; avoid save schema changes.

Wave 6 — Chip cross-season memory callbacks
[ ] Add read-only Chip callbacks from dynastyTimeline/storylineThreads/rivalry/coaching/team history.
[ ] Add content that makes Chip a dynasty witness, not just a tutorial.
[ ] No save schema change unless clearly necessary and migrated.

Wave 7 — Save Health Meter
[ ] Add save/version/size/integrity/slot-age/autosave/manual-export trust UI.
[ ] Surface in Settings or save/load area.
[ ] Pair with cartridge sizeBytes if available.

Wave 8 — Community/share loops
[ ] Shareable Season Recap card PNG/export if existing SeasonRecapCard or browser APIs make it safe.
[ ] Dynasty Cartridge challenge seeds using buildCartridge/parseCartridge and v2 if implemented.
[ ] No heavy new dependency unless justified.

Wave 9 — Transparency and performance polish
[ ] Adaptive difficulty transparency panel reading existing adaptive-difficulty state; do not change balance logic.
[ ] Selector/rerender optimization pass for hot whole-state.game subscribers.
[ ] Add or preserve tests.

Wave 10 — Future memory archive ADR only
[ ] Create docs/adr or docs/design note for future dynastyTimeline compaction.
[ ] Preserve landmark and major memory. Do not implement timeline compaction in this mission unless explicitly safe, isolated, and versioned separately.

EXECUTION LOOP:
For each checkpoint:
1. Inspect relevant files and tests.
2. Make the smallest coherent patch for the next dependency.
3. Add/adjust tests first or alongside patch.
4. Run focused tests.
5. Fix failures.
6. Run broader tests when a wave completes.
7. Update MISSION.md with status, commands run, results, and next checkpoint.
8. Commit if git is available and repo policy allows; otherwise leave a clean diff and detailed mission log.
9. Continue automatically to the next checkpoint.

WAVE 0 DETAILS — ARCHITECTURE TRUTH AND HYGIENE
Search active docs/prompts for stale terms:
- game.js monolith
- single-file browser sim
- three-file delivery
- legacy copy
- sync check
- CDN/Babel
Do not rewrite historical records unnecessarily. Fix active handoff docs, prompt templates, skills, or guides that would mislead Codex/Claude. Add wording:
- MFD is a pnpm workspace.
- Engine is packages/engine.
- Web is apps/web.
- Design system is packages/design-system.
- AGENTS.md is source of truth.
- Save migrations/golden fixtures and deterministic tests govern changes.

Repo hygiene:
- Inspect generated artifacts and .gitignore.
- If apps/web/dist, .logs/screenshots, output, coverage, screenshots, or local logs are tracked and clearly generated, remove from tracking and ignore.
- If large docs such as STATUS.md are active and too large, create a short index/summary doc and mark the large file as historical only if safe. Do not destroy useful status history.

WAVE 1A DETAILS — MEDIA SAVE DIET
If current SAVE_VERSION is 36 and 36→37 does not exist:
- bump SAVE_VERSION to 37.
- add migration 36→37.
- follow fixture policy. The known policy from prior review: save-version-drift.test expects max fixture version = SAVE_VERSION - 2 and an explicit checkedInFixtureVersions list. Verify in repo before editing. For 36→37 this likely means add v35.json and update checkedInFixtureVersions, not v37.json.
If current version differs, adapt using the same policy and do not rewrite already-used migrations.

Implement helpers:
- trimMediaCycle(game): weeklyDigests.slice(-34), powerRankingHistory.slice(-34).
- trimLongRunningSaveCollections(game): calls trimMediaCycle and later eventLog retention once Wave 1B exists.

Apply media trim after weekly digest/powerRankingHistory append and inside migration.

Tests:
- Migration trims oversized weeklyDigests to 34.
- Migration trims oversized powerRankingHistory to 34.
- week/year/phase unchanged.
- Multi-season or focused integration keeps arrays <= 34.
- golden-save/save-round-trip/save-version-drift pass.

WAVE 1B DETAILS — EVENTLOG RETENTION AND YEAR REPAIR
Create one helper file, likely packages/engine/src/systems/event-log-retention.ts, exporting year helpers and retention.

Known eventLog consumers that retention must not break:
- league-news.ts recent tail.
- history.ts current-year team events for season archive.
- coaching-legacy.ts coach_retirement with 20-year lookback.
- CoachingTree.tsx coach_retirement labels across all history.
- TeamNeeds.tsx gm_strategy_shift.
- franchise-week.ts deadlineAlreadyResolved current year/week.
- selectors.ts selectCoachingCarouselNews recent coach moves.

Timestamp overflow problem:
Existing timestamps often use year * 1000 + week * 10 + eventLog.length. Once eventLog.length is high, Math.floor(timestamp / 1000) can classify an event as a future year. Fix by stamping data.year/data.week and by reading event year safely.

Implement:
readGameEventYear(event, currentYear):
1. If event.data.year is a finite number, return Math.trunc(data.year).
2. Else infer from known ID patterns.
3. Else return Math.min(Math.floor(event.timestamp / 1000), currentYear).

inferEventYearFromKnownIdPattern(event):
Cover known patterns only:
- weekly_result-{year}-{week}-{index}
- playoff_result-{year}-{week}-{index}
- coach_retirement-{year}-{week}-{index}
- coach_hired-{year}-{week}-{index}
- coach_fired-{year}-{week}-{index}
- coach_departed-{year}-{week}-{index}
- coach_promoted-{year}-{week}-{index}
- off_field_event-{year}-{week}-{index}
- gm-strategy-{teamId}-{year}-{index}
- player-retired-{playerId}-{year}; parse year from the END because player IDs contain hyphens.
- trade-deadline-resolved-{year}-{week}
Do not pattern-guess unknown 4-digit numbers.
press_conference events have IDs like {conference.type}-{conference.id}; no year in ID. They must fall through to clamped timestamp fallback.

withEventDate(data, year, week):
- returns object with existing data plus year and week when known.
- does not overwrite meaningful domain fields except year/week metadata.

Stamp new events with data.year and data.week where known. Inspect and update at least:
- franchise-week-helpers.ts makeEvent
- off-field-events.ts pushLivingWorldEvent
- press-conference.ts record/creation path
- gm-strategies.ts event creation
- progression.ts makeRetirementEvent and milestone event paths
- coach-retirement.ts event builder
- coach-retention.ts event builder
- coaching-carousel.ts event builder
- coaching-market.ts event builder, including coach_promoted
- apps/web/src/app/store/game-store.ts deadlineResolvedEvent

Fix deadlineResolvedEvent:
- Replace Date.now() timestamp with logical game-time timestamp based on game.year, game.week, and current eventLog length.
- Ensure data.year and data.week exist.

Update consumers:
- history.ts eventYear/getTeamMajorEvents path should use readGameEventYear.
- coaching-legacy.ts getEventYear should use readGameEventYear.

Retention taxonomy:
Always keep:
- all events where readGameEventYear(event, game.year) === game.year
- all coach_retirement events forever
- all trade_deadline_resolved events forever

Keep latest 500 prior-year semantic events:
- gm_strategy_shift
- coach_hired
- coach_fired
- coach_departed
- coach_promoted
- player_retired
- milestone
- off_field_event

Keep latest 100 prior-year disposable events:
- weekly_result
- playoff_result
- press_conference

Unknown prior-year event types:
- Preserve in disposable tail unless inspection proves they are semantic. Do not delete unknowns aggressively.

Retention must preserve original ordering.
Retention runs only:
- migration
- safe end-of-advance engine paths after event generation
Retention must not run:
- web commitGame
- selectors
- render paths
- mid-advance before event creation finishes

Migration:
For existing eventLog entries:
- keep existing data.year if valid
- otherwise backfill data.year from ID pattern first, then clamped timestamp fallback
- backfill data.week when inferable from data or ID pattern
- then apply retention

Tests:
- Migration: oversized eventLog backfills data.year.
- Migration: ID-derived year beats overflowing timestamp.
- Migration: existing valid event.data.year is not overwritten.
- Retention: all current-year events survive even if >200 exist.
- Retention: old weekly_result/playoff_result/press_conference bulk is trimmed to disposable tail.
- Retention: coach_retirement survives forever, including older than 20 years.
- Retention: trade_deadline_resolved survives.
- Retention: gm_strategy_shift survives through semantic retention.
- Retention: coach_promoted is semantic.
- Retention: milestone is semantic.
- Retention: player_retired is semantic but not forever.
- deadlineAlreadyResolved still returns true after retention in same deadline year/week.
- selectCoachingCarouselNews still returns recent coach moves after retention.
- Overflow safety: with eventLog.length = 900, create/stamp new event and readGameEventYear returns game.year.
- Stamping: makeEvent, pushLivingWorldEvent, deadlineResolvedEvent, and at least one coaching event produce data.year === game.year.
- Existing golden-save and save-round-trip tests pass.

WAVE 1C DETAILS — REHYDRATE LOADED REFERENCES
Do not import private engine internals in web.
Add exported engine helper:
- rehydrateGameStateReferences(game: GameState): GameState
or
- normalizeRuntimeGameReferences(game: GameState): GameState
It should internally call syncPlayers(game) and return game.
Export through packages/engine/src/index.ts.
Call from apps/web persistence/import path after successful SaveStateSchema parse and ensureAgentsInitialized.
No SAVE_VERSION bump.

Tests:
- Import/load cartridge through real persistence path.
- Pick rostered player.
- Assert loaded.teams[teamId].roster[index] === loaded.players[playerId].
- Mutating through either path is visible through the other.

WAVE 1D DETAILS — CARTRIDGE SIZE GUARD AND V2
First add size guard:
- Test or utility proving cartridge size for a generated multi-season save stays within a reasonable regression threshold.
- Record sizeBytes where cartridge export already supports it or add non-invasive metadata.

Then inspect buildCartridge/parseCartridge. If safe, implement CARTRIDGE_VERSION 2:
- v1 cartridges still parse unchanged.
- v2 export replaces rostered entries in players map with stubs like { $roster: teamId }.
- v2 parse restores players map from team.roster before SaveStateSchema validation.
- Persisted SaveState and IndexedDB shape stay unchanged.
- Add tests: v1 import, v2 export/import, roster/player reference identity after import, size reduction on typical save.
If not safe, do not force it. Ship guard and write docs/spec with exact blocker and continue.

WAVE 2 DETAILS — WEB WORKER SIM BOUNDARY
Files likely:
- apps/web/src/app/store/sim.ts
- apps/web/src/app/store/sim.worker.ts
- apps/web/src/app/store/sim.test.ts
- apps/web/src/app/architecture-boundaries.test.ts

Protocol:
Request:
- { id, kind: 'advanceWeek', game, options }
- { id, kind: 'previewHalftimeDecision', game }
Response:
- { id, kind: 'done', result }
- { id, kind: 'error', message, stack }

Implement singleton Worker:
new Worker(new URL('./sim.worker.ts', import.meta.url), { type: 'module' })
Fallback:
- if typeof Worker === 'undefined'
- if Worker construction throws
- if tests run in Vitest environment without Worker
Keep runAdvanceWeek and runPreviewHalftimeDecision signatures unchanged.
Update architecture boundary allowlist so direct engine sim imports are only allowed in sim.ts and sim.worker.ts.
No callbacks through postMessage.
No new deps.

Tests:
- fallback calls engine functions
- Worker construction failure falls back
- architecture-boundary test passes
- optional determinism compare if test environment can instantiate Worker; otherwise document why fallback-only is covered

WAVE 2.5 DETAILS — SHARED FINALIZER
Before Sim Ahead, extract duplicate store finalization from advanceWeek and resolveHalftimeDecision.
Keep helper local to game-store.ts first.
Name example:
- finalizeAdvancedGame(previousGame, nextGame, options)
It should cover existing duplicated behavior:
- governance ensure
- trade deadline routing
- expansion draft routing
- CBA routing
- user team system fit update
- postGameUi initialization
- press conference queue
- post-advance audio queue
- breakingNewsQueue
- playoff lore staging
- recap prompt reset
- syncCareerMeta
- pendingPlayoffLoreReveal
- tutorial completion
- commit/autosave behavior
Preserve behavior exactly.
Do not add Sim Ahead in this patch.

Tests:
- existing advanceWeek tests pass
- existing halftime tests pass
- add coverage for deadline/expansion/CBA routing if missing

WAVE 3 DETAILS — SIM AHEAD
Engine:
Add packages/engine/src/systems/sim-ahead.ts and export from @mfd/engine.

Types:
SimAheadTarget:
- 'next_user_game'
- 'trade_deadline'
- 'end_regular_season'
- 'playoffs'
- { weeks: number }

SimAheadStopReason:
- 'target_reached'
- 'user_game'
- 'trade_deadline'
- 'expansion_draft'
- 'cba_interrupt'
- 'phase_changed'
- 'user_injury'
- 'safety_guard'

SimAheadFrame:
- year
- week
- phase
- weeksSimmed
- record/summary fields if cheap and serializable

Product rule:
- next_user_game stops before the next user-team game.
- trade_deadline/end_regular_season/playoffs/{weeks:N} may sim through user games.
- true fast-forward targets stop on trade deadline, expansion draft, CBA interrupt, relevant phase boundary, severe or season_ending user-team injury, or safety guard.
- Use actual injury tiers: severe | season_ending. Do not use major.
- Disable halftime pauses for batch fast-forward. For next_user_game, stop before game so normal Advance Week handles halftime.

Worker:
Add request:
- { id, kind: 'simulateWeeks', game, target }
Progress:
- { id, kind: 'progress', frame }
Done:
- { id, kind: 'done', result }
Do not send callbacks through postMessage.

Store:
Add simAhead(target) action.
Commit once at final frame.
Autosave once at final frame.
If tab closes mid-sim, latest autosave should remain pre-sim; do not persist partial frames.
Reuse finalizer from Wave 2.5.

UI:
Enhance apps/web/src/features/week-advance/WeekAdvance.tsx.
Add controls:
- Advance Week
- Sim Ahead: My Next Game / Trade Deadline / End Regular Season / Playoffs / 4 Weeks
Show progress ticker and final stop reason.
Disable relevant controls while simming.
No emoji in UI. Follow design-system tokens / Bloomberg aesthetic.

Tests:
- simulateWeeks N weeks equals N sequential advanceFranchiseWeek calls when no stop fires.
- trade_deadline stops at deadline with tradeDeadlineState set.
- next_user_game stops before user game.
- severe/season_ending user injury stops.
- safety guard prevents infinite loops.
- store action commits once and autosaves once.
- Worker progress messages update UI/store state.
- WeekAdvance renders controls.

WAVE 4 DETAILS — MFSN WEEKLY SHOW
Use existing /newsroom route and components:
- NewsroomDigest
- PowerRankingsTicker
- StorylineThreadCard
Add selectors in selectors.ts or existing selector module:
- selectWeeklyDigests
- selectLatestWeeklyDigest
- selectLatestDigestPowerRankings
- selectLatestDigestUserTeamSegment

UI sections:
- This Week on MFSN
- Opening Headlines
- Analyst Desk / Hot Takes
- Power Ranking Movement
- Your Team Segment
- Storyline Board
- CTAs to Advance Week / Game Plan / Power Rankings
Read game.mediaCycle.weeklyDigests only. Do not generate during render.
Empty state before first digest.
Tests for empty state, latest digest, hot takes, user team segment, no render-side generation.

WAVE 5 DETAILS — MATCHUP RADAR
Enhance existing WeekAdvance matchup/radar surface.
Add as much as existing data safely supports:
- rivalry heat
- revenge game hooks
- weather/stadium context
- primetime/MFN tag if available
- opponent power rank
- major user injuries
- one sentence “why this game matters”
No save schema change unless necessary.
Tests/render snapshots as repo prefers.

WAVE 6 DETAILS — CHIP MEMORY CALLBACKS
Goal: Chip becomes the dynasty witness.
Add read-only callback triggers from:
- dynastyTimeline
- storylineThreads
- rivalries/revenge games
- coach history
- prior playoff losses/wins if accessible
Examples of content style:
- remembers prior collapse
- calls out draft pick receipts
- notes anniversary/revenge game
- “told you so” after a previous warning pays off
No shame, no sarcasm that attacks player competence. Keep it warm, witty, and dynasty-aware.
Tests: callback selector/trigger returns deterministic dialogue for crafted state.

WAVE 7 DETAILS — SAVE HEALTH METER
Add trust UI in Settings or Save/Load:
- save version
- cartridge sizeBytes/export size if available
- autosave/manual save slot ages
- integrity/validation status
- “manual backup recommended before migration” note if helpful
No save schema change unless existing metadata supports it.
Tests for render and formatting.

WAVE 8 DETAILS — SHARE/COMMUNITY
Shareable Season Recap:
- Inspect existing SeasonRecapCard.
- Add PNG/export/share if feasible using existing dependencies or safe browser APIs.
- Avoid heavy new dependency unless justified.

Dynasty Cartridge Challenge Seeds:
- Use buildCartridge/parseCartridge.
- Add UI or copy/export flow for “play my save from this moment.”
- Work with v1/v2 cartridge compatibility.
Tests for export/import compatibility.

WAVE 9 DETAILS — TRANSPARENCY AND PERFORMANCE
Adaptive difficulty transparency:
- Surface existing adaptive difficulty state/calculations.
- Make rubber-banding understandable and player-trust-building.
- Do not change balance logic unless tests are updated and scope is explicit.

Selector/rerender pass:
- Identify hot components subscribing to whole state.game.
- Move hot paths to selectors.
- Preserve behavior.
- Use tests and build to catch mistakes.

WAVE 10 DETAILS — DYNASTY TIMELINE ADR
Create a future-facing design note only:
- Problem: dynastyTimeline grows forever.
- Constraint: landmarks and majors are sacred.
- Proposal options for v38+ archive/compaction.
- Migration and UI implications.
Do not implement in this marathon unless everything else is done and a fully safe migration is obvious. Default: ADR only.

TEST COMMANDS
Discover actual package scripts first. Preferred broad commands:
- pnpm --filter @mfd/engine test
- pnpm --filter @mfd/web test
- pnpm --filter @mfd/web build
- pnpm test:perft
- pnpm lint or equivalent if available
Run focused tests during patches, broad tests after waves.
If a command is unavailable or too slow/time-limited, document exact reason in MISSION.md and final response.

MANUAL QA DOC
Create or update docs/qa/MFD_EVOLUTION_MANUAL_QA.md with browser tests Kevin should run:
1. Export longest dynasty before migration.
2. Load longest dynasty after v37/vNext migration.
3. Advance 3 weeks; export cartridge; note size.
4. Advance 10 more weeks; export; size growth should flatten.
5. Reload latest autosave; verify roster/standings/timeline/newsroom.
6. Test trade deadline path after Worker and Sim Ahead.
7. Test halftime decision after Worker.
8. Test Sim to Trade Deadline, Sim to Playoffs, Sim 4 Weeks, My Next Game.
9. Verify MFSN Weekly Show updates after weekly advance.
10. Verify no torn autosave if closing during Sim Ahead.

FINAL RESPONSE REQUIREMENTS
When finished or blocked by environment limits, respond with:
Understanding:
- one paragraph of what changed and why.
Plan:
- completed waves and skipped/blocked waves.
Patch:
- file groups changed by wave.
Verification:
- every command run and result.
- any manual QA docs created.
Risks-Rollback:
- save migration risk and rollback note.
- any tasks intentionally deferred.
- exact restart point from MISSION.md if not complete.

START NOW.
Do not ask for confirmation. Do not stop at planning. Create/update MISSION.md and begin Wave 0, then continue through the mission board in dependency order.
```
