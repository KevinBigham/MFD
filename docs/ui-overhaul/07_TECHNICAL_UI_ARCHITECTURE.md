# 07 — Technical UI Architecture

## Architecture decision

| Option | Decision | Rationale |
|---|---|---|
| Evolve current React/TanStack/Zustand/Dexie stack | Selected | Strong typed route/state/persistence foundations; lowest regression and bundle risk; solves UI problem directly. |
| Introduce stronger UI/archetype layer within current stack | Selected as the method | Semantic v2 design system, presenters, route metadata, shell modules, overlays, and CSS Modules. |
| Large frontend/framework migration | Rejected | No evidence current framework blocks hierarchy; would threaten save/routing/release/bundle and consume effort without fixing attention architecture. |

The recommended architecture is a **reversible presentation-layer strangler migration inside the current stack**. React 19, Vite, TanStack Router, Zustand, Dexie, the engine package, local-first persistence, and GitHub Pages/hash-routing remain.

## Non-negotiable boundaries

- Browser presentation does not enter deterministic engine systems.
- UI layout does not consume RNG.
- A presenter may derive/explain existing state; it may not invent completion or mutate rules.
- UI-only migration/density/companion preferences do not require a dynasty save-schema change.
- Existing route paths remain resolvable during migration.
- Existing save/import/export/autosave/sidecar semantics remain untouched unless a separate, tested contract change is proven necessary.

## Target module tree


```text
apps/web/src/
├── app/
│   ├── App.tsx                         # thin composition + migration host
│   ├── store/
│   │   ├── game-store.ts               # protected mutations
│   │   ├── selectors.ts                # existing + pure derivation hooks
│   │   └── ui-store.ts                 # UI mode/density/companion preferences
│   └── legacy/                         # optional shell wrappers during strangler phase
├── ui/
│   ├── migration/
│   │   └── ui-overhaul-mode.ts
│   ├── shell/
│   │   ├── MfdAppShell.tsx
│   │   ├── GlobalHeader.tsx
│   │   ├── PhaseContextBar.tsx
│   │   ├── ScreenOutlet.tsx
│   │   └── shell.module.css
│   ├── navigation/
│   │   ├── AdaptivePrimaryNav.tsx
│   │   ├── MobileHubBar.tsx
│   │   ├── NavigationRail.tsx
│   │   ├── DesktopSidebar.tsx
│   │   └── ReturnToTask.tsx
│   ├── routes/
│   │   ├── route-surface-types.ts
│   │   ├── route-surface-map.ts
│   │   ├── route-compatibility.ts
│   │   └── navigation-origin.ts
│   ├── layout/
│   │   ├── AdaptiveViewport.tsx
│   │   ├── AppFrame.tsx
│   │   ├── PageScroll.tsx
│   │   ├── PaneLayout.tsx
│   │   └── StickyActionDock.tsx
│   ├── presenters/
│   │   ├── task-ledger.ts
│   │   ├── today-presenter.ts
│   │   ├── readiness-presenter.ts
│   │   └── entity presenters by domain
│   ├── overlays/
│   │   ├── OverlayProvider.tsx
│   │   ├── OverlayHost.tsx
│   │   ├── overlay-store.ts
│   │   └── overlay-policy.ts
│   ├── companion/
│   │   ├── ChipPresentationAdapter.tsx
│   │   ├── ChipTrigger.tsx
│   │   └── ChipPanel.tsx
│   ├── data/
│   │   ├── ResponsiveDataView.tsx
│   │   └── ChartFrame.tsx
│   ├── screens/
│   │   ├── entry/ setup/ today/ team/ player/
│   │   ├── game/ office/ league/ dynasty/ system/
│   │   └── each screen owns a scoped module + presenter tests
│   └── test/
│       ├── fixtures/
│       ├── geometry/
│       └── a11y/
└── features/                             # existing domain UI retained during migration

packages/design-system/
├── tokens/
│   ├── index.css                        # legacy compatibility
│   ├── semantic-v2.css
│   ├── typography-v2.css
│   └── density-v2.css
└── components/
    ├── existing components
    └── v2 components introduced only where current APIs cannot safely evolve
```


## App-shell split

### Current concentration

`App.tsx` currently owns root layout, navigation, route output, command UI, lifecycle effects, tutorial, achievements, ceremonies, news, halftime, hotkeys, lore, recap, era prompts, save reminders, and companion-related presentation.

