# MFD Master Audit Report

Audit date: 2026-06-19

Governing document: `AUDIT_GOAL_MFD.md`.

Scope: audit-only. The only files changed are audit/report markdown artifacts.

## 1. Executive Summary

Mr. Football Dynasty is far beyond prototype status. It has a deterministic browser engine, a broad franchise-management surface, a strong local 35-step release gate, stable save versioning at v36, a real week-advance spine, meaningful cap/contract/acquisition systems, and a lot of dynasty-history machinery.

The release verdict is YELLOW, not GREEN. The game is likely suitable for motivated early testers if the local full gate is run before publishing. It is not yet ready for confident wide public release because:

1. The real release gate is local-only; CI and deploy can ship after weaker checks.
2. Long-horizon dynasty trust is not proven. The frozen "20y" shadow baseline truncates near 10 completed seasons and includes 508 high anomalies by design.
3. Save memory portability is split: `.mfd` cartridges do not include several browser-local sidecars that carry emotional dynasty history.
4. A few visible systems are half-wired or shallow: draft war-room trades, trick plays, position coaches, press conferences, inbox read state, progressive nav unlocks.
5. CPU AI has real underlying models but needs better player-facing intent history and receipts to feel smart.

No audited feature looked completely fake or dead. The strongest recent pattern is truthful boundary copy: many screens now tell the player when a route is read-only or planning-only. That prevents deception, but it also exposes implementation seams that should eventually move behind advanced/source views.

## 2. Current Release Verdict

Verdict: YELLOW.

Early public release to franchise-sim testers: acceptable only after running `node scripts/release-gate.mjs` locally and disclosing save/sidecar limitations.

Wide public release: wait until the Top-5 release issues are fixed.

Top release evidence:

- `scripts/release-gate.mjs:76-202` defines 35 release steps covering static checks, typechecks, tests, build, bundle, built-page smoke, Math.random audit, engine season/save smoke, 10-season playtest, shadow regression, G4 soak, G1/G2 setup, G5 browser, G3 football ops, and G6 desktop/mobile UX.
- `RELEASE_CONVERGENCE.md:23` records a full local pass of 35/35 steps in 2550.5 seconds.
- `.github/workflows/ci.yml:24-37` and `.github/workflows/ci.yml:55-66` run lighter checks, not the release gate.
- `.github/workflows/deploy.yml:32-40` deploys after install, typecheck, tests, and web build, not the full gate.
- `_canon/seeds/mfd/README.md:23-29` says the 20y scenario is truncated and is a drift detector, not steady-state certification.

## 3. Top 25 Blockers Or Highest-Leverage Issues

