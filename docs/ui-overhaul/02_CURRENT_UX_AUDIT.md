# 02 — Current UX Audit

## Severity summary

| Severity | Count | Meaning |
|---|---|---|
| Critical | 6 | Prevents confident comprehension or operation of the core recurring experience; address in the vertical slice. |
| Major | 15 | Materially harms important journeys or makes safe migration difficult; address in route-cluster phases. |
| Moderate | 9 | Creates inconsistency, edge-state failure, or avoidable friction; include in foundation or relevant packet. |
| Minor | 4 | Polish/consistency issue that compounds density; resolve through the system migration. |
| Total | 34 | Repository- and runtime-backed findings. |

## Findings index

| ID | Severity | Journey | Finding | Confidence |
|---|---|---|---|---|
| C-01 | Critical | Global navigation / all journeys | Route-first information architecture exposes repository taxonomy instead of player jobs | High |
| C-02 | Critical | Recurring weekly loop | Monday Briefing is a mega-dashboard rather than a decision home | High |
| C-03 | Critical | Understand → resolve → advance | Competing next-action systems create contradictory attention signals | High |
| C-04 | Critical | Mobile wayfinding | The More drawer hides complexity without structuring it | High |
| C-05 | Critical | All mobile/desktop journeys | Global chrome and Chip reserve too much usable viewport | High |
| C-06 | Critical | Reading and operating the game | Small type, undersized targets, and equal visual intensity undermine usability | High |
| M-01 | Major | Entry and first ten minutes | New Dynasty is a six-screen-tall catalog before the player commits to a setup path | High |
| M-02 | Major | Technical shell | App.tsx is a 2,229-line shell/controller/overlay/router concentration point | High |
| M-03 | Major | Today / weekly loop | MondayBriefing.tsx mixes orchestration, layout, customization, copy, metrics, and task logic | High |
| M-04 | Major | Responsive architecture | Inline-style debt forces responsive CSS to fight specificity | High |
| M-05 | Major | Dense data on mobile | Desktop tables become kilometer-long bordered card stacks | High |
| M-06 | Major | Game-week and result loop | One game is fragmented across globally separate destinations | High |
| M-07 | Major | Acquisition and turnover | Personnel acquisition is split across too many global routes | High |
| M-08 | Major | League understanding | News, Newsroom, Social, Pulse, Rankings, Standings, Stats, Records, and Analytics overlap without a clear question model | High |
| M-09 | Major | Long-term dynasty | Legacy value is buried in a 23-route archive taxonomy | High |
| M-10 | Major | Novice/expert navigation | GM Mode and Nerd Mode create two mental maps instead of one scalable system | High |
| M-11 | Major | Visual scanning | Borders, badges, and accent colors make too many elements appear primary | High |
| M-12 | Major | Readability | Pixel typography and uppercase microcopy are used beyond brand moments | High |
| M-13 | Major | Navigation and return | Nested scroll and inconsistent route restoration obscure where the player is | High |
| M-14 | Major | Companion and guidance | Chip’s valuable guidance is coupled to a large persistent footprint and duplicate task messaging | High |
| M-15 | Major | Trust and system | Settings/save/help are long feature pages rather than calm trust-critical utilities | High |
| MO-01 | Moderate | Startup/readability | External font dependence can weaken offline visual consistency | Medium |
| MO-02 | Moderate | Global events | Global overlays lack a visible orchestration contract | High |
| MO-03 | Moderate | Power navigation | Command Deck is visually prominent enough to feel required | High |
| MO-04 | Moderate | Unlocks/phases | Locked and phase-specific features need consistent explanation | Medium |
| MO-05 | Moderate | System feedback | Empty/loading/error states are not governed by a shared archetype contract | Medium |
| MO-06 | Moderate | Density preference | No unified density contract separates comfort from expert throughput | High |
| MO-07 | Moderate | Entity exploration | Player/team/game links do not share a consistent origin and return model | Medium |
| MO-08 | Moderate | Landscape/short height | Short-height layouts remain technically operable but vertically inefficient | High |
| MO-09 | Moderate | Release safety | No durable visual/measurement baseline appears integrated into release gates | Medium |
| MI-01 | Minor | Notification scanning | Tiny badges and count affordances can lack sufficient semantic weight | Medium |
| MI-02 | Minor | Navigation labels | Icon and label patterns are inconsistent across dense controls | Medium |
| MI-03 | Minor | Copy comprehension | Internal taxonomy, abbreviations, and all-caps copy can obscure plain football meaning | High |
| MI-04 | Minor | Visual consistency | Border/elevation values are duplicated instead of semantically constrained | High |

## Detailed findings

### C-01 — Route-first information architecture exposes repository taxonomy instead of player jobs

- **Severity:** Critical
- **Journey/surface:** Global navigation / all journeys
- **Evidence:** 79 canonical destinations split across five rooms and an alternate eight-group Nerd navigation; mobile persists four task links and moves the remainder into More.
- **Root cause:** Routes accumulated as equal destinations without a durable hub/tab/detail/event taxonomy.
- **User impact:** Players must memorize where systems live, predict internal naming, and repeatedly browse a map before acting.
- **Affected state/input/viewport:** All viewports; highest impact for new, returning, and touch-only players.
- **Selected direction:** Replace the two competing maps with one job-centered IA: Today, Team, Game, Office, League; expose Dynasty and System contextually and through desktop rail/search.
- **Likely modules:** route-registry.ts, navigation.ts, App.tsx, MobileBottomTabBar.tsx, currentAppRoute.ts, navBadges.ts
- **Acceptance test:** 79/79 capabilities map to a future surface; required weekly work is reachable directly from Today; any capability is reachable within three intentional interactions.
- **Confidence:** High
### C-02 — Monday Briefing is a mega-dashboard rather than a decision home

