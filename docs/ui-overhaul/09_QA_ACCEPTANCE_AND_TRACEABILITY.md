# 09 — QA, Acceptance, and Traceability

## Release posture

The UI overhaul is a behavior-preserving migration, not a new simulation release. Visual approval is insufficient. Release requires route, state, viewport, input, accessibility, save, determinism, bundle, performance, and rollback evidence.

## Viewport matrix

| Class | Required sizes/states | What must be proven |
|---|---|---|
| Phone portrait | 320×568; 360×800; 390×844; 430×932 | All core journeys; 320 reflow; first-action and target geometry |
| Phone landscape | 667×375; 844×390; 932×430 | Compact-height shell; no occlusion; Game Center/data workbench enhancement |
| Tablet | 768×1024; 1024×768 | Rail, one/two pane, touch/coarse pointer |
| Desktop | 1280×720; 1440×900; 1600×1000 | Sidebar, compact density, keyboard/mouse, max-width/panes |
| Zoom/text | 200% zoom; OS/browser large text | No content/function loss; action/focus visible |
| Environment | Reduced motion; network blocked; offline cached; CPU throttle | Fallback fonts; no essential motion; responsive feedback |

For every critical route/archetype capture:

- viewport and document geometry;
- horizontal overflow;
- scroll owners/nested regions;
- fixed/sticky rectangles;
- first primary action position;
- target sizes;
- computed body/label/data sizes;
- focus order and occlusion;
- screenshot and text/semantic snapshot.

## Lifecycle/state matrix

| Lifecycle | Required fixtures |
|---|---|
| No save/new game | Cold open, empty, guided, instant, scenario, import error |
| Regular season | Early week, blockers, warnings, ready, game complete, bye |
| Deadline | Trade deadline before/at/expired |
| Playoffs | Clinched, elimination, championship, season transition |
| Offseason | Recap, contracts/staff, FA, draft, waivers, camp |
| Long dynasty | Multi-season records, legacy artifacts, large history/roster/stat collections |
| System | Healthy save, saving, failure, quota, import mismatch, recovery, offline |
| Companion/overlay | Chip collapsed/expanded/muted; overlay collisions; reduced motion |

## Journey matrix

| ID | Journey | Path | Pass condition |
|---|---|---|---|
| J-01 | First ten minutes | No save → Guided/Instant → setup → Today → first task → first readiness | No dead end; choices retained; primary path first viewport |
| J-02 | Returning user | Existing save → Continue → Today | Correct team/week/phase; save health; no unnecessary onboarding |
| J-03 | Regular week | Today → depth/plan → return → play/sim/advance → consequence | Same task ledger; exact return; deterministic result |
| J-04 | Trade deadline | Today deadline task → Trade Desk → offer/counter/outcome → return | Needs/cap/selection preserved; deadline consequence clear |
| J-05 | Draft | Pre-draft → on clock → prospect → pick/trade offer → recap | Clock/context retained; no hover/drag dependency |
| J-06 | Free agency | Need → market/filter → target → offer → outcome | Budget/cap and competition clear; draft preserved |
| J-07 | Game review | Schedule/Today → Game Center tabs → consequence → return | One game ID; score/context persistent |
| J-08 | League/entity | Standings/news/stats → team/player/game → return | Filter/scroll/origin restored |
| J-09 | Legacy moment | Record/award/named game event → durable artifact → related entity | Event not lost; old legacy route resolves |
| J-10 | Save/recovery | Save now/export/complete backup/import validation/recovery | Scope explicit; compatibility/sidecars preserved |
| J-11 | Chip | Open/minimize/mute/reopen/take me there/Where am I | No viewport reservation; guidance agrees with task |
| J-12 | Error/locked | Storage error, invalid import, unavailable phase, empty filter | Reason, recovery, focus, no dead end |

## Input matrix

| Input/user mode | Coverage | Pass condition |
|---|---|---|
| Touch only | Every core journey, sheets, lists, forms, transaction, depth | No hover/drag requirement; 44/48 targets; safe-area |
| Keyboard only | Every core management flow and utility | Visible focus; logical order; dialogs; tabs/links; no traps |
| Mouse/trackpad | Desktop productivity and hover-capable enhancement | Hover is optional; click targets stable |
| Screen reader | Today, nav, forms, dialogs/sheets, data views, live status | Landmarks/headings/names/states/table semantics/announcements |
| Reduced motion | Shell, overlays, game/event, task completion | No essential information lost; no auto-motion dependency |

