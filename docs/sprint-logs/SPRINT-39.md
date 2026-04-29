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
