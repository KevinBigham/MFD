# 05 — Screen Blueprints

## Purpose

These blueprints define structure and behavior before pixel styling. Claude should not redesign the product while implementing them. Exact copy and data values may change when bound to real selectors, but hierarchy, navigation, scroll ownership, return behavior, and responsive transformations are authoritative.

## Screen archetypes

| ID | Archetype | Hierarchy | Scroll contract | Sticky contract | Semantic contract |
|---|---|---|---|---|---|
| A1 | Today / task home | Context → task priority → readiness | One page; optional sections collapse | Sticky readiness dock | `main` with task-list heading and live readiness status |
| A2 | Phase-aware hub | Hub purpose → phase summary → local sections | One main scroll owner | Local nav sticky only when useful | Hub landmark + labeled tablist/sections |
| A3 | Collection / list | Search/filter → grouped rows → detail | Virtualize/paginate after threshold | Filter summary or sort bar may stick | List/table semantics chosen by comparison need |
| A4 | Entity detail | Identity → status → local tabs → history | Page scroll; local tab panel | Entity header may compact-stick | Heading + tablist; return origin announced |
| A5 | Decision workflow / wizard | Decision → evidence → consequence → confirm | Step-local scroll; preserve progress | Bottom action bar | Step heading, progress, errors, back/continue |
| A6 | Comparison / transaction workbench | Selected assets → scenario → effect → commit | Pane-local only on expanded layouts | Commit summary sticky | Named regions, table captions, reversible stage |
| A7 | Data dashboard / analytics | Question → headline answer → trend → detail | Page scroll; chart detail on demand | Filter context sticky when long | Text equivalents and data table/download where appropriate |
| A8 | Timeline / news / history | Latest/relevant → filters → durable detail | Infinite feed only with explicit load/state | Filter controls may stick | Article/timeline semantics and read state |
| A9 | Event / cinematic | Moment → choice/result → consequence → durable record | Viewport-contained then durable detail | Primary continuation | Dialog/event semantics; reduced-motion alternative |
| A10 | Setup / onboarding | One choice per step → review → create | Step-local; ≤1.5 phone screens | Back/continue dock | Progress, preserved choices, error summary |
| A11 | Settings / trust utility | Status → scoped controls → recovery | Single page with local category nav | Save status and dangerous action summary | Forms, descriptions, status/live regions |
| A12 | Empty / loading / error / recovery | State → why → recovery → details | No nested scroll | Recovery action near state | Status/alert role used appropriately; focus on heading |

## Global responsive rules

| Mode | Global navigation | Content columns | Local navigation | Context/Chip | Primary action |
|---|---|---|---|---|---|
| Compact portrait <600 px | Five-item bottom bar | One | Horizontal tabs/section links; sheets for short detail | On-demand bottom sheet | Sticky dock above nav/safe area |
| Compact height <600 px | Compact labeled bottom bar or rail if width permits | One or game-specific two-pane | Collapsed header; essential tabs only visible | Quiet trigger; no auto-open | Always visible without occluding content |
| Medium 600–1023 px | Navigation rail | One or list-detail two-pane | Tabs or secondary rail | On-demand panel/sheet | In screen or bottom/right dock |
| Expanded ≥1024 px | Sidebar/rail | One to two | Tabs/secondary rail | On-demand right panel | Screen header/summary or dock |
| Wide ≥1440 px | Sidebar | Up to three only for true workbench | Secondary rail allowed | Optional user-pinned panel | Transaction summary/commit remains visible |

## Scroll and sticky invariants

1. A screen archetype owns one primary page scroll.
2. Tables/workbench panes may own a local scroll only when their header, purpose, and boundaries are obvious.
3. The bottom navigation, sticky action dock, safe area, and Chip trigger share measured CSS variables; they never guess each other’s height.
4. Sticky elements cannot cover focused content. `scroll-padding` and focus tests account for them.
5. Route changes intentionally reset to the screen heading unless an origin contract restores tab/filter/scroll.
6. A modal/sheet makes the underlying surface inert, traps focus when modal, and returns focus to its trigger.

## State-transition diagrams

### Weekly loop

```text
Today(blocked)
  ├─ open depth task ─→ Depth workflow ─save→ Today(1 blocker)
  ├─ open plan task  ─→ Game Plan      ─save→ Today(ready)
  └─ readiness       ─→ Readiness sheet
                                  ├─ review warning → ready acknowledged
                                  └─ play/advance → Game Center/result → Today(new state)
```

### Entity drill-down

```text
Collection(filter + scroll + selected rows)
  → Entity detail(origin contract)
      → local tab / related workflow
          → Return to task OR Return to collection
              → restore filter + scroll + selected rows + focus
```

### Event/overlay

```text
Event enters overlay queue
  → priority/dedupe decision
      → nonblocking toast/card OR exclusive event
          → user resolves/continues
              → durable destination created/linked
                  → focus returns or route navigates
```

## Blueprint set

## 1. Boot / title / continue / new game

