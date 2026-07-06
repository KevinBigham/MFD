# MFD Wiring Audit

This audit focuses on mismatches required by `AUDIT_GOAL_MFD.md:131-144`: UI without sim, sim without UI, data without consumers, unexplained state changes, placeholders, duplicate logic, and save read/write gaps.

## Wiring Scorecard

| Area | Status | Evidence |
| --- | --- | --- |
| Route registration | GREEN | `nav-items.test.ts:110-160` verifies nav and route completeness. |
| Core week sim wiring | GREEN | `franchise-week.ts:590-696` owns phase/week transitions. |
| Game-plan contingencies | GREEN | `game-sim.ts:931-990` evaluates and records fired rules. |
| Trick plays | RED | UI saves planned trick plays, tests guard that sim spine does not import helper execution. |
| Position coaches | YELLOW | Progression uses bonuses, but UI reports only and does not seed/manage staff. |
| Progressive route unlock | YELLOW | Metadata reconciled, but shell intentionally does not hide/phase nav. |
| Save portability | YELLOW | `.mfd` and complete sidecar archives are separate. |
| Draft war-room trades | RED | Accept path transfers pick assets but draft-order update is effectively no-op; synthesized candidate offers can reference non-real picks. |
| Press conference choices | YELLOW | Truthfully disclosed as quote-only; feature is shallow. |
| Inbox read state | YELLOW | Read flags not durable and owner personality inbox store not consumed by `/inbox`. |

## Ranked Wiring Findings

