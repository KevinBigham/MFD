# Sprint 39 Slice A - Chip Onboarding Host

**Date:** 2026-04-29  
**Branch:** `sprint-39/slice-a-chip-onboarding-host`  
**Starting commit:** `3d311c8` (`test(shadow): drop redundant 5y baseline smoke from runner.test.ts`)  
**Ending commit:** `7a4c381` (`fix(chip): enforce reduced-motion pose overrides`)  
**Save version:** `35` unchanged

## Summary

- Shipped Chip's design-system character primitive with 9 poses, CRT scanline SVG pattern, Mic Check signature motion, and reduced-motion CSS fallbacks.
- Added `ChipDialogueBubble` as a broadcast-card lower-third bubble with requestAnimationFrame typewriter behavior.
- Added the web companion store, deterministic `fnv1a`/`selectVariant`, and the 9-beat onboarding catalog with the Beat 3 architectural anchor line.
- Added `ChipHost`, `VITE_CHIP_ENABLED`, localStorage onboarding skip state, and App wiring around the setup wizard.
- Fixed a reduced-motion smoke failure found during S6: the wave arm pose overrode the media-query fallback until commit `7a4c381`.

## Files Changed

- `apps/web/src/features/companion/**`
- `apps/web/src/app/App.tsx`
- `apps/web/src/app/App.test.tsx`
- `apps/web/.env.example`
- `packages/design-system/components/Chip/**`
- `packages/design-system/components/index.ts`
- `packages/design-system/package.json`
- `pnpm-lock.yaml`

## Scope Notes

- `packages/engine/**` untouched.
- `packages/engine/src/save/**` untouched.
- `apps/web/src/features/franchise-setup/AGMStage.tsx` untouched.
- `SAVE_VERSION` remains `35` at `packages/engine/src/config/difficulty.ts`.
- `packages/design-system/package.json` and `pnpm-lock.yaml` were touched as a documented S1 exception because the package had no `test`/`typecheck` scripts required by the Slice A gate.
- Local ignored artifact `apps/web/.env` was created with `VITE_CHIP_ENABLED=true`; committed flag documentation is in `apps/web/.env.example`.

## Bundle

- Final `pnpm --filter @mfd/web build`: `engine-C9-pRFju.js` gzip `263.84 KB`; `design-system-D83AP2LP.js` gzip `41.33 KB`; `design-system-C-7ObK85.css` gzip `3.58 KB`; `index-CZQSHyBi.js` gzip `163.38 KB`.
- Final checked bundle gate: `bash scripts/check-bundle-size.sh` PASS, engine chunk `257 KB` gzip / `312 KB` ceiling.
- Per-slice gzip deltas were not captured at each commit boundary. The final log records final build measurements rather than reconstructing unverifiable slice-level deltas.

## Verification

| Gate | Result |
|------|--------|
| `pnpm typecheck` | PASS across design-system, engine, web |
| `pnpm --filter @mfd/engine test -- --run` | PASS, `201` files / `1850` tests |
| `pnpm --filter @mfd/web test -- --run` | PASS, `159` files / `859` tests |
| `pnpm --filter @mfd/web build` | PASS, dist emitted |
| `bash scripts/check-math-random.sh` | PASS, no unauthorized `Math.random()` |
| `bash scripts/check-bundle-size.sh` | PASS, engine gzip `257 KB` / `312 KB` ceiling |
| `bash scripts/smoke-full-season.sh` | PASS, `3` files / `4` tests |
| `pnpm playtest:all` | PASS, 5 personas x 10 seasons, high anomalies `0` |
| `pnpm test:perft` | PASS, same persona summary as baseline |
| `pnpm test:shadow` | PASS, `speedrunner-5y`, `speedrunner-10y`, `speedrunner-20y` |

## Command Notes