## Numeric acceptance criteria

| ID | Criterion | Test |
|---|---|---|
| NAV-01 | Today viewport one shows team, season, phase/week, opponent/event, required count, and best next action | Geometry/text assertion at 390×844 and manual comprehension script |
| NAV-02 | Required weekly task reachable in one interaction from Today | Journey assertion |
| NAV-03 | Any current capability reachable within ≤3 intentional interactions; ≤1 from active related task | 79-route reachability graph |
| NAV-04 | No all-route drawer required for core loop | J-01/J-03 without search or route map |
| NAV-05 | Current hub, local section, and return path always visible/announced | Route/origin tests |
| LAY-01 | No unintended horizontal overflow at all required viewports | Geometry assertion |
| LAY-02 | No essential content/focus obscured by header/nav/action/Chip/safe area | Focus/occlusion assertion |
| LAY-03 | One primary scroll owner per archetype; local scrollers documented | DOM overflow audit |
| LAY-04 | Today default ≤2.5 viewports at 390×844; current baseline 14.0 | Measured scroll height ≤2,110 px before optional expansion |
| LAY-05 | Setup step ≤1.5 viewports at 390×844 | Measured step height ≤1,266 px |
| LAY-06 | Phone shell fixed chrome envelope ≤152 px plus safe area when no modal | Geometry assertion; action dock accounted separately without overlap |
| LAY-07 | Short-height 375–430 px remains operable with primary action visible/predictable | Landscape matrix |
| READ-01 | Phone body ≥16 px; essential labels ≥12 px; no body/data/forms/nav in pixel face | Computed style/lint assertion |
| READ-02 | 200% zoom and 320 CSS px reflow preserve content/function | Automated + manual |
| READ-03 | Color is never sole state cue; team color uses contrast fallback | Visual/a11y tests |
| TOUCH-01 | Routine core targets ≥44×44; design target 48; exceptions never <24 with spacing/rationale | Geometry assertion/allowlist |
| INPUT-01 | No essential hover, drag, gesture, or landscape dependency | Journey/input review |
| DATA-01 | Roster/standings/contracts/draft/FA/stats have declared phone priorities, detail, filter, and long-list strategy | Component contract tests |
| DATA-02 | Virtualize/paginate when >80 rendered rows or >300 complex row nodes unless profiled exception | DOM/performance assertion |
| CHIP-01 | Chip closed state reserves 0 content width/height beyond its trigger; minimize/mute/reopen work | Geometry and behavior tests |
| OVER-01 | At most one exclusive overlay; bounded nonblocking toasts; focus restored | Queue collision tests |
| ROUTE-01 | 79/79 current paths resolve with state/unlock/parameters/back intact | Coverage gate |
| REG-01 | No UI-only engine result/RNG/event-order change | Deterministic fixtures and engine suite |
| REG-02 | Save/import/export/slots/autosave/sidecars compatible | Persistence suite |
| PERF-01 | Engine chunk remains ≤320 KB gzip; no presentation code added to engine chunk | Bundle gate/chunk inspection |
| PERF-02 | No new eager UI chunk >100 KB gzip; initial UI gzip ≤15% baseline without approval | Bundle diff gate |
| PERF-03 | Visible control feedback <100 ms target; useful route response <250 ms on reference hardware | Performance trace |

### Clarifications

- The 152 px shell envelope excludes a currently visible contextual action dock only when the dock is a required screen action; the combined header + dock + bottom nav still must leave meaningful first-viewport content and cannot overlap.
- The 2.5-view Today budget applies to default, unexpanded operational content. The player may deliberately expand optional history/intelligence below it.
- The 80-row/300-node thresholds are starting gates, not universal performance laws. A packet may document profiling evidence for a different threshold.
- Response-time targets require a clean reference environment in WP-00; do not manufacture passing numbers from the audit container.

## Accessibility matrix