| ID | Severity | Finding | Evidence | Player impact | Technical impact | Next slice |
| --- | --- | --- | --- | --- | --- | --- |
| W01 | RED | Draft war-room accept flow does not update draft-order ownership | `draft-war-room.ts:354-378` loops assets then maps `draftOrder` without changing entries; store commits result at `game-store.ts:2320-2332` | Player can accept a draft trade and still see/resolve clock ownership incorrectly | Pick asset state and draft-order state can diverge | Make draft trade application transactional: validate assets, mutate current pick owner/order, test generated-offer acceptance |
| W02 | RED | Draft war-room can synthesize trade candidates when real draft-order candidates are fewer than three | `draft-war-room.ts:72-94` creates `synthesizedEntry`; `transferPick` only works if the pick exists in `team.draftPicks` (`draft-war-room.ts:138-152`) | Offers may promise picks that cannot transfer | Silent no-op risk | Generate offers only from real transferable picks or create future-pick assets explicitly |
| W03 | RED | Trick-play UI is not wired into simulation | `GamePlanSetup.tsx:143-145`, `626-627`; `trick-plays.test.ts:198-230` asserts sim spine has no trick-play helper imports | High-emotion choice does not affect game | Saved `WeeklyPrepPlan.trickPlays` has no drive outcome consumer | Wire `executeTrickPlay`/`shouldCallTrickPlay` into drive loop or downgrade UI |
| W04 | YELLOW | Position coach progression exists but management lifecycle is absent | `progression.ts:204-220`; `CoachingStaff.tsx:478-481`, `540-541` | Player sees "No staff" or read-only reports without hiring/upgrading agency | Optional save field can remain empty and underused | Seed staff and add hire/upgrade/offseason progression commands |
| W05 | YELLOW | Progressive unlock metadata is not used by app shell | `nav-items.test.ts:195-211`; `App.tsx:167-224` shows full primary nav | New player sees nearly every major system immediately | Existing metadata has no UX effect | Use unlock status for grouping, guidance, or collapsed advanced menus |
| W06 | YELLOW | Press conferences are quote-only | `PressConferenceModal.tsx:101-111`; `game-store.ts:2623-2631` only writes selected tier/response | Player may enjoy roleplay but not consequences | No news/social/owner/player hooks | Add optional low-stakes effects or keep labeling as cosmetic |
| W07 | YELLOW | Complete sidecar archive is separate from `.mfd` save | `DynastyCartridge.tsx:333-358`; `dynasty-sidecar-archive.ts:181-244` | A player can move a save but leave HOF/scrapbook/career/rivalry memory behind | Portability spans two mechanisms | Add one-click combined export/import bundle |
| W08 | YELLOW | Hall of Fame sidecar can be stale until sync/year rollover | `HallOfFameDirectory.tsx:466-487` | Archive count mismatch can weaken trust | Sidecar and GameState HOF drift by design | Add automatic sync after HOF changes plus mismatch repair |
| W09 | YELLOW | Player rivalry derived sidecar is not wired to live route/update flow | `PlayerRivalries.tsx:75-84` | Rivalry history/heat portability feels fragmented | GameState rivalry model and sidecar archive diverge | Durable rivalry head-to-head archive |
| W10 | YELLOW | Inbox read state is regenerated display state | `InboxTriage.tsx:60-78` | Player cannot reliably clear/triage mailbox | No durable read receipts | Sidecar or save-backed read state |
| W11 | YELLOW | Team Needs route is intentionally read-only | `TeamNeeds.tsx:153-157`, `400-415` | CPU intent page cannot trigger recompute/action | AI decisions happen elsewhere, making cause/effect harder to see | Intent ledger with last-change reason/time |
| W12 | YELLOW | Depth chart starter target is not formation validation | `DepthChart.tsx:85-90`, `215-221` | Player may believe 22 flags equals football-valid lineup | Shell urgency and formation correctness are separate | Formation-aware lineup validation |
| W13 | YELLOW | Release gate is not wired into CI/deploy | `scripts/release-gate.mjs:76-202`; `.github/workflows/ci.yml:24-37`; `.github/workflows/deploy.yml:32-40` | Public artifact can ship after lighter checks | Local release contract is not enforced by release channel | Add workflow job for `node scripts/release-gate.mjs` or a split matrix |
| W14 | YELLOW | Shadow "20y" baseline is not a clean 20-season proof | `_canon/seeds/mfd/README.md:17-29`; `RELEASE_CONVERGENCE.md:60-67` | Year 25/50 trust remains unproven | Long-horizon regressions can hide behind drift detector semantics | Add explicit 25-year/50-year audit/playtest mode |
| W15 | YELLOW | Root release metadata conflicts with shipped web version | `package.json:1-5`; `apps/web/package.json:1-4`; `README.md:7` | Confusing release artifact identity | Automation may read root `0.0.1` | Align root version or document package-version policy |
| W16 | YELLOW | Changelog is stale relative to June G7 release gate | `CHANGELOG.md:3-12`; `RELEASE_CONVERGENCE.md:52-58` | Players/operators cannot see latest release trust work | Release notes do not match current gate | Add 2026-06 G7 release note |
| W17 | YELLOW | README launch-gate commands are older than `release:gate` | `README.md:74-81`; `package.json:12-21` | Contributors may run weaker/older launch checks | Docs and automation drift | Replace launch-gate section with `node scripts/release-gate.mjs` |
| W18 | YELLOW | Command palette player list is capped to 32 roster players | `nav-items.test.ts:181-190` | Large rosters require route/manual search | Command system is incomplete for all players | Search/filter full roster lazily |
| W19 | YELLOW | Cartridge export strips broadcast payloads from results | `dynasty-cartridge.ts:52-79` | Imported saves may not carry full game replay/broadcast detail | Space optimization trades off memory | Persist lightweight game replay summary or disclose stronger |
| W20 | YELLOW | Legacy raw `{ save }` cartridge import is broad | `dynasty-cartridge.ts:115-123` | Badly shaped legacy payloads proceed to migration/schema before failing | Import path accepts any object with `save` | Add envelope warning and stricter legacy diagnostics |
| W21 | YELLOW | `shouldPromptBackup` uses wall-clock helper outside production reminder path | `dynasty-cartridge.ts:140-143`; guide says production uses season reminder | Possible stale helper confusion | Two backup prompt concepts | Remove/deprecate or test source of truth |
| W22 | YELLOW | Save schema leaves broad state islands permissive | `schema.ts:1649`, `1777`, `2038`, `2052-2054`, `2070-2074`, `2100-2113`, `2214` | Corrupt long-history payloads may pass too far | Future migrations harder | Tighten one history/result schema per slice |
| W23 | YELLOW | Sidecar import replaces all sidecars, not per-dynasty merge | `dynasty-sidecar-archive.ts:229-244` | Importing one archive can overwrite local browser history | No merge conflict UX | Add preview/merge/import selected dynasty |
| W24 | YELLOW | G6 visual sweep covers 48 initialized routes, not every registered/direct route | `RELEASE_CONVERGENCE.md:22-23`; `App.tsx:1890-1900` registers more routes | Some direct-only routes may miss visual regression proof | Visual coverage set can lag route surface | Generate smoke list from route registry |
| W25 | YELLOW | G3 matrix leaves OS download-directory assertions out of scope | `RELEASE_CONVERGENCE.md:19` | Export/import confidence is good but not full download-path proof | Browser artifact behavior partly untested | Add download artifact assertion on CI runner |
| W26 | YELLOW | Trade accept returns empty `events`/`consequences` despite news/social side effects | `trade-market.ts:406-477` | Receipts may be route-specific rather than standardized | EngineOutput contract underused | Standardize action receipts for all major actions |
| W27 | YELLOW | Player-facing source panels can expose implementation boundaries too often | Examples: `TeamNeeds.tsx:153-157`, `CoachingStaff.tsx:540-541`, `DepthChart.tsx:85-90` | Non-technical players may see "why this is limited" instead of "what to do" | Truthful but noisy UX | Move source detail into advanced toggles |
| W28 | YELLOW | Direct-only history routes rely on discovery | `nav-items.test.ts:9-35` | Player may miss scrapbook, HOF, bloodlines, weather, achievements | Strong features have weak IA entry | Contextual CTAs after relevant events |
| W29 | YELLOW | Legacy timeline is read-only and does not generate moments on open | `LegacyTimeline.tsx:229` | Legacy hub can feel like a museum of whatever already happened | Moment creation scattered elsewhere | Add "how this fills" explanations and CTAs |
| W30 | YELLOW | HOF sidecar import never writes entries back into live GameState | `HallOfFameDirectory.tsx:484-500` | Restored archive does not repair current save | Archive and save remain separate | Add explicit "restore snapshot to save" with validation |