- This machine does not have a global `pnpm`; gates were run through `npx --yes pnpm@9.15.9` with the bundled Node runtime on PATH.
- The packet's literal `pnpm --filter @mfd/engine test --run` form is rejected by pnpm 9 as `Unknown option: 'run'`; the equivalent working form is `pnpm --filter @mfd/engine test -- --run`.
- Root scripts `check-math-random`, `check-bundle-size`, and `smoke-full-season` are not declared in `package.json`; the checked-in shell gates were run directly.
- First reduced-motion browser smoke failed because the pose-specific wave arm selector beat the generic media-query fallback. Commit `7a4c381` fixes this and adds regression coverage.

## Reduced-Motion Smoke

- Local browser: Chrome headless via CDP, `Emulation.setEmulatedMedia` with `prefers-reduced-motion: reduce`.
- Flow: clear localStorage/IndexedDB, load `http://localhost:5173/MFD/`, Start Dynasty, verify `data-chip-host="true"`.
- Evidence screenshot: `tmp/chip-reduced-motion-smoke.png` (ignored local artifact, 68 KB).
- Final computed-style sample: `reducedMedia=true`, `hostRendered=true`, `pose=wave`, `animationName=none`, `transform=none`, `transitionProperty=opacity`, `transitionDuration=0.08s` for `.mfd-chip-svg`, `.mfd-chip-svg__figure`, `.mfd-chip-svg__arm--right`, `.mfd-chip-svg__head`, and `.mfd-chip-svg__eye`.

## Baselines

- Perft baselines unchanged; `pnpm test:perft` produced the expected summary: `SPEEDRUNNER 237/0`, `GLUTTON 239/0`, `CHEAPSKATE 239/0`, `CHURN_ARTIST 239/0`, `INJURY_MAGNET 239/0`.
- Shadow baselines unchanged; no baseline update was made.
- No AGMStage file changes; full web suite includes `AGMStage.test.tsx` passing.

## What Did Not Land

- Persistent dock, event-driven dialogue, cross-dynasty memory, save schema changes, voice/TTS, mobile-specific tuning, and Slice B+ systems did not land.
- Storybook pose stories did not land; they were not included in the Slice A file scope.

## Self-Critique

- **Schema bump?** No. Expected no bump; actual `SAVE_VERSION` remains `35`.
- **RNG safety?** No `Math.random`, `Date.now`, or `performance.now` hits in companion/Chip/App Slice A surfaces. Variant selection uses pure `fnv1a`.
- **Save compatibility?** No save schema or migration touched. Engine save/golden tests passed through the full engine suite.
- **Tests run?** All gates above passed, with noted command syntax/env corrections.
- **Files outside scope?** `packages/design-system/package.json` and `pnpm-lock.yaml` were the only S1 file-scope exceptions; they enable required design-system test/typecheck scripts. Docs are S6 scope.
- **Name canon?** New source uses `Chip`; `rg -i "elliot" apps/web/src/features/companion/ packages/design-system/components/Chip/ apps/web/src/app/App.tsx apps/web/src/app/App.test.tsx` returned zero matches.

## Classification

**SHIPPED** - Slice A is complete on branch `sprint-39/slice-a-chip-onboarding-host` at commit `7a4c381`. Slice B is unblocked.

---

## Slice B - Chip Dock + Monday Briefing Host

- **Date:** 2026-04-29
- **Branch:** `sprint-39/slice-b-chip-dock-monday-briefing`
- **Starting commit:** `bb98e10` (`Sprint 39 Slice A: Personal Assistant Chip - character + onboarding host (#18)`)
- **Ending code commit:** `6b4fca6` (`feat(chip): wire dock into app shell`)
- **Save version:** `35` unchanged

## Summary