- **Archetype:** A10
- **Viewport/orientation:** All; portrait-first; full-screen compact layout
- **Regions:** Brand moment; latest-save card; Start actions; version/save details disclosure
- **Primary action:** Continue latest dynasty when a healthy save exists; otherwise Start Guided
- **Secondary actions:** Instant, Scenario, Import, Save details
- **Scroll model:** No scroll at 390×844 for the decision surface; details open in sheet
- **Sticky behavior:** None; actions remain naturally in the first viewport
- **Touch zones:** Full-width 48–56 px actions; no tiny skip link
- **Keyboard/focus:** Autofocus only after intro completes; arrows/tab; Enter activates; Escape closes details
- **Data priority:** Save identity, last played, team, season/week, save health
- **Hidden/deferred:** Technical version/schema/slot diagnostics
- **Loading/empty/error/state coverage:** No save, one save, multiple saves, recoverable save, incompatible import, loading
- **Back/return behavior:** Browser back from New Dynasty returns to title without losing import file state
- **Transition:** Continue → Today; New → start-type step; Import → staged validation

### Mobile blueprint

```text
┌──────────────────────────────┐
│ MFD                          │
│ MR. FOOTBALL DYNASTY        │
│ A franchise lives here.     │
├──────────────────────────────┤
│ CONTINUE                    │
│ Lakeview Caps • 9–4         │
│ Week 14 • saved 2m ago   ✓  │
│ [ Continue dynasty        ] │
├──────────────────────────────┤
│ [ Start guided            ] │
│ [ Instant ] [ Scenario ]    │
│ Import save   •   Details   │
└──────────────────────────────┘
```

### Tablet / desktop blueprint

```text
┌──────────── brand / atmosphere ────────────┬──────── latest dynasty ────────┐
│ MFD identity + restrained motion             │ Team / season / week / health │
│                                              │ [ Continue dynasty ]          │
│                                              │ [ Guided ] [ Instant ]        │
│                                              │ Scenario • Import • Details   │
└──────────────────────────────────────────────┴────────────────────────────────┘
```
## 2. Franchise setup wizard

- **Archetype:** A10
- **Viewport/orientation:** Phone portrait required; all others adaptive
- **Regions:** Progress; step title/help; one decision group; contextual preview; action dock
- **Primary action:** Continue / Create Dynasty on review
- **Secondary actions:** Back, Save and exit setup, Help
- **Scroll model:** One step at a time; step content ≤1.5 phone viewports
- **Sticky behavior:** Back/Continue above bottom safe area
- **Touch zones:** Choice cards 48 px minimum; search results have clear selection state
- **Keyboard/focus:** Step heading focused on transition; radio/combobox semantics; no focus reset while filtering
- **Data priority:** Current choice, effect, retained selections, remaining steps
- **Hidden/deferred:** Advanced tuning behind “Advanced settings,” summarized on review
- **Loading/empty/error/state coverage:** Validation error, no search results, restored draft, creation progress, storage error
- **Back/return behavior:** Back preserves all choices and returns focus to previous selected choice
- **Transition:** Review → explicit create/save progress → Today first task

### Mobile blueprint

```text
┌──────────────────────────────┐
│ Setup 2 of 4          Help  │
│ Choose your franchise       │
│ Search [________________]   │
│ AFC • NFC • All             │
├──────────────────────────────┤
│ ○ Kansas City   8–9         │
│ ● Lakeview      Rebuild     │
│ ○ New York      Contender   │
│ …                            │
├──────────────────────────────┤
│ Back        [ Continue ]    │
└──────────────────────────────┘
```

### Tablet / desktop blueprint

```text
┌──── progress rail ────┬──────── choice list ────────┬──── selected preview ────┐
│ Start type          ✓ │ Search / conferences      │ Lakeview Caps          │
│ Franchise           2 │ Team results              │ roster/cap snapshot    │
│ Experience          3 │                           │ why this is interesting│
│ Review              4 │ Back          [Continue]  │                       │
└──────────────────────┴────────────────────────────┴───────────────────────┘
```
## 3. Global app shell

- **Archetype:** A2
- **Viewport/orientation:** Compact, medium, expanded, compact-height
- **Regions:** Global nav; phase context; screen header; main; sticky action; overlay root; Chip trigger
- **Primary action:** Owned by current screen, not shell
- **Secondary actions:** Inbox, search, team/system menu, save health, Chip
- **Scroll model:** Exactly one main page scroll owner; overlays own isolated scroll only while open
- **Sticky behavior:** Compact context header; bottom nav; optional action dock without overlap
- **Touch zones:** All shell targets 44 px minimum; 48 nominal
- **Keyboard/focus:** Skip link; hub shortcuts; Ctrl/Cmd+K; focus restoration after route/overlay
- **Data priority:** Team, phase/week, hub/location, save health, notification count
- **Hidden/deferred:** Version/debug and full route map
- **Loading/empty/error/state coverage:** New game/no game, offline, save warning, modal open, compact height, reduced motion
- **Back/return behavior:** Global Back follows origin model; hub click returns to overview
- **Transition:** Routes render into archetype slots

### Mobile blueprint

```text
┌──────────────────────────────┐
│ Lakeview  9–4 • W14     ●1  │  compact phase header
│ Today                         │
├──────────────────────────────┤
│                              │
│          screen main         │  one scroll owner
│                              │
├──────────────────────────────┤
│ readiness / primary action   │  optional sticky dock
├──────────────────────────────┤
│ Today Team Game Office League│  safe-area bottom nav
└──────────────────────────────┘
                         [Chip]
```

### Tablet / desktop blueprint

