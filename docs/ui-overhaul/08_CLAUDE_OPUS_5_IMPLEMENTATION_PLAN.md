# 08 — Claude Opus 5 Implementation Plan

## Operating principle

Implement the selected product. Do not conduct another broad redesign audit. Use the documents and prototype to resolve UI decisions, then work packet-by-packet with tests, screenshots, atomic commits, and a progress ledger.

## Phase plan

| Phase | Name | Packets | Gate / purpose |
|---|---|---|---|
| 0 | Baseline and safety rails | WP-00 | No production visual work before clean baseline/migration boundary. |
| 1 | Foundations | WP-01, WP-02, WP-03 | Tokens, adaptive layout, interaction/a11y. Parallel after WP-00 where dependencies permit. |
| 2 | Shell and IA | WP-04–WP-08 | Route contracts, shell, nav, overlays, Chip adapter. |
| 3 | Vertical slice | WP-09, WP-10, WP-11 | Today/task/readiness plus first-ten-minutes. H1 after complete loop proof. |
| 4 | Team/player | WP-12–WP-14 | Roster, player entity, depth/development/staff/culture. |
| 5 | Game | WP-18 | Game Hub/Center and game-plan/result consolidation. |
| 6 | Office/personnel | WP-15–WP-17 | Finance, trades, scouting/draft/FA lifecycle. |
| 7 | League/Dynasty | WP-19–WP-20 | League question model and emotional legacy hub. |
| 8 | Trust/system | WP-21 | Save/recovery/settings/accessibility/help. |
| 9 | Cleanup/release | WP-22–WP-23 | Incremental style cleanup and full hardening. |

## Work-packet index

| Packet | Title | Phase | Effort | Critical path | Dependencies |
|---|---|---|---|---|---|
| WP-00 | Baseline, Safety Rails, and Migration Boundary | 0 | M | Yes | None |
| WP-01 | Semantic Tokens and Typography Foundation | 1 | M | Yes | WP-00 |
| WP-02 | Adaptive Viewport and Screen-Archetype Primitives | 1 | L | Yes | WP-00, WP-01 |
| WP-03 | Interaction, Focus, Dialog, and Accessibility Foundation | 1 | L | Yes | WP-01, WP-02 |
| WP-04 | Route-Surface Metadata and Deep-Link Compatibility | 2 | L | Yes | WP-00 |
| WP-05 | App Shell Decomposition and Migration Host | 2 | XL | Yes | WP-01, WP-02, WP-03, WP-04 |
| WP-06 | Adaptive Navigation, Wayfinding, and Return-to-Task | 2 | L | Yes | WP-04, WP-05 |
| WP-07 | Overlay and Notification Orchestration | 2 | L | Yes | WP-03, WP-05 |
| WP-08 | Chip Presentation Adapter | 2/3 | L | Yes | WP-05, WP-07, WP-09 interface contract |
| WP-09 | Canonical Task Ledger and Today Screen | 3 | XL | Yes | WP-01–WP-06; defines contract for WP-08 |
| WP-10 | Readiness and Week-Advance Integration | 3 | L | Yes | WP-09, WP-03, WP-07 |
| WP-11 | Entry and Guided Setup Reinvention | 3 | L | No | WP-01–WP-06 |
| WP-12 | Team Hub and Mobile-Native Roster | 4 | XL | No | H1, WP-01–WP-06 |
| WP-13 | Player Entity Detail and Comparison | 4 | L | No | WP-12, WP-04 |
| WP-14 | Depth, Development, Staff, and Culture Surfaces | 4 | XL | No | WP-12, WP-13 |
| WP-15 | Office Finance, Contracts, Ownership, and Operations | 6 | XL | No | H1, WP-01–WP-06 |
| WP-16 | Trade Desk and Personnel Workbench | 6 | XL | No | WP-12, WP-13, WP-15 |
| WP-17 | Scouting, Draft, Free Agency, Waivers, and Camp | 6 | XL | No | WP-15, WP-16 |
| WP-18 | Game Hub and Unified Game Center | 5 | XL | No | H1, WP-04–WP-07, WP-10 |
| WP-19 | League Hub and Dense Data Patterns | 7 | XL | No | H1, WP-01–WP-06, WP-12 row primitives |
| WP-20 | Dynasty and Legacy Story Hub | 7 | XL | No | WP-07, WP-18, WP-19 |
| WP-21 | Save, Recovery, Settings, Accessibility, and Help | 8 | XL | No | H1, WP-03, WP-05, WP-07 |
| WP-22 | Inline-Style Migration and Legacy Shell Cleanup | 9 | XL | No | All migrated route clusters; runs incrementally |
| WP-23 | QA, Route Coverage, Performance, and Release Hardening | 9 | XL | Yes | All packets; infrastructure starts WP-00 |

