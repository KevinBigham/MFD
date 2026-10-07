# MFD File-Consistency Repair Plan

**Adopted:** October 7, 2026. **Audit baseline:** `a51aac1dd2c3e048893a5d897b0cef19ba97f57a`.

This is the current repository queue for the user-approved MFD Repair Execution Plan. It is newly authored and uses **MFD-01 through MFD-16**. It does not reconstruct the missing 100-item GOAT Rev-2 roadmap. A legacy item number or phase name requires its own authentic approved source.

Read [AGENTS.md](../../AGENTS.md) first and recheck the actual implementation base. The source-preparation work is authorized; this document grants no additional hosted-run, merge, or release permission beyond the current session. Keep the save packet isolated. The coordinator owns publication and final evidence; builders do not stage, commit, or publish another lane's work.

## Finding ledger

Each row is a selectable item. Its scope and acceptance apply together with the packet rules below. The candidate dispositions below refer to the independently reviewed feature branches and their executed checks. They do not claim a merge or deployment.

| ID | Packet / owner | Scope and approved disposition | Acceptance | Candidate disposition |
| --- | --- | --- | --- | --- |
| MFD-01 | P1 / save owner | Coordinated typed persistence repair in engine save/types/migrations and web seed/persistence tests; current-version assertions and narrowly approved markers in AGENTS/README/three protected CODEX documents. | Seven-field contract, valid populated values and deliberate missing defaults survive actual load/import; old/current saves and next-action behavior verified; historical evidence preserved. | Implemented; 242 focused tests passed. Package, perft and hosted gates remain. |
| MFD-02 | P2 / documentation owner | `docs/PLAY_GUIDE.md`, `apps/web/src/features/launch/AboutScreen.tsx`, and `apps/web/src/features/launch/AboutScreen.test.tsx`: supply a new source-based player guide and correct the rendered link. | Exact Play Guide anchor points to a readable candidate-tree document with accurate player instructions; focused About tests pass. | Fixed in candidate; About 6/6 passed. The main document URL becomes live after merge. |
| MFD-03 | P4 / automation owner | Both ecology workflow files: manual-only source operation and default-false full-matrix acknowledgement. | Missing/false input admits no matrix runner; acknowledged manual input preserves matrices, thresholds, and receipts; no certification run claimed. | Source repaired and independently reviewed; matrices not run. Main/source adoption and remote enablement remain separate. |
| MFD-04 | P2 / documentation owner | Both phase-packet skills, AGENTS/CLAUDE routing, `docs/README.md`, and this plan: register explicit MFD selectors. | Mirrors are identical; selected MFD packets contain all six sections; unknown/legacy selectors never invent or alias items. | Fixed; mirrors match and independent MFD/legacy selector trials passed. |
| MFD-05 | P2 / documentation owner | `CODEX_FINISH_GAME_MARATHON_PROMPT.md`: a new short replacement handoff at the existing link target. | Links resolve; new authorship and retired-prompt history are explicit; no old machine assumption or unbounded marathon. | Fixed; new handoff and preserved historical provenance verified. |
| MFD-06 | P2 / documentation owner | `docs/verification/fast-tier.md`, `shadow-tier.md`, and canonical README: actual enforcement plus one current baseline-update policy. | Configured hooks/commands match documentation; current policy links resolve without ignored local files; no heavy Stop hook added. | Fixed; source-matched commands/hooks and current policy links verified. |
| MFD-07 | P3 / tooling owner | Web development manifest/lock, existing Playwright config/suites as needed, and runner prerequisites. | Exact compatible runner is installed from a frozen lock; discovery and supported browser suites actually run; limits reported. | Runner restored and four tests discovered; browser execution blocked by unavailable Chromium. |
| MFD-08 | P2 / documentation and automation owners | Canonical README metrics; `scripts/shadow-regression.ts` update preflight and focused guard tests. | Stored metrics match JSON; old report/meta bytes retained; invalid provenance fails before generator/write; valid source SHA captured once; compare mode preserved. | README and future-update guard fixed; 11/11 guard tests passed. Historical generation SHA remains unknown. |
| MFD-09 | P3 / tooling owner | G4 wrapper/test titles and focused wrapper tests. | Labels match effective validated horizon; approved three-/ten-season defaults and thresholds unchanged. | Fixed; five wrapper tests and both 3-/10-season collection titles passed. |
| MFD-10 | P2 / documentation owner | New handoff/current routing and historical banner on `docs/audits/FABLE_NEXT_PATCH_PROMPT.md`. | Historical prompts cannot expand authority; protected-file exception remains limited to the approved P1 current markers. | Fixed; current routing and historical prompt boundaries verified. |
| MFD-11 | P2 / documentation owner | Historical notices listed below; `docs/README.md` current index. | Original records remain intact below notices; current work/evidence are identifiable; past verdicts are not relabeled as new results. | Fixed; all 15 original document bodies preserved beneath notices. |
| MFD-12 | P3 / documentation and tooling owners | Retain `public/manifest.json`; add `public/README.md`; preserve existing index-document tests. | Intentional legacy-test role explained; active web manifest still serves `/MFD/` and its existing icons. | Explained intentional state; five index/manifest tests passed. |
| MFD-13 | P3 / tooling owner | Remove unsupported Storybook commands from the web manifest; document retained story files as reference. | No active command promises an unavailable runner; unrelated web commands and story source preserved. | Fixed; unsupported commands retired, story source retained. |
| MFD-14 | P3 / tooling owner | Correct the `Hook` type import in `packages/engine/src/systems/game-day-package.test.ts`. | Type points to its real declaration and focused test passes; excluded test typechecks are not overstated. | Type import fixed; two behavioral tests passed. Existing test-fixture type gaps are recorded below. |
| MFD-15 | P3 / tooling owner | `knip.json`: actual workspace roots/entry points and installed-major schema. | Pinned Knip parses/runs without the old phantom-workspace assumptions; no automatic source deletion. | Configuration fixed; Knip ran with no unresolved imports. Other diagnostics remain for triage. |
| MFD-16 | P5 / coordinator | PR #70 body only, after fresh metadata inspection. | Description agrees with observed draft/head/state; old checks dated; no source/ref/draft-state/merge/close change. | Body correction applied and read back; head, open state and non-draft status preserved. |