```text
┌──────── rail ───────┬──────────── phase/context header ───────────┬──── utility ────┐
│ MFD / team          │ Lakeview • Regular • Week 14 • vs Harbor │ search / inbox │
│ Today               ├──────────────────────────────────────────┴─────────────────┤
│ Team                │ screen header / local tabs                                 │
│ Game                │                                                            │
│ Office              │ main content                              [context panel]   │
│ League              │                                                            │
│ Dynasty             │                                                            │
│ ───────             │                                                            │
│ Save ✓ / Settings   │                                                            │
└─────────────────────┴────────────────────────────────────────────────────────────┘
```
## 4. Mobile navigation

- **Archetype:** A2
- **Viewport/orientation:** <600 px; portrait and compact-height landscape
- **Regions:** Five peer hub targets; active indicator; badges; safe-area pad
- **Primary action:** Navigate to hub overview
- **Secondary actions:** Long-press is not required; no hidden gesture
- **Scroll model:** Never scrolls horizontally; labels remain present
- **Sticky behavior:** Fixed to viewport bottom; coordinated with action dock
- **Touch zones:** Each target spans ≥20% bar width and ≥48 px content height
- **Keyboard/focus:** Tab in document order; arrow-key roving optional only if implemented correctly
- **Data priority:** Today, Team, Game, Office, League
- **Hidden/deferred:** Dynasty/System via identity sheet/context/search
- **Loading/empty/error/state coverage:** Active, badge, focus, pressed, offline/save warning handled elsewhere
- **Back/return behavior:** Browser back traverses history; tapping active hub returns to its overview
- **Transition:** Hub screen with local navigation

### Mobile blueprint

```text
┌──────┬──────┬──────┬──────┬──────┐
│  ●2  │      │      │      │      │
│Today │ Team │ Game │Office│League│
└──────┴──────┴──────┴──────┴──────┘
```

### Tablet / desktop blueprint

```text
Not rendered as a bottom bar; same destination model becomes rail/sidebar.
```
## 5. Desktop / tablet navigation

- **Archetype:** A2
- **Viewport/orientation:** Rail 600–1023; sidebar ≥1024
- **Regions:** Team identity; core hubs; Dynasty; system/save health; collapse control on desktop
- **Primary action:** Navigate hub
- **Secondary actions:** Open team/system sheet, search, save status
- **Scroll model:** Navigation itself does not become a route list; rare overflow uses one rail scroll
- **Sticky behavior:** Viewport-height rail with safe padding
- **Touch zones:** Rail targets ≥48 px in coarse-pointer mode
- **Keyboard/focus:** Landmark navigation; active state and visible focus; shortcuts optional
- **Data priority:** Same five jobs; Dynasty visible on expanded
- **Hidden/deferred:** Local route tabs stay in content, never duplicated globally
- **Loading/empty/error/state coverage:** Collapsed labeled rail where width permits; never icon-only without accessible persistent names
- **Back/return behavior:** History and origin model unchanged
- **Transition:** Hub overview/local section

### Mobile blueprint

```text
Tablet portrait: 72–88 px labeled rail + single content pane.
```

### Tablet / desktop blueprint

```text
┌─────────────────────┐
│ MFD  Lakeview       │
│ ● Today          2  │
│   Team              │
│   Game              │
│   Office            │
│   League            │
│   Dynasty           │
│                     │
│ Save healthy      ✓ │
│ Settings / Help     │
└─────────────────────┘
```
## 6. Monday Briefing / Today

- **Archetype:** A1
- **Viewport/orientation:** All; 390×844 is reference proof
- **Regions:** Week context; next-action task; task groups; opponent; readiness; optional intelligence
- **Primary action:** Open top Must Do or play/advance when ready
- **Secondary actions:** Open all tasks, opponent, inbox summary, explain readiness
- **Scroll model:** Default ≤2.5 phone viewports; optional sections collapsed
- **Sticky behavior:** Readiness/action dock; compact header
- **Touch zones:** Task rows 56 px+ with full-row activation and separate details control
- **Keyboard/focus:** Task heading → rows → readiness; completion update announced
- **Data priority:** Phase/week, opponent, must-do count, reason, consequence, readiness
- **Hidden/deferred:** Source/provenance, full metrics, widget customization, optional feeds
- **Loading/empty/error/state coverage:** Blocked, warning, ready, game complete, phase transition, offseason, no optional tasks
- **Back/return behavior:** Return from task restores task focus and shows resolved status
- **Transition:** Task workflow or play/advance

### Mobile blueprint

```text
┌──────────────────────────────┐
│ REGULAR • WEEK 14 • 9–4     │
│ vs Harbor • division race   │
├──────────────────────────────┤
│ 2 MUST DO                   │
│ Depth chart: 12/22 starters │
│ Missing starters weakens…   │
│ [ Finish depth chart      ] │
│ Game Plan not saved         │
│ [ Set plan                ] │
├──────────────────────────────┤
│ RECOMMENDED (2)         ›   │
│ Opponent / injuries     ›   │
├──────────────────────────────┤
│ Resolve 2 blockers          │
└──────────────────────────────┘
```

### Tablet / desktop blueprint

```text
┌──────── week / opponent / stakes ───────┬──── readiness ───────────┐
│ Lakeview 9–4 • W14 • vs Harbor         │ 2 blockers              │
│ division race / weather / game time    │ [ Resolve next ]        │
├────────────────────────────────────────┴──────────────────────────┤
│ Must Do task ledger (main column)      │ Opponent + roster signals│
│ Recommended / Optional collapsed       │ Inbox / league stakes    │
└────────────────────────────────────────┴──────────────────────────┘
```
## 7. Action / readiness center