### Target responsibilities

| Module | Owns | Must not own |
|---|---|---|
| `App.tsx` | Providers, router composition, migration host, fatal boundary | Screen layout details, overlay ordering, route-specific data formatting |
| `MfdAppShell` | Adaptive frame slots and landmarks | Simulation mutation or route registry definition |
| `GlobalHeader` | Team/context/system utilities | Feature navigation map |
| `PhaseContextBar` | Derived season/phase/week/opponent/deadline display | Lifecycle mutation |
| `AdaptivePrimaryNav` | Seven hub entries adapted by viewport; five persistent phone jobs | Full route directory |
| `ScreenOutlet` | Canonical route/surface output and heading focus | Feature business logic |
| `OverlayProvider/Host` | Queue, exclusivity, priority, focus, dedupe | Event-generation rules |
| `ChipPresentationAdapter` | Translate canonical context/task/event into Chip presentation | Independent blocker logic |

## Route metadata and compatibility


```ts
export type HubId = 'today' | 'team' | 'game' | 'office' | 'league' | 'dynasty' | 'system';

export type SurfaceType =
  | 'global-destination'
  | 'phase-hub'
  | 'hub-section'
  | 'entity-detail'
  | 'workflow'
  | 'workbench'
  | 'sheet'
  | 'dialog'
  | 'event'
  | 'archive-detail'
  | 'system-utility'
  | 'compatibility';

export type RouteSurfaceMeta = {
  currentPath: AppRoute;
  hub: HubId;
  surface: SurfaceType;
  canonicalPath: string;
  localSection?: string;
  availability: (state: GameState) => Availability;
  resolve: (input: RouteInput, state: GameState) => CanonicalDestination;
  featureRisk: 'low' | 'medium' | 'high';
};
```


Implementation rules:

1. Generate/hand-author `ROUTE_SURFACE_MAP` from the audited 79-row matrix; add a test comparing keys to `APP_ROUTE_REGISTRY`.
2. Do not move the canonical route registry into web presentation.
3. Old paths resolve to a canonical hub/section/entity through an adapter; new links use canonical metadata.
4. Availability delegates to existing unlock/phase state. A shared `AvailabilityState` renders reason and path forward.
5. Compatibility wrappers remain until route coverage and H2 permit removal.
6. Search, badges, Chip, and recent/favorites consume the same metadata rather than maintaining independent route lists.

## Presenter / view-model layer


```ts
export type UiTask = {
  id: string;
  category: 'must' | 'recommended' | 'optional';
  title: string;
  reason: string;
  consequence: string;
  destination: CanonicalDestination;
  entityRef?: EntityRef;
  isComplete: boolean;
  completionExplanation: string;
  availability: Availability;
  source: string;
  dedupeKey: string;
};

export type TodayViewModel = {
  context: PhaseContextViewModel;
  opponentOrEvent: OpponentOrEventViewModel;
  tasks: UiTask[];
  readiness: ReadinessViewModel;
  supportingSignals: SupportingSignal[];
};
```


Presenters are pure and deterministic for a given state. They may call existing selectors. They may not call store mutation actions during rendering. Every important presenter has fixture snapshots across lifecycle phases and unusual states.

### Why presenters are necessary

- They extract explanation/priority from mega-components without moving game rules.
- They give phone/desktop the same semantic model with different layouts.
- They let Today, Chip, nav badges, and readiness agree.
- They provide a stable accessibility/copy contract.
- They reduce full-store subscriptions and unnecessary re-renders by selecting bounded view models.

## CSS architecture

### Selected method

- Semantic global tokens in `packages/design-system/tokens/semantic-v2.css`.
- Scoped CSS Modules for new shell, components, and screens.
- Existing legacy CSS remains loaded only as required during coexistence.
- No Tailwind/framework migration.
- No new layout-critical `style={...}` in new-shell files.
- Small truly dynamic numeric values may use CSS custom properties set inline with an allowlist (for example chart percentage), never entire layout objects.

### Style debt migration

1. Record current count: 4,110 direct inline blocks across 199 TSX files.
2. Add `scripts/audit-inline-styles.mjs` with baseline and new-shell prohibition.
3. Migrate only the route cluster being replaced.
4. Add scoped styles before removing legacy overrides.
5. Delete old CSS/component only after reference grep, route coverage, and visual tests.
6. Track remaining count and allowlisted dynamic cases in `INLINE_STYLE_LEDGER.md`.

