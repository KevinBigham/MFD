# 04 — Research, UX North Star, and Visual Direction

## Research role

Research supports—not replaces—the direct code/runtime audit. Formal platform/accessibility guidance sets constraints. Contemporary product patterns provide interaction hypotheses. MFD’s route inventory, measured journeys, and protected simulation decide the actual design.

Research was current as of 2026-08-05 and prioritized official/primary sources for standards and platform behavior.

## Source-backed principles

| Source | Formal guidance / observed product pattern | MFD application | Tradeoff / limit |
|---|---|---|---|
| W3C WCAG 2.2 — https://www.w3.org/TR/WCAG22/ | AA accessibility baseline; focus appearance/visibility, reflow, contrast, target size minimum. | Adopt AA as release requirement; geometry and focus assertions become tests. | Compliance alone does not create good hierarchy. |
| W3C Target Size (Minimum) — https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html | 24×24 CSS px minimum or sufficient spacing under WCAG 2.2 AA. | No migrated control falls below 24; use larger product standard. | 24 is a conformance floor, not the MFD target. |
| W3C Target Size (Enhanced) — https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html | 44×44 CSS px enhanced target. | 44 hard product minimum for routine touch controls; 48 nominal. | Dense desktop rows may use compact mode while preserving a 44 px touch variant for coarse pointers. |
| WAI-ARIA APG Modal Dialog — https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ | Dialogs contain focus, provide accessible name/description, close behavior, and restore focus. | Apply to confirmations, setup dialogs, Chip sheet/panel, and overlay manager. | Bottom sheets need platform-appropriate visuals but the same focus discipline. |
| W3C Resize Text — https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html | Text can scale to 200% without loss of content/function. | Large-text/zoom matrix for core journeys. | Some dense data may reflow to summary/detail instead of retaining all columns. |
| Apple HIG Tab Bars — https://developer.apple.com/design/human-interface-guidelines/tab-bars | Tab bars represent a small set of peer top-level destinations with persistent labels/meaning. | Five stable phone jobs; local tabs do not compete with global navigation. | MFD is a web app, so copy principles rather than native visual trade dress. |
| Apple HIG Materials — https://developer.apple.com/design/human-interface-guidelines/materials | Navigation/control layers should remain functionally distinct from content. | Use calm shell surfaces and reserve stronger material/elevation for transient layers. | Avoid expensive blur/transparency that hurts browser performance or contrast. |
| Android adaptive navigation / NavigationSuiteScaffold — https://developer.android.com/develop/ui/compose/layouts/adaptive/build-adaptive-navigation | Navigation adapts from bottom bar to rail/drawer based on window size. | Bottom bar on compact, rail on medium, sidebar on expanded; destination model remains identical. | Implementation stays framework-native React/CSS, not Compose. |
| MDN `env()` — https://developer.mozilla.org/en-US/docs/Web/CSS/env | Safe-area inset environment variables support notches and viewport segments. | Tokenize bottom/top/side safe-area padding for nav, action dock, sheets, and full-screen events. | Fallback values required. |
| MDN viewport units — https://developer.mozilla.org/en-US/docs/Web/CSS/length#relative_length_units_based_on_viewport | Small/large/dynamic viewport units address mobile browser chrome differences. | Use `100dvh` with fallback and compact-height rules; test dynamic chrome. | Do not set every page to fixed viewport height or create nested scroll. |
| ESPN Fantasy app redesign (official ESPN press release) | Personalized home, dynamic action items, pinned scores/player cards demonstrate task-first sports information. | Today should foreground actionable week context and preserve selected entities. | MFD must not copy ESPN art, language, or layout. |
| NFL Game Center / dashboard product pattern (official NFL surfaces) | Pregame, live, and postgame information share one game context; dashboard consolidates active actions. | Combine MFD’s game presentation routes into one Game Center and canonical task model. | MFD’s simulation depth requires more local tabs and explanation than a score app. |
| Sleeper trade-block product pattern | A roster asset can be marked and acted on within a focused transaction context. | Office Personnel should keep selected assets and needs visible in a trade workbench. | Do not copy branding or social interaction model; apply only the context-preserving workbench principle. |
| Football Manager Mobile product positioning | Complex management can remain phone/tablet and offline when flows are staged around management jobs. | Preserve local-first depth; no backend is necessary for the overhaul. | MFD has its own rules and identity; avoid importing another game’s exact navigation. |

### Formal guidance versus inference

- **Formal:** WCAG target/focus/reflow/zoom requirements; ARIA dialog behavior; safe-area and viewport CSS behavior; adaptive-navigation guidance.
- **MFD inference:** five persistent player jobs are better than four features plus More; Game Center should consolidate game routes; Today should own the canonical task ledger; Chip should open on demand.
- **Reasoning:** those product decisions are not mandated by WCAG, Apple, Android, or another game. They are the best fit for MFD’s measured route structure and recurring loop.

## UX north star

> **A phase-aware football front office that always puts the next meaningful decision first, lets experts drill into the full simulation without a second navigation system, and turns each week and season into a coherent story.**

### Design principles

