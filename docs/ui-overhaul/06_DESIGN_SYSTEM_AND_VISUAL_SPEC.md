# 06 — Design System and Visual Specification

## Selected direction

**Broadcast War Room** is the authoritative visual and interaction system. It combines calm front-office operations with crisp broadcast context and earned cinematic moments. This is not a neon reskin, a generic SaaS dashboard, or a permanent retro-pixel UI.

## Foundation tokens

### Semantic color roles

Candidate values below passed the listed contrast checks through calculation against the defined dark surfaces. Implementation must run automated contrast tests with the actual font size/weight, gradients, opacity, team-color transformations, and interactive states before approval.

| Token | Candidate | Role | Measured note |
|---|---|---|---|
| canvas | #070B10 | Page background | — |
| surface-1 | #0E151D | Shell and primary surface | Text 16.89:1 |
| surface-2 | #151F2A | Raised section/selected region | Text 15.31:1 |
| surface-3 | #1D2936 | Overlay/strong selected surface | Text 13.58:1 |
| text-primary | #F2F6F8 | Primary text | ≥13.58:1 on defined surfaces |
| text-secondary | #AAB7C4 | Secondary text | ≥7.23:1 on defined surfaces |
| text-muted | #748394 | Nonessential metadata only | 4.74:1 on surface-1; do not use on surface-3 for normal text |
| brand-gold | #E6B94A | Primary action/brand/event accent | ≥8.02:1 on defined surfaces |
| interactive | #42C7E8 | Links/focus/info | ≥7.43:1 on defined surfaces |
| success | #5BCB8A | Success with icon/text | ≥7.28:1 on defined surfaces |
| warning | #F0A94B | Warning with icon/text | ≥7.37:1 on defined surfaces |
| danger | #E76A6A | Danger with icon/text | 4.69:1 on surface-3; ≥5.29 on surface-2 |

### Color rules

1. `brand-gold` is the single primary-action/brand accent. It is not used on every border.
2. `interactive` identifies links, focus, and informational selection—not decorative technology glow.
3. Success/warning/danger always include icon/shape/text.
4. Team color may appear in crests, narrow identity bars, charts, and event accents. Text never assumes team color is accessible; apply a contrast-safe fallback token.
5. A screen may have **one primary accent** and **one urgent signal** at the same time. Everything else uses neutral hierarchy.
6. `text-muted` is metadata only and cannot be used for essential instructions, button labels, errors, or small text on `surface-3`.

### Example CSS token layer

```css
:root {
  --mfd-canvas: #070b10;
  --mfd-surface-1: #0e151d;
  --mfd-surface-2: #151f2a;
  --mfd-surface-3: #1d2936;
  --mfd-text: #f2f6f8;
  --mfd-text-secondary: #aab7c4;
  --mfd-text-muted: #748394;
  --mfd-brand: #e6b94a;
  --mfd-interactive: #42c7e8;
  --mfd-success: #5bcb8a;
  --mfd-warning: #f0a94b;
  --mfd-danger: #e76a6a;

  --mfd-safe-top: env(safe-area-inset-top, 0px);
  --mfd-safe-right: env(safe-area-inset-right, 0px);
  --mfd-safe-bottom: env(safe-area-inset-bottom, 0px);
  --mfd-safe-left: env(safe-area-inset-left, 0px);

  --mfd-nav-compact: 64px;
  --mfd-action-dock: 64px;
  --mfd-control-min: 44px;
  --mfd-control-default: 48px;
}
```

Do not paste these values blindly into production. Add them as semantic v2 tokens, run contrast/visual tests, and adapt names to the existing package conventions.

## Typography

### Families and roles

| Role | Recommended strategy | Uses | Forbidden uses |
|---|---|---|---|
| Display / condensed | Locally available/system condensed fallback; self-host only if bundle permits | Screen titles, score/event headlines, short section heads | Paragraphs, forms, table cells |
| Body / UI sans | Resilient system-first sans stack | Body, labels, buttons, help, forms | None; this is the default |
| Data / numeric | System monospace or tabular numeral feature | Scores, cap, stats, time, aligned comparison | Long prose |
| Pixel / signature | Existing MFD face, tightly restricted | Logo, 1–3 word kicker, rare broadcast/cinematic micro-label | Body, navigation, task reason, table/card labels, forms |

### Type scale

| Token | Phone / default | Expanded | Use |
|---|---|---|---|
| caption | 12/16, 500 | 12/16 | Nonessential metadata only |
| label | 14/20, 600 | 13–14/20 | Controls, fields, tabs |
| body | 16/24, 400–500 | 15–16/24 | Primary reading |
| body-strong | 16/24, 650 | 15–16/24 | Task title / important value |
| title-sm | 18/24, 650 | 18/24 | Section title |
| title-md | 22/28, 700 | 24/30 | Screen/title block |
| title-lg | 28/34, 750 | 32/38 | Event or major hub |
| display | 36/40, 750 | 44–56/1.0 | Cinematic only |
| data-sm | 14/20 tabular | 13–14/20 | Dense secondary data |
| data-md | 18/24 tabular | 18/24 | Scores/KPIs |