The global `!important` phone table-card overrides and permanent Chip-clearance rules are removed only when no migrated/legacy surface depends on them.

## Adaptive layout primitives

- `AdaptiveViewport` detects compact/medium/expanded/wide and compact-height; it exposes data attributes and a hook.
- `AppFrame` owns safe-area and navigation/action geometry variables.
- `PageScroll` is the default one-scroll owner and supplies `scroll-padding` for sticky regions.
- `PaneLayout` creates list-detail/workbench regions only when each pane has a labeled job.
- `StickyActionDock` coordinates with navigation and safe area.
- Components use container queries for local adaptation where supported; shell mode remains viewport-driven.

## UI state and persistence

Store only presentation preferences in `ui-store` or its existing persistence channel:

- legacy/new shell mode during migration;
- Comfortable/Compact density;
- Chip minimized/muted/pinned preference;
- reduced optional animation preference if distinct from OS setting;
- recent/favorite destinations;
- optional per-screen saved view/filter where appropriate;
- acknowledgement/dedupe for presentation-only guidance when safe.

Do not put route migration flags or layout state into `GameState`. Do not bump save schema solely for presentation. If UI preferences are currently stored inside a save contract, preserve compatibility and document scope before adding fields.

## Companion adapter

The adapter consumes:

- `TodayViewModel.tasks`;
- current `RouteSurfaceMeta`;
- `NavigationOrigin`;
- existing Chip event/route beats;
- overlay availability and speech dedupe policy.

It outputs:

- collapsed trigger count/status;
- one current Must/Next explanation;
- “Where am I?” label and canonical destination;
- permitted actions (`takeMeThere`, `why`, `mute`, `minimize`, `dismissType`).

It does not own task completion, route availability, or engine consequences.

## Overlay manager


```ts
export type OverlayRequest = {
  id: string;
  kind: 'toast' | 'panel' | 'dialog' | 'cinematic';
  priority: number;
  exclusive: boolean;
  dedupeKey?: string;
  canInterrupt: boolean;
  resumePolicy: 'discard' | 'resume' | 'durable-destination';
  returnFocusTo?: string;
};
```


Policy:

- one exclusive overlay at a time;
- system recovery > irreversible decision > required lifecycle event > earned cinematic > tutorial/help > nonblocking status;
- an event cannot interrupt a destructive confirmation or active transaction commit;
- duplicate event keys collapse;
- dismiss/resume creates a durable destination when the event carries lasting value;
- focus and background inertness follow modal behavior;
- toasts are bounded and never cover bottom navigation/action dock.

## Responsive tables and lists

`ResponsiveDataView` is a strategy wrapper, not a universal visual component. Each screen declares:

- comparison question;
- semantic desktop columns;
- phone row fields;
- grouping;
- sort/filter/search;
- detail destination;
- row actions;
- pagination/virtualization threshold;
- accessibility mode.

Use a semantic table when cross-row/column comparison is the task. Use a list when rows are entity destinations. Use a workbench when selected entities/assets need persistent comparison. Never convert every cell into a repeated phone card field by default.

## Entity navigation

Typed helpers preserve:

- entity type/id;
- origin route/hub/local section;
- task ID;
- filter/sort/saved view;
- selected comparison/transaction state when safe;
- scroll/focus key.

Browser Back remains meaningful; an explicit `ReturnToTask` is shown when it is more precise.

## Focus and keyboard strategy

- One skip link to main content.
- Route navigation focuses the new h1 unless restoring origin.
- Bottom nav/rail/sidebar use standard links with visible current state.
- Tabs use ARIA tab behavior only for in-page panels; route sections use links.
- Dialog/sheet focus is trapped when modal and restored.
- Sticky chrome supplies `scroll-margin`/`scroll-padding` so focus is not obscured.
- Drag/drop always has tap/click and keyboard alternatives.
- Command palette stays a power feature and uses canonical route/entity/action metadata.
- Existing keyboard shortcuts are inventoried and tested for conflicts after shell migration.

## Notification model

Normalize presentation into:

- task blocker/recommendation (Task Ledger);
- message/inbox item;
- transient status/toast;
- durable news/story/artifact;
- exclusive event;
- system/save health warning.

Each item has priority, canonical destination, read/acknowledged state if existing, and a dedupe key. Do not make every item a nav badge.

## Test architecture

