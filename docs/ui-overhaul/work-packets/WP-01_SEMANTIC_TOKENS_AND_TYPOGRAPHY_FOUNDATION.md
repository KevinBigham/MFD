# WP-01 — Semantic Tokens and Typography Foundation

## Packet control

| Field | Value |
|---|---|
| Phase | 1 |
| Relative effort | M |
| Critical-path status | Critical path |
| Dependencies | WP-00 |
| Owner gate | None beyond packet dependencies |
| Migration rule | Reversible, compatibility-first, no production route removal |

## User problem solved

Current pixel-heavy, border-heavy styling cannot express a calm hierarchy consistently.

## Objective

Add Broadcast War Room semantic tokens, resilient typography roles, density variables, contrast tests, and strict accent/surface rules without restyling legacy screens accidentally.

## Scope

- Define semantic canvas, surface, text, border, action, status, chart, focus, and team-color roles.
- Define readable body, data, display, label, and microcopy typography roles with local/system fallbacks.
- Define comfortable and compact density variables without creating two information architectures.
- Limit high-intensity accent use and encode the selected Broadcast War Room visual hierarchy.
- Add token-level contrast and fallback tests.

## Explicit non-scope

- Do not mass-replace legacy colors.
- Do not introduce a runtime font CDN dependency.
- Do not redesign screen composition in this packet.

## Exact files to add

- `packages/design-system/tokens/semantic-v2.css`
- `packages/design-system/tokens/semantic-v2.test.ts`
- `packages/design-system/tokens/typography-v2.css`
- `packages/design-system/tokens/density-v2.css`

## Exact files to modify

- `packages/design-system/tokens/index.css`
- `packages/design-system/components/index.ts`

## Exact files to delete — only after migration proof

- None in this packet.

A glob in this packet identifies a route cluster, not permission for blind bulk editing. Claude must enumerate the concrete touched files in the progress ledger before committing.

## Relevant symbols and contracts

- `--mfd-v2-* semantic tokens`
- `MfdTypography roles`
- `DensityMode`

## Proposed component / module structure

- V2 tokens are namespaced and imported after legacy foundations but consumed only inside the migration boundary.
- Use semantic roles in components; product screens must not depend on raw palette names.
- Pixel/display typography is limited to logos, compact score/broadcast moments, and selective labels.

## Data and state contracts

- Presentation data is derived through pure selectors/presenters or UI-only adapters.
- Existing authoritative mutation functions remain the only commit boundary.
- No new field enters the save schema unless a separately documented protected-contract exception is approved.
- No UI read, sort, animation, or preview may consume simulation RNG.
- Route/UI preference state must be isolated from deterministic engine state.

## CSS and responsive behavior

- Type roles use bounded `clamp()` where justified; body/data minimums remain readable at 320px.
- Density changes spacing and row height, not labels, routes, or feature visibility.
- Team colors pass through contrast-safe foreground/fallback helpers.

The shared rules in `05_SCREEN_BLUEPRINTS.md` and `06_DESIGN_SYSTEM_AND_VISUAL_SPEC.md` remain authoritative. Screen-specific CSS must use semantic tokens, one primary scroll owner, safe-area-aware sticky actions, and explicit compact-height behavior.

## Touch behavior

- Essential actions must be completable with touch only and must not depend on hover, right-click, or drag.
- Core interactive targets must meet the selected 44 CSS-pixel minimum; primary phone actions should normally be 48 pixels high.
- Bottom navigation, sheets, and sticky actions must avoid system-gesture and safe-area conflicts.
- Taps that commit a destructive, irreversible, or phase-changing action require clear scope and confirmation appropriate to the risk.
- Pressed/loading/disabled feedback must prevent accidental double activation.

## Keyboard behavior

- Use semantic DOM and natural tab order before adding custom key handling.
- Focus-visible must remain obvious against every surface and team-color state.
- Dialogs/sheets trap focus only while modal and restore it to the invoking control.
- Escape cancels/dismisses when safe; Enter/Space activate according to native semantics.
- Route changes place focus at the screen heading, requested entity, or restored origin target intentionally.
- Existing global shortcuts must be audited for conflicts and documented rather than silently changed.

## Accessibility requirements