Rules:

- Essential phone copy never renders below 12 px; body defaults to 16 px.
- All-caps is limited to short kickers/status words and receives letter spacing plus an accessible label where abbreviation exists.
- Body measure targets 45–75 characters; help text does not span the entire desktop canvas.
- Numeric columns use `font-variant-numeric: tabular-nums` and right alignment where comparison benefits.
- Truncation is never the only way to access a player/team/action name; provide wrapping, full accessible name, or detail.

## Spacing, sizing, and density

### Spacing scale

`4, 8, 12, 16, 24, 32, 48, 64` px. Use 4 only inside compact data groups; use 16–24 as default section rhythm; use 32–48 to separate major hierarchy instead of adding boxes.

### Control and row sizes

- Nominal routine target: 48×48 px.
- Product minimum: 44×44 px.
- Absolute exception floor: WCAG 24×24 plus spacing and documented rationale; not permitted for core actions/navigation.
- Phone player/task rows: 56 px minimum before multi-line expansion.
- Bottom navigation content height: 56–64 px plus safe area.
- Sticky action dock: 56–64 px plus safe area; may stack on 320 px width.

### Density modes

| Mode | Spacing/rows | Copy | Where | Pointer rule |
|---|---|---|---|---|
| Comfortable | Default tokens; 48–56 px rows | Reason/explanation visible | All phone; default everywhere | Always for coarse pointer |
| Compact | Reduced gaps; 36–44 px visual rows | Secondary explanation may move to detail | Tablet/desktop opt-in | If coarse pointer detected, interactive target wrapper remains ≥44 px |

Density changes size—not IA, labels, route availability, or task priority.

## Shape, borders, elevation, and texture

- Corners: 6 px controls, 8 px sections, 10–12 px sheets/dialogs; rare broadcast-cut corner permitted on event/score identity only.
- Default section: no perimeter border. Use whitespace, heading, and subtle divider.
- Border roles: `divider`, `selected`, `critical`. No route-local rainbow border taxonomy.
- Elevation: base, raised, overlay. Avoid constant shadows and blurred glass.
- Texture: subtle field/playbook/archive motifs only inside Game Plan/Film/Dynasty event regions; never behind body copy or tables.
- Team branding: narrow accent, crest, or event field—not a full surface that compromises contrast.

## Layer / z-index model

| Layer | Token range | Examples |
|---|---|---|
| Content | 0–9 | Sections, rows, charts |
| Sticky | 10–19 | Header, local tabs, action dock, bottom nav |
| Nonmodal surface | 20–29 | Tooltip, popover, nonmodal drawer |
| Modal | 40–49 | Dialog, modal sheet, Chip modal sheet |
| Event | 50–59 | Exclusive cinematic presentation |
| System critical | 60 | Recovery/fatal error only |

No feature chooses arbitrary z-index values outside this model. The overlay manager owns modal/event layers.

## Adaptive modes

| Mode | Query guidance | Navigation | Layout |
|---|---|---|---|
| Compact | `<600px` | Bottom bar | One column; sheets |
| Medium | `600–1023px` | Rail | One/two pane |
| Expanded | `≥1024px` | Sidebar/rail | One/two pane; more data columns |
| Wide | `≥1440px` | Sidebar | Up to three panes for workbench only |
| Compact height | `max-height:599px` | Condensed labeled nav | Collapsed context; horizontal action arrangement |
| Coarse pointer | `(pointer: coarse)` | Comfortable targets | 44/48 target wrappers regardless of visual density |

Use container queries for component-level adaptation when supported by the current browser matrix; retain viewport queries for shell mode. Use `100dvh` with `100vh` fallback and safe-area variables.

## Motion

- Fast feedback: 120 ms.
- Standard transition: 180 ms.
- Large panel/event setup: 240 ms maximum for routine UI.
- Easing: restrained ease-out for entry, ease-in for exit; no spring everywhere.
- Score/ticker changes may use brief directional transitions.
- Cinematic events may exceed routine timing only with Skip and reduced-motion alternative.
- Reduced motion: remove translation/parallax/flashing, use opacity or instant state, disable auto-scrolling counters.
- No essential information exists only during motion.

## Component specification

