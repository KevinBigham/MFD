# MFD File-Consistency Repair Plan

**Adopted:** October 7, 2026. **Audit baseline:** `a51aac1dd2c3e048893a5d897b0cef19ba97f57a`.

This is the current repository queue for the user-approved MFD Repair Execution Plan. It is newly authored and uses **MFD-01 through MFD-16**. It does not reconstruct the missing 100-item GOAT Rev-2 roadmap. A legacy item number or phase name requires its own authentic approved source.

Read [AGENTS.md](../../AGENTS.md) first and recheck the actual implementation base. The source-preparation work is authorized; this document grants no additional hosted-run, merge, or release permission beyond the current session. Keep the save packet isolated. The coordinator owns publication and final evidence; builders do not stage, commit, or publish another lane's work.

## Finding ledger

Each row is a selectable item. Its scope and acceptance apply together with the packet rules below. All results remain **verification pending** until actual evidence is recorded; this table does not claim a merge or deployment.

| ID | Packet / owner | Scope and approved disposition | Acceptance |
| --- | --- | --- | --- |
| MFD-01 | P1 / save owner | Coordinated typed persistence repair in engine save/types/migrations and web seed/persistence tests; current-version assertions and narrowly approved markers in AGENTS/README/three protected CODEX documents. | Seven-field contract, valid populated values and deliberate missing defaults survive actual load/import; old/current saves and next-action behavior verified; historical evidence preserved. |
| MFD-02 | P2 / documentation owner | `docs/PLAY_GUIDE.md`, `apps/web/src/features/launch/AboutScreen.tsx`, and `apps/web/src/features/launch/AboutScreen.test.tsx`: supply a new source-based player guide and correct the rendered link. | Exact Play Guide anchor points to a readable candidate-tree document with accurate player instructions; focused About tests pass. |
| MFD-03 | P4 / automation owner | Both ecology workflow files: manual-only source operation and default-false full-matrix acknowledgement. | Missing/false input admits no matrix runner; acknowledged manual input preserves matrices, thresholds, and receipts; no certification run claimed. |
| MFD-04 | P2 / documentation owner | Both phase-packet skills, AGENTS/CLAUDE routing, `docs/README.md`, and this plan: register explicit MFD selectors. | Mirrors are identical; selected MFD packets contain all six sections; unknown/legacy selectors never invent or alias items. |
| MFD-05 | P2 / documentation owner | `CODEX_FINISH_GAME_MARATHON_PROMPT.md`: a new short replacement handoff at the existing link target. | Links resolve; new authorship and retired-prompt history are explicit; no old machine assumption or unbounded marathon. |
| MFD-06 | P2 / documentation owner | `docs/verification/fast-tier.md`, `shadow-tier.md`, and canonical README: actual enforcement plus one current baseline-update policy. | Configured hooks/commands match documentation; current policy links resolve without ignored local files; no heavy Stop hook added. |
| MFD-07 | P3 / tooling owner | Web development manifest/lock, existing Playwright config/suites as needed, and runner prerequisites. | Exact compatible runner is installed from a frozen lock; discovery and supported browser suites actually run; limits reported. |
| MFD-08 | P2 / documentation and automation owners | Canonical README metrics; `scripts/shadow-regression.ts` update preflight and focused guard tests. | Stored metrics match JSON; old report/meta bytes retained; invalid provenance fails before generator/write; valid source SHA captured once; compare mode preserved. |
| MFD-09 | P3 / tooling owner | G4 wrapper/test titles and focused wrapper tests. | Labels match effective validated horizon; approved three-/ten-season defaults and thresholds unchanged. |
| MFD-10 | P2 / documentation owner | New handoff/current routing and historical banner on `docs/audits/FABLE_NEXT_PATCH_PROMPT.md`. | Historical prompts cannot expand authority; protected-file exception remains limited to the approved P1 current markers. |
| MFD-11 | P2 / documentation owner | Historical notices listed below; `docs/README.md` current index. | Original records remain intact below notices; current work/evidence are identifiable; past verdicts are not relabeled as new results. |
| MFD-12 | P3 / documentation and tooling owners | Retain `public/manifest.json`; add `public/README.md`; preserve existing index-document tests. | Intentional legacy-test role explained; active web manifest still serves `/MFD/` and its existing icons. |
| MFD-13 | P3 / tooling owner | Remove unsupported Storybook commands from the web manifest; document retained story files as reference. | No active command promises an unavailable runner; unrelated web commands and story source preserved. |
| MFD-14 | P3 / tooling owner | Correct the `Hook` type import in `packages/engine/src/systems/game-day-package.test.ts`. | Type points to its real declaration and focused test passes; excluded test typechecks are not overstated. |
| MFD-15 | P3 / tooling owner | `knip.json`: actual workspace roots/entry points and installed-major schema. | Pinned Knip parses/runs without the old phantom-workspace assumptions; no automatic source deletion. |
| MFD-16 | P5 / coordinator | PR #70 body only, after fresh metadata inspection. | Description agrees with observed draft/head/state; old checks dated; no source/ref/draft-state/merge/close change. |

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

**Preparation status:** implementation in progress; independent review, final checks, source PRs, and publication receipts are pending in this ledger. This is not an acceptance certificate.

For each completed row record:

- Actual candidate commit/tree and reviewed scope; owner/reviewer.
- Command, environment, exit result, assertion scope, skips, and limitations.
- PR/head and required-check run links once they exist; current-main and deployment evidence only after authorized release.
- One disposition: **fixed and verified**, **explained intentional state**, or **explicit remaining limitation/decision**. A limitation is not a passing check.

Keep the old v5 corpus generation SHA limitation separate from corrected prose and future prevention. A newly approved guide/plan/policy repairs current work; it does not prove that an unavailable legacy original was recovered. Retain original backups and account for new-save compatibility before any code rollback after the save packet ships.