- **Severity:** Critical
- **Journey/surface:** Recurring weekly loop
- **Evidence:** At 390×844 the rendered document is 11,788 px tall (14.0 viewports), with 43 interactive controls, 270 visible text elements below 12 px, and 156 bordered elements. The component is 1,987 lines.
- **Root cause:** Briefing absorbed task management, carryover, widgets, explanations, customization, metrics, and season signals without a first-viewport budget.
- **User impact:** The player cannot reliably distinguish what must happen now from useful context or decoration.
- **Affected state/input/viewport:** Every weekly session; phones and short-height landscape are most severe.
- **Selected direction:** Rebuild as Today: one context header, one task ledger, one next-opponent block, one readiness/advance dock, and progressively disclosed supporting intelligence.
- **Likely modules:** MondayBriefing.tsx, ActionCenter, selectors, WeekAdvance, Chip guidance
- **Acceptance test:** At 390×844, team/week/phase/opponent/required count/next action appear in viewport one; default Today content is no more than 2.5 viewports before optional expansion.
- **Confidence:** High
### C-03 — Competing next-action systems create contradictory attention signals

- **Severity:** Critical
- **Journey/surface:** Understand → resolve → advance
- **Evidence:** Monday Briefing, Action Center, Inbox, Watch, Chip, navigation badges, and Week Advance readiness all communicate what matters, but are separately presented and visually weighted.
- **Root cause:** No canonical UI task ledger owns priority, status, consequence, destination, and completion state.
- **User impact:** Players repeat checks, miss blockers, or advance without confidence because multiple sources can disagree in wording or priority.
- **Affected state/input/viewport:** Regular season, deadlines, playoffs, and phase transitions.
- **Selected direction:** Create one derived Task Ledger selector/presenter. Today, Chip, badges, and Advance consume the same read-only task contract.
- **Likely modules:** selectors.ts, MondayBriefing, ActionCenter, navBadges, ChipHost/ChipDock, WeekAdvance
- **Acceptance test:** A task has one ID, severity, reason, consequence, destination, completion rule, and source. No two surfaces display contradictory status in fixture tests.
- **Confidence:** High
### C-04 — The More drawer hides complexity without structuring it

- **Severity:** Critical
- **Journey/surface:** Mobile wayfinding
- **Evidence:** The captured 390×844 More state contains 117 interactive controls, 48 above the fold, 421 small-text elements, 230 bordered elements, four fixed/sticky elements, and three scroll containers.
- **Root cause:** The mobile system compresses the desktop sitemap into a drawer rather than redesigning destinations into hubs and local navigation.
- **User impact:** Discoverability exists technically but not cognitively; opening More creates a second overwhelming screen.
- **Affected state/input/viewport:** Portrait phones and touch-only play.
- **Selected direction:** Use five labeled bottom destinations, hub-local tabs/sections, contextual links, recent/favorite/search, and a small system sheet—not a full route directory.
- **Likely modules:** MobileBottomTabBar.tsx, navigation.ts, route metadata, command palette
- **Acceptance test:** Bottom navigation has five stable jobs; no drawer exposes the full route registry; a first-time user completes a weekly loop without opening search or an all-destinations view.
- **Confidence:** High
### C-05 — Global chrome and Chip reserve too much usable viewport

- **Severity:** Critical
- **Journey/surface:** All mobile/desktop journeys
- **Evidence:** Current shell applies 132 px main bottom padding, 320 px when Chip is active, and 310–370 px desktop right padding. Runtime shows a 287–333 px phone header plus fixed bottom nav and Chip.
- **Root cause:** Persistent systems were protected from overlap by permanently subtracting space rather than orchestrating adaptive layers.
- **User impact:** Core content begins late, short-height layouts collapse, and phones lose a disproportionate share of the screen before task content.
- **Affected state/input/viewport:** Phones, landscape, 1280×720 laptops, and Chip-enabled states.
- **Selected direction:** Compact phase header, adaptive nav, sticky action dock, and on-demand Chip sheet/panel with no permanent content reservation.
- **Likely modules:** App.tsx, app-shell.css, ChipDock.tsx, MobileBottomTabBar.tsx, overlay layout
- **Acceptance test:** Phone global chrome including safe-area treatment stays within a defined 152 px envelope; no content is permanently padded for expanded Chip; no occlusion at matrix viewports.
- **Confidence:** High
### C-06 — Small type, undersized targets, and equal visual intensity undermine usability

- **Severity:** Critical
- **Journey/surface:** Reading and operating the game
- **Evidence:** At 320×568 Briefing contains 270 small-text elements and 15 controls below 44 px; at 844×390, 48 of 49 interactive elements are below 44 px. The source contains 80 pixel-font references and extensive bright borders.
- **Root cause:** Retro identity tokens expanded into body/data roles; desktop controls were optimized for compactness; borders and accents carry too many semantic jobs.
- **User impact:** Scanning is slow, touch accuracy drops, and primary decisions do not stand out from labels and decoration.
- **Affected state/input/viewport:** Small phones, landscape, large-text users, low-vision users, and coarse pointers.
- **Selected direction:** Readable sans body, tabular numeric face, selective condensed/display type, 48 px nominal targets, semantic color hierarchy, and strict accent budget.
- **Likely modules:** design-system tokens/components, app-shell.css, inline-styled screens
- **Acceptance test:** Phone body copy ≥16 px, essential labels ≥12 px, routine targets ≥44×44 (48 nominal), 200% zoom/reflow passes, and each screen has at most one primary accent plus one urgent signal.
- **Confidence:** High
### M-01 — New Dynasty is a six-screen-tall catalog before the player commits to a setup path