Individual specifications are in `work-packets/{PACKET_ID}_*.md`.

## Critical path

```text
WP-00
 ├─→ WP-01 ─┐
 ├─→ WP-02 ─┼─→ WP-05 ─→ WP-06 ─┐
 ├─→ WP-03 ─┘                    ├─→ WP-09 ─→ WP-10 ─→ H1
 └─→ WP-04 ──────────────────────┘      │
                    WP-07 ──────────────┤
                    WP-08 ← task contract┘

WP-11 may run after foundations/shell and must be included in the H1 first-ten-minutes proof.
```

### H1 proof, not screenshot approval

H1 is passed only when the owner or delegated playtester can:

1. start/continue a dynasty;
2. land on Today;
3. understand week/phase/opponent and top required action from viewport one;
4. open depth or Game Plan in one interaction;
5. save the decision;
6. return to the same Today task with resolved state/focus;
7. understand readiness/consequence;
8. play/sim/advance without engine/save regression;
9. complete the loop on 390×844 and 1440×900;
10. open/minimize/reopen Chip without losing viewport or receiving contradictory guidance.

## Parallel work after H1

| Stream | Packets | Can run with | Shared contracts that must be frozen first |
|---|---|---|---|
| Team | WP-12–WP-14 | Game, Office Finance, League | Shell, route map, entity origin, data rows, tokens |
| Game | WP-18 | Team, Office, League | Shell, route map, overlay/event contract, readiness |
| Office | WP-15–WP-17 | Team/Game/League after shared player row/entity contracts | Shell, route map, transaction workbench primitives |
| League | WP-19 | Team/Game/Office | Entity links, ResponsiveDataView, ChartFrame |
| Dynasty | WP-20 | System and late cluster work | Overlay durable destination, Game/League entity links |
| System | WP-21 | Dynasty/cleanup | Dialog/state patterns, overlay, persistence API contract |
| Cleanup | WP-22 incrementally | Every completed cluster | Only files whose replacement coverage is green |

Parallel does not mean conflicting branches edit `App.tsx`, global tokens, route map, or shared component APIs without coordination. Freeze those contracts at the end of H1 and use small integration commits.

## Packet execution protocol

For each packet:

1. Read the packet and its cited audit sections.
2. Verify dependency packets in `PROGRESS_LEDGER.md` are green.
3. Re-run the packet’s narrow preflight tests.
4. Record intended files/symbols and confirm no protected-layer edit is needed.
5. Implement the smallest complete slice.
6. Run unit/component/route/a11y/viewport tests listed in the packet.
7. Run relevant engine/save regression tests if the UI calls existing mutations.
8. Capture required before/after screenshots using deterministic fixtures.
9. Update route matrix/coverage state and inline-style ledger.
10. Run bundle impact and repository status check.
11. Make the packet’s suggested atomic commits.
12. Update ledger with evidence, limitations, rollback command, and next packet.

Do not mark a packet complete because the screen “looks right.” Complete means behavior, state, responsive, input, accessibility, compatibility, regression, and rollback evidence are present.

## Progress ledger format

