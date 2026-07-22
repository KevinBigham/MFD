# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-05-20
- Primary product surfaces: title/new dynasty, first-ten-minutes setup, Monday Briefing, roster, depth chart, game plan, week advance, save/load, convention demo, standings, power rankings, league pulse, records, scouting, draft, Chip companion.
- Evidence reviewed: `README.md`, `docs/release/MFD_FINAL_SHIP_DECISION.md`, `docs/release/KEVIN_PLAYTEST_SCRIPT.md`, `apps/web/src/app/App.tsx`, `apps/web/src/app/NewGameScreen.tsx`, `apps/web/src/app/app-shell.css`, `packages/design-system/tokens/index.css`, `packages/design-system/components/*`, `apps/web/public/screenshots/v1/*`, `apps/web/public/assets/chip/*`.

## Brand
- Personality: 8-bit ESPN command center: football-serious, arcade-readable, cinematic, systems-heavy, but player-guided.
- Trust signals: stable save/import/export copy, deterministic-season framing, visible current route/team/week context, Chip guidance, release checklist language that keeps the player from wondering what to click next.
- Avoid: generic SaaS cards, one-note blue/purple gradients, soft rounded marketing hero layouts, hidden destructive actions, noisy panels that bury the next primary click.

## Product goals
- Goals: help one player start and sustain a football dynasty; make weekly decisions legible; make save/load feel safe; make demo and late-season paths easy to enter; keep the game cinematic without obscuring simulation data.
- Non-goals: multiplayer, server-backed live ops, card collector economy, broad visual redesign detached from the pixel/broadcast identity.
- Success signals: first 10 minutes are guided, Week 1 does not leave the player stuck, Chip helps without blocking play, save/load/import/export feel trustworthy, core routes load, mobile width is playable.

## Personas and jobs
- Primary personas: football franchise sim player, convention/demo player, returning dynasty player, release playtester.
- User jobs: start a clean dynasty, continue or import a save, launch a guided late-season demo, understand the next critical action, evaluate roster/cap/game-plan choices, export a portable backup.
- Key contexts of use: desktop browser for long play sessions, mobile-width smoke/playtest checks, local preview and GitHub Pages `/MFD/` production path.

## Information architecture
- Primary navigation: grouped command-center top nav on desktop/tablet, fixed five-slot mobile bottom nav with More drawer on phone widths.
- Core routes/screens: title/new dynasty, setup wizard, Monday Briefing, roster, depth chart, game plan, week advance, trade center, cap lab, save/load, standings, scouting, draft, franchise/legacy.
- Content hierarchy: each screen should surface current context first, then required action, then supporting detail. Dense data belongs in tables/cards only after the screen answers "what matters now?"

## Design principles
- Principle 1: Make the next good click obvious before exposing all secondary systems.
- Principle 2: Preserve the broadcast/pixel identity through tokens, panel chrome, badges, and Chip art rather than new decorative layers.
- Principle 3: Treat save, load, import, and export as trust-critical flows with calm copy and explicit failure states.
- Principle 4: Design mobile as a playable narrow command surface, not a squeezed desktop.
- Tradeoffs: density is part of the sim's appeal, but first-run and demo paths need stronger hierarchy than expert screens.

## Visual language
- Color: near-black surfaces, MFD gold as the signature action/accent, cyan/green/red for navigational, positive, and warning states. Use existing custom properties in `packages/design-system/tokens/index.css`.
- Typography: pixel font for compact labels and command chrome, display/serif for brand and cinematic headlines, mono/sans for readable data and instructional copy.
- Spacing/layout rhythm: 8-bit grid discipline with 4/8/12/16/20/32px token rhythm; responsive grids should use `minmax()`/`auto-fit` instead of fixed four-column assumptions on launch-critical screens.
- Shape/radius/elevation: sharp pixel panels with 0-6px radii; shadows reserved for real elevation or active command surfaces.
- Motion: short route/loading/feedback motion; respect `prefers-reduced-motion`.
- Imagery/iconography: Chip art and team logos are primary brand assets. Use lucide icons where the app already does; do not add unrelated illustrations.