- **Severity:** Major
- **Journey/surface:** Entry and first ten minutes
- **Evidence:** At 390×844 New Game is 5,055 px tall (6.0 viewports), with 56 interactive controls, 86 small-text elements, and 91 bordered elements; the Instant choice begins around y=3,484.
- **Root cause:** Franchise catalog, mode explanation, scenario options, and launch paths share one continuous page.
- **User impact:** The first decision feels like setup administration rather than starting a dynasty.
- **Affected state/input/viewport:** New players on phone.
- **Selected direction:** Stage the flow: choose Start Type → choose franchise/search → choose experience → confirm. Preserve progress and allow instant/demo paths immediately.
- **Likely modules:** NewGameScreen.tsx, FranchiseSetupWizard.tsx
- **Acceptance test:** Every setup step fits within 1.5 phone viewports; primary path is visible in viewport one; back preserves selections.
- **Confidence:** High
### M-02 — App.tsx is a 2,229-line shell/controller/overlay/router concentration point

- **Severity:** Major
- **Journey/surface:** Technical shell
- **Evidence:** RootLayout owns shell rendering, navigation, keyboard behavior, lifecycle effects, command palette, tutorial, achievements, ceremonies, breaking news, playoff lore, recap, save reminder, and other overlays.
- **Root cause:** Cross-cutting UI responsibilities grew inside one root component.
- **User impact:** Every shell change has large regression radius; overlay ordering and responsive behavior are difficult to test independently.
- **Affected state/input/viewport:** All UI migration work.
- **Selected direction:** Split into MfdAppShell, route surface metadata, adaptive navigation, phase context, overlay provider, companion adapter, and lifecycle presenters.
- **Likely modules:** App.tsx and app modules
- **Acceptance test:** Root app composition becomes thin; shell/overlay/nav modules have isolated tests; no engine action moves into presentation code.
- **Confidence:** High
### M-03 — MondayBriefing.tsx mixes orchestration, layout, customization, copy, metrics, and task logic

- **Severity:** Major
- **Journey/surface:** Today / weekly loop
- **Evidence:** 1,987 lines and multiple dashboard modes/widgets/pins/readiness explanations in one feature component.
- **Root cause:** No separation between derived weekly view model, task ledger, screen archetype, and optional modules.
- **User impact:** The most important screen is the hardest to safely simplify and test.
- **Affected state/input/viewport:** Today migration.
- **Selected direction:** Extract pure Today presenter and task ledger; compose bounded modules through a Today archetype.
- **Likely modules:** MondayBriefing.tsx, selectors
- **Acceptance test:** View model snapshot covers phases; screen component contains presentation composition, not business mutation logic.
- **Confidence:** High
### M-04 — Inline-style debt forces responsive CSS to fight specificity

- **Severity:** Major
- **Journey/surface:** Responsive architecture
- **Evidence:** 4,110 direct style object blocks across 199 TSX files; design tokens explicitly document data-attribute plus !important overrides because inline styles bypass responsive rules.
- **Root cause:** Screen-local styling bypasses semantic tokens and shared archetypes.
- **User impact:** Hierarchy changes are slow, inconsistent, and fragile across breakpoints.
- **Affected state/input/viewport:** 199 TSX files; all migration phases.
- **Selected direction:** Introduce semantic tokens and scoped CSS Modules; migrate by route cluster, prohibit new layout-critical inline styles, and remove overrides only after replacement coverage.
- **Likely modules:** design-system tokens, screen CSS, lint/test rules
- **Acceptance test:** New-shell surfaces contain no layout-critical inline styles; inline-style count decreases packet-by-packet with a tracked allowlist.
- **Confidence:** High
### M-05 — Desktop tables become kilometer-long bordered card stacks

- **Severity:** Major
- **Journey/surface:** Dense data on mobile
- **Evidence:** Global mobile CSS turns table rows into flex-column cards and injects 8 px pixel labels for each cell; Roster reaches 11,802 px with 526 small-text and 358 bordered elements.
- **Root cause:** A single generic fallback replaces column-priority and task-specific mobile data design.
- **User impact:** Players lose cross-row comparison while scroll burden explodes.
- **Affected state/input/viewport:** Roster, standings, contracts, draft, free agency, stats, records.
- **Selected direction:** Use purpose-specific mobile list rows, priority columns, horizontal comparison workbench only where justified, entity detail, filters, and virtualization thresholds.
- **Likely modules:** responsive table components, dense screens
- **Acceptance test:** Each dense view documents mobile priorities; no generic all-cells-as-card fallback; Roster default phone length is bounded through grouping/filtering/virtualization.
- **Confidence:** High
### M-06 — One game is fragmented across globally separate destinations

