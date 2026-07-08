# Mr. Football Dynasty - Codex Game Guide

This guide is for future Codex sessions working on Mr. Football Dynasty (MFD). It captures the repo shape, runtime wiring, deterministic simulation contract, save discipline, testing strategy, and known caution zones.

## First Facts

- Actual game repo inspected: `/Users/tkevinbigham/Documents/GitHub/MFD`.
- The originally provided workspace `/Users/tkevinbigham/Documents/New project` is currently an empty Git repo with no game files.
- Current product: browser-only single-player football franchise dynasty sim.
- Stack: TypeScript monorepo, pure engine package, React 19 web app, Zustand store, Dexie/IndexedDB saves, Vite, Vitest, GitHub Pages.
- Current save version: `SAVE_VERSION = 37` in `packages/engine/src/config/difficulty.ts`.
- Local environment observed on 2026-06-10: Node `v24.14.1`; global `pnpm` was not installed. Use `npx --yes pnpm@9.15.9 ...` if needed.
- Git status/log commands may be slow in this checkout because dependency/build folders exist locally. Prefer targeted file commands and avoid relying on full `git status` for quick checks.

## Repo Topology

- `apps/web`: React/Vite browser app.
- `apps/web/src/app`: app shell, router, stores, seed factory, boot/new game screens.
- `apps/web/src/features`: screen-level UI features.
- `apps/web/src/lib`: browser/local persistence helpers and presenters outside the main store.
- `packages/engine`: pure TypeScript simulation engine. No React, DOM, browser storage, or UI assumptions.
- `packages/engine/src/systems`: game systems. Most gameplay logic lives here.
- `packages/engine/src/types`: domain types and `GameState`.
- `packages/engine/src/save`: Zod save schema, migrations, golden save fixtures/tests.
- `packages/engine/src/rng`: deterministic PRNG and channels.
- `packages/engine/src/playtesting`: deterministic multi-season harness and anomaly detectors.
- `packages/content`: bundled JSON content, validated by engine Zod schemas at import time.
- `packages/design-system`: shared pixel/broadcast UI components and CSS tokens.
- `scripts`: launch gates, playtest reports, smoke tests, grading scripts.
- `_canon/seeds/mfd`: canonical playtest seed outputs.
- `.github/workflows`: CI and deploy.
- `.codex/MFD`: old sprint/checkpoint notes.

## Package Commands

Root `package.json`:

- `pnpm dev`: starts `@mfd/web`.
- `pnpm build`: recursive package build.
- `pnpm test`: recursive tests.
- `pnpm test:engine`: engine tests only.
- `pnpm typecheck`: recursive typecheck.
- `pnpm test:perft`: alias for deterministic playtest-all.
- `pnpm test:shadow`: shadow regression script.
- `pnpm grade-season`: season grading script.

If `pnpm` is missing:

```bash
npx --yes pnpm@9.15.9 --filter @mfd/engine test
```

## Architecture Contract

Preferred layering:

- `packages/engine`: pure sim logic, deterministic, testable in Node.
- `apps/web/src/app/store`: serialization-safe state facade and browser persistence boundary.
- `apps/web/src/features`: components and screen workflows. Keep business logic thin.
- `packages/content`: JSON content/config, loaded through validated schemas.
- `packages/design-system`: reusable UI primitives and tokens.

Do not put browser APIs in `packages/engine`. If a feature needs clipboard, localStorage, IndexedDB, DOM, audio, routing, or downloads, it belongs in `apps/web`.

## Engine Entry Points

Main barrel: `packages/engine/src/index.ts`.

It exports:

- Types from `src/types`.
- RNG helpers from `src/rng`.
- Events from `src/events`.
- Config from `src/config`.
- Save/cartridge APIs.
- Dozens of systems from `src/systems`, media cycle, storyline threads, and content loader.

Use existing exported engine functions from `@mfd/engine` in web code. Avoid reaching into private paths from the app unless the codebase already does so for that system.

## Game State Model

Core aggregate: `packages/engine/src/types/franchise.ts`, `GameState`.

Key top-level fields:

- `version`, `seed`, `year`, `week`, `phase`, `difficulty`, `settings`.
- `players`, `teams`, `owners`.
- `schedule`, `playoffBracket`.
- `draftClass`, `freeAgents`, `offseasonState`, `warRoomState`.
- `records`, `activeRecordChases`, `recentBrokenRecords`, `recentMilestones`.
- `awardsHistory`, `hallOfFame`, `allDecadeTeams`.
- `franchiseHistory`, `playerArchive`, `playerSeasonHistory`.
- `leagueRules`, `cbaState`, `commissionerState`, `laborState`.
- `eventLog`, `narrativeState`, `offFieldEvents`, `recentPressConferences`.
- `gameDayState`, `weekSummaries`.
- `leagueNews`, `socialFeed`, `mediaCycle`, `storylineThreads`, `storyArcs`.
- `waiverWire`, `waiverClaims`, `handshakes`, `agents`.
- `achievements`, `dashboardState`, `postGameUi`, `breakingNewsQueue`.
- `setupState`, `franchiseBlueprint`.