- Added the persistent `ChipDock` primitive with localStorage-only dock preferences at `mfd.chip.local`.
- Added Monday Briefing weekly dialogue variants and deterministic selection through the Slice A `fnv1a`/`selectVariant` path.
- Added a pure Zustand-subscription `eventBridge` and `useChipEvents` lifecycle adapter; no engine EventBus was introduced.
- Wired the post-setup app shell to render Chip's dock outside `/setup/*` and to feed active weekly dialogue into the dock bubble.
- Added Chip intro/outro commentary to Monday Briefing while preserving the existing ActionCenter, metric cards, and Narrative Pulse data.

## Files Changed

- `apps/web/src/features/companion/ChipDock.{tsx,css,test.tsx}`
- `apps/web/src/features/companion/dockPersistence.{ts,test.ts}`
- `apps/web/src/features/companion/dialogue/weekly.{ts,test.ts}`
- `apps/web/src/features/companion/dialogue/types.{ts,test.ts}`
- `apps/web/src/features/companion/eventBridge.{ts,test.ts}`
- `apps/web/src/features/companion/useChipEvents.{ts,test.ts}`
- `apps/web/src/features/companion/store.{ts,test.ts}`
- `apps/web/src/app/App.{tsx,test.tsx}`
- `apps/web/src/features/monday-briefing/MondayBriefing.tsx`
- `apps/web/src/features/monday-briefing/MondayBriefing.integration.test.tsx`

## Scope Notes

- `packages/engine/**` untouched.
- `apps/web/src/features/franchise-setup/AGMStage.tsx` untouched.
- Franchise setup wizard internals untouched.
- `SAVE_VERSION` remains `35`; no save schema, migration, or fixture changed.
- Dock collapse, quiet, reduced-guidance, and animation preferences remain browser-local only at `mfd.chip.local`.
- Companion source has zero imports from `@mfd/engine`.

## Bundle

- Slice A baseline from this log: `index-CZQSHyBi.js` gzip `163.38 KB`; `design-system-D83AP2LP.js` gzip `41.33 KB`; `design-system-C-7ObK85.css` gzip `3.58 KB`; `engine-C9-pRFju.js` gzip `263.84 KB`.
- Slice B final build: `index-BJJR7sdu.js` gzip `167.61 KB`; `design-system-D2Fa6P9k.js` gzip `41.89 KB`; `design-system-C-7ObK85.css` gzip `3.58 KB`; `engine-C9-pRFju.js` gzip `263.84 KB`.
- Total tracked gzip delta against Slice A baseline: `+4.79 KB` (`+4.23 KB` app index, `+0.56 KB` design-system JS), under the `+9 KB` Slice B budget.
- Final checked bundle gate: `bash scripts/check-bundle-size.sh` PASS, engine chunk `257 KB` gzip / `312 KB` ceiling.

## Verification

| Gate | Result |
|------|--------|
| `pnpm typecheck` | PASS across design-system, engine, web |
| `pnpm --filter @mfd/engine test -- --run` | PASS, `201` files / `1850` tests |
| `pnpm --filter @mfd/web test -- --run` | PASS, `165` files / `905` tests |
| `pnpm --filter @mfd/design-system test -- --run` | PASS, `2` files / `16` tests |
| `pnpm --filter @mfd/web build` | PASS, dist emitted |
| `bash scripts/check-math-random.sh` | PASS, no unauthorized `Math.random()` |
| `rg -i "elliot" apps/web/src/features/companion/ packages/design-system/components/Chip/` | PASS, zero matches |
| `bash scripts/check-bundle-size.sh` | PASS, engine gzip `257 KB` / `312 KB` ceiling |
| `bash scripts/smoke-full-season.sh` | PASS, `3` files / `4` tests |
| `pnpm playtest:all` | PASS, 5 personas x 10 seasons, high anomalies `0` |
| `pnpm test:perft` | PASS, byte-identical persona summary |
| `pnpm test:shadow` | PASS, `speedrunner-5y`, `speedrunner-10y`, `speedrunner-20y` |

## Focused Slice Commands