| Rank | Sev | Title | Evidence | Player impact | Technical impact | Recommended fix | Complexity |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | P1 | Full release gate is not enforced in CI/deploy | `scripts/release-gate.mjs:76-202`, `.github/workflows/ci.yml:24-37`, `.github/workflows/deploy.yml:32-40` | Public artifact can ship after weaker proof | Release contract is optional | Add protected release workflow for `node scripts/release-gate.mjs`, or split long jobs into required groups | M |
| 2 | P1 | No true 25/50-year dynasty trust proof | `_canon/seeds/mfd/README.md:23-29`, `RELEASE_CONVERGENCE.md:64-67` | Deep-dynasty players lack confidence | Late-history defects can hide | Add 25y and 50y quality soaks with anomaly budgets | L |
| 3 | P1 | Draft war-room trade acceptance can desync draft order | `draft-war-room.ts:354-378`, `game-store.ts:2320-2332` | Draft day decisions can break trust | Pick assets and draft order can diverge | Transactional draft trade apply with validation and tests | M |
| 4 | P1 | Generated draft trade offers can reference synthesized candidates | `draft-war-room.ts:72-94`, `draft-war-room.ts:138-152` | Player may accept non-real offers | Silent no-op transfer risk | Generate only real transferable assets or explicit future picks | M |
| 5 | P1 | `.mfd` backups omit emotional sidecars | `DynastyCartridge.tsx:354-358`, `dynasty-sidecar-archive.ts:181-244` | Moved save can lose HOF, scrapbook, career, rivalry memory | Portability is split | One-click combined backup and import | M |
| 6 | P1 | Save schema has permissive long-history islands | `schema.ts:1777`, `2038`, `2052-2054`, `2070-2074`, `2100-2113`, `2214` | Corrupt history can survive import | Migration and UI assumptions weaken | Tighten one schema family per slice | L |
| 7 | P1 | Trick plays are visible but not simulated | `GamePlanSetup.tsx:626-627`, `trick-plays.test.ts:198-230` | High-emotion choices feel cosmetic | Saved prep field lacks game consumer | Wire trick-play helpers into drive loop with receipts | M |
| 8 | P2 | CPU intent exists but is not durable or explanatory enough | `ai-philosophy.ts:102-138`, `gm-strategies.ts:151-181`, `TeamNeeds.tsx:153-157` | CPU teams may feel arbitrary | AI state changes lack unified read model | Add CPU intent ledger | M |
| 9 | P2 | Position coaches affect progression but lack management loop | `progression.ts:204-220`, `CoachingStaff.tsx:540-541` | Staff-building feels incomplete | Optional state remains underused | Seed, hire, upgrade, and develop position coaches | M |
| 10 | P2 | Progressive route unlock metadata is not used by shell | `nav-items.test.ts:195-211`, `App.tsx:167-224` | New players face route overload | Existing metadata has no UX value | Use unlocks for guidance or advanced grouping | M |
| 11 | P2 | Press conferences are quote-only | `PressConferenceModal.tsx:101-111`, `game-store.ts:2623-2631` | Roleplay lacks stakes | No owner, player, news, or social hooks | Add optional low-stakes consequence model | M |
| 12 | P2 | Inbox read state is not durable | `InboxTriage.tsx:60-78` | Weekly triage cannot stay clean | No read-state persistence | Add sidecar or save-backed read receipts | S |
| 13 | P2 | Hall of Fame sidecar can stale against GameState | `HallOfFameDirectory.tsx:466-487` | HOF count mismatch erodes trust | Sidecar and save drift | Auto-sync after HOF mutation and repair mismatch | M |
| 14 | P2 | Player rivalry sidecar is not wired to live model | `PlayerRivalries.tsx:75-84` | Rivalry memory portability is fragmented | GameState and sidecar diverge | Durable rivalry archive and head-to-head history | M |
| 15 | P2 | Release docs lag the G7 release command | `README.md:74-81`, `CHANGELOG.md:3-12`, `package.json:12-21` | Operators run stale commands | Docs and automation drift | Replace launch-gate docs with `release:gate`, add June changelog | S |
| 16 | P2 | Root package version conflicts with app release version | `package.json:1-5`, `apps/web/package.json:1-4`, `README.md:7` | Artifact identity confusion | Automation may read root `0.0.1` | Align versions or document policy | S |
| 17 | P2 | Game result payload is `z.any` in saves | `schema.ts:1774-1778` | Replays can fail after import | Result consumers must defend arbitrary shapes | Add validated GameResult schema or subset | M |
| 18 | P2 | Team persisted schema is passthrough | `schema.ts:2035-2038` | Bad team extras can linger | Future schema drift risk | Tighten saved team shape gradually | L |
| 19 | P2 | G6 visual sweep covers 48 initialized routes, not all registered routes | `RELEASE_CONVERGENCE.md:22-23`, `App.tsx:1890-1900` | Direct-only regressions may slip | Smoke list can lag route registry | Generate smoke targets from route registry | M |
| 20 | P2 | Depth chart starter target is not formation validation | `DepthChart.tsx:85-90`, `215-221` | Player may think lineup is complete when it is not | Shell urgency differs from football validity | Add formation-aware validation | M |
| 21 | P2 | Team Needs is read-only and does not run AI refresh | `TeamNeeds.tsx:153-157`, `400-415` | CPU intent page can feel static | Cache and AI writes happen elsewhere | Add recompute/explain timing or intent ledger | S |
| 22 | P2 | Accepted trades return empty EngineOutput events/consequences | `trade-market.ts:406-477` | Receipts are inconsistent | Engine output contract underused | Shared action receipt contract | M |
| 23 | P2 | Cartridge export strips broadcast payloads | `dynasty-cartridge.ts:52-79` | Imported saves lose some replay detail | Save bloat fix reduces archive fidelity | Persist compact replay summaries or disclose | M |
| 24 | P2 | Sidecar import replaces all sidecars | `dynasty-sidecar-archive.ts:229-244` | Import can overwrite browser-local history | No merge conflict model | Add preview, merge, and selected-dynasty import | M |
| 25 | P2 | Source-boundary copy can be too technical for players | `TeamNeeds.tsx:153-157`, `CoachingStaff.tsx:540-541`, `DepthChart.tsx:85-90` | Immersion breaks into implementation terms | Truthful but noisy UI | Move source detail behind advanced toggles | S |