```markdown
## WP-XX — Title
Status: not-started | in-progress | blocked-protected-contract | ready-for-review | complete
Commit(s):
Files changed:
Routes covered:
Tests run + exact results:
Screenshots:
Bundle delta:
Save/determinism impact: none | described
Known limitations:
Rollback:
Next dependency unlocked:
```

## Atomic commit strategy

Use small commits that separate architecture, behavior, styling, tests, and cleanup where practical. Example for a cluster:

1. `test(ui): add deterministic roster fixtures and baseline`
2. `feat(ui): add roster presenter and route contract`
3. `feat(ui): add responsive roster screen behind v2 shell`
4. `test(ui): add roster viewport, keyboard, and a11y coverage`
5. `refactor(ui): route legacy roster path through compatibility wrapper`
6. `style(ui): migrate roster styles to semantic modules`
7. `chore(ui): remove unused roster legacy CSS after coverage proof`

Never combine an engine rule change, save migration, shell rewrite, and visual restyle in one commit.

## Human gates

- **H1 — Visual and shell proof:** after WP-00–WP-11 vertical slice, before mass route migration.
- **H2 — Route retirement:** only when permanently removing an old URL/duplicate surface rather than retaining alias/compatibility. Do not stall on aliases.
- **H3 — Release candidate:** owner executes the final playtest script after all automated gates pass.

No approval is required after every packet. The audit choices are authoritative unless implementation evidence exposes a protected-contract conflict.

## Risks and controls

| Risk | Detection | Control | Rollback |
|---|---|---|---|
| Feature loss during consolidation | 79-route coverage script and per-route matrix test | Compatibility wrappers; route cluster checklist; H2 | Re-enable old route/surface |
| Simulation/RNG drift | Deterministic fixtures and existing engine tests | Presenter-only derivation; protected layer rule | Revert packet; legacy UI still available |
| Save incompatibility | Import/export/sidecar fixture suite | No UI-driven schema change | Legacy shell and previous build/save remain valid |
| Shell regression radius | Geometry/route/lifecycle tests | Extract modules behind mode before replacement | Set UI mode legacy |
| Bundle growth | Per-packet gzip diff; engine 320 KB gate | Lazy routes; no broad libraries/fonts | Remove dependency/asset; revert visual enhancement |
| Mixed old/new visual incoherence | Migration boundary and cluster completion rule | Do not partially restyle old screens | Keep cluster legacy until complete |
| Accessibility regressions | axe, keyboard, geometry, zoom, manual SR scripts | Foundation components and packet DoD | Block packet merge |
| Overlay collision | Synthetic queue tests | Central overlay policy | Compatibility bridge to legacy presentation |
| Long-list performance | DOM/render profiling thresholds | Purpose-built rows, virtualization/pagination | Return to legacy screen |
| Owner dislikes direction after mass work | H1 complete loop proof | No mass migration before H1 | Legacy mode remains default |

## Deletion policy

A file/component/style can be deleted only when:

- every route/reference has a replacement;
- tests prove old paths resolve;
- grep/import graph shows no production consumer;
- screenshots/behavior for the replacement are approved by the packet gate;
- the delete is a separate commit with rollback;
- H2 is recorded if a URL/capability is permanently retired.

## Definition of done for the entire overhaul

- 34 audit findings are resolved, mitigated, or explicitly accepted with evidence.
- 79/79 routes have reachable canonical surfaces and compatibility decisions.
- Today, Team, Game, Office, League, Dynasty, and System work across required phases.
- First-ten-minutes, weekly, team, acquisition, game, league, legacy, save/recovery, and Chip journeys pass.
- All numeric acceptance thresholds in `09_QA_ACCEPTANCE_AND_TRACEABILITY.md` pass.
- Existing engine/web/design-system tests, build, bundle, smoke, release gate, save/import/export, and deterministic fixtures pass in a clean environment.
- No product-critical feature depends on command search, hover, drag, color, motion, or landscape.
- New shell contains no unexplained nested scroll or permanent Chip clearance.
- Legacy shell/compatibility removal has a tested rollback and owner approval.
- H3 owner playtest is recorded.
