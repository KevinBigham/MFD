# MFD Save System Audit

Verdict: YELLOW-GREEN. The main save path is strong enough for early release because versioning, migration, schema validation, IndexedDB slots, cartridge import/export, and autosaves exist. It is not yet "dynasty-sim legendary" because long-history state has permissive schemas, `.mfd` files exclude browser-local sidecars, and no clean 25/50-year trust proof exists.

## Save Trust Scoreboard

| Area | Status | Evidence | Audit note |
| --- | --- | --- | --- |
| Current save version | GREEN | `README.md:7`, `AGENTS.md:35-39`, `RELEASE_CONVERGENCE.md:9`, `packages/engine/src/config/difficulty.ts:93` | `SAVE_VERSION = 36` is consistently known. |
| Migration chain | GREEN | `packages/engine/src/save/migrations.ts`; `save-version-drift.test.ts` | Registered migration policy exists; generated current/previous policy supplements old fixture gap. |
| Load/import order | GREEN | `apps/web/src/app/store/persistence.ts:24-41`, `84-107` | Parse cartridge, migrate, schema-validate, initialize agents. |
| IndexedDB slots | GREEN | `apps/web/src/lib/db.ts:1-72` | Dexie slots, autosaves, most-recent loading, trim to 3 autosaves. |
| Cartridge envelope | GREEN | `dynasty-cartridge.ts:10-19`, `84-127` | Versioned `mfd-cartridge.v1`, rejects empty/bad strings. |
| Sidecar archive validation | GREEN | `dynasty-sidecar-archive.ts:120-145`, `207-244` | Validates all sidecar payloads before replacing. |
| Main/sidecar portability | YELLOW | `DynastyCartridge.tsx:333-358` | `.mfd` does not include HOF archive, scrapbook, ROY, continuity, career meta, or derived rivalries. |
| Long-history schemas | YELLOW | `schema.ts:2038`, `2052-2054`, `2070-2074`, `2100-2113`, `2214` | Several `z.any`/passthrough fields remain. |
| Result payload schema | YELLOW | `schema.ts:1774-1778` | `ScheduledGame.result` is `z.any().nullable()`. |
| Long-horizon proof | RED/YELLOW | `_canon/seeds/mfd/README.md:17-29`, `RELEASE_CONVERGENCE.md:60-67` | Current 20y shadow is truncated and contains 508 high anomalies as a frozen drift detector. |

## Main Save Flow

1. Build slot payload:
   - `apps/web/src/app/store/persistence.ts:44-63` gets user team, builds a cartridge with `buildCartridge(game, { teamName, season, week })`, and stores timestamp/year/week/team/difficulty/version metadata.

2. Autosave/manual save:
   - `autosaveDynasty` saves then trims autosaves to 3 at `persistence.ts:66-69`.
   - `saveDynastyToSlot` writes a manual slot at `persistence.ts:72-74`.
   - Dexie table is `mfd.saves` at `db.ts:23-31`.

3. Load/import:
   - `loadSaveSlot` and `loadImportedCartridge` parse the cartridge, migrate to `SAVE_VERSION`, run `SaveStateSchema.safeParse`, summarize validation errors, then call `ensureAgentsInitialized` (`persistence.ts:24-41`, `84-107`).

4. Export/import UI:
   - Save/Load route builds/copies/downloads cartridges, imports pasted/file cartridges, and separately exports/imports sidecar archives (`DynastyCartridge.tsx`).

## Strengths

| Strength | Evidence | Why it matters |
| --- | --- | --- |
| Browser storage moved to IndexedDB slots | `db.ts:1-72` | Better than one fragile localStorage blob. |
| Save version is surfaced and stable | `README.md:7`, `NewGameScreen.tsx` displays save version | Player/operator can identify compatibility. |
| Import validation gives issue summaries | `persistence.ts:29-37` | Bad saves fail with specific paths instead of silent corruption. |
| Sidecar import validates before mutation | `dynasty-sidecar-archive.ts:207-244` | Prevents partial malformed sidecar replacement. |
| Full local gate includes save round trip | `scripts/release-gate.mjs:115-120`; `RELEASE_CONVERGENCE.md:23` | Save smoke is part of local release proof. |
| Export sanitizes very heavy broadcast payloads | `dynasty-cartridge.ts:52-79` | Reduces file bloat, but needs player-facing disclosure. |

## Save Risks

| ID | Severity | Risk | Evidence | Player impact | Technical impact | Next slice |
| --- | --- | --- | --- | --- | --- | --- |
| S01 | HIGH | Long-history state accepts broad `any` payloads | `schema.ts:2070-2074`, `2100-2113`, `2214` | A corrupted dynasty history can pass schema and fail later in UI | Migration and validation lose precision | Tighten `franchiseHistory`, `playerArchive`, `weekSummaries`, `eventLog`, `playoffBracket` one by one |
| S02 | HIGH | Game result shape is not validated | `schema.ts:1774-1778` | Imported schedule result may break game-flow/play-by-play surfaces | Replay/report code must defend against arbitrary result shape | Add `GameResultSchema` or sanitized result subset |
| S03 | HIGH | Main `.mfd` cartridge omits sidecars | `DynastyCartridge.tsx:354-358` | Player can move save and lose HOF/scrapbook/career/rivalry memory | Portability is split across two backups | One-click combined archive: cartridge plus sidecars |
| S04 | HIGH | 25/50-year save trust is not proven | `_canon/seeds/mfd/README.md:23-29`; `RELEASE_CONVERGENCE.md:64-67` | Player considering deep dynasties lacks proof | Late-history overflow/regression can remain hidden | Add true 25-year and 50-year soak reports |
| S05 | MEDIUM | HOF sidecar can stale relative to GameState | `HallOfFameDirectory.tsx:466-487` | Count mismatches weaken trust | Snapshot sync is manual/year-rollover bound | Auto-sync after HOF mutation and repair mismatch |
| S06 | MEDIUM | Sidecar import is all-or-nothing replacement | `dynasty-sidecar-archive.ts:229-244` | Importing archive can overwrite newer browser-local history | No merge/preview conflict handling | Add preview and per-dynasty merge |
| S07 | MEDIUM | Legacy `{ save }` import acceptance is broad | `dynasty-cartridge.ts:115-123` | Confusing payloads can reach migration/schema before failing | Legacy path has little envelope provenance | Improve legacy diagnostics and stricter shape checks |
| S08 | MEDIUM | Export strips broadcast payloads | `dynasty-cartridge.ts:52-79` | Imported save may not carry full broadcast replay detail | Replay/archive fidelity reduced | Persist compact replay summaries or label explicitly |
| S09 | MEDIUM | Backup prompt helper uses wall clock | `dynasty-cartridge.ts:140-143` | Stale helper can mislead future maintainers | Two backup-reminder concepts | Remove or rewire to production season-based helper |
| S10 | MEDIUM | Autosaves trim to 3 without obvious backup education | `db.ts:63-72`; `README.md:49-55` | Player may overestimate recovery depth | Limited crash recovery window | Save browser copy: autosave retention and export reminder |

## Release Save Verdict

Early public release: acceptable if the full local gate is run before publishing and save/sidecar limitations are disclosed. Wide public release: fix S01-S04 first.

Rollback guidance for future save work: any persistent `GameState` field requires type update, Zod schema update, seed/default creation, migration, old-save tests, and save round-trip/playtest verification per `AGENTS.md:35-47`.