- **Archetype:** A1
- **Viewport/orientation:** Sheet on phone from readiness; panel/page on expanded
- **Regions:** Blockers; warnings; saved weekly inputs; consequence; acknowledgement; action
- **Primary action:** Open blocker or confirm play/advance
- **Secondary actions:** Review saved inputs; explain calculation; cancel
- **Scroll model:** Sheet content scrolls; action footer remains visible
- **Sticky behavior:** Action footer above safe area
- **Touch zones:** Full-width task rows and clear acknowledgement control
- **Keyboard/focus:** Dialog/sheet focus rules; status changes announced
- **Data priority:** What blocks, what warns, what will be consumed/changed
- **Hidden/deferred:** Selector provenance/debug behind Details
- **Loading/empty/error/state coverage:** Blocked, warning-only, ready, stale readiness, save error
- **Back/return behavior:** Close returns focus to readiness trigger
- **Transition:** Exact task or transition

### Mobile blueprint

```text
╭──────── Readiness ───────────╮
│ NOT READY • 2 blockers       │
│ 1. Fill depth chart       ›  │
│ 2. Save Game Plan         ›  │
│ Warning: LT questionable  ›  │
│ Saved: practice / scouting   │
│                              │
│ [ Resolve next blocker ]     │
╰──────────────────────────────╯
```

### Tablet / desktop blueprint

```text
Right context panel or centered dialog for final confirmation; never a separate global destination.
```
## 8. Roster list

- **Archetype:** A3
- **Viewport/orientation:** Phone list; tablet list-detail; desktop table/detail
- **Regions:** Roster summary; search/filter/sort; position groups; player rows; compare tray
- **Primary action:** Open player
- **Secondary actions:** Filter, sort, select comparison, depth/transaction contextual action
- **Scroll model:** One grouped list; virtualize if >80 rendered rows or >300 row DOM nodes
- **Sticky behavior:** Compact filter summary; compare tray only when active
- **Touch zones:** Player row ≥56 px; secondary menu does not shrink row target
- **Keyboard/focus:** List/table navigation; filter focus; multi-select labels
- **Data priority:** Position, player, role/depth, OVR/grade, health; context-specific alert
- **Hidden/deferred:** Contract, traits, development details unless filter/column chosen
- **Loading/empty/error/state coverage:** Empty filter, injuries-only, practice squad, comparison mode, compact desktop
- **Back/return behavior:** Player detail returns to same group/filter/scroll and selected compare state
- **Transition:** Player detail / compare / contextual workflow

### Mobile blueprint

```text
┌──────────────────────────────┐
│ Roster 53/53   Search Filter│
│ Offense 25 • Defense 25     │
├─ QB ────────────────────────┤
│ QB1 Marcus Hale   84  Ready │
│ QB2 Theo Grant    72  Ready │
├─ RB ────────────────────────┤
│ RB1 Devon King    86  Q     │
│ …                            │
└──────────────────────────────┘
```

### Tablet / desktop blueprint

```text
┌ filters / saved view ─────────────────────────────────────────────┐
│ Pos | Player | Role | OVR | Age | Health | Dev | Contract | …     │
│ ... selectable rows ...                            detail pane →   │
└────────────────────────────────────────────────────────────────────┘
```
## 9. Player profile

- **Archetype:** A4
- **Viewport/orientation:** Phone page; tablet/desktop entity detail with context pane
- **Regions:** Player identity/status; key actions; local tabs; section content; return origin
- **Primary action:** Contextual: set role, negotiate, compare, add to trade, etc.
- **Secondary actions:** Favorite/watch, history, related links
- **Scroll model:** One page; tab content; identity compacts on scroll
- **Sticky behavior:** Local tabs; contextual action only when action exists
- **Touch zones:** Tabs scroll with visible overflow cue; actions 44/48 px
- **Keyboard/focus:** Heading and tab semantics; action menu named with player
- **Data priority:** Name/position/role, OVR/health, current task-relevant facts
- **Hidden/deferred:** Full ratings/history under tabs
- **Loading/empty/error/state coverage:** Injured, unsigned, retired, prospect, practice squad, comparison origin
- **Back/return behavior:** Explicit Return to roster/task/trade preserving origin
- **Transition:** Action workflow or related entity

### Mobile blueprint

```text
┌──────────────────────────────┐
│ ‹ Return to depth task       │
│ #12 MARCUS HALE • QB1       │
│ 84 OVR • Ready • Star dev   │
│ [ Set role ]  [ Compare ]   │
│ Overview Role Dev Contract ›│
├──────────────────────────────┤
│ Snapshot / strengths / risk  │
│ Current season               │
└──────────────────────────────┘
```

### Tablet / desktop blueprint

```text
Identity header + horizontal tabs; main details left, task/context/actions right.
```
## 10. Depth chart

- **Archetype:** A5
- **Viewport/orientation:** Phone position workflow; desktop drag/select board
- **Regions:** Completeness/status; side/position nav; slots; candidates; consequence; save/return
- **Primary action:** Assign selected player / save depth
- **Secondary actions:** Auto-fill, reset, inspect player, resolve next empty slot
- **Scroll model:** One position at a time on phone; desktop columns can locally scroll if labeled
- **Sticky behavior:** Completeness and save/return dock
- **Touch zones:** Do not require drag; tap slot → choose player is primary touch path
- **Keyboard/focus:** Select slot and candidate; move controls; announcements for reassignment
- **Data priority:** Empty/invalid slots, starter/backup, health, fatigue/fit
- **Hidden/deferred:** Full ratings and advanced comparison in player detail/sheet
- **Loading/empty/error/state coverage:** Incomplete, conflict, injury replacement, saved, auto-filled, preseason expanded roster
- **Back/return behavior:** Warn only if unsaved UI changes; saved state returns to Today task
- **Transition:** Next empty position or readiness