MFD-01's seven fields are `activeMentors`, `mentorBudget`, `userDynastyEras`, `trainingCampResults`, `pendingPassedPickTargets`, `setupState`, and `franchiseBlueprint`. Preserve valid populated values, including a zero budget. A wholly absent legacy mentor block uses the existing initial budget; populated mentors with an invalid or missing budget must follow the safe import-error path rather than receive an inferred refund. Missing setup and blueprint state stays optional; load must not reopen completed setup, repeat camp effects, or consume a pending draft receipt twice.

### Historical notices

Keep the original text and paths in place. Add only a notice and current-index pointer to:

- `MFD_RELEASE_AUDIT.md`, `MFD_SAVE_SYSTEM_AUDIT.md`, `MFD_WIRING_AUDIT.md`, `MFD_AI_SIM_AUDIT.md`, `MFD_PLAYER_JOURNEY_AUDIT.md`, and `MFD_MASTER_AUDIT_REPORT.md`.
- `MFD_GOAT_HANDOFF_BIBLE.md`, `MFD_MAIN_LIST_OF_IMPROVEMENTS.md`, and `MFD_COMPLETION_PLAN.md`.
- `docs/release/KEVIN_PLAYTEST_SCRIPT.md`, `MFD_FINAL_SHIP_DECISION.md`, and `MFD_RELEASE_CANDIDATE_HANDOFF.md` within that same directory.
- `docs/audits/FABLE_NEXT_PATCH_PROMPT.md`, `NEXT_CODEX_SESSION_PROMPT.md`, and `FABLE_HANDOFF.md` within that same directory.

