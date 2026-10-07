# Verification and development tools

Use Node 24 and the repository's pinned `pnpm@9.15.9`. Start from a clean
Git checkout and install the locked dependency graph:

```bash
pnpm install --frozen-lockfile
```

Read [AGENTS.md](../../AGENTS.md) for package verification defaults, save
contracts and approval gates. See the [current repair ledger](../plans/file-consistency-2026-10-07.md)
for the October 2026 consistency work.

## Browser tests

The web package declares `@playwright/test` at exactly `1.63.0`. Its two
existing suites collect four tests using the app-local configuration in
`apps/web/playwright.config.cjs`.

Install only the required Chromium browser in the intended test environment,
then collect the tests before running them:

```bash
pnpm --filter @mfd/web exec playwright install chromium
pnpm --filter @mfd/web exec playwright test --list
pnpm --filter @mfd/web exec playwright test --workers=1 --retries=0 --global-timeout=900000
```

The configured web server builds with Chip enabled and previews the app at
`127.0.0.1:4173/MFD/` (or the explicitly selected `MFD_PLAYWRIGHT_PORT`). Use
fresh browser contexts. These suites clear local/session storage and delete
the local `mfd` IndexedDB database; do not point them at an active player
profile or production origin. Missing browser/system prerequisites must be
reported rather than skipped as a passing result.

The normal `pnpm --filter @mfd/web test:e2e` command also uses this configuration.
The explicit command above bounds a diagnostic run to one worker, zero
retries and a 15-minute global timeout.

## G4 horizon labels

The dedicated release wrapper defaults to three completed seasons. The
generic Vitest test defaults to ten. An explicit `G4_TARGET_SEASONS`
overrides the horizon. Both receipts name the effective configured value;
the two defaults and their assertions are intentionally different.

Check the wrapper contract and collect both labels without running a soak:

```bash
node --test scripts/__tests__/smoke-test-g4-multi-year-trust.test.mjs
G4_TARGET_SEASONS=3 pnpm --filter @mfd/web exec vitest list src/app/store/g4-multi-year-trust.test.ts
G4_TARGET_SEASONS=10 pnpm --filter @mfd/web exec vitest list src/app/store/g4-multi-year-trust.test.ts
```

Collection imports the test module but does not run its test callback.
Correct label output is not a new three- or ten-season simulation result.

## Component previews

Storybook is not configured. The unsupported `storybook` and
`build-storybook` commands have been retired. Existing `.stories.tsx` files
remain reference examples. Use the Vite app and component tests for the
supported preview/verification workflow.

## Knip analysis

`knip.json` describes the root scripts and the three actual workspace
packages: engine, design-system and web. Content is JSON data consumed by
imports; it is not a TypeScript workspace with an `index.ts` entry point.
The schema reference matches locked Knip 6.4.1.

```bash
pnpm exec knip --version
pnpm exec knip --config knip.json --no-progress
```

Read and classify diagnostics. A nonzero result can represent existing
unused-code findings, not invalid configuration. Do not run automatic
deletion or `--fix` as part of a consistency check.

## Baseline and release checks

[Shadow comparison and update policy](shadow-tier.md) governs canonical
baseline changes. The focused provenance tests use inert generators and
writers and are enrolled in the existing release gate's script-test step:

```bash
node --test scripts/__tests__/shadow-baseline-update.test.mjs
```

The 37-step release contract and required CI job names are unchanged. A
full release gate is a separate validation workload; follow AGENTS before
running it locally or creating a PR that triggers hosted validation.
