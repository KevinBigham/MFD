# Save Integrity Repair — October 7, 2026

## Initial reviewed source candidate

The approved seven-field persistence repair is implemented on `codex/mfd-save-integrity-20261007`.

| Identity | Value |
| --- | --- |
| Base | `a51aac1dd2c3e048893a5d897b0cef19ba97f57a` |
| Reviewed implementation commit | [`a2e71ddd1c79320684498afe1364863a1f5d5209`](https://github.com/KevinBigham/MFD/commit/a2e71ddd1c79320684498afe1364863a1f5d5209) |
| Implementation tree | `c09a6aa62a7f0db78943e6dc63e6362b57eeb4ab` |
| Implementation scope | 26 files; this verification record is a subsequent documentation-only addition |
| Runtime | Node v24.19.0, pnpm 9.15.9, Vitest 3.2.4, locked Zod 3.25.76 |

The implementation and its final test fixture received independent source review. A separate reviewer checked the protected current-version markers; the requested one-word correction identifying the old 35→36 migration as historical was applied and rechecked. The published implementation tree matches the frozen local file hashes.

That initial source review preceded PR #108 and did not certify hosted checks or release. The October 8 update below records subsequent execution and the narrow test-boundary correction. Merge and deployment remain pending.

## Durable field contract

| Field | Behavior after normalization |
| --- | --- |
| `activeMentors` | Retains each typed hired contract; absent list becomes empty. |
| `mentorBudget` | Retains the exact finite nonnegative balance, including zero. An absent balance receives the existing 2.5 default only when there are no active contracts. A populated list with missing or invalid balance fails validation; no spending history is inferred or refunded. |
| `userDynastyEras` | Retains names, year boundaries, triggers and achievements. Missing history becomes empty without manufacturing eras from the current team label. |
| `trainingCampResults` | Retains all report, standout, injury, battle and headline fields. An absent report list becomes empty; loading does not rerun camp. |
| `pendingPassedPickTargets` | Retains the ordered pending queue. Its next intended draft action consumes the receipt once. |
| `setupState` | Preserves typed optional progress, decisions, crisis/forecast data and nested blueprint. Completed setup stays completed; incomplete setup retains its phase; absent setup stays absent. |
| `franchiseBlueprint` | Preserves the optional finalized summary without rerunning setup or applying its effects again. |

The new migration is 37→38. The web seed, engine test seed and playtest seed initialize independent empty arrays and the shared unchanged mentor budget. Types, validation, migration, source version, cleanup guard and approved current-document markers are coordinated. The original shared loader remains unchanged: every covered entry uses its existing migrate → schema → restoration boundary. There is no blanket passthrough or untyped replacement for the new nested schemas.

### Historical record compatibility

Full validation of the eight original golden fixtures exposed two defects already present at the base: v10 stored an empty `records` array, and v20 omitted the `franchise` bucket. Both were reproduced against the unchanged v37 schema before repair.

Only the new 37→38 hop handles those shapes: an empty array becomes the existing empty record book; a structurally valid three-bucket object missing `franchise` receives an empty franchise bucket. Populated records survive. Nonempty arrays, explicit null and malformed bucket shapes remain errors. No historical fixture bytes or earlier migration registrations were changed.

## Initial focused verification

The initial populated regression failed through the actual web cartridge loader: all seven fields became undefined. The repaired loader passed that regression. The fixture uses real mentor, era, setup, camp and draft writers. Its final form requires a nonempty camp battle and the existing accountability setup effect, so the no-replay checks exercise populated outcomes.

**242 distinct targeted tests passed across 16 suites.**

| Executed coverage | Result |
| --- | --- |
| Five engine save suites: durable state, migrations, version drift, golden saves and general save tests | 109 passed |
| Seven engine consumer suites: mentors, eras, near-miss draft wiring, setup, camp, cartridge and test helpers | 86 passed |
| Four web suites: persistence, seed, combined backup and import journal | 47 passed |
| Final strengthened durable-fixture rerun | 28 passed; these overlap the 109 save tests and are not added twice |
| Engine and web package typechecks | Both passed |
| Math.random source gate | Passed |
| Cleanup script shell syntax | Passed; the full cleanup script was not executed |
| Diff whitespace and preservation checks | Passed |

From the repository root, the principal commands were:

```bash
corepack pnpm@9.15.9 install --frozen-lockfile
corepack pnpm@9.15.9 --filter @mfd/engine exec vitest run src/save/durable-feature-state.test.ts src/save/migrations.test.ts src/save/save-version-drift.test.ts src/save/golden-saves.test.ts src/save/save.test.ts
corepack pnpm@9.15.9 --filter @mfd/engine exec vitest run src/systems/alumni-mentors.test.ts src/systems/dynasty-era.test.ts src/systems/near-miss-wiring.test.ts src/systems/franchise-setup.test.ts src/systems/training-camp.test.ts src/systems/dynasty-cartridge.test.ts src/systems/test-helpers.test.ts
corepack pnpm@9.15.9 --filter @mfd/web exec vitest run src/app/store/persistence.test.ts src/app/store/seed.test.ts src/lib/dynasty-combined-backup.test.ts src/lib/combined-import-journal.test.ts
corepack pnpm@9.15.9 --filter @mfd/engine exec vitest run src/save/durable-feature-state.test.ts
corepack pnpm@9.15.9 --filter @mfd/engine typecheck
corepack pnpm@9.15.9 --filter @mfd/web typecheck
bash scripts/check-math-random.sh
bash -n scripts/cleanup-gate.sh
git diff --check
```

The web tests serialize actual `SaveSlot.data` through mocked DB seams, load it using real persistence functions, save the loaded state again, and inspect the resulting cartridge. They cover manual saves, autosave/latest reload, text/file-like import, combined-backup staging, persistence/sidecar failure rollback, and rejection without replacing the active Zustand game. Continuity checks cover mentor effects and spending, era history, camp/player outcomes, setup effects and a draft queue consumed once.

All eight historical golden JSON files, old migrations, the version-drift guard, original loader, dependency manifests and lockfile retain their original bytes. Historical July v37 receipts and canonical baseline data were preserved. The cartridge envelope, IndexedDB schema and sidecar versions are unchanged; GameState v38 is a separate contract.

## Hosted validation and correction — October 8, 2026

Kevin approved opening the save PR and starting its required hosted CI and prescribed local perft validation. [PR #108](https://github.com/KevinBigham/MFD/pull/108) opened as a draft from head `11470347484e92d9afd598cd5378c001453ce031`, based on `a51aac1dd2c3e048893a5d897b0cef19ba97f57a`. Its initial integration commit was `f57788878411fb9dc77d7b88cee537275165a437`, with tree `a5f9e1d2340f2d7210cc85470c9f91d2efb4d592`, identical to that candidate's tree.

### Initial hosted result and diagnosed correction

[CI run 37713640811](https://github.com/KevinBigham/MFD/actions/runs/37713640811), attempt 1, passed the determinism gate, frozen install and all package typechecks. Its package tests reported 4,853 passed and one failed: design system 123/123, engine 2,416/2,416, and web 2,314 passed / one failed. The full ten-season G4 test passed. No Vitest skips were reported.

The sole failure was the unchanged web architecture guard. Three new web tests imported the private engine durable-state helper; the persistence test also imported two historical JSON fixtures as private engine modules. The dependent build, bundle-size, built-page smoke and release gate did not execute.

The correction keeps the web fixture in `apps/web/src/app/store/durable-feature-state.test-helpers.ts`. It uses already exported engine feature writers and the existing web seed factory, preserving the mentor, era, setup, camp and draft writer sequence. The three tests import that local helper. The persistence test reads the original v10/v20 JSON files explicitly as test data through Node file access. The architecture guard, engine package exports, engine fixture, historical JSON bytes and all regression assertions are unchanged.

The focused before-run reproduced the exact five import violations. After correction, **54 tests passed across five suites**: architecture boundaries 7, persistence 30, seed 5, combined-import journal 6 and combined backup 6. Positive mentor effects, camp battles and setup effects remain nonempty, so the no-replay assertions still exercise populated outcomes. The web typecheck also passed.

```bash
corepack pnpm@9.15.9 --filter @mfd/web exec vitest run src/app/architecture-boundaries.test.ts src/app/store/persistence.test.ts src/app/store/seed.test.ts src/lib/combined-import-journal.test.ts src/lib/dynasty-combined-backup.test.ts
corepack pnpm@9.15.9 --filter @mfd/web typecheck
```

This test-only correction and its evidence update form the plan's single bounded corrective candidate. Fresh required hosted checks on the corrected PR integration remain pending; the PR description records their live identities and outcomes. A skipped release gate is not a pass.

### Prescribed local perft result

`corepack pnpm@9.15.9 test:perft` exited **0** after **696.966 seconds**, from 01:38:27 to 01:50:04 UTC, using Node 24.19.0 / pnpm 9.15.9. Each persona ran once at seed 42 for ten seasons, with the unchanged maxSteps 1000, round-trip interval 10 and host performance probes.

| Persona | Seasons completed | High anomalies | Medium warnings | Healthy-shortage game-weeks | CPU receipts / audited events |
| --- | ---: | ---: | ---: | ---: | ---: |
| SPEEDRUNNER | 10/10 | 0 | 227 | 0 | 6,878/6,878 |
| GLUTTON | 10/10 | 0 | 226 | 0 | 6,811/6,811 |
| CHEAPSKATE | 10/10 | 0 | 216 | 0 | 6,377/6,377 |
| CHURN_ARTIST | 10/10 | 0 | 227 | 0 | 7,112/7,112 |
| INJURY_MAGNET | 10/10 | 0 | 223 | 0 | 7,069/7,069 |

All five certifications passed. Each report has 293 accepted advances, including phase transitions. The 1,119 warnings are all medium roster-minimum snapshots across regular season, playoffs and other phases; there are no low or high canonical anomalies. This is five ten-season runs, not one continuous fifty-season dynasty.

Three-iteration cartridge-load medians were 383.72–428.92 ms, all below the existing 3,000 ms target. All five reports carry the informational worker recommendation because clone-plus-encode medians exceeded its threshold. Host timing fields do not control certification and are not deterministic replay evidence.

The initial launch stopped before any persona ran because nested lifecycle resolution selected runtime pnpm 11.25.0. A scratch-only process PATH pin corrected it to 9.15.9 without source, dependency or workload changes. One actual simulation run executed; its source stayed clean at head `11470347484e92d9afd598cd5378c001453ce031`. The binding execution receipt has SHA-256 `a3a53ea19161f4b5da8fe8b152526d67814d7c7895b40fc766f3187f52d55593`.

An independent reviewer verified all five report hashes and copied bytes, certification/count consistency, runtime settings and unchanged source. The later import correction changes only web test wiring and this evidence record. All 531 existing engine/web runtime files retain aggregate SHA-256 `5ac06379f96548fc77d4e18e2e91f461c5978daca8ae3772a2f5f007e6845b26`; the added helper is referenced only by the three tests. No additional local perft run was needed for that test-only correction. Its new commit still requires fresh hosted integration checks.

Perft samples migration/schema-normalized round-trip stability and receipt coverage for qualifying recorded CPU events. The separate populated-loader regressions establish the covered field-retention behavior. No full local release gate or ecology matrix was run.

## Remaining limits and release gates

The persistence tests prove the covered behavior with mocked storage boundaries. They do not establish native IndexedDB behavior or atomicity if autosave trimming itself fails. Existing transaction implementation was not changed. No real player save or production browser was used.

Required hosted `test`, `determinism-gate` and `release-gate` checks must pass on the corrected integration. Recheck the PR base and head and retain independent review before any authorized merge. Merge and deployment remain held: a successful main CI run can deploy to Pages, so merge/release authorization must cover that consequence.

## Recovery and rollback

Keep original raw exports outside autosave rotation before live validation. The repaired loader preserves fields still present in an original payload; it cannot reconstruct data already stripped and overwritten by older saves.

After v38 saves exist, prefer a compatible forward correction. Reverting code alone is not automatically a safe data rollback: the old loader does not reject a higher-version payload and can strip these fields again. A deployed downgrade needs explicit compatibility proof and retained original backups.