## 4. Top 100 Total Findings

| Rank | Sev | Title | Evidence | Player impact | Technical impact | Recommended fix | Complexity |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | P1 | Release gate not enforced in CI/deploy | `.github/workflows/ci.yml:24-37`, `.github/workflows/deploy.yml:32-40`, `scripts/release-gate.mjs:76-202` | Public release can skip strongest proof | Gate drift | CI release workflow | M |
| 2 | P1 | No true 25/50-year proof | `_canon/seeds/mfd/README.md:23-29` | Deep saves feel risky | Late regressions hidden | 25y and 50y soaks | L |
| 3 | P1 | 20y shadow baseline has 508 high anomalies and is a drift detector | `RELEASE_CONVERGENCE.md:64-67` | Misleading if read as quality proof | Shadow semantics unclear | Separate quality baseline | M |
| 4 | P1 | Draft trade apply does not mutate draft order | `draft-war-room.ts:354-378` | Draft trust break | State divergence | Transactional apply | M |
| 5 | P1 | Draft offer generation synthesizes candidate picks | `draft-war-room.ts:72-94` | Non-real offer risk | Silent no-op transfers | Real asset validation | M |
| 6 | P1 | Sidecar memories are outside `.mfd` | `DynastyCartridge.tsx:354-358` | Moved save loses history | Split portability | Combined backup | M |
| 7 | P1 | Save history fields use `z.any` | `schema.ts:2070-2074`, `2100-2113` | Corrupt history may load | Weak validation | Tighten schemas | L |
| 8 | P1 | Scheduled game result is `z.any` | `schema.ts:1774-1778` | Replays can break | Consumers lack contract | GameResult schema | M |
| 9 | P1 | Trick plays not simulated | `GamePlanSetup.tsx:626-627`, `trick-plays.test.ts:198-230` | Choice feels cosmetic | Saved plan has no consumer | Sim integration | M |
| 10 | P2 | Position coaches have no management lifecycle | `CoachingStaff.tsx:540-541`, `progression.ts:204-220` | Staff layer feels missing | Optional state underused | Hire/upgrade loop | M |
| 11 | P2 | Progressive unlock metadata unused by shell | `nav-items.test.ts:195-211` | Route overload | Dead metadata effect | Guided unlock UX | M |
| 12 | P2 | Press response has no gameplay effect | `PressConferenceModal.tsx:101-111`, `game-store.ts:2623-2631` | Roleplay lacks stakes | No consequence hook | Small effect model | M |
| 13 | P2 | Inbox read state not durable | `InboxTriage.tsx:60-78` | Triage resets | No persistence | Read receipts | S |
| 14 | P2 | HOF sidecar can stale | `HallOfFameDirectory.tsx:466-487` | HOF trust weakens | Save/sidecar drift | Auto-sync | M |
| 15 | P2 | Rivalry sidecar not wired to live saved model | `PlayerRivalries.tsx:75-84` | Rivalry archive fragmented | Duplicate memory stores | Rivalry archive | M |
| 16 | P2 | Team Needs cannot refresh AI from UI | `TeamNeeds.tsx:153-157` | Intent feels static | Cache lifecycle hidden | Intent ledger | S |
| 17 | P2 | Depth chart target is not formation validation | `DepthChart.tsx:85-90` | False confidence | Urgency differs from validity | Formation validation | M |
| 18 | P2 | Trade EngineOutput events empty on accept | `trade-market.ts:406-477` | Receipts inconsistent | Contract underused | Shared receipts | M |
| 19 | P2 | Root version is `0.0.1` while app is `1.0.0` | `package.json:3`, `apps/web/package.json:3`, `README.md:7` | Version confusion | Automation ambiguity | Align metadata | S |
| 20 | P2 | Changelog lacks June G7 release-gate entry | `CHANGELOG.md:3-12`, `RELEASE_CONVERGENCE.md:52-58` | Release story stale | Operator context drift | Update changelog | S |
| 21 | P2 | README launch gates omit release-gate command | `README.md:74-81`, `package.json:13` | Contributors run old gates | Verification drift | Update README | S |
| 22 | P2 | CI lacks playtest-all | `.github/workflows/ci.yml:24-37`, `RELEASE_CONVERGENCE.md:55` | Sim drift can ship | Fast tier optional | Add CI job | M |
| 23 | P2 | CI lacks shadow-regression | `.github/workflows/ci.yml:24-37`, `scripts/release-gate.mjs:121-123` | Canon drift can ship | Baseline optional | Add CI job | M |
| 24 | P2 | CI lacks G4 multi-year soak | `.github/workflows/ci.yml:24-37`, `scripts/release-gate.mjs:123-125` | Multi-year trust not release-blocked | Long browser proof optional | Scheduled/protected job | M |
| 25 | P2 | CI lacks G3 football-ops matrix | `.github/workflows/ci.yml:24-37`, `scripts/release-gate.mjs:142-144` | Cap/acquisition regressions can ship | Browser matrix optional | Required workflow group | M |
| 26 | P2 | Deploy workflow can publish without G6 mobile/visual checks | `.github/workflows/deploy.yml:32-40`, `scripts/release-gate.mjs:146-200` | Mobile regressions can ship | Deploy proof weak | Deploy needs release artifact | M |
| 27 | P2 | G6 visual sweep covers 48 routes, not all routes | `RELEASE_CONVERGENCE.md:22-23`, `App.tsx:1890-1900` | Direct routes may regress | Smoke coverage lag | Generate route list | M |
| 28 | P2 | Direct-only routes may be undiscoverable | `nav-items.test.ts:9-35` | Players miss history/tools | IA debt | Contextual CTAs | S |
| 29 | P2 | Command palette player list capped to 32 | `nav-items.test.ts:181-190` | Harder to find deep roster | Search incomplete | Full roster search | S |
| 30 | P2 | Cartridge export strips broadcast payloads | `dynasty-cartridge.ts:52-79` | Replay memory loss | Archive fidelity tradeoff | Compact replay summaries | M |
| 31 | P2 | Legacy cartridge import accepts any JSON object with `save` | `dynasty-cartridge.ts:115-123` | Confusing import errors | Broad legacy path | Stricter diagnostics | S |
| 32 | P2 | Backup prompt helper uses wall clock | `dynasty-cartridge.ts:140-143` | Possible stale behavior if reused | Duplicate backup concepts | Deprecate or rewire | S |
| 33 | P2 | Sidecar import is all-or-nothing replace | `dynasty-sidecar-archive.ts:229-244` | Can overwrite local history | No merge model | Preview and merge | M |
| 34 | P2 | HOF sidecar import never repairs GameState | `HallOfFameDirectory.tsx:484-500` | Archive restore incomplete | Save remains separate | Restore-to-save command | M |
| 35 | P2 | Legacy route does not generate archive items | `LegacyTimeline.tsx:229` | Legacy hub can feel passive | Generation scattered | Add CTAs and explanations | S |
| 36 | P2 | Source panels expose implementation details | `TeamNeeds.tsx:153-157`, `CoachingStaff.tsx:540-541` | Immersion loss | Copy debt | Advanced source toggle | S |
| 37 | P2 | CPU intent history is not durable | `ai-philosophy.ts:123-134`, `gm-strategies.ts:166-177` | AI feels arbitrary | No unified log | Intent ledger | M |
| 38 | P2 | Team philosophy news can be lost in feeds | `ai-philosophy.ts:123-134` | Player misses CPU shift | Important event not centralized | Team intent screen | M |
| 39 | P2 | GM strategy shifts only push recent headlines | `gm-strategies.ts:176-177` | Long-term CPU arc lost | Limited history | Strategy history array | M |
| 40 | P2 | Trade offers capped and user-centered | `trade-market.ts:352-403` | League market can feel small | Limited CPU market sim | Market-wide summary | M |
| 41 | P2 | Fire-sale offers are only one unshifted priority offer | `trade-market.ts:387-393` | Fire-sale market may feel thin | Simplified generation | Multi-offer fire sale slate | M |
| 42 | P2 | Trade accept mutates news/social but not consequences | `trade-market.ts:451-477` | Feedback consistency varies | Side effects outside standard output | Action receipt contract | M |
| 43 | P2 | Draft trade application has no explicit failure receipt | `draft-war-room.ts:354-378`, `game-store.ts:2320-2332` | Silent bad trade risk | No validation errors | Return transaction result | M |
| 44 | P2 | Draft war-room `timeRemaining` is fixed at 90 | `draft-war-room.ts:338-342` | Clock can feel decorative | No live timer model | Real clock state or label | S |
| 45 | P2 | Team Needs cache lifecycle is hidden | `schema.ts:2126`, `game-store.ts:428-449` | Reports may feel stale | Cache invalidation implicit | Display last computed source | S |
| 46 | P2 | Owner personality inbox store not consumed by Inbox | `InboxTriage.tsx:70-72` | Mailbox misses durable owner events | Parallel store unused | Wire or remove store | S |
| 47 | P2 | Setup first-ten persistence is localStorage, not save | `FranchiseSetupWizard.tsx:153-159`, `setupPersistence.ts:3-45` | Switching browser can reset setup markers | Onboarding state separate | Save/setup sync diagnostics | S |
| 48 | P2 | Watch list is browser-local sidecar | `WatchListScreen.tsx:159-163` | Watch list lost with `.mfd` only | Local prefs outside save | Include in combined archive | S |
| 49 | P2 | Complete sidecar archive import uses paste textarea | `DynastyCartridge.tsx:364-388` | Large JSON import is clumsy | UX friction | File import and combined bundle | S |
| 50 | P2 | HOF current snapshot sync is manual | `HallOfFameDirectory.tsx:472-487` | Player must repair mismatch | Manual integrity action | Auto-sync hook | M |
| 51 | P2 | Press conference queue caps at four | `game-store.ts:1449-1455`, `1530-1535` | Older moments vanish quickly | Limited postgame archive | Archive selected answers | S |
| 52 | P2 | Press response copy says no news/social effect | `PressConferenceModal.tsx:101-111` | Feature feels low stakes | No content fan-out | Optional media effect | M |
| 53 | P2 | Position coach report may show no staff indefinitely | `CoachingStaff.tsx:523-541` | Development layer feels empty | No seeding | Seed staff migration/default | M |
| 54 | P2 | Position coach upgrade helper unused by UI | `position-coaches.ts:204`, `CoachingStaff.tsx:540-541` | No player agency | Exported logic orphaned from UI | Upgrade command | M |
| 55 | P2 | Trick-play helper catalog is unused by game loop | `trick-plays.ts:187-244`, `trick-plays.test.ts:198-230` | Big mechanic dormant | Orphaned runtime logic | Sim wiring | M |
| 56 | P2 | Game Plan labels trick plays as "Coach unlocked" despite planning-only | `GamePlanSetup.tsx:620-627` | Expectation mismatch | Copy tension | Rename or wire | S |
| 57 | P2 | Depth chart no exact formation validation | `DepthChart.tsx:85-90` | Invalid lineup confidence | Formation logic absent | Position requirements | M |
| 58 | P2 | Formation urgency is shared threshold, not football-specific | `DepthChart.tsx:215-221` | Player may chase wrong target | Shared shell metric | Separate readiness types | S |
| 59 | P2 | G3 matrix excludes OS download-directory checks | `RELEASE_CONVERGENCE.md:19` | Export proof incomplete | Download behavior unverified | Add download assertion | M |
| 60 | P2 | G6 visual proof uses DOM metrics, not screenshots | `RELEASE_CONVERGENCE.md:22-23` | Visual defects can pass | Limited visual regression | Add screenshots/image diff | M |
| 61 | P2 | Full gate runtime is 2550.5s | `RELEASE_CONVERGENCE.md:23` | Developers may avoid running it | Release feedback slow | Split fast/slow required groups | M |
| 62 | P2 | Root checkout has no git metadata | `RELEASE_CONVERGENCE.md:7-8` | Harder to audit diffs | Provenance weak | Work in git checkout for release | S |
| 63 | P2 | `pnpm` absent in audit shell | `RELEASE_CONVERGENCE.md:10`, `which pnpm` | Standard docs fail locally | Command drift | Document package-local fallback | S |
| 64 | P2 | README release notes omit June G6/G7 work | `README.md:89-91`, `STATUS.md:3-42` | Player sees older state | Docs stale | Update release notes | S |
| 65 | P2 | CHANGELOG launch gate list is older than current gate | `CHANGELOG.md:32-42`, `scripts/release-gate.mjs:76-202` | Launch history stale | Verification mismatch | Add current gate note | S |
| 66 | P2 | Team persisted schema is passthrough | `schema.ts:2035-2038` | Bad team fields persist | Weak team contract | Tighten team schema | L |
| 67 | P2 | Owners stored as `z.any` | `schema.ts:2052` | Owner data corruption risk | Weak validation | Owner schema | M |
| 68 | P2 | Draft class stored as `z.any` array | `schema.ts:2054` | Bad prospect shapes can load | Draft consumers defensive | DraftProspect schema | M |
| 69 | P2 | Player rivalries stored as `z.any` array | `schema.ts:2073` | Rivalry UI/sim mismatch | Weak contract | Rivalry schema | M |
| 70 | P2 | Farewell tours stored as `z.any` array | `schema.ts:2074` | Retirement stories can corrupt | Weak migration target | Farewell schema | M |
| 71 | P2 | Event log stored as `z.any` array | `schema.ts:2100` | Event display risk | Weak action audit | GameEvent schema | M |
| 72 | P2 | Narrative hooks stored as `z.any` | `schema.ts:2103` | Story arcs can fail late | Weak narrative contract | Hook schema | M |
| 73 | P2 | Week summaries stored as `z.any` | `schema.ts:2112` | Weekly archive risk | Weak summary contract | WeekSummary schema | M |
| 74 | P2 | Playoff bracket stored as `z.any` | `schema.ts:2113` | Playoff import risk | Weak bracket contract | Bracket schema | M |
| 75 | P2 | Earned doctrines stored as `z.any` | `schema.ts:2214` | Legacy perk corruption | Weak doctrine contract | Doctrine schema | S |
| 76 | P3 | Staff candidate `specialty75` is `z.any` | `schema.ts:1640-1655` | Low visible risk | Minor schema looseness | Type specialty | S |
| 77 | P3 | Autosaves trim to three | `db.ts:63-72` | Recovery depth limited | Data retention policy implicit | Explain retention | S |
| 78 | P3 | Manual save slots have no visible hard cap in DB layer | `db.ts:36-50` | User may clutter saves | Storage pressure possible | Save browser quota UI | S |
| 79 | P3 | No cloud/server backup by design | `README.md:35`, `db.ts:1-72` | Browser/device loss risk | Product constraint | Strong export education | S |
| 80 | P3 | Sidecar exportedAt uses wall clock | `dynasty-sidecar-archive.ts:195-204` | None for sim | Non-deterministic archive metadata | Accept or isolate | S |
| 81 | P3 | Cartridge exportedAt uses wall clock | `dynasty-cartridge.ts:91-99` | None for sim | Non-deterministic file bytes | Accept or hash save separately | S |
| 82 | P3 | Raw GameState paste rejected by cartridge parser | `dynasty-cartridge.ts:110-127` | Manual recovery harder | Intentional strictness | Add repair/import utility | S |
| 83 | P3 | About/Credits/FAQ are release routes but not core smoke targets | `App.tsx:219-221`, `RELEASE_CONVERGENCE.md:22-23` | Meta regressions possible | Smoke coverage limited | Add route list generation | S |
| 84 | P3 | League weather route is direct-only | `nav-items.test.ts:25` | Weather depth hidden | IA debt | Link from Game Plan | S |
| 85 | P3 | Achievements route is direct-only | `nav-items.test.ts:15` | Retention hook hidden | IA debt | Link from toasts/settings | S |
| 86 | P3 | Player development route is direct-only | `nav-items.test.ts:28`, `nav-items.test.ts:223-230` | Growth detail hidden | IA debt | Link from roster/player profile | S |
| 87 | P3 | Trade deadline route is direct-only | `nav-items.test.ts:34` | High-drama route can be missed | IA debt | Auto CTA near deadline | S |
| 88 | P3 | Expansion draft route is direct-only | `nav-items.test.ts:14` | Rare event may be hidden | IA debt | Event-driven CTA | S |
| 89 | P3 | Franchise book route is direct-only | `nav-items.test.ts:16` | Story feature hidden | IA debt | Legacy/franchise CTA | S |
| 90 | P3 | Playoff lore route is direct-only | `nav-items.test.ts:22` | Playoff memory hidden | IA debt | Post-playoff CTA | S |
| 91 | P3 | Legacy timeline is display-only on open | `LegacyTimeline.tsx:229` | Passive history feel | No write boundary | Link generators | S |
| 92 | P3 | Hall directory export/import moves HOF sidecar only | `HallOfFameDirectory.tsx:498-500` | Archive UX fragmented | Single-sidecar operation | Combined archive emphasis | S |
| 93 | P3 | Trophy room does not mutate achievements/history on open | `TrophyRoom.tsx:168` | Passive display | Read-only route | Event CTAs | S |
| 94 | P3 | Playoff lore route does not merge scrapbook entries on open | `PlayoffLoreDirectory.tsx:172-196` | Pending lore can remain obscure | Read-only boundary | Guided merge action | S |
| 95 | P3 | Rookie history route does not autosave/run sim | `RookieOfYearHistory.tsx:48` | Passive display | Read-only boundary | More CTAs | S |
| 96 | P3 | Watch list outside GameState cartridges | `WatchListScreen.tsx:159-163` | Device-only notes | Sidecar split | Include in archive | S |
| 97 | P3 | Chip prefs/read receipts use localStorage | `ChipHost.tsx:109`, `readReceipts.ts:5` | Device-specific onboarding | Sidecar split | Include/export prefs selectively | S |
| 98 | P3 | Broadcast ghost prefs localStorage-only | `ghostBroadcastPrefs.ts:9-28` | Device-specific presentation | Sidecar split | Settings export | S |
| 99 | P3 | Visual route proof does not include image-diff screenshots | `RELEASE_CONVERGENCE.md:22-23` | Subtle layout issues possible | Regression coverage limited | Screenshot diff suite | M |
| 100 | P3 | No prior audit artifacts existed before this run | `find . -maxdepth 2 -name 'MFD_*AUDIT*.md'` returned none | Future work lacked consolidated map | Knowledge was scattered | Keep these artifacts current | S |