| Component | Purpose | Responsive behavior | Accessibility minimum |
|---|---|---|---|
| AppShell | Owns adaptive nav/header/main/action/overlay slots | Bottom/rail/sidebar | Skip link, landmarks, one main scroll |
| GlobalHeader | Team + phase/week + utilities | One compact row on phone; richer expanded | Heading/context labels; utilities named |
| PrimaryNav | Five hubs | Bottom → rail → sidebar | Visible labels, current state, 44/48 targets |
| PhaseContextBar | Season/phase/week/opponent/deadline | Compresses by height, not hidden | Text alternatives for icons/status |
| ScreenHeader | Title, description, local actions, return origin | Stacks on phone | One h1; actions after title context |
| ReturnToTask | Restores originating task/workflow | Sticky only if needed | Names destination and task |
| LocalTabs | Hub/entity sections | Scrollable phone; rail possible expanded | ARIA tablist only for same-page panels; links for routes |
| Button | Primary/secondary/tertiary/destructive | Full-width phone where useful | State and accessible name; loading retains label |
| StickyActionDock | Readiness or workflow commit | Bottom phone; inline/right expanded | Never obscures focus/content; safe-area aware |
| ReadinessControl | Blockers/warnings/ready + consequence | Compact status + sheet/panel | Status not color-only; live update |
| TaskRow | Priority, title, reason, consequence, destination | Stacked content phone; compact row expanded | Full row target; separate details labeled |
| AlertDecisionRow | Message/action with urgency | Same hierarchy across widths | Icon + label + urgency text |
| HubCard | Section entry or current signal | Limited; not every section boxed | One primary target; no nested click trap |
| EntityRow | Identity + prioritized fields + state | Purpose-specific phone fields | List/table semantics based on comparison |
| PlayerRow | Position/name/role/grade/health | Phone row; desktop columns | Health/status non-color cue |
| PlayerHeader | Identity, status, key actions | Compacts on scroll | Entity heading and action labels |
| StatStrip | Small set of high-priority values | Wraps; never microtext | Definition/units accessible |
| KpiCard | Answer-first KPI with comparison | Use sparingly | Meaningful label and trend text |
| FilterBar | Search/filter/sort/view | Sheet on compact; inline expanded | Applied-filter summary and clear action |
| FormControls | Input/select/radio/toggle/slider | Native-first; labels activate | Error description; slider paired with value/input |
| ResponsiveDataView | Column-priority table or purpose-built list | Never generic all-cell cards | Caption/headers or list labels; sort state |
| ComparisonTable | Selected entities and differences | Horizontal only in explicit workbench | Row/column headers; text difference cues |
| ScheduleGameCard | Opponent/time/state/result/action | Compact phone row/card | State and result in text |
| StandingsRow | Rank/team/record/GB/status | Priority row phone; table desktop | Owned team non-color marker |
| TransactionCard | Assets/status/cap/outcome | Summary phone; workbench detail | Status/consequence explicit |
| DraftPickCard | Pick/team/prospect/state | Event and history variants | Pick number/round spoken coherently |
| TimelineItem | Date/type/story/related entity | Grouped by season/era | Article/list semantics |
| ChartFrame | Question, chart, insight, data alternative | One chart per mobile section | Text summary + table/values + non-color encoding |
| StateFrame | Empty/loading/error/locked/recovery | Same archetype across routes | Correct status/alert; focus on heading when needed |
| Drawer | Short nonmodal contextual choices | Phone/desktop edge | Not route sitemap; focus behavior explicit |
| BottomSheet | Filters, Chip, short contextual detail | Compact only/medium as needed | Dialog semantics if modal; close button |
| Dialog | Confirmation/irreversible focused choice | Centered or full compact | APG modal behavior and focus restoration |
| Toast | Nonblocking feedback | Viewport-safe stack | Live region; timeout adjustable/pausable if action exists |
| NotificationCenter | Inbox/status groups | Sheet/panel/page depending volume | Read state and destination explicit |
| TooltipHelp | Supplemental definition | No essential-only hover content | Focus/touch reachable; dismissible |
| ChipTrigger/Panel | Companion access and explanation | Trigger → sheet/panel | Labeled, mute/minimize, task-source consistency |
| CinematicEvent | Earned full-screen moment | Reduced-motion alternative | Continue/skip and durable destination |

## Interactive state matrix

| State | Visual rule | Behavior rule | Accessibility rule |
|---|---|---|---|
| Rest | Neutral surface/text; no decorative glow | Ready | Accessible name from visible label |
| Hover | Subtle surface change only on hover-capable input | No essential content appears only here | Must not replace focus |
| Focus-visible | 2–3 px high-contrast interactive ring with offset | Never clipped/obscured | Meets focus appearance and not-obscured tests |
| Pressed | Small tone/position change; no large motion | Immediate acknowledgement <100 ms target | State does not rely on animation |
| Selected/current | Persistent shape + label/weight + color | Stable until selection changes | `aria-current`/selected semantics |
| Disabled | Lower emphasis but readable | Explain why and path forward | Disabled reason adjacent or described |
| Loading | Retain dimensions/label; spinner/skeleton restrained | Prevent duplicate commit; allow cancel when safe | `aria-busy`; polite status |
| Success | Success icon + word + concise consequence | Offer next action/undo if supported | Live status, not color-only |
| Warning | Warning icon + word + effect | Does not block unless rule requires | Explicit warning text |
| Error | Error icon + field/summary + recovery | Focus first relevant error on submit | Programmatic association |
| Destructive | Danger color reserved for final action | Staged confirmation with scope | Button names exact consequence |