- Meet the contrast, target-size, zoom, reduced-motion, focus, heading, landmark, error, and non-color requirements in the QA matrix.
- Every icon action has a visible label or accessible name; primary navigation retains visible text labels.
- Dynamic task/save/overlay status uses restrained live-region behavior.
- Tables, charts, comparison grids, and visual state indicators have semantic or textual equivalents.
- At 200% zoom, the complete packet journey remains operable without two-dimensional page scrolling.

## Loading, empty, locked, and error behavior

- Loading preserves the screen frame and current context; it does not replace the whole app shell.
- Empty states explain why the surface is empty and offer the most relevant safe next action.
- Errors identify what failed, what was not changed, and a retry/recovery path.
- Locked/unavailable states explain lifecycle timing and preserve a path back to the originating task.

## Route and deep-link implications

- Use the route-surface map and compatibility resolver from WP-04.
- Preserve existing deep links until the route matrix and owner gate permit retirement.
- Preserve entity IDs, query/filter state, navigation origin, scroll anchor, and focus target when valid.
- Browser back/forward must behave predictably and must not repeat mutations.

## Save, determinism, and protected-layer implications

- No save-schema version change is expected.
- UI-only preferences use the existing UI preference boundary and must fail safely.
- Before/after deterministic fixture state must match legacy behavior for every committed game action.
- Import/export/autosave behavior is out of scope unless explicitly named in this packet.

Protected by default: `packages/engine/src/systems/`, RNG/determinism, save schemas/migrations, core domain types, game outcome logic, state-mutation actions, persistence serialization, and backup formats. If a protected change appears necessary, stop this packet and document the exact requirement, why an adapter is insufficient, determinism/save impact, tests, and rollback before proceeding.

## Automated tests

- Computed token/contrast tests
- network-blocked font fallback
- 200% zoom sample
- no legacy snapshot change outside migration boundary.

Also required:

- Unit tests for pure presenter/adapter logic and each error/state branch introduced.
- Component tests for semantics, keyboard, focus, disabled/loading behavior, and state transitions.
- Route compatibility/coverage tests for every route touched.
- Viewport geometry assertions at the smallest relevant phone, compact-height landscape, tablet, and desktop.
- Existing engine/web/design-system tests plus build, bundle, smoke, and release gates according to the packet’s blast radius.

## Manual test script

- Render a token specimen page at phone and desktop.
- Disable external network and verify typography fallback.
- Test representative light-on-dark, status, team-color, and focus combinations.
- Zoom to 200% and inspect wrapping, clipping, and numeric alignment.

## Required before / after screenshots

- Token specimen: neutral hierarchy.
- Task card and roster row in comfortable/compact density.
- Team-color fallback and all status roles.

Each screenshot entry must include viewport, state/fixture, route, mode, commit, and the matching geometry measurement. Capture focus, open-sheet/dialog, error, and 200%-zoom states where this packet changes them.

## Performance and bundle checks

- Measure route bundle change and compare against the existing release/bundle gate.
- Avoid mounting hidden heavy legacy and new implementations simultaneously outside controlled migration tests.
- Use memoized selectors/view models only where profiling shows value; do not cache mutable domain objects.
- Large lists must have an explicit DOM/render strategy and a keyboard/focus-safe fallback.
- Foundation code is shared widely; treat every dependency and CSS import as a startup/bundle decision.

## Risks

- Unscoped token aliases can repaint legacy screens.
- Too many semantic roles can recreate palette complexity.
- Display font loading can regress startup or cause layout shift.

## Rollback path

Remove v2 imports; legacy tokens remain untouched.

Additionally:

- Keep the legacy route/shell/component available until replacement coverage and acceptance gates are green.
- Separate extraction, new implementation, route adoption, and deletion commits so any layer can be reverted independently.
- Never roll back by altering or discarding user saves.

## Suggested atomic commits

- feat(design-system): add Broadcast War Room semantic tokens
- feat(design-system): add readable typography and density roles
- test(design-system): verify contrast and font fallback

Each commit must update the progress ledger with checks, screenshots, remaining compatibility behavior, and rollback command/commit.

## Definition of done

Tokens document role/contrast; body/data/pixel roles enforced; new-shell examples pass phone/desktop visual review.

The packet is not done when the new UI merely renders. It is done only when feature parity, route compatibility, interaction/accessibility behavior, viewport acceptance, deterministic/save safety, evidence capture, and rollback proof all pass.