## 5. RED/YELLOW/GREEN Scoreboard

| Domain | Status | Reason |
| --- | --- | --- |
| Local build/release tooling | GREEN | 35-step local gate exists and static tests passed in this audit. |
| GitHub release channel | YELLOW/RED | CI/deploy do not enforce full local gate. |
| Main save migration/load path | GREEN | parse -> migrate -> schema -> agent initialization is strong. |
| Save portability | YELLOW | `.mfd` and sidecar archive split emotional history. |
| Long-horizon trust | YELLOW/RED | 10-season proof is strong; 20/25/50 clean proof absent. |
| Weekly loop clarity | YELLOW | Monday Briefing/Chip are strong, but route overload remains. |
| Football sim | YELLOW/GREEN | Core sim is real; trick plays and long-horizon balance gaps remain. |
| AI team intelligence | YELLOW | Real AI state exists, but explainability and evidence need improvement. |
| Dynasty immersion | YELLOW | Many systems exist; archive sidecars/direct-only routes dilute attachment. |
| Release docs | YELLOW | README/CHANGELOG/version metadata lag current gate state. |

## 6. Feature Grade Table

See `MFD_FEATURE_INVENTORY.md` for the full table.

| Feature family | Grade | One-line reason |
| --- | --- | --- |
| New Dynasty and Monday Briefing | B/A | Strong setup and weekly hub, route overload still high. |
| Week advance and game sim | B | Real deterministic engine, but trick plays and long-horizon proof lag. |
| Contracts and cap | A | Strong G3 matrix and mature money workflows. |
| Trades and acquisition | B/C | Broad and real, draft war-room trade application needs fix. |
| Free agency and agents | B | Functional negotiation/agent systems, more intent visibility needed. |
| Draft/scouting | B/C | Good core, war-room state trust risk. |
| Coaching/staff | C/B | HC/coordinator loop stronger than position-coach lifecycle. |
| Governance/CBA/commissioner | A/B | Strong browser smoke and tests. |
| Records/awards/HOF/legacy | B/C | Rich systems, but sidecar/read-only/direct-only friction. |
| Save/load | A/B | Main save strong, combined archive missing. |
| Chip/companion | B | Good recovery and guidance, needs task memory and route restraint. |

