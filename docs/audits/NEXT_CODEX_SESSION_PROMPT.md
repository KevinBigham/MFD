# Next Codex Session Prompt

You are continuing the MFD audit from `/Users/kevin/Downloads/MFD/MFD-main`.

Read these first:

1. `/Users/kevin/Downloads/MFD/MFD-main/docs/audits/CODEX_AUDIT_STATUS.md`
2. `/Users/kevin/Downloads/MFD/MFD-main/docs/audits/CODEX_DEEP_AUDIT.md`
3. `/Users/kevin/Downloads/MFD/MFD-main/docs/audits/FABLE_HANDOFF.md`
4. `/Users/kevin/Downloads/MFD/MFD-main/AGENTS.md`
5. `/Users/kevin/Downloads/MFD/MFD-main/CODEX_GAME_GUIDE.md`
6. `/Users/kevin/Downloads/MFD/MFD-main/CODEX_IMPROVEMENT_PLAN.md`
7. `/Users/kevin/Downloads/MFD/MFD-main/MFD_GOAT_GAP_ANALYSIS.md`
8. `/Users/kevin/Downloads/MFD/MFD-main/MFD_GOAT_HANDOFF_BIBLE.md`

Treat older root audit docs and repo-guide claims as hypotheses, not truth. The July 5 source has fixed several older findings, and `CODEX_GAME_GUIDE.md` still contains old home-directory paths plus at least one stale progressive-nav note.

## Current Best Read

- Audit root is `/Users/kevin/Downloads/MFD/MFD-main`.
- `.git` is absent; do not rely on git diff/status/log.
- Do not modify source/build/release files unless the user explicitly switches from audit to implementation.
- If staying audit-only, write only under `docs/audits/`.
- Full build/browser/playtest/release gates are not safe by default because they write outside `docs/audits/`.
- Source truth confirmed during audit: `SAVE_VERSION = 36`; app shell imports/uses `getNavUnlockStatus`; engine/web boundaries are guarded by `apps/web/src/app/architecture-boundaries.test.ts`.

## What Was Completed

- Created/updated `docs/audits/CODEX_AUDIT_STATUS.md`, `CODEX_DEEP_AUDIT.md`, `FABLE_HANDOFF.md`, and this prompt.
- Verified release-gate dry-run/list, Math.random audit, bundle-size gate, recursive typecheck, focused engine tests, focused web tests, and design-system tests.
- Cleaned generated Vitest result caches so only audit docs remained intentionally modified.

## What Remains

- Full 36-step release gate, web build, browser smokes, playtest-all, shadow regression, and visual sweeps were not rerun because they write outside audit docs.
- Remote CI status, branch protection, dependency vulnerability posture, and deployed Pages artifact were not inspected.
- Implementation is not started; this packet is audit-only.

## Highest-Signal Findings To Continue From

1. CI now runs `node scripts/release-gate.mjs`, but deploy does not require that gate.
2. Combined Backup exists and validates `.mfd` plus complete dynasty sidecars.
3. Classic `.mfd` remains current-save-only and excludes browser-local sidecars.
4. Sidecar import validates then replaces whole sidecars; no merge/preview.
5. Watch List is localStorage-only at `mfd.watchlist.v1` and outside combined backup.
6. Save schema still has important `z.any` islands.
7. Trick plays are planning-only by explicit test boundary.
8. Press response choices are quote-only.
9. Position coaches are basic initialize/upgrade plus progression effects, not a full staff market/development loop.
10. README/CHANGELOG/project-map comments are stale versus current release-gate and July 5 convergence.
11. `CODEX_GAME_GUIDE.md` is the most useful source map but needs path/nav-helper cleanup if docs drift is addressed.

## If Asked To Implement The First Cleanup

Recommended implementation slice:

1. Update README launch gates to include `pnpm release:gate`.
2. Update CHANGELOG post-launch section with a short release-gate/docs note.
3. Fix the stale comment in `packages/engine/src/config/navigation.ts`.
4. Fix the matching stale `CODEX_GAME_GUIDE.md` progressive-nav line and old-path caveat if docs cleanup includes repo guides.
5. Add or update a narrow test that prevents release docs from omitting the release-gate command.
6. Verify with `corepack pnpm -r --workspace-concurrency=1 typecheck` and the narrow relevant tests only.

## Stopping Rules

- Stop and ask before running `node scripts/release-gate.mjs`, web build, browser smokes, G6 sweeps, playtest-all, or shadow regression.
- Stop and ask before modifying any source file if the user says audit-only.
- Stop and ask if a command would write outside the agreed scope and you cannot cleanly avoid it.
- If Vitest creates `node_modules/.vite/vitest/.../results.json`, clean up generated result caches and document it.

## Suggested Verification Commands

Safe default checks:

```bash
corepack pnpm -r --workspace-concurrency=1 typecheck
corepack pnpm --filter @mfd/engine test -- src/config/navigation.test.ts src/save/save.test.ts
corepack pnpm --filter @mfd/web test -- src/app/nav-items.test.ts src/features/dynasty-cartridge/DynastyCartridge.source.test.ts
```

Potentially mutating checks that need explicit permission:

```bash
corepack pnpm --filter @mfd/web build
node scripts/release-gate.mjs
node scripts/smoke-test-post-setup-route.mjs
corepack pnpm --filter @mfd/engine playtest:all
bash scripts/shadow-regression.sh
```
