# Save Integrity Repair — October 7, 2026

## Reviewed source candidate

The approved seven-field persistence repair is implemented on `codex/mfd-save-integrity-20261007`.

| Identity | Value |
| --- | --- |
| Base | `a51aac1dd2c3e048893a5d897b0cef19ba97f57a` |
| Reviewed implementation commit | [`a2e71ddd1c79320684498afe1364863a1f5d5209`](https://github.com/KevinBigham/MFD/commit/a2e71ddd1c79320684498afe1364863a1f5d5209) |
| Implementation tree | `c09a6aa62a7f0db78943e6dc63e6362b57eeb4ab` |
| Implementation scope | 26 files; this verification record is a subsequent documentation-only addition |
| Runtime | Node v24.19.0, pnpm 9.15.9, Vitest 3.2.4, locked Zod 3.25.76 |

The implementation and its final test fixture received independent source review. A separate reviewer checked the protected current-version markers; the requested one-word correction identifying the old 35→36 migration as historical was applied and rechecked. The published implementation tree matches the frozen local file hashes.

This is a reviewed feature-branch candidate. No main-target PR, hosted validation, merge or deployment is certified by this record.

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

## Executed verification

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

## Remaining validation gates

Full engine/web package suites, `pnpm test:perft`, and current hosted `test`, `determinism-gate` and `release-gate` evidence remain pending. Constructors changed, so the repository's perft requirement is explicitly retained for final validation. The bounded preparation run did not execute a full local release gate, shadow generation or ecology matrices.

The persistence tests prove the covered behavior with mocked storage boundaries. They do not establish native IndexedDB behavior or atomicity if autosave trimming itself fails. Existing transaction implementation was not changed. No real player save or production browser was used.

Before a main-target PR, confirm the applicable hosted-run authorization in the current session. Recheck its integration base and head, obtain the required checks, and retain independent review before any authorized merge. A successful main CI run can deploy to Pages, so merge/release authorization must cover that consequence.

## Recovery and rollback

Keep original raw exports outside autosave rotation before live validation. The repaired loader preserves fields still present in an original payload; it cannot reconstruct data already stripped and overwritten by older saves.

After v38 saves exist, prefer a compatible forward correction. Reverting code alone is not automatically a safe data rollback: the old loader does not reject a higher-version payload and can strip these fields again. A deployed downgrade needs explicit compatibility proof and retained original backups.