Player shape: `packages/engine/src/types/player.ts`.

- Stable `id`, name fields, `pos`, age, `ovr`, `pot`, ratings, dev trait, personality, traits.
- Contract, team ID, draft metadata, career/season stats.
- Injury, morale, chemistry, system fit, clique/captain-related fields.
- Optional bloodlines and dev snapshots.

Team shape: `packages/engine/src/types/team.ts`.

- Stable `id`, city/name/abbr, conference/division.
- `roster`, cap fields, record/streak, schemes.
- `staff` plus legacy `coachingStaff`, owner state, philosophy/strategy.
- Draft picks, rivalry state, transaction log, season stats.
- training, fatigue, facilities, practice squad, locker room, franchise identity, retired jerseys, special teams.

## Initial Game Creation

Main seed factory: `apps/web/src/app/store/seed.ts`.

`createSeedGameState(seed, userTeamIndex, difficulty)`:

- Calls `setSeed(seed)`.
- Generates 32 fictional franchises from `TEAM_DEFS`.
- Generates rosters from `ROSTER_TEMPLATE`.
- Creates contracts using engine cap tables.
- Initializes owners, staff, facilities, locker rooms, franchise identity, special teams, schedule, tutorial, achievements, governance, CBA, labor, dashboard, scouting, and records.
- Calls `ensureAgentsInitialized` and `syncAllPlayerArchiveEntries`.

Important current constants in seed:

- Base year is `2026`.
- Roster template totals 52 despite comment saying close enough for 53.
- KC gets special elite roster boosts.
- Team IDs and player IDs come from deterministic `uid()` on the RNG UI channel.

## RNG And Determinism

RNG module: `packages/engine/src/rng/index.ts`.

Channels:

- `play`
- `injury`
- `draft`
- `ai`
- `dev`
- `trade`
- `ui`
- `event`

Key functions:

- `setSeed(seed)`: resets all channels.
- `reseedSeason(year)`: reseeds draft channel for season.
- `reseedWeek(year, week)`: reseeds play-time channels for the week.
- `rng`, `rngI`, `rngD`, `rngAI`, `rngT`, `rngDev`, `rngEvent`.
- `pick`, `pickD`, `uid`.

`advanceFranchiseWeek` explicitly calls:

```ts
setSeed(game.seed);
reseedSeason(game.year);
reseedWeek(game.year, game.week);
```

That makes week simulation replayable from seed/year/week/state. Do not add ambient randomness to engine systems.

Known permitted clock/random-ish areas:

- `Date.now()` and `new Date()` exist for UI timestamps, export metadata, local Chip UI state, and playtest performance telemetry.
- `packages/engine/src/playtesting/harness.ts` instruments `Math.random()` to detect calls.
- `scripts/check-math-random.sh` bans unauthorized `Math.random()` in packages/apps.

## Week Advance Spine

Web boundary: `apps/web/src/app/store/sim.ts`.

- `runAdvanceWeek(game, options)` delegates to `advanceFranchiseWeek`.
- Promise-based so a future Worker swap does not change callers.

Engine spine: `packages/engine/src/systems/franchise-week.ts`.

`advanceFranchiseWeek(game, options)`:

- `structuredClone`s input into `nextState`.
- Ensures governance/living-world defaults.
- Reseeds RNG by seed/year/week.
- Handles early-return non-game phases:
  - CBA interruptions.
  - training camp.
  - preseason transition to regular season.
  - expansion draft pause.
  - offseason/free agency/draft/post-draft.
  - trade deadline pause.
- For regular season/playoffs:
  - process holdouts, training, labor, fatigue, injury recovery.
  - auto-assign AI special teams.
  - flex/assign broadcasts and weather.
  - build sim context from effects, weekly prep, locker room, rivalries, atmosphere, game plans, adaptive difficulty.
  - call `simulateGame`.
  - update snap counts, records, milestones, named games, rivalries, owner, event log.
  - build game-day package, press conference, film room report, media cycle, storyline threads, league/social news, achievements.
  - reset game plan and clear current weekly prep.
- Returns `EngineOutput` with `nextState`, events, consequences, and optional milestone/call-your-shot/near-miss/save-reminder fields.

