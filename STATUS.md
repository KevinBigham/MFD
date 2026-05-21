# STATUS

## Shipped

Closed the repo-wide lint baseline enough for mission validation to use exact `pnpm -r lint`.

- Added a root `packageManager` pin for `pnpm@9.15.9`.
- Installed/wired the missing pnpm runtime for this Codex desktop shell and wrapped it so package scripts see the bundled primary-runtime Node first.
- Added lint scripts for `@mfd/web` and `@mfd/design-system`, so `pnpm -r lint` now covers the TS/TSX workspace packages instead of only `@mfd/engine`.
- Added `eslint-plugin-react-hooks` and enabled `react-hooks/rules-of-hooks` plus `react-hooks/exhaustive-deps` in the shared ESLint config.
- Removed all existing `@ts-nocheck` headers from web tests and added `@types/node` to the web app for the source-reading test files.
- Fixed the blocking lint errors without gameplay behavior changes:
  - Replaced non-null asserted optional chains in web/engine tests with explicit guards.
  - Converted the existing prefer-const bindings to `const`.
  - Fixed React hook dependency and hook-order errors by stabilizing fallbacks, removing unnecessary deps, and making one memo unconditional.

## Files Changed

- `.eslintrc.cjs`
- `package.json`
- `pnpm-lock.yaml`
- `apps/web/package.json`
- `packages/design-system/package.json`
- `packages/engine/src/systems/call-your-shot-wiring.test.ts`
- `packages/engine/src/systems/cba-engine.test.ts`
- `packages/engine/src/systems/commissioner.ts`
- `apps/web/src/app/App.tsx`
- `apps/web/src/app/App.test.tsx`
- `apps/web/src/app/nav-items.test.ts`
- `apps/web/src/app/round2-convention.test.ts`
- `apps/web/src/app/round3-grand-opening.test.ts`
- `apps/web/src/app/hooks/useBootSequence.test.ts`
- `apps/web/src/app/hooks/useKeyboard.ts`
- `apps/web/src/app/store/game-store.test.ts`
- `apps/web/src/features/broadcast/GameFlow.tsx`
- `apps/web/src/features/contracts/CapLaboratory.tsx`
- `apps/web/src/features/dynasty-cartridge/DynastyCartridge.tsx`
- `apps/web/src/features/dynasty-cartridge/DynastyCartridge.confirm.test.ts`
- `apps/web/src/features/game-day/GameDayRecap.tsx`
- `apps/web/src/features/league/CommissionerOffice.tsx`
- `apps/web/src/features/mentors/AlumniMentorsScreen.tsx`
- `apps/web/src/features/monday-briefing/MondayBriefing.integration.test.tsx`
- `apps/web/src/features/route-coaching/spotlightAnchors.test.ts`
- `apps/web/src/features/stats/RecordBook.tsx`
- `apps/web/src/features/stats/StatCentral.tsx`
- `apps/web/src/features/week-advance/WeekAdvance.tsx`

Generated validation output:

- `packages/engine/dist/**` from `tsc`
- `apps/web/dist/**` from `vite build`

## Checks Run

- `pnpm -r lint`: passed. Remaining output is warning-only baseline:
  - `@mfd/design-system`: 0 errors, 1 warning.
  - `@mfd/engine`: 0 errors, 79 warnings.
  - `@mfd/web`: 0 errors, 45 warnings.
- `pnpm -r typecheck`: passed for `@mfd/design-system`, `@mfd/engine`, and `@mfd/web`.
- `pnpm -r build`: passed for `@mfd/engine` and `@mfd/web`. Vite still reports the pre-existing large chunk size warning.
- `rg -n "@ts-nocheck" apps packages --glob '!**/dist/**' --glob '!**/node_modules/**'`: no matches.

## Notes

- The initial `pnpm -r build` attempt failed under the Codex app's signed Node because Rollup's native optional module could not be loaded by that hardened runtime. The session-local pnpm wrapper now puts `/Users/kevin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin` first for package scripts, and the exact `pnpm -r build` command passes.
- Repo-wide lint is green by exit code, but unused import/unused variable/no-explicit-any warnings remain intentionally warning-only per the existing ESLint cleanup config.
