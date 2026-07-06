# Fable Next Patch Prompt

Paste everything below the line into a fresh Claude Code session once implementation is approved.

---

You are implementing one approved patch in Mr. Football Dynasty at `/Users/kevin/Downloads/MFD/MFD-main`. This is the TypeScript monorepo (engine/web/design-system) — not the old `Mr_Football` JSX monolith; the three-file mfd-patch delivery format does not apply here.

Read first, in order:

1. `AGENTS.md` — follow its response shape (Understanding / Plan / Patch / Verification / Risks-Rollback) and verification defaults.
2. `docs/audits/FABLE_GOAT_REVIEW.md` §13 — the patch definition.
3. `docs/audits/FABLE_PRIORITY_BOARD.md` items 1–2.
4. `.github/workflows/deploy.yml`, `.github/workflows/ci.yml`, `README.md:70-90`, `CHANGELOG.md:1-15`, `packages/engine/src/config/navigation.ts:1-10`.

## Patch: Publication Integrity + Release-Doc Truth

Zero product-behavior change. No sim math, no save schema, no engine logic, no UI. Scope is exactly the seven changes below — nothing else, even if you spot other issues (note them in your final summary instead).

### 1. `.github/workflows/deploy.yml`

- In the `on.push.branches` list, remove `codex/phase4a-season-loop`. Deploy triggers become `main` + `workflow_dispatch` only.
- Change `pnpm/action-setup` `version: 9` to `version: 9.15.9` (must match `ci.yml` and `package.json`).
- In the `build` job, after the `pnpm --filter @mfd/web build` step, add two steps mirroring CI's test job:
  - `bash scripts/check-bundle-size.sh`
  - `bash scripts/smoke-test-built-page.sh`
- Do NOT add a dependency on the CI `release-gate` job and do NOT change deploy to `workflow_run` — that is deliberately sequenced later (Priority Board item 4), after a remote release-gate run has been proven green.

### 2. `README.md` launch gates (around lines 74–81)

Lead with the full contract, keep the old commands as focused diagnostics:

```bash
# Full public-release contract (36 steps):
pnpm release:gate

# Focused diagnostics (not release-complete evidence):
bash scripts/check-math-random.sh
bash scripts/check-bundle-size.sh
bash scripts/smoke-full-season.sh
pnpm playtest:all
```

### 3. `CHANGELOG.md`

Add a short entry at the top of the Post-Launch section (dated 2026-07-05) noting: 36-step `release:gate` is the release contract and now runs as a CI job; Combined Backup (.mfd + dynasty sidecars) exists; deploy workflow hardened (stale branch trigger removed, pnpm pinned, artifact smokes added); release docs updated. Match the existing entry style. Do not restyle existing entries.

### 4. `packages/engine/src/config/navigation.ts` (lines 4–6)

The comment says the app shell does not hide nav items from this table. Stale — `apps/web/src/app/App.tsx` imports `getNavUnlockStatus` (line 12) and applies it (line 178). Rewrite the comment to say the shell consumes this metadata via `getNavUnlockStatus()` and that new rules belong here rather than in the shell. Comment-only change; touch no code in this file.

### 5. `CODEX_GAME_GUIDE.md`

- Fix the line (~139) claiming the web shell does not import progressive unlock helpers — it does.
- Near the top where the old `/Users/tkevinbigham/MFD/MFD-main` path appears, add a one-line caveat that absolute paths in this guide are historical and the repo root should be resolved from the current checkout. Do not rewrite the guide.

### 6. New drift test: `scripts/__tests__/release-docs.test.mjs`

Node built-in test runner (`node:test` + `node:assert`), style-matched to the existing tests in `scripts/__tests__/`. Assert:

1. `README.md` contains `release:gate` (or `scripts/release-gate.mjs`).
2. `package.json` still defines the `release:gate` script.
3. `.github/workflows/deploy.yml` push branches equal exactly `[main]` (string or simple-YAML check is fine; no YAML dependency).
4. `deploy.yml` pnpm `version:` matches the version in `ci.yml` (read both, compare — don't hardcode `9.15.9` twice).
5. `deploy.yml` mentions `check-bundle-size.sh` and `smoke-test-built-page.sh`.

Register it in the `nodeTestArgs` list inside `buildReleaseGatePlan()` in `scripts/release-gate.mjs` so the gate runs it, keeping the `script-tests` step as the single place script tests are listed.

### 7. Ledger touch-ups (small)

- `RELEASE_CONVERGENCE.md`: note deploy hardening done; note that structural deploy-gating waits on one green remote release-gate run.
- `MFD_PROJECT_MAP.md`: one supersession line at top pointing to `docs/audits/CODEX_DEEP_AUDIT.md` + `FABLE_GOAT_REVIEW.md`. Do not rewrite the file.

## Verification (run these; report results honestly)

```bash
corepack pnpm -r --workspace-concurrency=1 typecheck
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test scripts/__tests__/release-docs.test.mjs
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test scripts/__tests__/release-gate.test.mjs
node scripts/release-gate.mjs --dry-run   # step count grows only via the script-tests list; plan must list cleanly
corepack pnpm --filter @mfd/engine test -- src/config/navigation.test.ts
```

Do NOT run: full `node scripts/release-gate.mjs`, `pnpm build`, browser smokes, visual sweeps, `playtest:all`, shadow regression. They write generated artifacts outside this patch's scope and need separate explicit permission.

If Vitest or the node test runner leaves result caches under `node_modules/.vite/`, clean them and say so.

## Guardrails

- No changes to simulation math, probabilities, constants, save schema, migrations, or `SAVE_VERSION`.
- No new dependencies.
- No files touched beyond the ones listed (plus the two ledgers in step 7).
- This checkout has no `.git` — do not attempt git commands; workflow changes are validated by the drift test and YAML review only, and say so in Risks.
- Finish with the `AGENTS.md` five-part response shape, including exact rollback (list of files to revert).
