# MFD Release Audit

Current public-release verdict: YELLOW.

MFD is locally gateable, broadly playable, and much stronger than a prototype. I would not call it GREEN for wide public release because the strongest release contract is not enforced in CI/deploy, long-horizon dynasty trust is not proven, and several player-visible systems are shallow or split across save/sidecar boundaries.

## RED/YELLOW/GREEN Scoreboard

| Area | Status | Evidence | Release note |
| --- | --- | --- | --- |
| Local release gate | GREEN | `node scripts/release-gate.mjs --dry-run --list` listed 35/35; `scripts/release-gate.mjs:76-202`; `RELEASE_CONVERGENCE.md:23` | Strong local contract. |
| Release gate tests | GREEN | `node --test scripts/__tests__/release-gate.test.mjs` passed 6 tests | Command contract is tested. |
| Deterministic RNG ban | GREEN | `bash scripts/check-math-random.sh` passed | Good sim discipline. |
| Setup/weekly/gameday browser smokes | GREEN | `RELEASE_CONVERGENCE.md:17-23` | G1-G7 documented as green locally. |
| CI gate coverage | YELLOW/RED | `.github/workflows/ci.yml:24-37`, `55-66`; `.github/workflows/deploy.yml:32-40` | CI/deploy run lighter checks than local release gate. |
| Save version/migration | GREEN | `README.md:7`, `persistence.ts:24-41` | Strong main save path. |
| Save portability | YELLOW | `DynastyCartridge.tsx:354-358` | Sidecars separate from `.mfd`. |
| Long-horizon trust | YELLOW/RED | `_canon/seeds/mfd/README.md:23-29`; `RELEASE_CONVERGENCE.md:64-67` | No clean 20/25/50-year proof. |
| Feature wiring | YELLOW | `GamePlanSetup.tsx:626-627`, `CoachingStaff.tsx:540-541`, `draft-war-room.ts:354-378` | A few visible systems are shallow or state-risky. |
| AI believability | YELLOW | `ai-philosophy.ts:60-138`, `gm-strategies.ts:151-181`, `TeamNeeds.tsx:153-157` | Real systems, weak explainability. |
| Player onboarding | YELLOW | `App.tsx:167-224`, `nav-items.test.ts:195-211` | Powerful but overwhelming. |
| Release docs | YELLOW | `README.md:74-81`, `CHANGELOG.md:3-12`, `package.json:12-21` | Docs lag the new G7 release command. |

## Must Fix Before Broad Public Release

| Rank | Issue | Evidence | Why it is must-fix |
| ---: | --- | --- | --- |
| 1 | Wire `node scripts/release-gate.mjs` into CI/deploy or a protected release workflow | `scripts/release-gate.mjs:76-202`; `.github/workflows/ci.yml:24-37`; `.github/workflows/deploy.yml:32-40` | The public artifact should not ship on weaker gates than the release contract. |
| 2 | Fix draft-war-room trade acceptance and generated-offer validity | `draft-war-room.ts:72-94`, `354-378` | Draft day state trust is core to dynasty saves. |
| 3 | Add true 25-year and 50-year quality soaks | `_canon/seeds/mfd/README.md:23-29`; `RELEASE_CONVERGENCE.md:64-67` | The product promises deep dynasty play; current proof stops short. |
| 4 | Add one-click combined `.mfd + sidecars` export/import | `DynastyCartridge.tsx:354-358`, `dynasty-sidecar-archive.ts:181-244` | Long-term emotional history must be portable. |
| 5 | Tighten the highest-risk save schema islands | `schema.ts:1777`, `2070-2074`, `2100-2113` | Save trust is the genre's foundation. |

## Should Fix Before Public Release

| Issue | Evidence | Release impact |
| --- | --- | --- |
| Progressive route unlock/guided nav not wired | `nav-items.test.ts:195-211` | Reduces new-player overwhelm. |
| Trick plays not simulated | `GamePlanSetup.tsx:626-627`, `trick-plays.test.ts:198-230` | High-visibility expectation gap. |
| CPU intent ledger absent | `ai-philosophy.ts:102-138`, `gm-strategies.ts:151-181` | Makes AI behavior believable. |
| Position coach lifecycle missing | `CoachingStaff.tsx:540-541`, `progression.ts:204-220` | Development system feels half-owned. |
| Release metadata/docs drift | `README.md:74-81`, `CHANGELOG.md:3-12`, `package.json:3` | Avoids operator/player confusion. |
| Inbox read state not durable | `InboxTriage.tsx:60-78` | Reduces weekly loop friction. |
| HOF sidecar stale/mismatch handling | `HallOfFameDirectory.tsx:466-487` | Protects long-run trust. |

## Can Fix After Early Public Release

- Move source-boundary implementation copy behind advanced toggles.
- Add route discovery CTAs for direct-only history/weather/achievement screens.
- Add full-roster command palette search beyond 32 players.
- Add download-directory assertions for export smokes.
- Add image-diff visual regression for key routes; current G6 DOM/console sweeps are useful but not full visual diffs.

## Long-Term Greatness Work

- CPU intent/history model with team-specific personalities and owner styles.
- Multi-era rivalry and head-to-head records.
- Franchise book that automatically authors season arcs.
- Deeper player relationships, mentor trees, agent relationships, and media memory.
- 50-year dynasty benchmark with storage-size, performance, save-load, economy, HOF, records, and generation-turnover metrics.

## Release Decision

Early public release to motivated testers: yes, if the local full gate is run and sidecar/save limitations are disclosed.

Wide public release: no, not yet. Make the must-fix list real first, then rerun the full local gate and enforce it in the release channel.