## Detailed core-component anatomy

### Task Row

```text
[priority icon + word]  Task title                      [status]
                        Reason this matters
                        Consequence if skipped
                        [Open task] [Details]
```

- Must/Recommended/Optional is visible text, not color alone.
- Entire row may open the task; Details must remain a distinct, labeled target.
- Completion animates minimally and announces status.
- The row receives a stable task ID for focus restoration.

### Readiness Control

```text
BLOCKED • 2 required decisions
Fill depth chart and save Game Plan before playing.
[Resolve next] [Review all]
```

- Never uses a generic disabled Advance button without explanation.
- Ready state states the actual transition: `Play Harbor`, `Simulate Week 14`, or `Advance to Free Agency`.
- Warning acknowledgement is explicit and stores only existing/appropriate transient UI acknowledgement—not a simulation shortcut.

### Responsive Data View

Every usage declares:

1. comparison question;
2. phone priority fields;
3. desktop columns;
4. sort/filter model;
5. detail route/sheet;
6. row action;
7. virtualization/pagination threshold;
8. empty/error state.

The old generic pattern—turn every table row into a bordered vertical card and generate a label for every cell—is prohibited in new-shell surfaces.

### Chip

- Trigger remains visible but does not reserve page layout.
- Panel consumes the Task Ledger and route context through an adapter.
- Auto-open is limited by event policy and dedupe.
- The user can mute/minimize without disabling task functionality elsewhere.

## Screen-pattern rules

1. **One primary accent:** gold may identify one primary action or major brand/event focus.
2. **Panel test:** use a panel only if the boundary conveys grouping, selection, elevation, or interaction. Plain content/section is default.
3. **Border test:** a border must mean divider, selected, or critical; otherwise remove it.
4. **Summary before depth:** first view answers the screen’s question; advanced detail follows a link/tab/disclosure.
5. **Mobile data:** prioritize fields and drill down. Do not shrink desktop or create giant all-field cards.
6. **Long lists:** group, filter, paginate, or virtualize. Do not render hundreds of complex cards eagerly.
7. **Sticky actions:** add content padding and focus scroll margins from shared variables; never obscure the last field/row.
8. **Forms:** preserve drafts during local navigation/back; warn before abandoning meaningful unsaved state.
9. **Charts:** include text answer, legend with non-color cues, and data alternative.
10. **Empty/locked:** explain why, what changes it, and the best available action.
11. **Cinematic restraint:** routine settings/roster screens do not use event animation or display typography.
12. **Copy structure:** action → reason → consequence. Debug/source provenance moves to Details.

## Representative treatments

### Today

Neutral canvas, compact team/week score strip, one gold top task action, quiet grouped tasks, cyan links, warning only when actionable. Optional modules do not each receive a neon frame.

### Roster

Section heading and filters on neutral surface; position groups separated by rhythm/divider; aligned numeric grade; health/role indicators use icon+text; selected player receives one quiet raised surface.

### Game Center

Broadcast score identity is strong, but tab content remains calm. Final/turning-point/event elements can use controlled motion and display type. Flow charts use accessible patterns and tabular play data.

### Dynasty

Franchise Archive dialect: editorial typography, milestone art/plate accents, season/era grouping. It still uses the same body type, colors, controls, focus, and navigation as the shell.

## Font and asset strategy

- Core body/UI must work with system fonts and no network.
- Existing pixel assets may remain where restricted by role.
- Self-host one condensed/display family only if licensing is clear and measured bundle/startup impact passes.
- Prefer SVG/CSS/simple local raster assets; no runtime CDN dependency.
- Avoid importing a broad icon library if a small accessible local set or existing assets suffice.

## Design-system definition of done

- Tokens exist with documented semantic roles and contrast tests.
- Components above have rest/hover/focus/pressed/selected/disabled/loading/success/warning/error/destructive coverage where applicable.
- Phone, compact-height, tablet, desktop, coarse pointer, 200% zoom, and reduced-motion stories/tests exist.
- New-shell components contain no layout-critical inline styles.
- No pixel font appears in body/data/forms/navigation.
- No component requires hover, drag, color, or motion to complete its job.