### Mobile blueprint

```text
┌──────────────────────────────┐
│ Depth • 12/22 starters       │
│ Offense  QB  RB  WR  OL      │
├──────────────────────────────┤
│ QB1  Marcus Hale 84   ✓      │
│ QB2  Empty              [ + ]│
│ Candidates                    │
│ Theo Grant 72 • healthy   [ ]│
│ …                             │
├──────────────────────────────┤
│ Save & return to Today       │
└──────────────────────────────┘
```

### Tablet / desktop blueprint

```text
Position map/slots left; candidates center; selected-player comparison right; no drag-only requirement.
```
## 11. Team / Football Operations hub

- **Archetype:** A2
- **Viewport/orientation:** All
- **Regions:** Team health summary; local nav; phase-aware alerts; current section
- **Primary action:** Section-specific
- **Secondary actions:** Roster search, compare, open staff/culture
- **Scroll model:** Hub overview bounded; section owns one scroll
- **Sticky behavior:** Local nav after header compacts
- **Touch zones:** Tabs/section links 44 px; cards are not nested interactive traps
- **Keyboard/focus:** Tablist/landmarks; `/` or search optional
- **Data priority:** Roster count, health, depth completeness, development/staff signals
- **Hidden/deferred:** Full module detail
- **Loading/empty/error/state coverage:** Preseason, regular, injury crisis, roster violation
- **Back/return behavior:** Hub overview stable; contextual origin preserved
- **Transition:** Roster/Depth/Development/Staff/Culture

### Mobile blueprint

```text
Header + horizontal local tabs + two operational alerts + grouped section links.
```

### Tablet / desktop blueprint

```text
Hub summary row + local tabs; optional roster-health side panel.
```
## 12. Front Office / finance hub

- **Archetype:** A2
- **Viewport/orientation:** All; expanded supports scenarios
- **Regions:** Cap/ownership snapshot; local nav; obligations; upcoming decisions; scenario link
- **Primary action:** Resolve highest finance/ownership decision
- **Secondary actions:** Contracts, Cap Lab, owner goals, facilities/operations
- **Scroll model:** Summary-first; contracts collection separate
- **Sticky behavior:** Local nav and scenario commit only when active
- **Touch zones:** Financial values pair labels; scenario controls 44 px
- **Keyboard/focus:** Tabular values; sliders have numeric inputs; forms announce validation
- **Data priority:** Cap space, projected space, key expirations, owner risk, current action
- **Hidden/deferred:** Full contract ledger and advanced cap assumptions
- **Loading/empty/error/state coverage:** Over cap, deadline, extension window, healthy, ownership warning
- **Back/return behavior:** Scenario can cancel without changing save; return preserves assumptions until discarded
- **Transition:** Contract detail / Cap workbench / ownership action

### Mobile blueprint

```text
Finance snapshot + top expiring decisions + “Open Cap Lab” action.
```

### Tablet / desktop blueprint

```text
Summary and upcoming decisions left; obligations/trend right; local tabs.
```
## 13. Acquisition hub

- **Archetype:** A2
- **Viewport/orientation:** All; phase-aware default section
- **Regions:** Needs; current lifecycle; local nav; active targets/offers; deadlines
- **Primary action:** Resume active personnel decision
- **Secondary actions:** Trade Desk, Scouting, Draft, Free Agency, Waivers, Camp
- **Scroll model:** Overview short; workbenches separate
- **Sticky behavior:** Deadline/clock only when truly active
- **Touch zones:** Lifecycle cards full-width; no route-grid overload
- **Keyboard/focus:** Sections and active state named; countdown never keyboard-blocking
- **Data priority:** Needs, active phase/deadline, offers/targets requiring response
- **Hidden/deferred:** Inactive phases available through local nav with availability explanation
- **Loading/empty/error/state coverage:** Regular, deadline, draft, FA, waivers, camp
- **Back/return behavior:** Return to Office Overview or Today task
- **Transition:** Trade/Draft/FA workflow

### Mobile blueprint

```text
Personnel status + active lifecycle card + needs + targets/offers summary.
```

### Tablet / desktop blueprint

```text
Needs/context left, active personnel workspace entry center, upcoming phases right.
```
## 14. Trade workflow

- **Archetype:** A6
- **Viewport/orientation:** Phone staged workflow; desktop workbench
- **Regions:** Partner/need; your assets; their assets; cap/value effect; rationale; submit/confirm
- **Primary action:** Add asset / Propose trade at final stage
- **Secondary actions:** Inspect, compare, save scenario, clear, cancel
- **Scroll model:** Phone stages; desktop panes can scroll independently only with fixed labels and one transaction summary
- **Sticky behavior:** Offer summary and primary action
- **Touch zones:** Checkbox/add controls 44 px; selected tray accessible
- **Keyboard/focus:** Move/add/remove controls; no drag-only; validation summary
- **Data priority:** Assets, cap, value, roster/depth impact, acceptance rationale
- **Hidden/deferred:** Full player detail; advanced value explanation
- **Loading/empty/error/state coverage:** Empty, invalid roster/cap, likely rejection, counter, accepted, deadline expired
- **Back/return behavior:** Preserve draft offer until explicit discard; return origin retained
- **Transition:** Review → confirm → outcome detail