- **Severity:** Major
- **Journey/surface:** Game-week and result loop
- **Evidence:** Game Day, Broadcast, Presentation, Play-by-Play, Game Flow, Film Room, Schedule, and recap concepts are separate routes/groups.
- **Root cause:** Presentation modes were modeled as peers in global IA instead of states/tabs of a game entity.
- **User impact:** Postgame understanding requires route hopping and loses score/opponent context.
- **Affected state/input/viewport:** Every played/simulated game.
- **Selected direction:** Create Game Hub plus entity-based Game Center with Overview, Broadcast, Plays, Flow, Film, Box Score, and Consequences tabs; preserve old paths as aliases.
- **Likely modules:** game-day features, route registry, Game Center presenters
- **Acceptance test:** From a game card, all game views retain the same game ID/context and switch locally; back returns to originating schedule/Today task.
- **Confidence:** High
### M-07 — Personnel acquisition is split across too many global routes

- **Severity:** Major
- **Journey/surface:** Acquisition and turnover
- **Evidence:** Trades, block, deadline, team needs, scouting, draft, recap, free agency, targets, waivers, practice squad, and camp are independently surfaced.
- **Root cause:** Lifecycle-specific tools lack a parent Personnel workspace and phase-aware entry points.
- **User impact:** Players must reconstruct a roster-building workflow from destination names.
- **Affected state/input/viewport:** Trade deadline and offseason.
- **Selected direction:** Office → Personnel with phase-aware tabs and transaction workbenches; surface the relevant stage on Today.
- **Likely modules:** trade/scouting/draft/FA features and route mapping
- **Acceptance test:** Deadline and offseason fixture journeys can be completed from one workspace with preserved filters, selections, and backtracking.
- **Confidence:** High
### M-08 — News, Newsroom, Social, Pulse, Rankings, Standings, Stats, Records, and Analytics overlap without a clear question model

- **Severity:** Major
- **Journey/surface:** League understanding
- **Evidence:** 13 league-room routes plus league content duplicated in ticker, Briefing, and other screens.
- **Root cause:** Content channels and analytical questions are mixed as global destinations.
- **User impact:** Players cannot predict where to answer “what happened,” “who is best,” or “why.”
- **Affected state/input/viewport:** League context and weekly storytelling.
- **Selected direction:** League hub with Overview, Race, News, Stats, Records, and Rules; embed contextual league snippets on team/player/game pages.
- **Likely modules:** league features and ticker
- **Acceptance test:** Each league question has one canonical surface; duplicate summaries deep-link to that source rather than reproducing full modules.
- **Confidence:** High
### M-09 — Legacy value is buried in a 23-route archive taxonomy

- **Severity:** Major
- **Journey/surface:** Long-term dynasty
- **Evidence:** Franchise, career, book, chronicle, scrapbook, legends, HOF, trophy room, eras, MVPs, lore, achievements, named games, bloodlines, awards, recap, and scenarios are separated.
- **Root cause:** Emotional artifacts were organized by feature implementation rather than story and moment.
- **User impact:** The deepest emotional payoff is discoverable mainly by menu browsing after the moment has passed.
- **Affected state/input/viewport:** Multi-season saves.
- **Selected direction:** Dynasty hub organized as Story, People, Honors, Seasons, and Records; trigger relevant legacy moments after games, seasons, records, and milestones.
- **Likely modules:** legacy features, ceremonies, notifications
- **Acceptance test:** Every legacy route maps to a hub section/detail; milestone fixtures provide an event entry and preserve old deep links.
- **Confidence:** High
### M-10 — GM Mode and Nerd Mode create two mental maps instead of one scalable system

- **Severity:** Major
- **Journey/surface:** Novice/expert navigation
- **Evidence:** Five room navigation coexists with eight alternate groups covering overlapping routes.
- **Root cause:** Expert density was solved by reorganizing navigation rather than progressively disclosing data.
- **User impact:** Learning one mode does not reliably transfer to the other.
- **Affected state/input/viewport:** All users switching modes.
- **Selected direction:** One IA; Comfortable and Compact density preferences, advanced sections, saved views, comparison, and command search serve experts.
- **Likely modules:** navigation.ts, UI preferences, dense components
- **Acceptance test:** Mode removal does not hide any route; compact changes density, not location or labels.
- **Confidence:** High
### M-11 — Borders, badges, and accent colors make too many elements appear primary

- **Severity:** Major
- **Journey/surface:** Visual scanning
- **Evidence:** Briefing has 156 bordered elements at 320×568; More has 230; Roster phone has 358. Screens use multiple bright semantic and decorative border colors.
- **Root cause:** Panels are the default container and accent color performs branding, status, navigation, and hierarchy simultaneously.
- **User impact:** Focal points disappear; the UI feels noisy and less premium.
- **Affected state/input/viewport:** Most screens.
- **Selected direction:** Plain sections by default, three neutral surface levels, borders only for grouping/state, strict accent budget, whitespace and type for hierarchy.
- **Likely modules:** tokens and screen styles
- **Acceptance test:** Visual-emphasis audit shows one primary action and at most one urgent competing signal per screen; decorative border count materially drops.
- **Confidence:** High
### M-12 — Pixel typography and uppercase microcopy are used beyond brand moments

- **Severity:** Major
- **Journey/surface:** Readability
- **Evidence:** 80 pixel typography references and 52 uppercase transforms; phone runtime includes hundreds of visible elements below 12 px.
- **Root cause:** Retro broadcast identity is implemented as a pervasive text system.
- **User impact:** Dense football information becomes harder to scan, especially at mobile distance.
- **Affected state/input/viewport:** All dense and explanatory screens.
- **Selected direction:** Use readable sans for body, condensed display for headings, tabular mono for data; reserve pixel face for logo, short kicker, and rare broadcast moments.
- **Likely modules:** tokens and components
- **Acceptance test:** No paragraph/table cell/form label uses pixel type; essential copy meets minimum sizes and 200% zoom.
- **Confidence:** High
### M-13 — Nested scroll and inconsistent route restoration obscure where the player is