## Components
- Existing components to reuse: `PixelPanel`, `MfdPanel`, `PixelButton`, `PixelBadge`, `PixelScreenHeader`, `PixelMetricCard`, `PixelTable`, `MfdCommandPalette`, `Chip`, `ChipDialogueBubble`, `MobileBottomTabBar`.
- New/changed components: keep launch-screen polish local unless a pattern repeats across screens; promote only reusable, tested patterns into `packages/design-system`.
- Variants and states: selected, hover, focus-visible, disabled, loading, empty, error, success, destructive, route-active, drawer-open, import-in-progress.
- Token/component ownership: design tokens live in `packages/design-system/tokens`; app-shell layout and launch-only classes live in `apps/web/src/app`.

## Accessibility
- Target standard: WCAG-informed browser game UI, with at least visible focus, keyboard navigation for command surfaces, readable contrast, and 44px touch targets on mobile.
- Keyboard/focus behavior: all command buttons need `type="button"` where they are not submit controls; custom selectable buttons should expose `aria-pressed` or equivalent state when useful.
- Contrast/readability: keep tiny pixel text for labels only; body/help text should remain readable, especially in mobile and setup screens.
- Screen-reader semantics: use real buttons/inputs, labels for import text, `aria-live` for critical import/autosave errors when feasible, and current-route metadata in nav.
- Reduced motion and sensory considerations: preserve existing reduced-motion tokens and disable decorative route/loading animation when requested.

## Responsive behavior
- Supported breakpoints/devices: phone portrait around 480px, phone landscape/small tablet around 768px, tablet/small desktop around 1024px, wide desktop command layout.
- Layout adaptations: desktop can use multi-column command layouts; launch/setup screens should collapse to one column on mobile; team/difficulty grids should avoid fixed 4-column overflow.
- Touch/hover differences: hover polish is optional; focus and touch target size are mandatory.

## Interaction states
- Loading: autosave/import and lazy-route loading states must use clear labels and non-jumping layouts.
- Empty: no active dynasty, no saves, no lore/records yet should explain the next action without sounding like an error.
- Error: import/autosave errors must say current dynasty was not changed when applicable.
- Success: save/import/export success should be explicit and short.
- Disabled: disabled actions need visible reason nearby or self-explanatory copy.
- Offline/slow network, if applicable: app is client-side; recovery messaging should assume browser storage and local file handling can fail.

## Content voice
- Tone: sideline-command, confident, calm under pressure, lightly cinematic.
- Terminology: dynasty, franchise, briefing, command deck, convention demo, portable backup, cartridge, week advance, Chip.
- Microcopy rules: lead with the action/result; avoid generic "learn more" copy; trust-critical copy should be plain and specific.

## Implementation constraints
- Framework/styling system: React 19, Vite, TanStack Router, Zustand, Dexie, TypeScript, workspace `@mfd/design-system`, CSS custom properties plus inline styles in existing components.
- Design-token constraints: extend existing CSS variables and data-attribute rules before adding a new styling layer.
- Performance constraints: preserve lazy routes and existing chunking; known Vite chunk-size warnings are non-blocking release risks, not a UI-polish target.
- Compatibility constraints: GitHub Pages `/MFD/` base path, stable browser saves, save schema v37, and exact-gate artifact deployment.
- Test/screenshot expectations: run targeted Vitest, typecheck/build, and browser smoke/screenshots for launch path and mobile width when UI changes land.

## Open questions
- [ ] Owner: Kevin / Should launch screen prioritize Convention Demo above custom dynasty for public events, or keep it as a secondary quick-start? / Impacts first-screen CTA order.
- [ ] Owner: Kevin / What is the intended minimum mobile support beyond smoke checks? / Impacts how aggressively dense screens should be redesigned for phone play.
- [ ] Owner: Kevin / Should Chip be visible on the title screen in a future pass? / Impacts first-run branding and onboarding scope.