| Layer | Tests |
|---|---|
| Pure presenters | Phase/state fixtures, snapshot of semantic view model, mutation guard |
| Design system | Component states, keyboard, axe, target geometry, reduced motion, zoom |
| Route metadata | 79/79 parity, alias/canonical, availability, parameters, origin |
| Shell geometry | Viewport matrix, one scroll owner, no overflow/occlusion, first-action position |
| Journeys | Entry, weekly loop, team, acquisition, game result, league, legacy, save/recovery, Chip |
| Visual regression | Approved deterministic fixtures for archetypes and major states |
| Engine/save regression | Existing engine/web tests, deterministic hashes, migrations/import/export/sidecars |
| Performance | Bundle chunks, render/DOM thresholds, route transition, long-list memory |

A Storybook/component-preview tool is optional, not required. Introduce it only if it fits existing build/release constraints and adds less cost than a small route-based internal component gallery. The minimum requirement is a deterministic component/archetype preview harness captured by Playwright.

## Bundle and performance constraints

- Existing engine chunk: 313 KB gzip against 320 KB ceiling; do not add presentation code to the engine chunk.
- Route-cluster UI must remain lazy.
- No new eager UI chunk above 100 KB gzip without owner review and evidence.
- Initial UI gzip should not rise more than 15% from the clean WP-00 baseline without H1 approval.
- Avoid broad icon/animation/chart libraries; prefer existing/local targeted solutions.
- Long collections virtualize/paginate when rendered rows exceed 80 or complex row DOM exceeds 300 nodes, unless profiling justifies another threshold.
- Select bounded view models to prevent full-app rerenders.
- Visual response to input target: <100 ms; route content target: useful response within 250 ms on reference hardware, measured rather than claimed.

## Font and asset loading

- No runtime font CDN requirement.
- System body stack is the resilience baseline.
- Existing pixel font retained only for restricted roles.
- A self-hosted condensed display face requires license proof, preload/subset strategy, fallback geometry test, and bundle approval.
- Team/Chip/event assets stay local and lazy where possible.

## PWA / GitHub Pages / offline implications

- Preserve the `/MFD/` base and hash-routing behavior.
- New canonical routes must work on direct load under GitHub Pages constraints.
- Service worker/cache strategy must not strand incompatible mixed shell assets; version cache when necessary using existing deployment patterns.
- New shell and essential fonts/icons must function offline after normal app caching.
- No backend/account/cloud dependency is introduced.

## Protected layers

Claude should generally not alter:

- `packages/engine/src/systems/**`
- `packages/engine/src/rng/**`
- save schemas, migrations, slot formats, export/import, combined backup, sidecars
- core domain types and league/content generation
- game outcome ordering and event consumption
- `game-store` actions that mutate simulation state
- persistence behavior

UI work should use pure selectors, presenters, metadata, adapters, UI-only state, compatibility wrappers, and design-system components.

## Engine-change exception protocol

An engine change is not automatically forbidden, but it requires a written mini-RFC before code:

1. exact UI requirement;
2. evidence no selector/adapter can provide it;
3. proposed engine API;
4. RNG/determinism/event-order impact;
5. save/schema/import impact;
6. old/new fixture hashes;
7. tests;
8. rollback path;
9. owner/protected-contract gate.

Until approved, stop only that packet and continue unrelated work. Never silently “help the UI” by changing simulation semantics.

## Migration strategy

```text
Legacy shell remains functional
        ↓
V2 tokens/layout/components isolated
        ↓
New shell enabled by UI-only mode for deterministic fixtures
        ↓
Today weekly vertical slice proves shell + IA + Chip + readiness
        ↓ H1
Route clusters migrate behind compatibility map
        ↓
79/79 coverage + visual/a11y/save/determinism gates
        ↓ H2 only for permanent path/surface retirement
Legacy code removed in cluster-scoped cleanup commits
        ↓
Release candidate and H3 owner playtest
```

## Architecture definition of done

- New shell uses current stack and does not alter engine/save contracts.
- `App.tsx` is thin and testable.
- 79/79 routes have metadata and compatibility.
- One canonical task/readiness model drives Today, nav, Chip, and Advance.
- One overlay manager owns global transient presentation.
- New screens use semantic tokens, CSS Modules, archetypes, and bounded presenters.
- GitHub Pages/offline/bundle gates pass.
- Legacy mode remains a proven rollback until final release approval.
