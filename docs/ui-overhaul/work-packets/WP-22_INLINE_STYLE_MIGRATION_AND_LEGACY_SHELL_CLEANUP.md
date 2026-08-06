# WP-22 — Inline-Style Migration and Legacy Shell Cleanup

## Packet control

| Field | Value |
|---|---|
| Phase | 9 |
| Relative effort | XL |
| Critical-path status | Non-critical-path after prerequisites |
| Dependencies | All migrated route clusters; runs incrementally |
| Owner gate | H1/H2/H3 only where listed in dependencies or implementation plan |
| Migration rule | Reversible, compatibility-first, no production route removal |

## User problem solved

4,110 direct inline-style blocks and !important responsive overrides prevent stable hierarchy and maintainability.

## Objective

Migrate layout-critical styles for completed clusters to scoped CSS/semantic tokens, maintain an allowlist, remove obsolete overrides/components only after coverage.

## Scope

- Inventory and classify remaining inline styles by dynamic necessity, layout risk, and migrated cluster.
- Move layout/typography/surface styling to scoped CSS modules and semantic tokens.
- Maintain a narrow documented allowlist for truly dynamic values.
- Remove obsolete legacy shell/table-card/Chip-clearance rules only after reference, route, and visual proof.

## Explicit non-scope

- No blind regex rewrite.
- No feature logic refactor bundled with style migration.
- No deletion based only on filename age.

## Exact files to add

- `scripts/audit-inline-styles.mjs`
- `docs/ui-overhaul/implementation/INLINE_STYLE_LEDGER.md`

## Exact files to modify

- `Migrated TSX/CSS modules`
- `packages/design-system/tokens/index.css`
- `apps/web/src/app/app-shell.css`

## Exact files to delete — only after migration proof

- `Legacy components/styles only when no route/packet references remain and H2/coverage permits`

A glob in this packet identifies a route cluster, not permission for blind bulk editing. Claude must enumerate the concrete touched files in the progress ledger before committing.

## Relevant symbols and contracts

- `inline-style audit allowlist`
- `semantic CSS modules`

## Proposed component / module structure

- `audit-inline-styles` reports counts by file/category and fails new layout-critical use in migrated directories.
- Each cluster cleanup is a separate commit after its functional packet passes.
- The ledger records before/after counts, retained exceptions, removed selectors/components, visual baselines, and rollback commit.
- Dynamic styles use CSS custom properties where possible.

## Data and state contracts

- Presentation data is derived through pure selectors/presenters or UI-only adapters.
- Existing authoritative mutation functions remain the only commit boundary.
- No new field enters the save schema unless a separately documented protected-contract exception is approved.
- No UI read, sort, animation, or preview may consume simulation RNG.
- Route/UI preference state must be isolated from deterministic engine state.

## CSS and responsive behavior

- Remove legacy width-only/table-card/clearance overrides only when new adaptive primitives own behavior.
- Re-run full viewport geometry after every cluster cleanup.

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

- Count trend
- no new layout-critical inline styles
- visual regression
- grep/reference proof before deletion
- bundle comparison.

Also required:

- Unit tests for pure presenter/adapter logic and each error/state branch introduced.
- Component tests for semantics, keyboard, focus, disabled/loading behavior, and state transitions.
- Route compatibility/coverage tests for every route touched.
- Viewport geometry assertions at the smallest relevant phone, compact-height landscape, tablet, and desktop.
- Existing engine/web/design-system tests plus build, bundle, smoke, and release gates according to the packet’s blast radius.

## Manual test script

- Run inline-style audit and compare baseline 4,110 direct blocks.
- Search references before each deletion.
- Visual-diff migrated screens across viewport/input states.
- Test team colors and dynamic measurements.
- Verify no cascade leakage into legacy mode while it remains.

## Required before / after screenshots

- Before/after representative screens per cluster.
- Style count trend and allowlist.
- Legacy/new mode comparison until retirement.

Each screenshot entry must include viewport, state/fixture, route, mode, commit, and the matching geometry measurement. Capture focus, open-sheet/dialog, error, and 200%-zoom states where this packet changes them.

## Performance and bundle checks

- Measure route bundle change and compare against the existing release/bundle gate.
- Avoid mounting hidden heavy legacy and new implementations simultaneously outside controlled migration tests.
- Use memoized selectors/view models only where profiling shows value; do not cache mutable domain objects.
- Large lists must have an explicit DOM/render strategy and a keyboard/focus-safe fallback.

## Risks

- CSS extraction can change specificity/order.
- Removing `!important` before inline styles are gone can break mobile.
- Large cleanup commits make rollback and visual blame difficult.

## Rollback path

Cleanup commits are separated by cluster; revert without changing feature logic.

Additionally:

- Keep the legacy route/shell/component available until replacement coverage and acceptance gates are green.
- Separate extraction, new implementation, route adoption, and deletion commits so any layer can be reverted independently.
- Never roll back by altering or discarding user saves.

## Suggested atomic commits

- chore(styles): add inline-style audit and ledger
- refactor(styles): migrate <cluster> to semantic modules
- chore(styles): remove proven-unused legacy rules for <cluster>

Each commit must update the progress ledger with checks, screenshots, remaining compatibility behavior, and rollback command/commit.

## Definition of done

New shell and migrated routes meet style policy; obsolete !important/table-card/Chip-clearance rules removed only when unused.

The packet is not done when the new UI merely renders. It is done only when feature parity, route compatibility, interaction/accessibility behavior, viewport acceptance, deterministic/save safety, evidence capture, and rollback proof all pass.