Game sim helpers:

- `packages/engine/src/systems/franchise-week-helpers.ts` wraps `simGame`, applies results/stats/fatigue/injuries, updates owner.
- `packages/engine/src/systems/game-sim.ts` is the drive-by-drive sim: play selection, weather effects, coaching edge, pressure, turnovers, scoring, special teams, matchup events, and player stat lines.

## Web Store And Persistence

Main store: `apps/web/src/app/store/game-store.ts`.

Patterns:

- Zustand + Immer.
- `game: GameState | null`.
- Most actions:
  1. Read `current = get().game`.
  2. `structuredClone(current)`.
  3. Call engine function or deterministic local helper.
  4. `commitGame(nextGame)`.
- `commitGame` sets state and autosaves through `autosaveDynasty` when UI autosave is enabled.
- Undo snapshot exists for selected actions; week advance is intentionally not undoable.
- A few direct `set` actions mutate without autosave (`toggleTradeBlock`, `setStarter`, setup phase moves, `recordPortableExport`, etc.). Check whether persistence is intentional before following those examples.

Browser save layer:

- `apps/web/src/app/store/persistence.ts`: normalizes import, migrations, Zod validation, agent initialization, autosave/manual save APIs.
- `apps/web/src/lib/db.ts`: Dexie database `mfd`, table `saves`.
- Autosaves are trimmed to 3 by default.
- Portable backups use dynasty cartridges.

Cartridge system:

- `packages/engine/src/systems/dynasty-cartridge.ts`.
- `buildCartridge(save, meta)` wraps save in JSON envelope.
- Export strips heavy `broadcast` payloads from historical schedule/playoff results.
- `parseCartridge(text)` accepts current and legacy JSON envelopes.
- UI screen: `apps/web/src/features/dynasty-cartridge/DynastyCartridge.tsx`.

## Save Schema And Migrations

Save schema:

- `packages/engine/src/save/schema.ts`.
- Zod-validated `SaveStateSchema`.

Migration chain:

- `packages/engine/src/save/migrations.ts`.
- `registerMigration(N, fn)` upgrades version N to N+1.
- `migrate(state, SAVE_VERSION)` loops by version key.
- Registered versions cover v1 through v37.
- v30 migration is registered after v34 in file order; this is okay because lookup is by numeric key.

Golden fixtures:

- `packages/engine/src/save/fixtures/v1.json`
- `v10`, `v20`, `v30`, `v31`, `v32`, `v33`, `v34`.

Save tests:

- `packages/engine/src/save/save.test.ts`
- `migrations.test.ts`
- `golden-saves.test.ts`

Persistent field checklist:

- Update TypeScript type.
- Update `SaveStateSchema`.
- Add migration from current `SAVE_VERSION` to `SAVE_VERSION + 1`.
- Increment `SAVE_VERSION`.
- Update seed factory defaults if new games need the field.
- Update import normalization if needed.
- Add or adjust save tests and a load-old-save verification case.

## Routing And Screens

Router lives in `apps/web/src/app/App.tsx`.

Visible nav groups include:

- Core: briefing, advance week, watch list, inbox.
- Team: roster, depth chart, locker room, coaching, handshakes, training camp, mentors.
- Money: contracts, cap lab, front office, endorsements.
- Acquire: trades, trade block, scouting, draft, free agency, FA targets, waivers, practice squad, team needs.
- Gameday: game day, game plan, broadcast, presentation, play-by-play, game flow, film room, schedule, Super Bowl.
- League: standings, power rankings, league pulse, newsroom, news, social, commissioner, analytics, records, stat central.
- Dynasty: franchise, owner, legends, legacy, awards, scenarios.
- System: about, credits, FAQ, save/load, settings.

Additional direct routes not all visible in nav:

- `/player/$playerId`
- `/player/$playerId/timeline`
- `/compare`
- `/rivalries`
- `/coaching/tree`
- `/coaching/relationships`
- `/franchise/book`
- `/trade-deadline`
- `/cba`
- `/league-rules`
- `/relocate`
- `/expansion-draft`
- `/season/recap`
- `/legacy/named-games`
- `/legacy/bloodlines`
- `/franchise/career`
- `/franchise/scrapbook`
- `/franchise/hall`
- `/franchise/trophy-room`
- `/franchise/eras`
- `/franchise/mvps`
- `/franchise/playoff-lore`
- `/franchise/chronicle`
- `/player-development`
- `/franchise/achievements`
- `/league/weather`

Router uses hash history for GitHub Pages.

## Boot And UI Shell

Entry point: `apps/web/src/main.tsx`.