- **Severity:** Major
- **Journey/surface:** Navigation and return
- **Evidence:** Phone shell commonly reports three scroll containers; some route documents appear short because content lives in a nested main region. Global header, main, drawers, and overlays can each scroll.
- **Root cause:** Shell and screens independently own overflow without a single archetype contract.
- **User impact:** Back, focus restoration, and scroll restoration are unpredictable; users can feel trapped inside long data views.
- **Affected state/input/viewport:** Phone and keyboard users.
- **Selected direction:** One primary scroll region per archetype; explicit local scrollers for tables only; route-state restoration keyed by entity/task origin.
- **Likely modules:** shell layouts, router helpers
- **Acceptance test:** No unexplained nested scroll; route tests assert scroll/focus/back behavior; drawers trap and restore focus correctly.
- **Confidence:** High
### M-14 — Chip’s valuable guidance is coupled to a large persistent footprint and duplicate task messaging

- **Severity:** Major
- **Journey/surface:** Companion and guidance
- **Evidence:** Shell reserves 320 px bottom or 310–370 px right when Chip is active; Chip repeats pending-decision and location guidance also present elsewhere.
- **Root cause:** The companion is implemented as a persistent dock rather than a presentation adapter over canonical context.
- **User impact:** Players may minimize useful guidance just to reclaim space, while those who keep it open receive redundant signals.
- **Affected state/input/viewport:** Chip-enabled mobile and desktop.
- **Selected direction:** 44–48 px trigger; mobile bottom sheet; desktop on-demand side panel; same Task Ledger and route context; speak at blockers, consequences, onboarding, and major moments.
- **Likely modules:** ChipDock, ChipHost, event wiring, shell
- **Acceptance test:** No permanent layout reservation; minimize/mute/reopen works; Chip and Today task fixtures always agree.
- **Confidence:** High
### M-15 — Settings/save/help are long feature pages rather than calm trust-critical utilities

- **Severity:** Major
- **Journey/surface:** Trust and system
- **Evidence:** Settings phone capture is 8,548 px (10.1 viewports); save/load and backup behavior are spread among utility surfaces and cartridge concepts.
- **Root cause:** System options accumulated in the same panel-heavy screen pattern as game systems.
- **User impact:** Users have difficulty finding recovery, accessibility, import/export, and reversible settings when confidence matters most.
- **Affected state/input/viewport:** Returning users, failures, device migration, accessibility setup.
- **Selected direction:** System sheet plus dedicated Save & Recovery and Settings surfaces grouped by task, with status, last-save proof, and safe staged actions.
- **Likely modules:** Settings.tsx, DynastyCartridge, persistence utilities
- **Acceptance test:** Autosave status and recovery are visible; export/import flows explain scope and preserve compatibility; settings categories are searchable and keyboard/touch complete.
- **Confidence:** High
### MO-01 — External font dependence can weaken offline visual consistency

- **Severity:** Moderate
- **Journey/surface:** Startup/readability
- **Evidence:** Runtime capture aborted external requests and rendered fallback fonts; product is browser-first and local-first.
- **Root cause:** Brand typography can rely on network availability.
- **User impact:** Offline or restricted networks may shift metrics and hierarchy.
- **Affected state/input/viewport:** Offline/local-first use.
- **Selected direction:** System-first body stack and locally bundled selective display assets only if measured against bundle gate.
- **Likely modules:** font loading and tokens
- **Acceptance test:** Core layout remains stable with network blocked; no essential UI depends on third-party font fetch.
- **Confidence:** Medium
### MO-02 — Global overlays lack a visible orchestration contract

- **Severity:** Moderate
- **Journey/surface:** Global events
- **Evidence:** RootLayout mounts tutorial, achievements, ceremonies, breaking news, halftime, hotkeys, playoff lore, recap, era prompt, and save reminder.
- **Root cause:** Each overlay independently competes for timing and layer priority.
- **User impact:** Rare states can stack, steal focus, or interrupt another critical workflow.
- **Affected state/input/viewport:** Milestones, playoffs, season transitions.
- **Selected direction:** Central overlay queue with priority, exclusivity, preemption, dedupe, persistence, and focus rules.
- **Likely modules:** App.tsx and overlay components
- **Acceptance test:** Synthetic collision tests produce deterministic ordering and one blocking overlay at a time.
- **Confidence:** High
### MO-03 — Command Deck is visually prominent enough to feel required

- **Severity:** Moderate
- **Journey/surface:** Power navigation
- **Evidence:** CTRL+K and command affordances appear in global chrome near core navigation.
- **Root cause:** Search compensates for route complexity.
- **User impact:** New players may believe they need to know names before finding features.
- **Affected state/input/viewport:** New and keyboard users.
- **Selected direction:** Keep command search as a power tool; hubs and contextual links must complete core journeys without it.
- **Likely modules:** command palette and shell
- **Acceptance test:** Core playtest never invokes search; search remains reachable and improves expert speed.
- **Confidence:** High
### MO-04 — Locked and phase-specific features need consistent explanation

