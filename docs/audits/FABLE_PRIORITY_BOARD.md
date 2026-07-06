# Fable Priority Board

Date: 2026-07-05
Source: `FABLE_GOAT_REVIEW.md` (Fable's challenge pass over the Codex audit packet).
Scoring: ROI = value per unit effort for the GOAT goal. Risk = chance of breaking saves/sim/release. Confidence = how sure Fable is the item is correctly scoped, based on source verification.

Standing rules for every item: respect `AGENTS.md` (response shape, verification defaults, pnpm 9.15.9). No sim-math or save-shape change ships without Kevin's explicit approval and its own design note. Items marked **[APPROVAL]** must not start as casual patches.

---

## Tier 1 — Do first (publication trust)

### 1. Deploy integrity hardening
- **ROI:** Very high · **Risk:** Low · **Effort:** ~1h · **Confidence:** High
- Remove `codex/phase4a-season-loop` from `deploy.yml` triggers (stale-branch pushes currently deploy to production). Pin pnpm to `9.15.9` (currently floating `9`, drifting from CI and `package.json`). Add `check-bundle-size.sh` + `smoke-test-built-page.sh` to the deploy build so the shipped artifact gets at least the same smoke CI's test job gives its own.
- **First files:** `.github/workflows/deploy.yml`
- **Proves done:** deploy triggers only on `main` + dispatch; pnpm pinned; two smoke steps present; drift test (item 2) covers regressions.

### 2. Release-doc truth + drift test
- **ROI:** High · **Risk:** Low · **Effort:** ~1–2h · **Confidence:** High
- README launch gates lead with `pnpm release:gate` (36-step contract). CHANGELOG post-launch entry for July convergence. Fix stale `navigation.ts:4-6` comment ("shell does not hide nav items" — it does, via `getNavUnlockStatus`). Fix `CODEX_GAME_GUIDE.md` stale nav line + old home-path caveat. Add `scripts/__tests__/release-docs.test.mjs` so README can't omit `release:gate` and deploy.yml can't regain stale branches or unpinned pnpm.
- **First files:** `README.md`, `CHANGELOG.md`, `packages/engine/src/config/navigation.ts`, `CODEX_GAME_GUIDE.md`, `scripts/__tests__/release-docs.test.mjs`
- Items 1+2 together = the single best first patch (`FABLE_NEXT_PATCH_PROMPT.md`).

### 3. One full 36/36 release-gate run — local, then remote **[APPROVAL: writes generated artifacts]**
- **ROI:** High · **Risk:** Low (evidence-gathering) · **Effort:** 2–4h wall-clock · **Confidence:** High
- G7 in `RELEASE_CONVERGENCE.md` stays yellow until one uninterrupted local `node scripts/release-gate.mjs` run and one remote CI release-gate run are green. The remote run also answers whether 20+ browser smokes pass on ubuntu — a prerequisite for item 4.
- **First files:** none (run + record in `RELEASE_CONVERGENCE.md`, `STATUS.md`)

### 4. Structurally gate deploy on CI success
- **ROI:** High · **Risk:** Medium (could freeze deploys if remote gate is flaky) · **Effort:** 2–4h · **Confidence:** Medium
- Today CI and deploy are parallel workflows racing on push to `main`; the release-gate result is decorative for publication. Convert deploy to `workflow_run` on CI success (or fold deploy into `ci.yml` as a final job needing `release-gate`), and/or add branch protection + a `github-pages` environment rule. **Sequenced strictly after item 3 proves remote green.**
- **First files:** `.github/workflows/deploy.yml`, `.github/workflows/ci.yml`; repo settings (needs git-connected checkout / GitHub access)

## Tier 2 — Backup trust (dynasty memory)

### 5. Combined Backup as the primary export
- **ROI:** High · **Risk:** Low · **Effort:** 2–3h · **Confidence:** High
- Make Combined Backup the default/primary CTA in the Dynasty Cartridge screen; relabel classic `.mfd` as "Advanced — current save only, excludes dynasty archives." UI copy + ordering + tests only; no format changes.
- **First files:** `apps/web/src/features/dynasty-cartridge/DynastyCartridge.tsx`, its `.test.tsx` / `.source.test.ts`

### 6. Sidecar import preview + never-replace-absent-stores
- **ROI:** High · **Risk:** Medium · **Effort:** 1–2 days (phase 1 ~half day) · **Confidence:** Medium-high
- **Phase 1 (bug-adjacent):** stop `parsePayload` from substituting `emptyRivalryPayload()` for a *missing* rivalries key and then `replaceRivalries()` wiping local history (dynasty-sidecar-archive.ts:129, 238). Rule: a store the archive didn't carry is never written. Add a pre-import preview (summary counts + dynasties) with explicit confirm before any `replace*`.
- **Phase 2:** per-dynasty selective import / merge with conflict summary. Fixtures: older archive without rivalries, archive with subset of dynasties, conflicting dynasty ids.
- **First files:** `apps/web/src/lib/dynasty-sidecar-archive.ts`, `dynasty-sidecar-archive.test.ts`, `DynastyCartridge.tsx`

### 7. Watch-list portability decision
- **ROI:** Medium · **Risk:** Low · **Effort:** 1–2h · **Confidence:** High
- Decide: label pins as browser-local convenience state (cheap, recommended now) or fold `mfd.watchlist.v1` into Combined Backup v2 (later, when the envelope next versions). Don't let this sit ambiguous next to trust-oriented backup copy.
- **First files:** `apps/web/src/features/watch-list/WatchListScreen.tsx`, `watchListPrefs.ts`

## Tier 3 — Schema hardening (one island per patch) **[APPROVAL: save-shape adjacent]**

### 8. Island 1: typed `ScheduledGame.result`
- **ROI:** High · **Risk:** Medium-high · **Effort:** 1–2 days · **Confidence:** Medium
- `result: z.any().nullable()` (schema.ts:1777) feeds replay/game-day consumers. Type it against the real `GameResult` shape, with migration + old-save fixtures proving v≤36 saves still parse. Requires type update, Zod update, migration, seed default, old-save tests per `AGENTS.md`.
- **First files:** `packages/engine/src/save/schema.ts`, `packages/engine/src/save/migrations.ts`, `save.test.ts`

### 9. Islands 2+: owners → draftClass → eventLog → playoffBracket → archives
- **ROI:** Medium-high · **Risk:** Medium each · **Effort:** ongoing, one per patch · **Confidence:** Medium
- Same discipline each time. Never batch islands. `TeamPersistedSchema.passthrough()` and the long-history arrays (franchiseHistory, playerArchive, rivalries, farewellTours, weekSummaries, earnedDoctrines) come last — they're the least-consumed.

## Tier 4 — Gameplay depth (the GOAT arc) **[APPROVAL: sim-touching, design note first]**

### 10. Press responses → bounded, receipted consequences
- **ROI:** High (emotional payoff per effort) · **Risk:** Medium · **Effort:** 2–4 days after approval · **Confidence:** Medium
- Design note first: exact deltas (small morale/owner/social effects), caps, decay, receipt format, before/after examples. Then wire player response choices past quote-only (`game-store.ts:2685-2693`) and delete the "gameplay does not change" disclaimer honestly.
- **First files:** design doc → `packages/engine/src/systems/press-conference.ts`, `apps/web/src/app/store/game-store.ts`, `PressConferenceModal.tsx`

### 11. Trick plays into live sim with receipts
- **ROI:** Very high · **Risk:** High (guarded out of `game-sim.ts`/`game-flow.ts`/`franchise-week.ts` by explicit boundary tests — that's a fence with a reason) · **Effort:** 1–2 weeks · **Confidence:** Low-medium
- Design note must cover: which plays, trigger conditions, RNG channels, failure modes, receipt format, and exactly which boundary tests change and why. No implementation until approved.
- **First files:** design doc → `packages/engine/src/systems/trick-plays.ts`, `trick-plays.test.ts`, then sim files per approved design

### 12. Position-coach market/budget lifecycle
- **ROI:** Medium · **Risk:** Medium · **Effort:** 3–5 days · **Confidence:** Medium
- Replace instant generated upgrades with a hiring market + budget + development arc. After items 10/11 establish the depth pattern.
- **First files:** `packages/engine/src/systems/position-coaches.ts`, `apps/web/src/features/coaching/CoachingStaff.tsx`

## Tier 5 — Long-horizon proof

### 13. 25/50-year trust corpus + anomaly budget
- **ROI:** Medium now, high long-term · **Risk:** Low · **Effort:** 2–3 days · **Confidence:** Medium
- Deterministic replay snapshots, cross-version save round-trips, anomaly budgets as a periodic opt-in run. Turns determinism discipline into a product claim.

### 14. Release evidence dashboard
- **ROI:** Medium · **Risk:** Low · **Effort:** 1–2 days · **Confidence:** Medium
- One place (script → `STATUS.md` section) reporting: last local gate, last remote gate, route sweep, bundle size, playtest anomaly count. Kills "is the ledger current?" ambiguity for every future session.

---

## Explicitly parked (do not spend time yet)

- Fresh full-repo audits; rewriting historical audit ledgers (one supersession line each, max).
- Big-bang schema strictness; multiple islands per patch.
- Performance tuning (bundle gate green, 21 KB headroom, no failing evidence).
- Chip feature expansion; durable inbox read receipts (out of scope by design).
- Root `0.0.1` vs web `1.0.0` version metadata (one-line note when convenient).
- Dependency vulnerability audit — schedule ~1h immediately before wide public release, not now.