| Area | Automated | Manual |
|---|---|---|
| Semantics | axe; landmarks/headings; names/states | Screen-reader pass on Today, nav, forms, data, dialogs, event |
| Keyboard | Tab order; focus-visible; trap/restore tests | Complete J-01, J-03, J-04/J-05, J-10 without pointer |
| Focus not obscured | Geometry vs sticky rects | Zoom/compact-height spot checks |
| Target size | Bounding-box assertion with allowlist | Coarse-pointer device spot checks |
| Contrast | Token/component computed contrast | Team-color and state combinations |
| Reflow/zoom | 320 px and 200% captures | Long names, localization-like expansion, browser text scale |
| Motion | `prefers-reduced-motion` snapshots | Cinematic/event and live score experience |
| Color independence | State icon/text snapshot | Color-vision simulation/inspection |
| Dialogs/sheets | ARIA + focus tests | Escape/close/background inert/return focus |
| Charts | Text summary/data table presence | Comprehension without chart hover/color |
| Errors | Programmatic field association/status | Recovery and error summary usability |

## Automated test plan

### Unit/presenter

- task priority/dedupe/completion across phases;
- readiness blocked/warning/ready and exact consequence;
- route mapping 79/79 and compatibility;
- availability reason;
- entity origin serialization/restoration;
- overlay priority/dedupe/resume;
- Chip speech policy consistency;
- dense-data phone priority contracts.

### Component

- every design-system state;
- touch geometry and coarse-pointer adaptation;
- local nav link/tab semantics;
- bottom sheet/dialog focus;
- sticky action and safe-area layout;
- responsive data/table/list semantics;
- empty/loading/error/locked/recovery.

### End-to-end

- J-01 through J-12;
- required viewport matrix for Today plus representative archetypes;
- direct load of every legacy path under `/MFD/#/...`;
- browser Back and Return to task;
- offline cached launch and network-blocked fallback;
- old save continue/import/export/complete backup/sidecars;
- legacy-mode rollback.

### Regression

Run the complete repository commands from the clean WP-00 environment after every critical-path packet and at cluster gates:

```bash
pnpm -r typecheck
pnpm --filter @mfd/engine test
pnpm --filter @mfd/web test
pnpm --filter @mfd/web build
bash scripts/check-bundle-size.sh
bash scripts/smoke-test-built-page.sh
node scripts/release-gate.mjs
```

## Manual scripts

### M1 — First ten minutes

1. Clear/copy browser storage using the approved test fixture path.
2. Launch at 390×844.
3. Verify Guided, Instant, Scenario, Import are understandable without scrolling a catalog.
4. Complete Guided setup with Back twice; confirm choices persist.
5. Create dynasty; verify save/progress feedback.
6. On Today, state aloud: team, phase/week, opponent/event, must-do count, top action, consequence.
7. Complete first task and return.
8. Verify focus/task status and readiness.

### M2 — Regular weekly loop

1. Load the Week 14 deterministic fixture.
2. Open Today and finish depth + plan.
3. Inspect warning; do not acknowledge; verify action language.
4. Acknowledge if allowed; play/sim/advance.
5. Review Game Center consequence and next Today.
6. Compare state hash/outcome to legacy fixture.

### M3 — Mobile ergonomics

Repeat M2 at 320×568, 390×844, and 844×390 using touch-only. Verify no accidental activation, gesture conflict, hidden action, hover requirement, or Chip occlusion.

### M4 — Keyboard and screen reader

Complete Today → task → readiness, a player drill-down, a transaction selection, and Save & Recovery without a pointer. Verify landmarks, h1 changes, tab/link behavior, status announcements, modal close/restore, and no focus obscuration.

### M5 — Save trust

Using copies only: Save now, export portable save, export complete backup, validate incompatible import, restore valid copy, verify sidecars/history, reload, and continue. Record exact included/replaced scope at each step.

### M6 — Long dynasty

Load a large multi-season fixture; inspect Roster, League Stats, Records, Dynasty timeline, search, and Game history. Monitor DOM size, memory, route response, and filter/return behavior.

## Visual regression plan