- **Severity:** Moderate
- **Journey/surface:** Unlocks/phases
- **Evidence:** Routes include unlock week/phase metadata, but presentation varies across navigation and screens.
- **Root cause:** Availability is expressed per feature rather than through a shared unavailable-state component.
- **User impact:** Players cannot distinguish “not yet,” “wrong phase,” and “missing prerequisite.”
- **Affected state/input/viewport:** New saves and offseason transitions.
- **Selected direction:** Shared AvailabilityState with reason, unlock condition, preview, and relevant next action.
- **Likely modules:** route metadata and components
- **Acceptance test:** All locked route fixtures render reason and path forward; no dead-end disabled controls.
- **Confidence:** Medium
### MO-05 — Empty/loading/error states are not governed by a shared archetype contract

- **Severity:** Moderate
- **Journey/surface:** System feedback
- **Evidence:** Large feature surface area and local screen implementations imply inconsistent handling; direct runtime did not traverse every exceptional state.
- **Root cause:** No design-system state pattern or route-level test matrix.
- **User impact:** Failures or empty seasons can feel like broken screens.
- **Affected state/input/viewport:** Imports, empty lists, phase transitions, async-like operations.
- **Selected direction:** Shared state frame with title, explanation, recovery, diagnostics ID, and preserved context.
- **Likely modules:** design system and feature routes
- **Acceptance test:** Every migrated route has loading/empty/error/locked test cases or an explicit not-applicable record.
- **Confidence:** Medium
### MO-06 — No unified density contract separates comfort from expert throughput

- **Severity:** Moderate
- **Journey/surface:** Density preference
- **Evidence:** Current GM/Nerd split changes navigation while many screens remain independently dense.
- **Root cause:** Density is encoded in individual styles and routes.
- **User impact:** Experts cannot reliably compact data without changing mental model; novices still see advanced noise.
- **Affected state/input/viewport:** Desktop/tablet and data-heavy phone screens.
- **Selected direction:** Comfortable/Compact tokenized density; mobile defaults comfortable; advanced sections and saved views persist in UI preferences.
- **Likely modules:** tokens, UI store, list/table components
- **Acceptance test:** Density changes spacing/row height only, not information location or route availability.
- **Confidence:** High
### MO-07 — Player/team/game links do not share a consistent origin and return model

- **Severity:** Moderate
- **Journey/surface:** Entity exploration
- **Evidence:** Many global routes link into related objects, but current route taxonomy is screen-centered rather than entity-centered.
- **Root cause:** Navigation helpers lack explicit origin/task context.
- **User impact:** Drill-down interrupts the workflow and back may return to an unexpected surface.
- **Affected state/input/viewport:** Roster comparison, game review, transactions, league stats.
- **Selected direction:** Typed entity links and return context: origin route, tab, filter, scroll key, and active task.
- **Likely modules:** router helpers and presenters
- **Acceptance test:** Entity drill-down fixture returns to preserved filter/selection/scroll after Back or “Return to task.”
- **Confidence:** Medium
### MO-08 — Short-height layouts remain technically operable but vertically inefficient

- **Severity:** Moderate
- **Journey/surface:** Landscape/short height
- **Evidence:** Briefing reaches 8,059 px at 667×375 (21.5 viewports) and 7,449 px at 844×390 (19.1 viewports).
- **Root cause:** Responsive rules focus on width while global chrome and stacked modules ignore height.
- **User impact:** Landscape is worse, not better, for management screens.
- **Affected state/input/viewport:** Landscape phones and 1280×720 windows.
- **Selected direction:** Compact-height shell, horizontal context/actions, collapsed optional modules, and game-presentation-specific landscape layout.
- **Likely modules:** adaptive shell and archetypes
- **Acceptance test:** 375–430 px height matrix keeps primary action visible, no occlusion, and uses compact-height tokens.
- **Confidence:** High
### MO-09 — No durable visual/measurement baseline appears integrated into release gates

- **Severity:** Moderate
- **Journey/surface:** Release safety
- **Evidence:** Audit required custom capture scripts; existing release gate lists many checks but retained artifact does not show route/viewport visual baselines.
- **Root cause:** Functional coverage matured faster than UI regression infrastructure.
- **User impact:** A shell rewrite could silently reintroduce overflow, buried actions, or target-size failures.
- **Affected state/input/viewport:** Every migration packet.
- **Selected direction:** Add deterministic fixture capture, geometry assertions, axe checks, and approved visual baselines for archetypes.
- **Likely modules:** Playwright/e2e, release scripts
- **Acceptance test:** Critical route/viewport matrix runs in CI or release gate with diff thresholds and geometry assertions.
- **Confidence:** Medium
### MI-01 — Tiny badges and count affordances can lack sufficient semantic weight

- **Severity:** Minor
- **Journey/surface:** Notification scanning
- **Evidence:** Global navigation and Chip use compact count treatments amid dense chrome.
- **Root cause:** Badges are used for both status and urgency.
- **User impact:** Counts can be missed or overinterpreted.
- **Affected state/input/viewport:** Alerts and task counts.
- **Selected direction:** Standard badge variants with text alternatives, capped counts, and urgency semantics.
- **Likely modules:** badges
- **Acceptance test:** Badges are never the only cue and have accessible names.
- **Confidence:** Medium
### MI-02 — Icon and label patterns are inconsistent across dense controls

- **Severity:** Minor
- **Journey/surface:** Navigation labels
- **Evidence:** Current UI mixes text-only, abbreviated, symbolic, and command-style controls.
- **Root cause:** Feature-local controls evolved without one interaction grammar.
- **User impact:** Recognition and touch confidence decrease.
- **Affected state/input/viewport:** Local tools and utility controls.
- **Selected direction:** Labeled icons only when the symbol is conventional; consistent verb-first action copy.
- **Likely modules:** design-system controls
- **Acceptance test:** Component inventory documents icon/label behavior and automated accessible names.
- **Confidence:** Medium
### MI-03 — Internal taxonomy, abbreviations, and all-caps copy can obscure plain football meaning