1. **Decision before directory.** The UI begins with the player’s current job, not a list of features.
2. **One source of truth for attention.** Today, readiness, badges, and Chip consume the same derived task model.
3. **Context follows the player.** Team, week, opponent, entity, filters, and return origin survive drill-down.
4. **Depth is progressively revealed, never deleted.** Summaries answer the immediate question; full systems remain a tap/click away.
5. **Phase changes emphasis, not location.** Draft, deadline, playoffs, and free agency reshape Today and hub defaults without rearranging the product.
6. **Routine is calm; moments are cinematic.** Borders, animation, and display type are earned by meaning.
7. **Phone is a first-class management device.** It receives purpose-built rows/workflows, not shrunken desktop or giant card stacks.
8. **Desktop rewards expertise without inventing a second product.** More columns, split view, keyboard, and compact density use the same IA.
9. **Trust is visible.** Save health, consequences, loading, recovery, and undo are explicit.
10. **The engine is sacred.** Presentation derives; it does not mutate simulation contracts to make UI easier.

## Navigation decision

### Selected model

- Phone: five labeled bottom destinations—Today, Team, Game, Office, League.
- Tablet: same destinations in a rail; optional list-detail.
- Desktop: same destinations in a sidebar/rail, plus Dynasty; System/save health at the base.
- Local navigation: tabs/sections within hubs and entities.
- Contextual navigation: task links, entity links, milestone/event cards, and return-to-task.
- Search: power feature, not a basic-flow dependency.

### Why five

Five is not selected because a platform guideline gives MFD a magic number. It is selected because the route inventory clusters into five recurring jobs with minimal ambiguity. Removing Office or League would overload another destination; adding Dynasty/System to phone bottom navigation would displace routine jobs. The same model adapts cleanly to rail/sidebar.

### Why Advance is not a global tab

Advance is an action/state transition, not a place. It belongs in Today’s readiness dock and relevant phase/game contexts. Treating it as persistent navigation gives it equal weight before the player understands consequences and consumes one of four phone slots.

### Why no “More” sitemap

A full sitemap in a drawer hides rather than resolves information architecture. System and Dynasty have deliberate entry points; every advanced capability remains reachable through a hub, contextual link, event, search, recent, or favorite.

## Weekly-loop decision

The new home is **Today**, not “Dashboard.” It is generated from current lifecycle state and a canonical task ledger.

### First-viewport contract

At 390×844 before scrolling, the player sees:

- team/franchise identity;
- season, phase, week, and record;
- opponent or current lifecycle event;
- stakes/consequence summary;
- unresolved Must Do count;
- top task with reason;
- readiness/primary action state;
- visible route back if resuming a task.

Optional widgets, explanation provenance, season signals, metrics, customization, and deep context follow below or open on demand.

## Adaptive layout and orientation

### Compact portrait (<600 px width)

- Default and fully supported for all management, setup, settings, save, and accessibility flows.
- Bottom navigation and sticky action dock.
- One content column.
- Bottom sheets for filters, Chip, comparison setup, and short contextual detail.
- Dense rows show only the fields required for the row’s question; details open an entity page/sheet.

### Compact landscape / short height (<600 px height)

- Header collapses to a single context row.
- Optional summaries collapse automatically but remain accessible.
- Bottom navigation may use compact icon+label treatment while retaining names and target size.
- Game Center can use two-pane score/plays or visualization/detail.
- No screen *requires* landscape.

### Medium (600–1023 px)

- Navigation rail.
- One or two panes based on task.
- Collections may use list-detail.
- Local tabs can remain horizontal or become a secondary rail.

### Expanded (≥1024 px)

- Sidebar/rail plus content.
- Context pane opens only when useful.
- Dense tables add lower-priority columns.
- Compact density is available for keyboard/mouse; coarse pointer gets comfortable targets.

### Wide (≥1440 px)

- Maximum content measures prevent uncontrolled stretching.
- Three-pane workbench is allowed for trades/draft/comparison only when each pane has a clear job.
- Routine pages do not fill space with more decorative modules.

### Viewport mechanics

- `min-height: 100vh; min-height: 100dvh` fallback sequence.
- `env(safe-area-inset-*)` variables for nav/action/sheets.
- One primary scroll owner per archetype.
- Height media/container queries for compact-height behavior.
- Browser zoom and text scaling are allowed to reflow; no essential fixed-height clipping.

## Density decision

Retire GM/Nerd navigation modes. Add:

- **Comfortable:** default; 48 px row/target rhythm; explanatory copy visible.
- **Compact:** desktop/tablet preference; reduced spacing/row height while preserving location, labels, focus, and minimum coarse-pointer target behavior.
- **Advanced data:** expandable sections and saved views independent of density.
- **Comparison mode:** explicit workbench, not more columns on every page.
- **Mobile:** always starts Comfortable; compact may be offered only if touch/zoom requirements still pass.

Density is stored in UI preferences, not the dynasty save schema unless there is an existing safe preference channel. It never changes simulation or route availability.

## Chip decision

### Role

Chip is the franchise operations companion: an interpreter of current context, not a parallel navigation system.