## 7. Save-Trust Summary

Main save trust is one of MFD's strengths. `SAVE_VERSION = 36` is consistently surfaced. The import path parses cartridges, migrates to current, validates with Zod, and initializes agents. Dexie slots replace one fragile localStorage blob.

The save-trust gap is dynasty memory portability and schema precision:

- `.mfd` cartridges do not include complete sidecars.
- Sidecars include exactly the long-run memories that matter: HOF archive, scrapbook, ROY, roster continuity, GM career meta, and rivalry heat.
- Several history/result fields remain `z.any`.
- Long-horizon proof is not strong enough for 25/50-year claims.

## 8. AI/Simulation Summary

The AI is real, not a facade. CPU teams have derived philosophies, GM strategies, trade offer generation, agent negotiation, offseason flows, and team-needs analysis. The player-facing gap is proving and explaining intelligence. The best next slice is a CPU intent ledger that records why teams changed posture, what they need, what they are shopping, and what cap window they are in.

The football sim is broad: weather, plans, contingencies, special teams, rivalry/home-field context, player lines, MVPs, and weekly results. The high-priority sim gaps are trick-play execution and long-horizon quality proof.

## 9. Player Journey Summary

The first-session experience has improved materially with Chip and setup smokes, but all primary systems remain visible quickly. Motivated sim players can handle it; new players may need more progressive guidance. The journey gets stronger through Week 1, regular season, trade deadline, playoffs, and offseason. It weakens at Year 10+ because the player starts caring about save portability, history, HOF, rivalries, sidecars, and long-horizon balance.