Existing adequate historical banners do not need replacement. Never bulk-change old save versions, historical metrics, or local provenance paths.

## Packet rules

Generate **CONTEXT / OBJECTIVE / CONSTRAINTS / VERIFICATION / DELIVERABLE / STOP CONDITIONS** for the selected finding. Use the exact row scope, current source, and these rules; a selected row does not authorize every other item in its packet.

| Packet | Objective / constraints | Verification / stop conditions |
| --- | --- | --- |
| P1 — save integrity | Preserve valid durable values with typed schema, deliberate legacy defaults, next migration, seed/test updates, and approved current markers. One schema window; no formula/RNG/sidecar redesign or blanket passthrough. | Actual persistence-boundary regressions, old/current fixtures, affected engine/web suites and typechecks; perft when applicable under AGENTS. Stop on uncertain reconstruction, unapproved math, concurrent schema work, or broader protected edits. |
| P2 — current references and evidence | Repair links, packet routing, policy, and historical labels. Provenance guard is a separate focused source change within this packet. No invented history or automatic baseline regeneration. | Check current links/commands, mirrors, a sample packet, and corpus metrics. MFD-02: `pnpm --filter @mfd/web exec vitest run src/features/launch/AboutScreen.test.tsx`. Run relevant existing release-document tests; guard tests stub generation/writes. Stop if the source needed to make a claim is unavailable. |
| P3 — supported tooling | Repair declared commands, reference paths, labels, and retained-test documentation. No framework modernization or mass dead-code deletion. | Actual runner discovery/execution, targeted tests, config analysis, and applicable package checks. Stop on broad dependency upgrades or unrelated runtime changes. |
| P4 — ecology operation | Make unattended/full-matrix work an explicit choice without changing certification criteria. | Parse/review YAML and admission logic. No ecology matrix is part of source-only verification. Stop on permission failure or unapproved workload. |
| P5 — metadata closeout | Correct observed PR wording without deciding old code's disposition. | Refetch and compare body/state/head before and after; confirm no source/ref mutation. Stop when a fresh state makes the prepared wording inaccurate. |

A packet's deliverable is a scoped candidate, independent review, actual verification receipts, and its updated finding status. A merge/release requires the current session's applicable authorization and fresh checks. Existing explicit authorization need not be requested again for routine actions within its scope.

## Evidence and closeout

**Source preparation is complete and independently reviewed.** The candidates are published on feature branches. Full integration, main-target PRs, merges and deployment remain pending under the approved execution sequence. The browser execution gap below remains open; it is not a passing result.

### Candidate identities