### Mobile blueprint

```text
1 Partner → 2 Your assets → 3 Their assets → 4 Review
[sticky offer summary: 2 out / 1 in • cap +$3.2M]
[ Continue / Propose ]
```

### Tablet / desktop blueprint

```text
Three-pane: your assets | offer ledger | their assets, with cap/value consequence dock.
```
## 15. Draft workflow

- **Archetype:** A6/A9
- **Viewport/orientation:** Phone staged board; expanded workbench; event mode on clock
- **Regions:** Pick/clock/context; board; prospect detail; team needs; trade offers; selection confirmation
- **Primary action:** Draft player / submit trade response
- **Secondary actions:** Filter, compare, queue, inspect, pause event if supported
- **Scroll model:** Board one scroll; detail sheet/pane; event overlay not nested
- **Sticky behavior:** Pick context and selected prospect action
- **Touch zones:** Rows 56 px; clock not tiny; no hover scouting data
- **Keyboard/focus:** Board navigation, search, compare, confirm; focus preserved after pick
- **Data priority:** Pick, team, need, prospect, scouting confidence, fit, consequence
- **Hidden/deferred:** Deep combine/traits/history
- **Loading/empty/error/state coverage:** Pre-draft, on clock, CPU pick, trade offer, drafted, recap
- **Back/return behavior:** On-clock leave confirms only if it risks losing context; board filters persist
- **Transition:** Selection event → updated board → recap artifact

### Mobile blueprint

```text
Clock header + needs chips + prospect list; prospect opens sheet; Draft action sticky.
```

### Tablet / desktop blueprint

```text
Board table + prospect detail + needs/queue; event presentation overlays only the pick moment.
```
## 16. Free agency workflow

- **Archetype:** A6
- **Viewport/orientation:** Phone staged target/offer; desktop market workbench
- **Regions:** Needs/budget; market filters; targets; player detail; offer structure; competition; submit
- **Primary action:** Add target / Submit offer
- **Secondary actions:** Compare, remove target, scenario, inspect cap
- **Scroll model:** Market list one scroll; offer editor step/sheet
- **Sticky behavior:** Target count/budget and offer action
- **Touch zones:** Offer controls paired with inputs; no small sliders only
- **Keyboard/focus:** Numeric entry, validation, market filters, target tray
- **Data priority:** Player/position, fit, ask, cap effect, interest/competition
- **Hidden/deferred:** Full history/ratings
- **Loading/empty/error/state coverage:** Market open, offer pending, bidding update, signed elsewhere, accepted, cap invalid
- **Back/return behavior:** Offer draft preserved or explicit discard; market filters persist
- **Transition:** Outcome → roster/player detail → next target

### Mobile blueprint

```text
Market rows + target tray; selected player opens offer step with clear cap consequence.
```

### Tablet / desktop blueprint

```text
Market left, selected player center, offer/competition right.
```
## 17. Game Week hub

- **Archetype:** A2
- **Viewport/orientation:** All; short-height optimized
- **Regions:** Opponent/venue/weather/stakes; preparation status; local nav; recent matchup; game action
- **Primary action:** Resolve prep or start game/sim
- **Secondary actions:** Opponent detail, schedule, matchup history
- **Scroll model:** Overview ≤2 phone viewports; detail local sections
- **Sticky behavior:** Game readiness/action dock
- **Touch zones:** Opponent and action blocks 48 px+
- **Keyboard/focus:** Local tablist; status descriptions; start action confirmation
- **Data priority:** Opponent, time/venue/weather, injury/depth/plan readiness, stakes
- **Hidden/deferred:** Full scouting/history/league context
- **Loading/empty/error/state coverage:** Pregame, live/paused if applicable, final, bye, offseason
- **Back/return behavior:** Return to Today; Game Center returns here/schedule origin
- **Transition:** Game Plan or Game Center

### Mobile blueprint

```text
Scoreboard-like opponent header + preparation checklist + primary action.
```

### Tablet / desktop blueprint

```text
Opponent/prep main; scouting and league stakes context side panel.
```
## 18. Game Plan

- **Archetype:** A5
- **Viewport/orientation:** Phone stepper/sections; desktop two-column plan board
- **Regions:** Opponent tendency; offense plan; defense plan; personnel/depth link; risk summary; save
- **Primary action:** Save plan and return
- **Secondary actions:** Use recommended, reset, inspect evidence
- **Scroll model:** One section/accordion on phone; no nested page+form scroll
- **Sticky behavior:** Unsaved status + Save
- **Touch zones:** Segmented choices 44 px; sliders paired with values and buttons/inputs
- **Keyboard/focus:** Fieldsets, radios, sliders, validation; unsaved warning
- **Data priority:** Chosen approach, opponent reason, expected tradeoff, saved state
- **Hidden/deferred:** Advanced tuning and provenance
- **Loading/empty/error/state coverage:** Not started, partial, recommended, saved, invalid due roster/injury
- **Back/return behavior:** Unsaved confirmation; saved returns to Today task with focus
- **Transition:** Readiness or depth decision

### Mobile blueprint

```text
Opponent insight → offense choice → defense choice → risk summary → Save.
```

### Tablet / desktop blueprint

```text
Opponent evidence left; plan controls center; consequence/readiness right.
```
## 19. Game Center