## 10. GOAT Gap Analysis

The current game can become excellent by making three things undeniable:

1. Trust: save portability, long-horizon proof, CI release gate.
2. Intelligence: CPU intent that players can inspect and believe.
3. Memory: every season writes stories that follow the save everywhere.

The biggest GOAT gap is not breadth. MFD already has breadth. The gap is converting breadth into durable player belief: "the game remembered, the AI had a plan, and my choices mattered."

## 11. Recommended Next 25 Codex Implementation Slices

| Rank | Slice | Primary artifacts/tests |
| ---: | --- | --- |
| 1 | Add CI/protected workflow for `node scripts/release-gate.mjs` or split required gate groups | `.github/workflows`, `scripts/release-gate.mjs`, workflow docs |
| 2 | Fix draft-war-room trade transaction ownership and generated-offer validity | `draft-war-room.ts`, `game-store.ts`, draft-war-room tests |
| 3 | Add combined `.mfd + sidecars` backup/export/import | `DynastyCartridge.tsx`, `dynasty-sidecar-archive.ts`, persistence tests |
| 4 | Add true 25-year quality soak with anomaly budget | playtest harness, new script, release docs |
| 5 | Add true 50-year smoke or nightly benchmark | playtest harness, shadow docs |
| 6 | Tighten `ScheduledGame.result` schema | save schema, migrations/tests, game-flow tests |
| 7 | Tighten `franchiseHistory` and `playerArchive` schemas | save schema, history tests |
| 8 | Tighten `eventLog`, `weekSummaries`, and `playoffBracket` schemas | save schema, round-trip tests |
| 9 | Wire trick plays into game simulation with bounded frequency | `game-sim.ts`, `trick-plays.ts`, game-sim tests |
| 10 | Add CPU intent ledger and Team Needs intent history | `ai-philosophy.ts`, `gm-strategies.ts`, selectors, Team Needs UI |
| 11 | Add shared action receipt contract for trades, draft trades, FA, cuts, depth | engine types, store actions, route receipt panels |
| 12 | Add position coach lifecycle | `position-coaches.ts`, coaching UI, progression tests |
| 13 | Use progressive nav metadata for guided weekly view | `NAV_UNLOCK_RULES`, App shell, Monday Briefing, tests |
| 14 | Add durable Inbox read state | Inbox route, sidecar or save migration |
| 15 | Auto-sync HOF sidecar and add mismatch repair | HOF sync hooks, HOF directory tests |
| 16 | Add durable rivalry head-to-head archive | rivalry systems, sidecar archive, rivalry route |
| 17 | Add formation-aware depth-chart validation | depth chart helpers, UI, tests |
| 18 | Add optional press-conference effects | press-conference engine, news/social/owner/morale tests |
| 19 | Move source-boundary panels behind advanced/source toggles | shared UI, affected routes |
| 20 | Generate G6 route smoke list from route registry | App route registry/test/smoke script |
| 21 | Add full-roster command palette search | App command palette tests |
| 22 | Update README, CHANGELOG, and package version policy for G7 gate | docs and package metadata |
| 23 | Add export/download artifact assertions in browser smoke | smoke scripts |
| 24 | Add image-diff screenshots for high-risk routes | Playwright or smoke infrastructure |
| 25 | Add Franchise Book auto-authoring slice for season arcs | franchise book, season recap, scrapbook |

