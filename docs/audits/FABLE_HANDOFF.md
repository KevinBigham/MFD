# Fable Handoff

## 1. Fable TL;DR

MFD is stronger than the older root audits suggest. July 5 work fixed major app-shell and UX discoverability gaps: static routes are nav-visible, the command palette no longer caps roster players, owner inbox events are consumed, draft war-room accepted trades are source-backed and update live draft order, and position coaches now have basic initialize/upgrade UI.

Current release read: YELLOW-GREEN for motivated testers, YELLOW for wide/public release discipline. The top remaining risks are release-gate enforcement, long-memory portability/merge semantics, permissive save schema islands, and honest-but-shallow visible mechanics like trick plays and press responses.

Use `CODEX_GAME_GUIDE.md` and the GOAT docs as the repo operating map, but verify against source. They still contain old home-directory paths, and at least one progressive-nav note is stale.

## 2. Highest-Confidence Findings

1. CI release-gate claim is partially stale: `.github/workflows/ci.yml` now has a dependent `release-gate` job running `node scripts/release-gate.mjs`, but `.github/workflows/deploy.yml` still deploys after lighter install/typecheck/test/web-build steps.
2. Navigation/direct-route audit claims are stale: `apps/web/src/app/nav-items.test.ts` now expects only `/player/$playerId` and `/player/$playerId/timeline` outside primary nav.
3. Combined Backup is real: `apps/web/src/lib/dynasty-combined-backup.ts` validates a `.mfd` cartridge plus complete dynasty sidecars; UI exposes copy/download/upload.
4. Classic `.mfd` is still narrower: it serializes sanitized GameState and strips broadcast payloads; browser sidecars require Combined Backup or sidecar archive.
5. Save schema still has broad `z.any` islands in result/history/event/playoff/archive fields.
6. Trick plays are intentionally planning-only; tests guard the helpers out of live sim.
7. Inbox now consumes `ownerPersonalityInbox`, but durable read receipts are still absent by design.
8. Position coaches now initialize/upgrade and affect progression, but the loop is shallow.
9. Engine/web boundaries are actively source-guarded in `apps/web/src/app/architecture-boundaries.test.ts`.
10. `CODEX_GAME_GUIDE.md` is valuable but not perfect: it names the old `/Users/tkevinbigham/MFD/MFD-main` path and says progressive nav unlock helpers are not web-wired, while current `App.tsx` imports/uses `getNavUnlockStatus`.

## 3. Highest-Risk Unresolved Questions

- Should Pages deploy be structurally blocked on the full release gate, or is manual release discipline acceptable?
- Should Combined Backup become the default export, with classic `.mfd` treated as legacy/advanced?
- Should sidecar import replace whole browser archives, or should it preview/merge per dynasty?
- Which schema island should be hardened first: `ScheduledGame.result`, event log/history, playoff bracket, or owner/draft class?
- Are watch-list pins considered dynasty memory that must travel with backups, or just browser convenience state?

## 4. Top 5 Decisions Fable Should Make

1. Release policy: require `release-gate` before deploy or document why deploy remains lighter.
2. Backup UX policy: promote Combined Backup as primary and demote old `.mfd`, or leave both equally prominent.
3. Sidecar restore semantics: replace, merge, or per-dynasty selective import.
4. Gameplay depth target: wire trick plays into live sim next, or press responses into bounded consequences next.
5. Schema-hardening order: start with game result payloads or long-history archive/event fields.

## 5. Top 5 Implementation Tasks For Claude Code

1. Update README/CHANGELOG/release docs so launch gates mention `pnpm release:gate` and current 36-step gate.
2. Add a release-doc drift test that fails if README launch gates omit `release:gate` / `node scripts/release-gate.mjs`.
3. Fix stale `packages/engine/src/config/navigation.ts` comment saying the shell does not use unlock metadata.
4. Fix the matching stale `CODEX_GAME_GUIDE.md` progressive-nav line and old-path caveats if docs cleanup is in scope.
5. Add backup UX polish: make Combined Backup the primary CTA and label `.mfd` as legacy/current-save-only.

## 6. What Codex Verified

- Typecheck passed across design-system, engine, and web.
- Focused engine tests passed: 5 files / 105 tests.
- Focused web tests passed: 12 files / 100 tests.
- Design-system tests passed: 17 files / 105 tests.
- `check-math-random` passed.
- Bundle-size gate passed: engine chunk 291 KB gzip vs 312 KB ceiling.
- Release-gate dry-run/list show 36 steps.
- No `.git` directory exists in this checkout.

## 7. What Codex Could Not Finish

- Did not run full default `node scripts/release-gate.mjs`.
- Did not run browser smokes, visual sweeps, web build, playtest-all, or shadow regression because they write outside `docs/audits/`.
- Did not inspect remote GitHub Actions status or branch protection.
- Did not perform dependency vulnerability/security scan.

## 8. Files Fable Should Inspect First If It Spends More Tokens

- `docs/audits/CODEX_DEEP_AUDIT.md`
- `docs/audits/CODEX_AUDIT_STATUS.md`
- `AGENTS.md`
- `CODEX_GAME_GUIDE.md`
- `CODEX_IMPROVEMENT_PLAN.md`
- `MFD_GOAT_GAP_ANALYSIS.md`
- `MFD_GOAT_HANDOFF_BIBLE.md`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `scripts/release-gate.mjs`
- `apps/web/src/app/architecture-boundaries.test.ts`
- `apps/web/src/features/dynasty-cartridge/DynastyCartridge.tsx`
- `apps/web/src/lib/dynasty-combined-backup.ts`
- `apps/web/src/lib/dynasty-sidecar-archive.ts`
- `packages/engine/src/save/schema.ts`
- `apps/web/src/app/nav-items.test.ts`
- `packages/engine/src/systems/trick-plays.test.ts`

## 9. Recommended Fable Prompt

Read `/Users/kevin/Downloads/MFD/MFD-main/docs/audits/CODEX_DEEP_AUDIT.md`, `/Users/kevin/Downloads/MFD/MFD-main/docs/audits/CODEX_AUDIT_STATUS.md`, `AGENTS.md`, `CODEX_GAME_GUIDE.md`, and the GOAT docs. Treat older root audit docs and guide claims as hypotheses until source-confirmed. Decide whether to implement a docs/release-drift cleanup or a portability cleanup first. Do not run full build/browser/playtest gates unless explicitly allowed to write generated artifacts outside `docs/audits/`. If implementing, keep changes focused and verify with typecheck plus the narrow tests named in the audit.