### Presentation

- Collapsed labeled trigger, 44–48 px, with count/status and non-color cue.
- Mobile bottom sheet at sensible detents; full expansion only by user action.
- Desktop side panel overlay; optional pin in wide layouts if it does not obscure content and is explicitly chosen.
- No permanent padding reservation when closed.

### Speech policy

Chip may initiate for:

- first-run orientation;
- a new blocker that has meaningful consequence;
- a major phase transition;
- an important owner/save warning;
- a record, championship, retirement, named game, or major story moment.

Chip remains quiet for routine route changes, repeated unresolved tasks, and information already visible in the first viewport. A `dedupeKey` and acknowledgement state prevent repetition.

### Controls

Minimize, mute, reopen, replay explanation, “Why?”, “Take me there,” and “Don’t show this type again.” During a modal/transaction workflow Chip is non-interrupting unless invoked or a destructive consequence requires clarification.

## Visual directions explored

### Direction A — Broadcast War Room **(selected)**

**Concept:** a modern pro-football command center: calm operational surfaces, crisp broadcast score context, and cinematic event moments.

- **Emotion:** prepared, authoritative, consequential.
- **Football relationship:** sideline/broadcast information hierarchy plus front-office tools.
- **Typography:** condensed display for headlines; readable sans for body/controls; tabular mono/numeric for stats; pixel only logo/kickers.
- **Color:** ink/navy neutrals; gold primary/brand; cyan interaction/info; semantic success/warning/danger.
- **Shape:** restrained 6–10 px corners, occasional broadcast cuts, clear active shapes.
- **Surface:** mostly borderless sections; three neutral elevations; strong separators only for selected/urgent states.
- **Data:** aligned numerics, quiet grid, row emphasis, accessible chart patterns.
- **Motion:** fast score/ticker transitions and restrained panel motion; cinematic only for events.
- **Performance:** low; CSS-first, no heavy textures/blur requirement.
- **Accessibility risk:** lowest of the three because hierarchy does not depend on texture or team color.
- **Example Briefing:** compact broadcast context strip, task stack, opponent card, readiness dock.
- **Example Roster:** purpose-built rows and detail pane.
- **Example Game Center:** scoreboard header with local tabs and time/event-aware content.

### Direction B — Sideline Playbook

**Concept:** tactile coaching materials, field diagrams, play-call notation, paper/tape accents, and tactical motion.

- **Emotion:** hands-on, strategic, gritty.
- **Strength:** excellent Game Plan and scouting personality.
- **Risk:** texture/noise can reduce data readability; field green/tape metaphors can become decorative; more asset/performance work.
- **Best use:** selective motif inside Game Plan, scouting, and Film rather than the whole shell.

### Direction C — Franchise Archive

**Concept:** premium editorial sports history—program books, trophy plates, season folios, and documentary storytelling.

- **Emotion:** legacy, permanence, pride.
- **Strength:** exceptional Dynasty/season recap/awards treatment.
- **Risk:** less immediate for weekly operations; editorial density can feel passive.
- **Best use:** Dynasty hub and milestone artifacts inside the selected shell.

## Decision matrix

| Criterion | Broadcast War Room | Sideline Playbook | Franchise Archive |
|---|---|---|---|
| Weekly decision hierarchy | 5 / 5 | 4 / 5 | 3 / 5 |
| Dense data readability | 5 / 5 | 4 / 5 | 4 / 5 |
| MFD broadcast personality | 5 / 5 | 4 / 5 | 4 / 5 |
| Emotional legacy payoff | 4 / 5 | 3 / 5 | 5 / 5 |
| Mobile performance | 5 / 5 | 3 / 5 | 4 / 5 |
| Accessibility risk (higher score = safer) | 5 / 5 | 3 / 5 | 4 / 5 |
| Migration risk (higher score = safer) | 5 / 5 | 3 / 5 | 4 / 5 |
| Total | 34 / 35 | 24 / 35 | 28 / 35 |

## Selected visual system

Broadcast War Room becomes the shell. Sideline Playbook contributes tactical motifs to Game Plan/Film. Franchise Archive contributes legacy/event treatments. This is not three themes or user-selectable skins; it is one coherent system with context-specific visual dialects.

## Research-backed product thresholds

- WCAG 2.2 AA is mandatory.
- Routine touch controls: 48 px nominal; 44 px minimum; any exception documented and never below 24 px plus required spacing.
- Phone body copy: 16 px minimum; essential labels: 12 px minimum; numeric data uses tabular alignment.
- Reflow at 320 CSS px and usable at 200% zoom.
- Focus is visible and not obscured by sticky bars, sheets, or Chip.
- Modal/sheet focus enters, cycles appropriately, closes predictably, and returns to the invoking control.
- Color never carries status alone.
- Reduced motion removes nonessential transforms, parallax, flashes, and cinematic auto-motion.

## Anti-copy rule

The product-pattern research contributes principles only. Do not reproduce another product’s branding, icons, art, exact layout, language, trade dress, or proprietary interaction details. MFD’s interface must remain original and derive its screen structure from its own simulation, routes, and player jobs.