| Candidate | Reviewed implementation commit | Implementation tree |
| --- | --- | --- |
| Save integrity (`codex/mfd-save-integrity-20261007`) | [`a2e71ddd1c79320684498afe1364863a1f5d5209`](https://github.com/KevinBigham/MFD/commit/a2e71ddd1c79320684498afe1364863a1f5d5209) | `c09a6aa62a7f0db78943e6dc63e6362b57eeb4ab` |
| Consistency (`codex/mfd-consistency-20261007`) | [`be9ea226256cdd2b84f5f46d01704592500d0b47`](https://github.com/KevinBigham/MFD/commit/be9ea226256cdd2b84f5f46d01704592500d0b47) | `7efdf26c64fc2551d8100d866768c845d9c4b215` |

Both implementation candidates start at the audit baseline `a51aac1dd2c3e048893a5d897b0cef19ba97f57a`. The save implementation changes 26 files. The consistency implementation changes 45 files in three separately reviewable commits: tooling, verification controls, then current/historical documentation. Later commits containing this ledger and the save verification record are documentation-only; the implementation identities above identify the tested source.

The coordinator compared the remote Git trees with local reviewed file hashes. Source and test owners froze their files before publication. Independent reviewers examined the save contract and final populated tests, the protected current-version markers, and the tooling changes; the coordinator reviewed the documentation and automation changes. A separate fresh packet trial generated MFD-02 correctly and declined to invent GOAT item 23 or Phase 2 mappings.

The consistency branch deliberately retains its original v37 base. Incorporate the settled save merge and any newer main changes before opening its PR, preserving the v38 markers and the new navigation/documentation. Its current receipts do not certify that later combined tree.

### Executed local evidence

Runtime: Node v24.19.0, pinned pnpm 9.15.9, Vitest 3.2.4. Frozen dependency installations succeeded on both worktrees; the consistency lock adds only the exact Playwright 1.63.0 dependency chain.

| Check | Actual result / scope |
| --- | --- |
| Save repair | 242 distinct targeted tests across 16 suites: 109 engine save, 86 consumer, 47 web. The final 28-case durable-fixture rerun overlaps the 109 and is not counted twice. Both package typechecks, deterministic-source check, shell syntax and diff checks passed. |
| Script contracts | `node --test` on release-gate, G4 wrapper and shadow-baseline-update files: 25/25 passed. |
| Existing release-document tests | 5/5 passed. |
| About guide link | 6/6 passed, including the exact rendered anchor and a readable candidate-tree document. |
| Active index and retained manifest | 5/5 passed. |
| Game-day package | 2/2 behavioral tests passed; the Hook type resolves to its defining module. |
| G4 collection | Vitest collection under `G4_TARGET_SEASONS=3` and `10` returned matching titles. No multi-season soak was called for label verification. |
| Consistency package typechecks | Engine and web both passed. |
| Consistency deterministic-source check | Passed. |
| Current documentation and historical notices | 64 original current-document links/anchors and 15 notice links resolved. All 15 historical bodies match the baseline after removing only their new notice. |
| Mirrored skills and ledger | Skill bytes match, frontmatter parses, and all 16 finding rows are present. Independent selector trials passed. |
| Canonical reports/metadata and legacy manifest | Original six report/meta JSON files and the root legacy manifest remain unchanged. |
| Ecology source | YAML parsed with GitHub `on` preserved. Before/after comparison retains matrices, job limits, thresholds and receipt paths; changes are limited to schedule removal, admission input/condition and explanatory comments. |
| Release plan | Semantic comparison retains all 37 existing steps. Its only execution-plan change is the new provenance test file in the existing script-test step. |
| Knip | Installed 6.4.1 parsed and ran the repaired configuration. Exit 1 reports 113 file-level diagnostic records, including 265 export, 250 type, five duplicate, three dev-dependency, one dependency, one binary and one unused-file entries. No unresolved or unlisted imports were reported. This is not a clean unused-code report. |
| Playwright | Exact runner installed; collection found four tests in two files. The configured flagged local Vite build/preview succeeded. All four attempted tests failed at browser launch because the required Chromium executable was unavailable. No browser assertion is certified. |

The [save verification record](https://github.com/KevinBigham/MFD/blob/codex/mfd-save-integrity-20261007/docs/verification/save-integrity-2026-10-07.md) contains its field contracts, historical v10/v20 record-shape handling, real-loader before/after proof and exact focused commands. Its original eight golden fixtures, old migrations, version-drift assertions and shared loader remain unchanged. The record also preserves the limits of DB-seam testing and downgrade safety.

Principal consistency commands were:

```bash
corepack pnpm@9.15.9 install --frozen-lockfile
node --test scripts/__tests__/release-gate.test.mjs scripts/__tests__/smoke-test-g4-multi-year-trust.test.mjs scripts/__tests__/shadow-baseline-update.test.mjs
node --test scripts/__tests__/release-docs.test.mjs
corepack pnpm@9.15.9 --filter @mfd/web exec vitest run src/features/launch/AboutScreen.test.tsx
corepack pnpm@9.15.9 --filter @mfd/web exec vitest run src/app/indexDocument.test.ts
corepack pnpm@9.15.9 --filter @mfd/engine exec vitest run src/systems/game-day-package.test.ts
G4_TARGET_SEASONS=3 corepack pnpm@9.15.9 --filter @mfd/web exec vitest list src/app/store/g4-multi-year-trust.test.ts
G4_TARGET_SEASONS=10 corepack pnpm@9.15.9 --filter @mfd/web exec vitest list src/app/store/g4-multi-year-trust.test.ts
corepack pnpm@9.15.9 --filter @mfd/web typecheck
corepack pnpm@9.15.9 --filter @mfd/engine typecheck
bash scripts/check-math-random.sh
corepack pnpm@9.15.9 exec knip --reporter json
corepack pnpm@9.15.9 --filter @mfd/web exec playwright test --list
corepack pnpm@9.15.9 --filter @mfd/web exec playwright install chromium
corepack pnpm@9.15.9 --filter @mfd/web exec playwright install chromium --only-shell
corepack pnpm@9.15.9 --filter @mfd/web exec playwright test --workers=1 --retries=0 --global-timeout=900000
```

The last three commands are recorded as failed environment-dependent attempts, not passing verification. Both standard and headless-only downloads returned invalid archives. The four-test attempt used a fresh local preview and no player's browser profile. No threshold or UI assertion was weakened. Chromium 153.0.8010.12 / Playwright revision 1243 must be installed successfully before rerunning these suites in a supported execution environment. Existing CI source does not invoke `test:e2e`, so a green current CI run alone would not close this specific gap.

A direct strict TypeScript check including `game-day-package.test.ts` confirmed that Hook now resolves, but exposed two unchanged incomplete `TeamGameStats` objects in the older test fixture. The normal engine configuration excludes test files. The scoped import correction and behavioral pass are established; the full test-file typecheck is not claimed green. Those fixture gaps and Knip diagnostics need separate triage rather than unreviewed suppression or mass deletion.

### PR metadata correction

[PR #70](https://github.com/KevinBigham/MFD/pull/70) was re-read immediately before its approved body-only update and again afterward. At verification on October 7, 2026, it remained open and non-draft at head `79efb2ab307fb3c5073f7d6f7d39c73d7c8c845f`; the corrected body matched exactly. GitHub recorded the update at `2026-10-07T18:15:15Z`.

The description now dates the July verification, identifies the observed state/head and requires reconciliation with current main before integration. Title, draft/open state, source head and code were unchanged. No comment, review request, close, merge or rebase was performed.

### Remaining operational and evidence limits

- Open the save PR only when its associated hosted workload is authorized. Retain full engine/web package defaults, perft and current `test`, `determinism-gate` and `release-gate` checks as final-validation gates. No full local release gate or ecology matrix was run during preparation.
- Before the consistency PR, incorporate the settled first merge, refresh affected evidence and complete the blocked browser verification through an authorized supported environment.
- Manual-only ecology and the guide's main URL take effect on main after the corresponding merge. No remote workflow enable/disable operation was performed; that setting remains unverified. The preserved matrices still contain 100 and 50 jobs when explicitly admitted.
- Existing v5 corpus generation metadata still records `engineCommit: "unknown"`. Corrected counts and the new preflight prevent future unsupported provenance; neither establishes a missing historical generation SHA. Canonical data was not regenerated.
- The new guide, plan and policy are newly authored replacements. They do not recover the unavailable historical originals or authenticate legacy GOAT selectors.
- Native IndexedDB and autosave-trim failure atomicity are outside the focused save test seams. Retain original raw exports; after v38 saves exist, prefer a compatible forward correction rather than an unverified downgrade.
- Merge/release remains a separate action under AGENTS and the approved plan. A successful main CI run can automatically deploy to Pages; current feature-branch evidence is not a production receipt.

Continue from the actual current branch/head and session authorization. Record future required-check runs, integration heads and deployment artifacts when those stages are authorized and executed; do not relabel this preparation evidence as a later release.