- Deterministic fixture screenshots at every required Today viewport.
- Entry, setup, roster, player, depth, Game Plan, Game Center, Trade, Draft, League, Dynasty, Save, Settings, Chip, dialog/sheet/event at 390×844 and 1440×900.
- State variants: default, focus, error, disabled, loading, warning, ready, reduced motion, 200% zoom where useful.
- Pixel diff is a signal, not the sole gate. Geometry and semantic assertions catch meaningful failures hidden by tolerated diff.
- Approved baseline updates require packet ID, reason, before/after, and reviewer.

## Performance checks

- chunk/gzip diff per packet;
- engine chunk ownership and 320 KB gate;
- initial route chunks/lazy imports;
- React render count for shell/Today and long rows;
- DOM node count for long lists;
- input-to-feedback and route response trace;
- memory after repeated navigation/overlay open-close;
- offline/font fallback layout shift;
- low-power/CPU throttle smoke.

## Traceability matrix — Critical and Major findings

| Finding | Evidence | Design decision | Target surface | Work packet | Acceptance test |
|---|---|---|---|---|---|
| C-01 | 79 canonical destinations split across five rooms and an alternate eight-group Nerd navigation; mobile persists four task links and moves the remainder into More. | One IA + route surface adapter | Adaptive nav / all hubs | WP-04, WP-06 | NAV-03, ROUTE-01 |
| C-02 | At 390×844 the rendered document is 11,788 px tall (14.0 viewports), with 43 interactive controls, 270 visible text elements below 12 px, and 156 bordered elements. The component is 1,987 lines. | Today first, bounded | Today | WP-09 | NAV-01, LAY-04 |
| C-03 | Monday Briefing, Action Center, Inbox, Watch, Chip, navigation badges, and Week Advance readiness all communicate what matters, but are separately presented and visually weighted. | Canonical Task Ledger | Today/readiness/Chip/badges | WP-09, WP-10, WP-08 | J-03, REG-01 |
| C-04 | The captured 390×844 More state contains 117 interactive controls, 48 above the fold, 421 small-text elements, 230 bordered elements, four fixed/sticky elements, and three scroll containers. | Five jobs; no sitemap drawer | Mobile nav | WP-06 | NAV-04, TOUCH-01 |
| C-05 | Current shell applies 132 px main bottom padding, 320 px when Chip is active, and 310–370 px desktop right padding. Runtime shows a 287–333 px phone header plus fixed bottom nav and Chip. | Adaptive shell; on-demand Chip | Shell/Chip | WP-02, WP-05, WP-08 | LAY-02, LAY-06, CHIP-01 |
| C-06 | At 320×568 Briefing contains 270 small-text elements and 15 controls below 44 px; at 844×390, 48 of 49 interactive elements are below 44 px. The source contains 80 pixel-font references and extensive bright borders. | Readable type/targets/accent budget | Design system/all screens | WP-01, WP-03 | READ-01, TOUCH-01 |
| M-01 | At 390×844 New Game is 5,055 px tall (6.0 viewports), with 56 interactive controls, 86 small-text elements, and 91 bordered elements; the Instant choice begins around y=3,484. | Staged setup | Entry/setup | WP-11 | J-01, LAY-05 |
| M-02 | RootLayout owns shell rendering, navigation, keyboard behavior, lifecycle effects, command palette, tutorial, achievements, ceremonies, breaking news, playoff lore, recap, save reminder, and other overlays. | Split shell modules | App shell | WP-05, WP-07 | LAY-03, OVER-01 |
| M-03 | 1,987 lines and multiple dashboard modes/widgets/pins/readiness explanations in one feature component. | Presenter + Today archetype | Today | WP-09 | LAY-04, REG-01 |
| M-04 | 4,110 direct style object blocks across 199 TSX files; design tokens explicitly document data-attribute plus !important overrides because inline styles bypass responsive rules. | Semantic CSS Modules + ledger | Migrated routes | WP-01, WP-22 | READ-01 + inline-style gate |
| M-05 | Global mobile CSS turns table rows into flex-column cards and injects 8 px pixel labels for each cell; Roster reaches 11,802 px with 526 small-text and 358 bordered elements. | Purpose-built data views | Roster/data routes | WP-12, WP-19 | DATA-01, DATA-02 |
| M-06 | Game Day, Broadcast, Presentation, Play-by-Play, Game Flow, Film Room, Schedule, and recap concepts are separate routes/groups. | Game Center by game ID | Game | WP-18 | J-07, ROUTE-01 |
| M-07 | Trades, block, deadline, team needs, scouting, draft, recap, free agency, targets, waivers, practice squad, and camp are independently surfaced. | Personnel lifecycle/workbenches | Office | WP-16, WP-17 | J-04, J-05, J-06 |
| M-08 | 13 league-room routes plus league content duplicated in ticker, Briefing, and other screens. | League question model | League | WP-19 | J-08, DATA-01 |
| M-09 | Franchise, career, book, chronicle, scrapbook, legends, HOF, trophy room, eras, MVPs, lore, achievements, named games, bloodlines, awards, recap, and scenarios are separated. | Dynasty story/artifact hub | Dynasty | WP-20 | J-09, ROUTE-01 |
| M-10 | Five room navigation coexists with eight alternate groups covering overlapping routes. | One IA + density | Navigation/data | WP-06, WP-01 | NAV-03, INPUT-01 |
| M-11 | Briefing has 156 bordered elements at 320×568; More has 230; Roster phone has 358. Screens use multiple bright semantic and decorative border colors. | Neutral hierarchy/accent budget | Design system | WP-01, WP-22 | Visual emphasis review |
| M-12 | 80 pixel typography references and 52 uppercase transforms; phone runtime includes hundreds of visible elements below 12 px. | Role-based typography | Design system/all | WP-01, WP-22 | READ-01, READ-02 |
| M-13 | Phone shell commonly reports three scroll containers; some route documents appear short because content lives in a nested main region. Global header, main, drawers, and overlays can each scroll. | One scroll + origin contract | Shell/entities | WP-02, WP-04, WP-06 | LAY-03, NAV-05 |
| M-14 | Shell reserves 320 px bottom or 310–370 px right when Chip is active; Chip repeats pending-decision and location guidance also present elsewhere. | Chip adapter/sheet/panel | Chip | WP-08 | CHIP-01, J-11 |
| M-15 | Settings phone capture is 8,548 px (10.1 viewports); save/load and backup behavior are spread among utility surfaces and cartridge concepts. | System trust surfaces | System | WP-21 | J-10, REG-02 |