- Mounts `App`.
- Imports design tokens and accessibility CSS.

App shell responsibilities:

- Top nav/mobile bottom nav.
- Command palette and keyboard shortcuts.
- Autosave toast.
- Audio controller/toggle.
- Tutorial overlay.
- Ceremony, achievement, season report, milestone, breaking news, halftime decision, dynasty era, season recap, playoff lore, save reminder modals/prompts.
- Chip companion host/dock.

## Design System

Exports: `packages/design-system/components/index.ts`.

Major component families:

- `Pixel*`: pixel/broadcast UI primitives (`PixelPanel`, `PixelButton`, `PixelTable`, `PixelModal`, etc.).
- `Mfd*`: general UI primitives (`MfdPanel`, `MfdDialog`, `MfdCommandPalette`, etc.).
- `Chip`: assistant character, poses, dialogue bubble, typewriter behavior.
- `Spotlight`: guided UI highlight.

Tokens: `packages/design-system/tokens/index.css`.

Identity:

- Black/dark pixel broadcast surface.
- Gold is signature color.
- Cyan/green/red semantic accents.
- Sharp/pixel borders, minimal radius.
- Responsive mobile nav and card-mode tables through data attributes.

When adding UI:

- Prefer existing `Pixel*`/`Mfd*` components.
- Use tokens instead of one-off colors.
- Keep screen logic in features; move reusable selectors/pure calculations to engine or lib.

## Content System

Content files live under `packages/content`.

Loaded by `packages/engine/src/content-loader.ts` with JSON imports and Zod validation from `packages/engine/src/types/content-schemas.ts`.

Content buckets include:

- Team identity/fan culture/stadium/rivalry/PA overrides for all 32 teams.
- Broadcast templates.
- Press conference templates.
- AGM dialogue/content.
- News/social templates.
- Scouting report templates.
- Halftime performers.
- Award speeches.
- Personality flavor.
- Call Your Shot reactions.
- Contingency callouts.
- Apology tour beats.

Content edit rules:

- Update schemas when content shape changes.
- Add/adjust content schema tests.
- Use deterministic RNG passed into content selectors.
- Do not read JSON ad hoc in feature components.

## Playtesting And Determinism Gates

Fast tier doc: `docs/verification/fast-tier.md`.

`pnpm test:perft` runs five personas for 10 seasons at seed 42:

- CHEAPSKATE
- CHURN_ARTIST
- GLUTTON
- INJURY_MAGNET
- SPEEDRUNNER

Launch baseline high-severity count is `0`.

Playtest architecture:

- Harness: `packages/engine/src/playtesting/harness.ts`.
- Personas: `packages/engine/src/playtesting/personas.ts`.
- Detectors: `packages/engine/src/playtesting/anomaly-detectors.ts`.
- Reporter: `scripts/playtest-report.ts`.

Host-noise detectors such as wall-clock perf are excluded from canonical counts.

Other gates:

- `bash scripts/check-math-random.sh`
- `bash scripts/check-bundle-size.sh`
- `bash scripts/smoke-full-season.sh`
- `bash scripts/smoke-test-built-page.sh`
- `pnpm test:shadow`

## CI

`.github/workflows/ci.yml`:

- Install pnpm 9 and Node 20.
- `pnpm install --frozen-lockfile`.
- `pnpm typecheck`.
- `pnpm test`.
- `pnpm build` with `VITE_CHIP_ENABLED=true`.
- Bundle size gate.
- Built-page smoke test.
- Separate determinism job runs `check-math-random.sh` and save version audit.

`.github/workflows/deploy.yml`:

- Builds `@mfd/web` with `VITE_CHIP_ENABLED=true`.
- Uploads `apps/web/dist` to GitHub Pages.

## Feature/Wiring Map

Heavily wired through web UI:

- Weekly advance, game day recap, halftime decision.
- Roster, depth chart, practice squad, waivers.
- Contracts, cap lab, contract tools.
- Trades, trade proposals, trade deadline, trade block.
- Scouting, draft board, draft recap, war room.
- Free agency and FA targets.
- Coaching staff/tree/relationships.
- Owner, commissioner, CBA, league rules.
- Standings, schedule, records, stat central, analytics, power rankings.
- Newsroom, league news, social feed, league pulse.
- Franchise hub, legends, scrapbook, Hall of Fame, trophies, eras, chronicle, GM career.
- Locker room, facilities/training/fatigue-related screens, game plan, film room.
- Chip companion/onboarding/route coaching.
- Save/load via dynasty cartridge.

Engine systems with partial, indirect, or lower-confidence UI wiring. Verify before extending:

- `assistant-gm.ts`
- `gm-reputation.ts`
- `coach-retention.ts`
- `coaching-legacy.ts`
- `coordinator-chemistry.ts`
- `position-coaches.ts`
- `scheme-install.ts`
- `development-insights.ts`
- `cap-visualization.ts`
- `broadcast-commentary.ts`
- `role-defs.ts`
- `trick-plays.ts` beyond weekly prep/game-plan use

This does not mean unused. It means future work should inspect imports, selectors, and feature screens before assuming product exposure.

## Known Caution Zones

- Save schema is large and strict. Any state shape drift can break old saves.
- Many systems mutate the cloned `GameState`; this is expected inside engine workflows but should stay deterministic.
- `GameState.players` and `Team.roster` both hold player records. Many systems call `syncPlayers`; if editing player movement, keep both synchronized.
- Cap actions must keep `capUsed`, `capSpace`, `deadCap`, contract references, and roster/player records in sync.
- Week advance has many early returns. If adding phase behavior, place it carefully so it does not bypass required post-processing.
- Trade deadline and CBA can intentionally interrupt week advance and navigate the UI to special routes.
- Some store actions mutate directly without autosave. Prefer `commitGame` for durable user actions unless matching a deliberate transient pattern.
- Content loader fails at import time if JSON shape is invalid.
- Hash router is used for GitHub Pages.
- `VITE_CHIP_ENABLED=true` must be set for production-equivalent build/smoke tests.

## How To Add A Feature Safely

1. Locate the owning layer:
   - Pure sim rule: `packages/engine/src/systems`.
   - Persistent state: `packages/engine/src/types` plus save schema/migration.
   - Browser workflow: `apps/web/src/app/store` and feature screen.
   - Presentation only: `apps/web/src/features` or `packages/design-system`.
   - Content: `packages/content` and content schemas.
2. Read the closest existing system and its test.
3. Add the smallest pure helper possible.
4. Add focused tests next to the changed system.
5. Wire through store actions/selectors only after engine behavior is tested.
6. Wire UI using existing components/tokens.
7. Run verification based on risk.

## Verification By Change Type

Docs only:

```bash
npx --yes pnpm@9.15.9 --version
```

Engine unit/system:

```bash
npx --yes pnpm@9.15.9 --filter @mfd/engine test
```

Specific engine test:

```bash
cd packages/engine
npx --yes pnpm@9.15.9 exec vitest run systems/game-sim.test.ts
```

Save/migration:

```bash
npx --yes pnpm@9.15.9 --filter @mfd/engine test -- save
```

Sim math or season loop:

```bash
bash scripts/check-math-random.sh
bash scripts/smoke-full-season.sh
npx --yes pnpm@9.15.9 test:perft
```

Web feature:

```bash
npx --yes pnpm@9.15.9 --filter @mfd/web test
npx --yes pnpm@9.15.9 --filter @mfd/web typecheck
npx --yes pnpm@9.15.9 --filter @mfd/web build
```

Design system:

```bash
npx --yes pnpm@9.15.9 --filter @mfd/design-system test
npx --yes pnpm@9.15.9 --filter @mfd/design-system typecheck
```

Full local gate:

```bash
npx --yes pnpm@9.15.9 typecheck
npx --yes pnpm@9.15.9 test
npx --yes pnpm@9.15.9 build
bash scripts/check-math-random.sh
bash scripts/check-bundle-size.sh
bash scripts/smoke-full-season.sh
```

## Manual Smoke Script

For user-facing changes:

1. Start dev server: `npx --yes pnpm@9.15.9 dev`.
2. Open the local Vite URL.
3. Start or load a dynasty.
4. Visit the changed route.
5. Perform the changed action.
6. Assert:
   - No console errors.
   - State updates are visible.
   - Autosave/manual save works if persistent.
   - Reload/import old save still works if save shape changed.
   - Mobile width does not hide critical controls.

## Future Codex First-Read Checklist

1. Read `AGENTS.md` and this file.
2. Confirm intended repo path. If starting in `/Users/tkevinbigham/Documents/New project`, switch to `/Users/tkevinbigham/Documents/GitHub/MFD`.
3. Inspect the files for the requested subsystem before editing.
4. Identify whether the change touches:
   - gameplay math,
   - save schema,
   - week advance,
   - store/persistence,
   - UI only,
   - content only.
5. Pick focused tests before editing.
6. Keep patches small.

## Maintenance Notes For This Guide

Update this guide when:

- `SAVE_VERSION` changes.
- New package/workspace is added.
- Week advance spine changes meaningfully.
- Persistence/import/export changes.
- Major feature routes are added/removed.
- Determinism or playtest baselines change.
- CI gates change.