- `pnpm --filter @mfd/web exec vitest run src/features/companion/ChipDock.test.tsx` PASS, `10` tests.
- `pnpm --filter @mfd/web exec vitest run src/features/companion/dockPersistence.test.ts` PASS, `6` tests.
- `pnpm --filter @mfd/web exec vitest run src/features/companion/dialogue/weekly.test.ts` PASS, `6` tests, plus 100x determinism rerun with single output line `0`.
- `pnpm --filter @mfd/web exec vitest run src/features/companion/eventBridge.test.ts` PASS, `7` tests.
- `pnpm --filter @mfd/web exec vitest run src/features/companion/useChipEvents.test.ts src/features/companion/store.test.ts` PASS, `13` tests.
- `pnpm --filter @mfd/web exec vitest run src/app/App.test.tsx src/features/monday-briefing/MondayBriefing.integration.test.tsx src/features/monday-briefing/MondayBriefing.test.tsx` PASS, `13` tests.

## Browser Smokes

- Reduced-motion smoke: Chrome/Playwright with `prefers-reduced-motion: reduce`, loaded `http://localhost:5173/MFD/`, launched Convention Demo, verified ChipDock rendered on a non-setup route. Evidence screenshot: `tmp/chip-dock-reduced-motion-smoke.png`.
- Reduced-motion computed sample: `reducedMedia=true`, `dockRendered=true`, `chipPose=idle`, `svgAnimationName=none`, `svgTransform=none`, `svgTransitionProperty=opacity`, `svgTransitionDuration=0.08s`.
- Keyboard focus-ring sample: `focusVisible=true`, `focusOutlineStyle=solid`, `focusOutlineWidth=3px`, `focusOutlineColor=rgb(0, 229, 255)`. Evidence screenshot: `tmp/chip-dock-focus-ring-smoke.png`.
- Rollback smoke: restarted dev server with `VITE_CHIP_ENABLED=false`, launched Convention Demo, verified `dockRendered=false`, `chipIntroRendered=false`, `chipOutroRendered=false`, `chipBubbleRendered=false`. Evidence screenshot: `tmp/chip-disabled-rollback-smoke.png`.

## Baselines

- Perft baselines unchanged; `pnpm test:perft` produced `SPEEDRUNNER 237/0`, `GLUTTON 239/0`, `CHEAPSKATE 239/0`, `CHURN_ARTIST 239/0`, `INJURY_MAGNET 239/0`.
- Shadow baselines unchanged; no baseline update was made.
- AGMStage unchanged and `AGMStage.test.tsx` passed inside the full web suite.

## What Did Not Land

- Slice C+ event-driven triggers beyond Monday Briefing did not land.
- Save schema changes, cross-dynasty memory, voice/TTS, and mobile-specific dock tuning did not land.
- No real engine-level EventBus was added; the bridge follows MFD's actual Zustand-driven app architecture.

## Self-Critique

- **Schema bump?** No. Expected no bump; actual `SAVE_VERSION` remains `35`.
- **RNG safety?** No `Math.random`, `Date.now`, or `performance.now` in companion Slice B code. Weekly selection uses `fnv1a` via `selectVariant`; timestamps use injected `now` in dock/bridge paths.
- **Save compatibility?** No engine save, migration, schema, or fixture touched. Golden saves and full engine suite passed.
- **Tests run?** All gates above passed. Web suite increased from `859` to `905` tests; engine and design-system counts stayed `1850` and `16`.
- **Files outside scope?** No engine, AGM, setup wizard, save, or unrelated route files changed. `dialogue/types.ts` was touched for the required weekly archetype validator extension; `store.ts` was touched for the documented additive `showWeeklyDialogue` action.
- **Name canon?** New source uses `Chip`; `rg -i "elliot" apps/web/src/features/companion/ packages/design-system/components/Chip/` returned zero matches.

## Classification

**SHIPPED** - Slice B is complete on branch `sprint-39/slice-b-chip-dock-monday-briefing`. Slice C is unblocked for broader companion event triggers.