No Critical/Major finding is orphaned. Moderate/Minor findings are covered through the relevant foundation/cluster/cleanup packets and the full acceptance matrix.

## Route and feature coverage gate

The release script must:

1. load canonical `APP_ROUTE_REGISTRY` paths;
2. load `ROUTE_SURFACE_MAP` keys;
3. require exact 79/79 set equality;
4. require one canonical surface, compatibility rule, risk, and test ID per path;
5. navigate each old path in representative availability fixtures;
6. verify no route silently renders a blank/not-found surface;
7. verify new global navigation does not expose the registry as a sitemap;
8. emit a machine-readable report archived with the release.

## Final release checklist

### Product

- [ ] North star, five-hub IA, Broadcast War Room, Chip strategy, and density model match audit.
- [ ] First viewport and weekly-loop proof pass.
- [ ] Every current feature has a future surface.
- [ ] No basic flow depends on search.

### Accessibility/input

- [ ] WCAG 2.2 AA audit passes.
- [ ] Target, zoom, reflow, focus, keyboard, touch, reduced motion, dialogs, and chart alternatives pass.

### Regression/trust

- [ ] Engine and web suites pass.
- [ ] Deterministic fixture hashes/outcomes match.
- [ ] Save/import/export/autosave/backup/sidecars pass.
- [ ] GitHub Pages base and offline behavior pass.

### Performance

- [ ] Bundle gates pass and deltas documented.
- [ ] Long lists meet DOM/render thresholds.
- [ ] No expensive always-on animation/blur/Chip asset delay.

### Migration

- [ ] 79/79 route report green.
- [ ] Legacy rollback mode works with current saves.
- [ ] No old path removed without H2.
- [ ] Cleanup deletions have reference proof and separate commits.

### Human

- [ ] H1 recorded.
- [ ] H2 recorded where applicable.
- [ ] H3 owner playtest completed with issues resolved or explicitly accepted.