- **Archetype:** A4/A9
- **Viewport/orientation:** Portrait management; landscape/two-pane enhanced; desktop
- **Regions:** Persistent game identity/score/state; local tabs; tab content; consequences/next
- **Primary action:** State-dependent: Play/Continue, Review consequence, Return to Today
- **Secondary actions:** Switch tab, inspect player/team, share/export only if existing
- **Scroll model:** One tab panel; live/event view can be viewport-contained
- **Sticky behavior:** Score/state header compacts; local tabs
- **Touch zones:** Tabs and play filters 44 px; timeline rows accessible
- **Keyboard/focus:** Tablist; live updates announced politely; controls labeled with game state
- **Data priority:** Teams, score/time/final, possession/state, key result and consequences
- **Hidden/deferred:** Full play data/film/advanced charts by tabs
- **Loading/empty/error/state coverage:** Pregame, live, halftime, final, replay, unavailable film, no plays
- **Back/return behavior:** Return to schedule/Today origin with game ID retained
- **Transition:** Consequences → Today/new week

### Mobile blueprint

```text
┌ Lakeview 27 — Harbor 24 FINAL ┐
│ Overview Broadcast Plays Flow ›│
├────────────────────────────────┤
│ key result / turning point      │
│ injuries / standings / records  │
│ [ Review consequences ]         │
└────────────────────────────────┘
```

### Tablet / desktop blueprint

```text
Persistent scoreboard + tab content; optional play list/detail split or flow chart/detail.
```
## 20. League hub / standings

- **Archetype:** A2/A3
- **Viewport/orientation:** Phone priority rows; desktop data table
- **Regions:** League headline/race; local nav; current tab filters; rows/cards; context
- **Primary action:** Open team/game/story
- **Secondary actions:** Conference/division filter, sort, compare
- **Scroll model:** One list/table; sticky column header on desktop only if accessible
- **Sticky behavior:** Local nav/filter summary
- **Touch zones:** Standings row ≥52 px; no 8 px generated cell labels
- **Keyboard/focus:** Proper table when cross-row comparison is primary; captions and sort buttons
- **Data priority:** Rank, team, W–L, GB, playoff status; owned team emphasized non-color-only
- **Hidden/deferred:** Points/advanced splits to detail/expanded columns
- **Loading/empty/error/state coverage:** Early season, clinched/eliminated, playoffs, no data
- **Back/return behavior:** Team detail returns to same filter/scroll
- **Transition:** Team/game/news detail

### Mobile blueprint

```text
Division groups with compact standings rows; tap row for detail; owned-team marker + text.
```

### Tablet / desktop blueprint

```text
Semantic standings table with column priorities and optional advanced columns.
```
## 21. Analytics / records / stats

- **Archetype:** A7
- **Viewport/orientation:** Phone answer-first; expanded dashboard
- **Regions:** Question/title; filters; headline insight; chart/table; explanation; related entities
- **Primary action:** Change question/filter or open entity
- **Secondary actions:** Show data table, compare, save view
- **Scroll model:** Page scroll; chart never owns hidden vertical scroll
- **Sticky behavior:** Filter summary only for long exploration
- **Touch zones:** Chart interactions have accessible alternatives; points not tiny-only
- **Keyboard/focus:** Legend/filter controls; text summary; table alternative
- **Data priority:** Answer, trend, sample/context, relevant comparison
- **Hidden/deferred:** All variables/raw rows
- **Loading/empty/error/state coverage:** No sample, partial season, record tie, loading/calculation error
- **Back/return behavior:** Saved filters/view restored
- **Transition:** Entity detail or related analysis

### Mobile blueprint

```text
One headline KPI/answer + one chart + short insight + “View data.”
```

### Tablet / desktop blueprint

```text
Question/filter bar + 2-column insight/chart; supporting table below, not a mosaic of equal cards.
```
## 22. Dynasty / Legacy hub

- **Archetype:** A8
- **Viewport/orientation:** All; editorial detail on expanded
- **Regions:** Current dynasty identity; newest story artifact; local nav; timeline/people/honors/seasons/records
- **Primary action:** Open newest meaningful artifact
- **Secondary actions:** Filter era/person/season; compare eras; scenarios
- **Scroll model:** Timeline with explicit load-more or virtualized grouping; no endless decorative cards
- **Sticky behavior:** Local nav; era filter when active
- **Touch zones:** Artifact cards have one primary target; internal links separate
- **Keyboard/focus:** Timeline/list semantics; headings by year/era
- **Data priority:** Recent milestone, long-term record, people and seasons with emotional significance
- **Hidden/deferred:** Full archive taxonomy behind sections/search
- **Loading/empty/error/state coverage:** First season/no artifacts, new record, retirement, championship, era change
- **Back/return behavior:** Artifact returns to preserved timeline/season origin
- **Transition:** Artifact detail / related game/player/season

### Mobile blueprint

```text
Newest story + Story/People/Honors/Seasons/Records tabs + year-grouped timeline.
```

### Tablet / desktop blueprint

```text
Editorial lead artifact, timeline, and “dynasty at a glance”; archive detail right/next page.
```
## 23. Save / load / backup