- **Severity:** Minor
- **Journey/surface:** Copy comprehension
- **Evidence:** Runtime includes labels such as GM MODE, CMD DECK, source/debug-like descriptions, and extensive uppercase styling.
- **Root cause:** Developer/system language leaks into player-facing hierarchy.
- **User impact:** Players spend attention decoding the interface.
- **Affected state/input/viewport:** New players and help states.
- **Selected direction:** Plain-language copy system: action, reason, consequence; move provenance/debug detail behind Help/Details.
- **Likely modules:** copy and presenters
- **Acceptance test:** Content review removes unexplained internal terms from primary flows.
- **Confidence:** High
### MI-04 — Border/elevation values are duplicated instead of semantically constrained

- **Severity:** Minor
- **Journey/surface:** Visual consistency
- **Evidence:** Large bordered-element counts and screen-local styling imply many local combinations.
- **Root cause:** No strict semantic surface/border hierarchy.
- **User impact:** Polish drifts across route clusters.
- **Affected state/input/viewport:** All visual migration.
- **Selected direction:** Three surface levels, three border roles, two elevation levels, and one overlay layer family.
- **Likely modules:** tokens and CSS
- **Acceptance test:** New UI uses semantic tokens; lint/style review rejects raw repeated values outside tokens.
- **Confidence:** High


## Journey analysis


### A. Entry and first ten minutes

**Current failure:** the cold open is clean, but New Dynasty immediately expands into a six-screen catalog. The guided Chip intro is staged well, proving the product can use single-screen progress, yet the broader flow does not carry that discipline forward.

**Target journey:**

```text
Title / Continue
  → Start type: Continue | Guided | Instant | Scenario | Import
  → Franchise search/selection
  → Experience settings (difficulty, guidance, density/accessibility)
  → Review choices
  → Create save with explicit progress and recovery
  → Today with one first task
```

Every step preserves selection on Back. Guided and Instant are always visible in the first viewport. Technical save/version detail remains available under “Save details,” not in the primary decision hierarchy.

### B. Recurring weekly loop

**Current failure:** the user receives instructions from several surfaces and then scrolls a mega-dashboard to infer what is mandatory. Week Advance is a destination rather than the closing state of the loop.

**Target journey:** Today owns the task ledger and readiness. Each task launches a contextual workflow and carries a `returnToTask` origin. On completion, the user returns to Today, sees the state update, and can inspect the consequence before play/advance.

### C. Team-building loop

**Current failure:** roster, depth, development, culture, staff, contracts, promises, comparison, and practice squad are global destinations with inconsistent drill-down and back behavior.

**Target journey:** Team provides Overview, Roster, Depth, Development, Staff, and Culture. Player is an entity detail with consistent tabs. Contract actions can open Office Finance in a focused workbench while retaining the player and return origin.

### D. Acquisition and roster-turnover loop

**Current failure:** deadline, trade, scouting, draft, free agency, waivers, and camp require route reconstruction.

**Target journey:** Office → Personnel becomes phase-aware. In season it emphasizes Needs, Trade Desk, Block, Deadline, and Scouting. Offseason it stages Scouting → Draft → Free Agency → Waivers → Camp. Today surfaces only the active deadline/phase tasks.

### E. Game-week and result loop

**Current failure:** Game Day, Broadcast, Presentation, Play-by-Play, Flow, and Film are navigational peers.

**Target journey:** Game Hub owns opponent/preparation. A Game Center is keyed by game ID and contains Overview, Broadcast, Plays, Flow, Film, Box Score, and Consequences. Switching views never drops game context.

### F. League-understanding loop

**Current failure:** feeds, race, stats, and governance are mixed.

**Target journey:** League answers separate questions: Overview (“what matters?”), Race (“where do teams stand?”), News (“what happened?”), Stats (“who is producing?”), Records (“what is historic?”), and Rules (“how does the league work?”).

### G. Long-term dynasty and legacy loop

**Current failure:** 23 archive routes force browsing after emotional moments.

**Target journey:** Dynasty groups Story, People, Honors, Seasons, and Records. Event cards surface new records, named games, milestones, bloodlines, trophies, and era changes when they happen; every card deep-links to its permanent archive detail.

### H. Trust and system loop

**Current failure:** settings and save/recovery use the same dense visual grammar as football management.

**Target journey:** a calm System entry exposes last save, autosave health, storage/backup status, export/import, recovery, settings, accessibility, help, and about. Destructive actions are staged, scoped, and reversible where possible.

### I. Companion and notification loop

**Current failure:** Chip, badges, Breaking News, ceremonies, toasts, and task surfaces can all compete.

**Target journey:** the canonical task/notification model assigns priority and destination. The overlay manager permits one blocking presentation. Chip is an interpretable assistant over this context, not a second source of truth.



## Cross-cutting audit by lens

### Information architecture and wayfinding

The current IA is technically comprehensive and cognitively expensive. Route names often reflect feature modules, not the question a player is trying to answer. A destination is commonly “findable” only after the player learns whether it belongs to Briefing, Football Ops, Game Week, League, Legacy, or one of eight Nerd groups. The proposed hubs convert the product from **feature-location memory** to **job recognition**.

The new shell must always expose:

- franchise/team identity;
- season, phase, week, and relevant deadline;
- current hub and local section;
- one return-to-task link when the user arrived from Today;
- save health and notification access without competing with the primary action.

### Next action and readiness

A canonical derived task object should include:

```ts
type UiTask = {
  id: string;
  category: 'must' | 'recommended' | 'optional';
  title: string;
  reason: string;
  consequence: string;
  route: AppRoute;
  entityRef?: EntityRef;
  completion: { isComplete: boolean; explanation: string };
  availability: Availability;
  source: string;
  dedupeKey: string;
};
```

This is a presenter contract, not saved game state. Existing engine selectors/actions remain authoritative. Today, nav badges, Chip, and Advance render the same derived objects.

### Cognitive load and progressive disclosure

The problem is not “too many features.” It is too many simultaneous claims on attention. Use three levels:

1. **Decision layer:** the one thing to act on now.
2. **Operational context:** opponent, injuries, cap/staff/standings signals that change the decision.
3. **Deep simulation:** full tables, explanations, histories, and expert tools on demand.

No feature is removed. It moves to the level where its timing and context make sense.

### Scroll, density, and viewport use

Screen archetypes receive explicit budgets:

- Today default: ≤2.5 phone viewports before optional expansion.
- Setup step: ≤1.5 phone viewports.
- Decision workflow: primary decision and consequence visible without traversing unrelated content.
- Entity detail: sticky/local tabs; one main scroll region.
- Long collection: filters remain visible; grouped/paginated/virtualized rows; not one card per table cell.
- Cinematic event: may use the full viewport, then exits to a stable detail/summary.

### Typography and readability

The current retro type is a product asset when it signals identity, broadcast, or a special event. It is a liability when it carries paragraphs, table labels, buttons, and numeric comparison. The new system separates display, body, and data roles and sets hard minimums.

### Mobile ergonomics

Persistent actions live within thumb reach; bottom navigation is labeled; sheets respect safe areas; critical buttons avoid the system gesture zone; no essential action depends on hover; and a compact-height mode responds to height as well as width. Landscape is optional for management and optimized for Game Center/data workbenches, never required for setup or trust flows.

### Data presentation

Every dense route must state its primary comparison question. Roster on phone prioritizes position, player, overall/role, health, and depth status. Secondary contract/trait/development details open in a sheet/detail. Standings prioritize rank, team, W–L, games back, and playoff status. Desktop can add columns; phone should not convert every hidden column into repeated labels.

### Interaction consistency

Primary actions use a single gold emphasis. Secondary actions are neutral. Tertiary actions are text or quiet icon-label controls. Destructive actions are red only at the final decision point. Selected, current, focus-visible, pressed, disabled, loading, warning, and error states are explicit and non-color-dependent.

### Accessibility

The overhaul adopts WCAG 2.2 AA as the required baseline and aims at the 44×44 enhanced target for routine touch controls. The product standard is 48 px nominal / 44 px minimum, with documented exceptions never below the WCAG 24×24 minimum. Reflow at 320 CSS px, 200% zoom, visible un-obscured focus, reduced motion, semantic headings/landmarks, dialog focus trapping, status announcements, and text alternatives for charts are part of component design—not release polish.

### Technical UI architecture

The root problem is coupled presentation. The selected architecture creates route metadata, view-model/presenter derivation, screen archetypes, semantic components, and a single overlay manager while leaving the engine/save boundary intact. CSS Modules and semantic tokens replace layout-critical inline styles incrementally.


## Keep / change / retire matrix

| Area | Keep | Change | Retire only after replacement proof |
|---|---|---|---|
| Simulation and rules | All deterministic engine behavior, AI, cap math, development, draft, outcomes | Presentation selectors and explanations only | Nothing |
| Persistence | Slots, autosaves, migrations, portable export, complete backup/sidecars | Save status, recovery UX, safe staged import flows | No schema or format unless separately justified |
| Routes | Every capability and deep-link intent | Parent hub, local tab/detail/event classification, aliases | Duplicate surface only after H2 and route contract |
| React application | React 19, Vite, TanStack Router, Zustand, Dexie | Shell split, route metadata, presenters, CSS architecture | Current monolithic shell after migration |
| Design identity | Football seriousness, broadcast energy, team branding, Chip personality | Broadcast War Room hierarchy and readable typography | Pervasive pixel body/data type; equal neon borders |
| Chip | Art, personality, route/event wiring, pending-decision value | On-demand presentation adapter using canonical Task Ledger | Permanent 320 px/370 px layout reservation |
| Command palette | Power search and keyboard speed | Secondary power feature with canonical taxonomy | Use as a requirement for basic navigation |
| GM/Nerd intent | Support both approachable and expert play | One IA plus density/advanced-data controls | Two unrelated navigation maps |
| Tables/data | Dense football analysis and comparison | Column priority, responsive row patterns, detail, filters, virtualization | Generic all-cell card conversion |

## Overall diagnosis

MFD’s interface is not failing because it lacks polish or because 79 routes are inherently impossible. It is failing because four structures are missing:

1. **A canonical attention model** that decides what matters now.
2. **A hub/detail/event IA** that makes depth predictable.
3. **Screen archetypes with viewport budgets** that prevent every feature from becoming a dashboard.
4. **A semantic presentation architecture** that can enforce hierarchy across 199 inline-styled files.

A visual reskin without these structures would reproduce the same confusion in newer colors. Deleting features would destroy the game’s competitive advantage. The correct intervention is to preserve every capability while changing **when, where, and how strongly** it appears.