- **Archetype:** A11
- **Viewport/orientation:** All; calm utility layout
- **Regions:** Save health; slots/autosave; last successful save; portable export/import; complete backup/sidecars; recovery
- **Primary action:** Contextual safe action: Save now / Export complete backup / Validate import
- **Secondary actions:** Load, rename, download, inspect, restore
- **Scroll model:** One page with categories; dangerous actions isolated
- **Sticky behavior:** Save status only if active operation; not a decorative footer
- **Touch zones:** Actions 44/48 px; file controls labeled
- **Keyboard/focus:** Form and progress status; confirmation focus; file validation summary
- **Data priority:** Is current save safe? What exactly will this action include/replace?
- **Hidden/deferred:** Schema/version/diagnostics under details
- **Loading/empty/error/state coverage:** Healthy, saving, failed, quota risk, incompatible import, recoverable backup, no slot
- **Back/return behavior:** Cancel never mutates; load/restore requires scope confirmation and recovery point when supported
- **Transition:** Return to prior game surface with save proof

### Mobile blueprint

```text
Health card → Save now → Complete backup → Import/restore → slots/history.
```

### Tablet / desktop blueprint

```text
Status/slots left; backup/import/recovery right; clear audit details.
```
## 24. Settings / accessibility

- **Archetype:** A11
- **Viewport/orientation:** All
- **Regions:** Search/categories; preference form; current value; reset; preview; save semantics
- **Primary action:** Changes apply immediately only when safely reversible; otherwise Save
- **Secondary actions:** Reset category, restore defaults, Help
- **Scroll model:** One category at a time on phone; category rail desktop
- **Sticky behavior:** Category title; no huge global save unless needed
- **Touch zones:** Toggles/controls 44 px; label activates control
- **Keyboard/focus:** Native controls; error summary; no keyboard traps
- **Data priority:** Display/readability, motion, audio, guidance/Chip, density, controls, privacy/storage
- **Hidden/deferred:** Developer/debug settings separated and clearly labeled
- **Loading/empty/error/state coverage:** Default, changed, reset, unsupported feature, reduced motion OS preference
- **Back/return behavior:** Reversible live settings persist in UI preference store; unsaved forms warn
- **Transition:** Return to previous screen with focus

### Mobile blueprint

```text
Search settings + category list; category opens a focused page.
```

### Tablet / desktop blueprint

```text
Category rail + form; live preview only where useful.
```
## 25. Chip collapsed / expanded / contextual

- **Archetype:** A12/A5
- **Viewport/orientation:** Trigger all; sheet compact; panel expanded
- **Regions:** Trigger/status; header/persona; Must/Next/Where am I; explanation; actions; preferences
- **Primary action:** Take me there / explain current blocker
- **Secondary actions:** Minimize, mute, replay, dismiss type
- **Scroll model:** Expanded content one scroll; not the page scroll
- **Sticky behavior:** Sheet header and action footer
- **Touch zones:** Trigger 44–48 px; sheet handle not the only close mechanism
- **Keyboard/focus:** Trigger button; dialog/panel name; Escape closes; focus returns
- **Data priority:** One current explanation and exact destination
- **Hidden/deferred:** Conversation/history and verbose rationale
- **Loading/empty/error/state coverage:** Quiet, new blocker, onboarding, event, muted, unavailable context
- **Back/return behavior:** Close returns focus; route navigation carries Chip origin only if needed
- **Transition:** Exact task or restored screen

### Mobile blueprint

```text
[Chip • 2] trigger → bottom sheet with one Must, one Next, “Where am I?”, and controls.
```

### Tablet / desktop blueprint

```text
On-demand side panel overlay; optional user-pinned mode on wide screen only.
```
## 26. Modal, sheet, toast, and event patterns

- **Archetype:** A9/A12
- **Viewport/orientation:** All
- **Regions:** Named title; context; body; consequences; actions; close when allowed
- **Primary action:** One explicit resolution
- **Secondary actions:** Cancel/back/details
- **Scroll model:** Body scroll only if needed; header/footer remain; underlying page inert
- **Sticky behavior:** Footer actions; safe area
- **Touch zones:** Close and actions 44 px; swiping never sole dismissal
- **Keyboard/focus:** Focus trap for modal; Escape according to safety; return focus; live region for toast
- **Data priority:** Why it appeared, what changes, what happens next
- **Hidden/deferred:** Diagnostics/details
- **Loading/empty/error/state coverage:** Info, success, warning, destructive, blocking, cinematic, reduced motion
- **Back/return behavior:** Cancel or safe close; no silent dismissal of destructive confirmation
- **Transition:** Return with focus or navigate to durable detail

### Mobile blueprint

```text
Toast nonblocking; bottom sheet contextual; modal for confirmation; full-screen event only for earned moments.
```

### Tablet / desktop blueprint

```text
Toast stack constrained; dialog centered; panel for nonblocking detail; overlay manager prevents collisions.
```


## Prototype relationship

`prototypes/index.html` demonstrates the first vertical slice:

```text
Today → required task → Game Plan / depth decision → readiness → advance
```

It is deliberately static and offline. It is a behavioral reference for hierarchy, responsive shell, task resolution, sticky actions, and Chip presentation. It must not be wired into production state or copied as production architecture without the selectors, route contracts, accessibility tests, and design-system components defined elsewhere in this package.


### Prototype validation evidence

The reference was captured at 390×844 and 1440×900 across seven representative states. The phone Today state has no horizontal overflow, one primary page scroll owner, five labeled bottom destinations, and no permanent Chip layout reservation. See `evidence/prototype/geometry-phone.json`, `evidence/prototype/geometry-desktop.json`, and the screenshots in `evidence/prototype/`.

The prototype is a decision lock for hierarchy and behavior—not permission to bypass WP-01 through WP-10 or paste static sample data into production.
